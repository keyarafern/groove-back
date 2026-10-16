// Phone or laptop camera → body landmarks → the same joint angles the coach uses.
// Stars are coaching cues, not medical measurements: tolerances are generous and
// every player is scored against their own range for the day.
const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
// "full" is noticeably steadier than "lite" on limbs at 2 m; lite stays as the fallback for slow machines.
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const MODEL_LITE = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export const tracker = {
  ready: false, starting: false, error: null, video: null, lm: null,
  pts: null, vis: 0, lastSeen: 0, angles: null, energy: 0, jitter: 0, fullBody: false, legsSeen: false,
  hist: [], listeners: new Set(),
};
const SEG = {
  lUA: [11, 13], lFA: [13, 15], rUA: [12, 14], rFA: [14, 16],
  lTH: [23, 25], lSH: [25, 27], rTH: [24, 26], rSH: [26, 28],
};
const deg = (r) => (r * 180) / Math.PI;

// The tracker owns its <video>. It used to live inside a screen, and Chrome pauses a
// video the moment it leaves the page, so tracking froze as soon as the song began.
function ownVideo() {
  let v = document.getElementById('gb-cam');
  if (!v) {
    v = document.createElement('video'); v.id = 'gb-cam';
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    // kept on the page (not display:none) so the browser keeps decoding frames
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1';
    document.body.appendChild(v);
  }
  return v;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

let starting = null;
export function startCamera() {
  if (tracker.ready) { const v = tracker.video; if (v && v.paused) v.play().catch(() => {}); return Promise.resolve(true); }
  if (!starting) starting = boot().finally(() => { starting = null; });
  return starting;
}
async function boot() {
  tracker.starting = true; tracker.error = null;
  let stream = null;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('nocam'), { name: 'NotSupported' });
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    const video = ownVideo();
    video.srcObject = stream;
    await video.play();
    tracker.video = video;
    // the pose model downloads from the internet the first time; don't wait forever on a bad connection
    const vision = await withTimeout(import(/* @vite-ignore */ VISION + '/vision_bundle.mjs'), 30000);
    const files = await withTimeout(vision.FilesetResolver.forVisionTasks(VISION + '/wasm'), 30000);
    const opts = (d, m) => ({ baseOptions: { modelAssetPath: m, delegate: d }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    const tries = [['GPU', MODEL], ['GPU', MODEL_LITE], ['CPU', MODEL_LITE]];
    for (const [d, m] of tries) { try { tracker.lm = await withTimeout(vision.PoseLandmarker.createFromOptions(files, opts(d, m)), 30000); break; } catch (e) { if (m === MODEL_LITE && d === 'CPU') throw e; } }
    tracker.ready = true;
    loop();
    return true;
  } catch (e) {
    tracker.error = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'NotSupported') ? 'blocked' : 'load';
    if (stream && !tracker.ready) { stream.getTracks().forEach((t) => t.stop()); tracker.video = null; }
    return false;
  } finally { tracker.starting = false; }
}

let lastVT = -1;
function loop() {
  const v = tracker.video;
  if (v && v.paused && v.srcObject) v.play().catch(() => {});
  if (v && v.readyState >= 2 && v.currentTime !== lastVT) {
    lastVT = v.currentTime;
    let res = null;
    try { res = tracker.lm.detectForVideo(v, performance.now()); } catch (e) { res = null; }
    const raw = res && res.landmarks && res.landmarks[0];
    if (raw) process(raw); else tracker.vis = 0;
  }
  requestAnimationFrame(loop);
}

// One-Euro filter (Casiez et al.): heavy smoothing when a joint is still, light when it moves fast,
// so the shadow stops shivering without lagging behind real moves.
const filters = [];
function oneEuro(i, key, x, t) {
  const f = (filters[i] ||= {})[key] ||= { x: x, dx: 0, t };
  const dt = Math.max(1 / 120, t - f.t); f.t = t;
  const alpha = (cut) => { const r = 2 * Math.PI * cut * dt; return r / (r + 1); };
  const dx = (x - f.x) / dt; f.dx += alpha(1.0) * (dx - f.dx);
  const cutoff = 1.2 + 3 * Math.abs(f.dx);
  f.x += alpha(cutoff) * (x - f.x);
  return f.x;
}

function process(raw) {
  const v = tracker.video, ar = (v.videoWidth / v.videoHeight) || 4 / 3;
  const now = performance.now() / 1000;
  // mirror so the player's left appears on the left, like a mirror; smooth every joint
  const pts = raw.map((p, i) => { const nx = oneEuro(i, 'x', 1 - p.x, now), ny = oneEuro(i, 'y', p.y, now); return { x: nx * ar, y: ny, v: p.visibility ?? 1, nx, ny }; });
  const prev = tracker.pts;
  tracker.pts = pts;
  const upper = Math.min(pts[11].v, pts[12].v, pts[13].v, pts[14].v);
  tracker.vis = upper;
  if (upper > 0.4) tracker.lastSeen = now;
  tracker.legsSeen = Math.min(pts[25].v, pts[26].v) > 0.5;
  // hip height and torso length (normalised), for squats and calf raises
  tracker.hipY = (pts[23].y + pts[24].y) / 2;
  tracker.torso = Math.abs((pts[23].y + pts[24].y) / 2 - (pts[11].y + pts[12].y) / 2) || 0.25;
  if (base.n < 40 && upper > 0.5) { base.hip = (base.hip * base.n + tracker.hipY) / (base.n + 1); base.torso = (base.torso * base.n + tracker.torso) / (base.n + 1); base.n++; }
  tracker.fullBody = upper > 0.5 && tracker.legsSeen && Math.min(pts[27].v, pts[28].v) > 0.4;
  const ang = {};
  for (const k in SEG) {
    const [a, b] = SEG[k]; const A = pts[a], B = pts[b];
    ang[k] = { a: deg(Math.atan2(B.x - A.x, B.y - A.y)), v: Math.min(A.v, B.v) };
  }
  const sm = { x: (pts[11].x + pts[12].x) / 2, y: (pts[11].y + pts[12].y) / 2 }, hm = { x: (pts[23].x + pts[24].x) / 2, y: (pts[23].y + pts[24].y) / 2 };
  ang.lean = { a: 180 - deg(Math.atan2(sm.x - hm.x, sm.y - hm.y)) % 360, v: Math.min(pts[23].v, pts[24].v) };
  const nose = pts[0]; ang.head = { a: deg(Math.atan2(nose.x - sm.x, sm.y - nose.y)), v: nose.v };
  tracker.angles = ang;
  // motion energy (per second, in shoulder widths) and jitter
  const sw = Math.hypot(pts[11].x - pts[12].x, pts[11].y - pts[12].y) || 0.2;
  if (prev && tracker.lastT) {
    const dt = Math.max(1 / 60, now - tracker.lastT);
    let e = 0, n = 0;
    for (const i of [13, 14, 15, 16, 25, 26, 27, 28, 0]) { if (pts[i].v < 0.4) continue; e += Math.hypot(pts[i].x - prev[i].x, pts[i].y - prev[i].y); n++; }
    tracker.energy = n ? e / n / sw / dt : 0;
  }
  tracker.lastT = now;
  tracker.hist.push({ t: now, ang });
  while (tracker.hist.length && tracker.hist[0].t < now - 1.2) tracker.hist.shift();
  for (const fn of tracker.listeners) fn(now);
}

// Standing baseline, captured while the player stands still in the warm-up.
const base = { hip: 0, torso: 0.25, n: 0 };
export function resetBaseline() { base.n = 0; base.hip = 0; }
export function setBaseline(hip, torso) { base.hip = hip; base.torso = torso; base.n = 40; }
// Hips lower (+) or higher (−) than standing, in the coach's pose units (torso ≈ 150).
export function trackedDrop() { return base.n < 10 ? null : ((tracker.hipY - base.hip) / base.torso) * 150; }

export const angDiff = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };

// How closely the player matches a coach pose right now: 0..1 per body region.
export function matchPose(pose, coreParts) {
  const A = tracker.angles; if (!A) return null;
  const target = {
    lUA: pose.lSh, lFA: pose.lSh + pose.lEl, rUA: pose.rSh, rFA: pose.rSh + pose.rEl,
    lTH: pose.lTh, lSH: pose.lTh + pose.lKn, rTH: pose.rTh, rSH: pose.rTh + pose.rKn,
  };
  const score = (keys) => {
    let s = 0, w = 0;
    for (const k of keys) { const m = A[k]; if (!m || m.v < 0.45) continue; const d = angDiff(m.a, target[k]); s += clamp01(1 - (d - 22) / 55) * m.v; w += m.v; }
    return w > 0.6 ? s / w : null;
  };
  const arms = score(['lUA', 'lFA', 'rUA', 'rFA']);
  const legs = score(['lTH', 'lSH', 'rTH', 'rSH']);
  const core = coreParts.includes('arms') ? arms : coreParts.includes('legs') ? legs : null;
  const flair = coreParts.includes('arms') ? legs : arms;
  // The limb furthest from the coach, for live coaching cues. Angles run 0 = hanging down
  // to 180 = straight up, so comparing magnitudes tells us "higher" or "lower".
  let worst = null; const diffs = {};
  for (const k in target) {
    const m = A[k]; if (!m || m.v < 0.5) continue;
    const d = angDiff(m.a, target[k]);
    diffs[k] = d;
    const region = k[1] === 'U' || k[1] === 'F' ? 'arms' : 'legs';
    const w = d * (coreParts.includes(region) ? 1.25 : 1); // the physio move matters most
    if (!worst || w > worst.w) worst = { k, region, d, w, under: Math.abs(norm(m.a)) < Math.abs(norm(target[k])) };
  }
  return { arms, legs, core, flair, worst, diffs };
}

// One number for "how well does the player match this coach shape right now", 0..1.
// The prescribed (Core) part counts most; hip height, trunk lean and head tilt count when the move uses them.
// Tolerances are wide on purpose: this is encouragement, not measurement.
export function scoreFrame(pose, coreParts) {
  const A = tracker.angles; if (!A) return null;
  const T = segTargets(pose);
  let s = 0, w = 0;
  const add = (score, wt) => { s += score * wt; w += wt; };
  for (const k in T) {
    const m = A[k]; if (!m || m.v < 0.45) continue;
    const region = k[1] === 'U' || k[1] === 'F' ? 'arms' : 'legs';
    // joints the exercise moves count a lot; joints that stay at rest count a little
    const moved = Math.min(3, angDiff(T[k], REST_T[k]) / 22);
    const wt = (0.15 + moved) * (coreParts.includes(region) ? 1.4 : 0.35);
    add(clamp01(1 - Math.max(0, angDiff(m.a, T[k]) - 12) / 34), wt);
  }
  const core = (part) => (coreParts.includes(part) ? 1.4 : 0.6);
  const drop = trackedDrop();
  if (Math.abs(pose.drop) >= 12 && drop != null) add(clamp01(1 - Math.abs(drop - pose.drop) / (Math.abs(pose.drop) * 0.7 + 4)), Math.min(3, Math.abs(pose.drop) / 10) * core('legs'));
  if (Math.abs(pose.lean) >= 8 && A.lean && A.lean.v > 0.4) add(clamp01(1 - Math.max(0, angDiff(norm(A.lean.a), pose.lean) - 5) / (Math.abs(pose.lean) * 0.8)), Math.min(3, Math.abs(pose.lean) / 7) * core('trunk'));
  // the coach's head tilt is drawn mirrored relative to the camera's nose angle
  if (Math.abs(pose.head) >= 15 && A.head && A.head.v > 0.4) add(clamp01(1 - Math.max(0, Math.abs(A.head.a + pose.head * 0.7) - 5) / (Math.abs(pose.head) * 0.6)), Math.min(3, Math.abs(pose.head) / 10) * core('head'));
  return w > 0.8 ? s / w : null;
}
const segTargets = (p) => ({ lUA: p.lSh, lFA: p.lSh + p.lEl, rUA: p.rSh, rFA: p.rSh + p.rEl, lTH: p.lTh, lSH: p.lTh + p.lKn, rTH: p.rTh, rSH: p.rTh + p.rKn });
const REST_T = segTargets({ lSh: -12, lEl: -4, rSh: 12, rEl: 4, lTh: -4, lKn: 0, rTh: 4, rKn: 0 });

// The player's body as a pose the coach renderer can draw (the inverse of matchPose's target).
export function trackedPose() {
  const A = tracker.angles; if (!A) return null;
  const a = (k, d = 0) => (A[k] && A[k].v > 0.35 ? A[k].a : d);
  const lSh = a('lUA', -12), rSh = a('rUA', 12), lTh = a('lTH', -4), rTh = a('rTH', 4);
  return {
    lSh, lEl: norm(a('lFA', lSh) - lSh), rSh, rEl: norm(a('rFA', rSh) - rSh),
    lTh, lKn: norm(a('lSH', lTh) - lTh), rTh, rKn: norm(a('rSH', rTh) - rTh),
    lean: clampLean(norm(A.lean ? A.lean.a : 0)), head: Math.max(-40, Math.min(40, A.head ? -A.head.a / 0.7 : 0)), drop: Math.max(-30, Math.min(50, trackedDrop() ?? 0)),
  };
}
const clampLean = (v) => Math.max(-35, Math.min(35, v));
const norm = (a) => ((a % 360) + 540) % 360 - 180;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Recent jitter (lower = steadier), from the angle history.
export function steadiness() {
  const h = tracker.hist; if (h.length < 8) return 1;
  let tot = 0, n = 0;
  for (const k of ['lUA', 'rUA', 'lTH', 'rTH']) {
    const vals = h.map((x) => x.ang[k]).filter((m) => m && m.v > 0.5).map((m) => m.a);
    if (vals.length < 8) continue;
    for (let i = 2; i < vals.length; i++) { const acc = Math.abs(vals[i] - 2 * vals[i - 1] + vals[i - 2]); tot += Math.min(acc, 40); n++; }
  }
  return n ? clamp01(1 - (tot / n - 1.5) / 8) : 1;
}

export function drawSkeleton(g, w, h, { video = true, color = '#ffb38a', guide = false } = {}) {
  const v = tracker.video;
  g.save();
  if (video && v && v.readyState >= 2) {
    g.translate(w, 0); g.scale(-1, 1); g.drawImage(v, 0, 0, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
    const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, 'rgba(14,8,30,0.35)'); vg.addColorStop(1, 'rgba(14,8,30,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  } else { const bg = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.7); bg.addColorStop(0, '#2a1846'); bg.addColorStop(1, '#0e081e'); g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  // framing guide: where your body should sit
  if (guide) {
    const ok = tracker.fullBody && performance.now() / 1000 - tracker.lastSeen < 0.5;
    g.setLineDash([10, 10]); g.lineWidth = 3; g.strokeStyle = ok ? 'rgba(95,240,176,0.9)' : 'rgba(255,250,246,0.4)';
    g.beginPath(); g.roundRect(w * 0.3, h * 0.06, w * 0.4, h * 0.88, 24); g.stroke(); g.setLineDash([]);
  }
  const p = tracker.pts;
  if (p && performance.now() / 1000 - tracker.lastSeen < 0.8) {
    const lw = Math.max(3, w / 70);
    g.lineCap = 'round'; g.shadowColor = color; g.shadowBlur = lw * 3;
    const seg = (a, b, lwm, col) => { if (p[a].v < 0.35 || p[b].v < 0.35) return; g.strokeStyle = col; g.lineWidth = lw * lwm; g.beginPath(); g.moveTo(p[a].nx * w, p[a].ny * h); g.lineTo(p[b].nx * w, p[b].ny * h); g.stroke(); };
    [[11, 12], [11, 23], [12, 24], [23, 24]].forEach(([a, b]) => seg(a, b, 1, 'rgba(255,250,246,0.6)'));
    [[11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]].forEach(([a, b]) => seg(a, b, 1.7, color));
    g.shadowBlur = 0;
    for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) { if (p[i].v < 0.35) continue; g.beginPath(); g.arc(p[i].nx * w, p[i].ny * h, lw * 1.1, 0, 7); g.fillStyle = '#fff8f2'; g.fill(); }
    if (p[0].v > 0.4) { g.beginPath(); g.arc(p[0].nx * w, p[0].ny * h, lw * 2.6, 0, 7); g.fillStyle = color; g.fill(); }
  }
  g.restore();
}
