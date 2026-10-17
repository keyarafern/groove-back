// Groove Back explainer: a ~55 s, 1080p, narrated video drawn with the game's own coach, scenes and band.
// Everything is deterministic in time `t`, so it can be previewed live or rendered frame by frame to MP4.
import { drawFigure, drawPicto, lerpPose, eio, clamp, hexA } from '/src/figure.js';
import { drawScene } from '/src/scene.js';
import { POSES } from '/src/content.js';
import { Band, setAudioContext } from '/src/audio.js';
import { icon } from '/src/ui.js';

const W = 1920, H = 1080, FPS = 30, DUR = 55;
const MUSIC_T0 = 4.3, BPM = 100, SPB = 60 / BPM, BEATS = 80;
const C = { ink: '#1E2A2F', ink2: '#4A585E', orange: '#FF8C52', orangeInk: '#C2541C', teal: '#359FA0', tealInk: '#1F7374', seafoam: '#8AD6D1', cream: '#FFF0C5', bg: '#FFFCF6', lav: '#9C8CE8', berry: '#E8628F', gold: '#FFB547' };
const DISPLAY = '"Bricolage Grotesque", Figtree, sans-serif', BODY = 'Figtree, system-ui, sans-serif';
const COACH = { body: C.teal, glove: C.orange, skin: '#D49D72', glowColor: 'rgba(255,140,82,0.25)' };
const CREW = [{ body: C.berry, skin: '#D49D72' }, { body: C.teal, skin: '#A9704A' }, { body: '#F2B33D', skin: '#F7D9C0' }, { body: C.lav, skin: '#7A4E31' }, { body: C.orange, skin: '#EDBB93' }];

// ---------------------------------------------------------------- narration (macOS "Samantha", generated into ./vo)
const VO = [
  { f: 'l1', at: 0.6, text: 'Physio exercises at home can feel a little… like this.' },
  { f: 'l2', at: 4.35, text: 'So we turned them into a dance party!' },
  { f: 'l3', at: 6.7, text: 'Meet Groove Back. Your physio picks the moves,' },
  { f: 'l4', at: 10.0, text: 'and the song does the counting. | Just follow the coach, and hit each move as it reaches the line.' },
  { f: 'l5', at: 17.0, text: 'Turn on your camera, and every rep gets a cheer. | Perfect! Great! Good!' },
  { f: 'l6', at: 22.6, text: 'Finish your session, and you earn 100 points. | Extra reps don’t earn more, so there’s never a reason to overdo it.' },
  { f: 'l7', at: 30.0, text: 'Rest days never break your streak. | And if something hurts, one tap stops the song, and it still counts.' },
  { f: 'l8', at: 37.2, text: 'Your crew dances toward one weekly goal, together. | Every session counts the same, whatever your exercise.' },
  { f: 'l9', at: 44.4, text: '' },
  { f: 'l10', at: 49.3, text: '' },
];

// ---------------------------------------------------------------- helpers
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eoB = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const since = (t, t0, d = 0.45) => clamp((t - t0) / d);
const beatAt = (t) => (t - MUSIC_T0) / SPB;
const pulseAt = (t) => { const b = beatAt(t); return b > 0 ? Math.pow(1 - (((b % 1) + 1) % 1), 3) : 0; };
// a looping dance through a list of poses, one pose per `per` beats
function loopPose(list, b, per = 1) { const x = b / per, i = Math.floor(x), f = x - i; const n = list.length; return lerpPose(POSES[list[((i % n) + n) % n]], POSES[list[(((i + 1) % n) + n) % n]], eio(clamp(f * 1.5))); }
// an exercise rep: rest → shape → rest over `cycle` beats (or a 4-shape sequence for two-sided moves)
function repPose(shape, b, cycle = 4) { const ph = (((b % cycle) + cycle) % cycle) / cycle; const k = ph < 0.5 ? ph * 2 : (1 - ph) * 2; return lerpPose(POSES.rest, POSES[shape], eio(clamp(k * 1.2))); }
function seqPose(seq, b, cycle = 8) { const q = ((((b % cycle) + cycle) % cycle) / cycle) * 4, i = Math.floor(q) % 4, f = q - Math.floor(q); return lerpPose(POSES[seq[i]], POSES[seq[(i + 1) % 4]], eio(clamp(f * 1.35))); }
function withArms(pose, arms) { return { ...pose, lSh: arms.lSh, lEl: arms.lEl, rSh: arms.rSh, rEl: arms.rEl }; }

function text(g, s, x, y, o = {}) {
  const { size = 80, color = C.ink, weight = 800, align = 'center', font = DISPLAY, p = 1, stroke = 0, strokeColor = '#fff', rot = 0, italic = false, alpha = 1 } = o;
  if (p <= 0) return;
  const sc = 0.55 + 0.45 * eoB(p);
  g.save(); g.globalAlpha *= alpha * clamp(p * 2.2); g.translate(x, y); g.rotate(rot * (1 - eo(p))); g.scale(sc, sc);
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = strokeColor; g.strokeText(s, 0, 0); }
  g.fillStyle = color; g.fillText(s, 0, 0); g.restore();
}
function rrect(g, x, y, w, h, r, fill, stroke) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } }
function shadowCard(g, x, y, w, h, r = 36, fill = '#fff', p = 1) {
  if (p <= 0) return; const sc = 0.85 + 0.15 * eoB(p);
  g.save(); g.globalAlpha *= clamp(p * 2); g.translate(x + w / 2, y + h / 2); g.scale(sc, sc); g.translate(-w / 2, -h / 2);
  g.shadowColor = 'rgba(120,80,30,0.22)'; g.shadowBlur = 50; g.shadowOffsetY = 18; rrect(g, 0, 0, w, h, r, fill); g.restore();
}
function star(g, x, y, r, fill) { if (r <= 0) return; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill(); }
// confetti bursts, deterministic from their start time
function confetti(g, t, t0, cx, cy, n = 90, spread = 1) {
  const a = t - t0; if (a < 0 || a > 2.6) return;
  const cols = [C.orange, C.gold, C.teal, C.seafoam, C.berry, C.lav];
  for (let i = 0; i < n; i++) {
    const r1 = Math.sin(i * 12.9898 + t0 * 7) * 43758.5453 % 1, r2 = Math.sin(i * 78.233 + t0 * 3) * 12543.1 % 1;
    const ang = Math.abs(r1) * Math.PI * 2, v = (500 + Math.abs(r2) * 900) * spread;
    const x = cx + Math.cos(ang) * v * a, y = cy + Math.sin(ang) * v * a * 0.8 - 400 * a + 900 * a * a;
    g.save(); g.globalAlpha = clamp(1 - a / 2.6); g.translate(x, y); g.rotate(a * 8 + i); g.fillStyle = cols[i % cols.length]; g.fillRect(-9, -5, 18, 10); g.restore();
  }
}
const iconImg = {};
function loadIcon(name, color) { return new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(icon[name].replace(/currentColor/g, color).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ')); }).then((img) => (iconImg[name + color] = img)); }
function drawIcon(g, name, color, x, y, size, p = 1) { const img = iconImg[name + color]; if (!img || p <= 0) return; const s = size * (0.5 + 0.5 * eoB(p)); g.save(); g.globalAlpha *= clamp(p * 2); g.drawImage(img, x - s / 2, y - s / 2, s, s); g.restore(); }

// soft cream background with drifting blobs
function bg(g, t, tint = 0) {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#FFFCF6'); gr.addColorStop(1, tint ? '#E4F6F4' : '#FFF0C5'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, col) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, hexA('#FFFFFF', 0)); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); };
  blob(1500 + Math.sin(t * 0.4) * 80, 200 + Math.cos(t * 0.3) * 40, 520, hexA(C.orange, 0.22));
  blob(250 + Math.cos(t * 0.35) * 60, 900, 480, hexA(C.seafoam, 0.3));
  blob(960, 1200, 600, hexA(C.cream, 0.6));
}
// a framed "game stage" (like the play screen) with an illustrated room inside
function stage(g, t, x, y, w, h, scene, drawInside) {
  g.save(); g.shadowColor = 'rgba(120,80,30,0.25)'; g.shadowBlur = 60; g.shadowOffsetY = 20; rrect(g, x, y, w, h, 44, '#fff'); g.restore();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 44); g.clip(); g.translate(x, y);
  const s = h / 780;
  drawScene(g, w, h, scene, { t, pulse: pulseAt(t), cx: w / 2, floorY: h * 0.74, s });
  drawInside(w, h, s);
  g.restore();
}
// Just Dance move track: cards slide to the orange line on peaks every `every` beats
function moveTrack(g, b, w, h, poses, every = 4, offset = 2) {
  const sz = 96, y = h - 92, x0 = 26, x1 = w - 26, lineX = x0 + sz * 0.9, ppb = 52;
  rrect(g, x0, y - sz * 0.72, x1 - x0, sz * 1.44, 34, 'rgba(255,255,255,0.78)');
  const k = b > 0 ? Math.pow(1 - (((b % 1) + 1) % 1), 3) : 0;
  g.save(); g.shadowColor = 'rgba(255,140,82,0.9)'; g.shadowBlur = 10 + 16 * k; g.strokeStyle = C.orange; g.lineWidth = 5 + 3 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(lineX, y - sz * 0.62); g.lineTo(lineX, y + sz * 0.62); g.stroke(); g.restore();
  const first = Math.floor((b - offset) / every) - 1;
  for (let n = first; n < first + 12; n++) {
    const pb = n * every + offset, x = lineX + (pb - b) * ppb;
    if (x < x0 - 10 || x > x1 + sz) continue;
    const a = clamp((x1 - x) / (sz * 0.7)) * clamp((x - x0 + 20) / (sz * 0.8));
    drawPicto(g, x, y, sz, POSES[poses[((n % poses.length) + poses.length) % poses.length]], { alpha: a, now: Math.abs(pb - b) < 0.5, gold: ((n % 5) + 5) % 5 === 4, color: C.orange });
  }
}
function judge(g, word, col, t, t0, x, y, starsN, sub) {
  const a = t - t0; if (a < 0 || a > 1.15) return;
  const p = since(t, t0, 0.3), fade = a > 0.85 ? 1 - (a - 0.85) / 0.3 : 1;
  g.save(); g.globalAlpha = fade;
  text(g, word, x, y, { size: 104, color: col, italic: true, stroke: 22, p, rot: -0.25 });
  for (let i = 0; i < 3; i++) star(g, x - 60 + i * 60, y + 86, 26 * eoB(since(t, t0 + 0.1 + i * 0.07, 0.25)), i < starsN ? C.gold : 'rgba(30,42,47,0.14)');
  if (sub) text(g, sub, x, y + 146, { size: 34, color: C.ink2, font: BODY, stroke: 8, p });
  g.restore();
}
function captions(g, t) {
  if (t > 44) return;
  for (const v of VO) {
    if (!v.text || t < v.at - 0.05) continue;
    const dur = durs[v.f] || 3; if (t > v.at + dur + 0.25) continue;
    const parts = v.text.split(' | '), total = parts.reduce((a, s) => a + s.length, 0);
    let acc = 0, cur = parts[0];
    for (const s of parts) { if ((t - v.at) / dur >= acc / total) cur = s; acc += s.length; }
    g.save(); g.font = `700 36px ${BODY}`; const tw = Math.min(g.measureText(cur).width, 1500), bw = tw + 64, bx = (W - bw) / 2, by = H - 104;
    g.globalAlpha = clamp((t - v.at + 0.05) * 6) * clamp((v.at + dur + 0.25 - t) * 6);
    rrect(g, bx, by, bw, 66, 33, 'rgba(30,42,47,0.86)'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cur, W / 2, by + 34, 1500); g.restore();
  }
}
// wipe between scenes: a bold diagonal band sweeps across
const CUTS = [6.5, 10, 17, 22.5, 30, 37, 44];
function wipe(g, t) {
  for (let i = 0; i < CUTS.length; i++) {
    const a = (t - (CUTS[i] - 0.28)) / 0.56; if (a < 0 || a > 1) continue;
    const x = -700 + a * (W + 1400), col = i % 2 ? C.teal : C.orange;
    g.save(); g.translate(x, 0); g.transform(1, 0, -0.35, 1, 0, 0); g.fillStyle = col; g.fillRect(-500, 0, 1000, H); g.fillStyle = hexA('#FFFFFF', 0.35); g.fillRect(-500, 0, 60, H); g.restore();
  }
}

// ---------------------------------------------------------------- scenes
function s1(g, t) { // the boring version, then the drop
  const b = beatAt(t);
  if (t < MUSIC_T0) {
    g.save(); g.filter = 'grayscale(0.9) brightness(0.97)';
    drawScene(g, W, H, 'room', { t: 0, cx: W * 0.62, floorY: H * 0.8, s: H / 760, reduced: true });
    const slow = Math.sin(t * 1.6) * 0.5 + 0.5;
    drawFigure(g, W * 0.62, H * 0.45, H / 760, lerpPose({ ...POSES.rest, head: 12, lean: -3, lSh: -6, rSh: 6 }, { ...POSES.halfSquat, head: 16, lSh: -10, rSh: 10, lEl: -2, rEl: 2, drop: 10 }, eio(slow * 0.35)), { ...COACH, glow: false });
    g.restore();
    for (let i = 0; i < 3; i++) { const a = ((t * 0.5 + i / 3) % 1); text(g, 'z', W * 0.67 + a * 120 + i * 10, H * 0.24 - a * 160, { size: 54 + i * 14, color: '#8A949A', alpha: Math.sin(a * Math.PI), p: 1 }); }
    const shake = t > 3.9 ? Math.sin(t * 120) * 10 * clamp((t - 3.9) * 4) : 0;
    g.save(); g.translate(shake, 0);
    text(g, 'Home exercises…', 150, 300, { size: 104, align: 'left', color: '#5E6A70', p: since(t, 0.6) });
    text(g, '…can feel like this.', 150, 430, { size: 104, align: 'left', color: '#5E6A70', p: since(t, 2.0) });
    rrect(g, 150, 540, 420, 84, 42, 'rgba(255,255,255,0.7)');
    g.font = `700 38px ${BODY}`; g.fillStyle = '#7A858A'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`Rep ${Math.min(30, 1 + Math.floor(t * 0.6))} of 30…`, 186, 583);
    g.restore();
    return;
  }
  // DROP: colour, music, confetti
  drawScene(g, W, H, 'room', { t, pulse: pulseAt(t), cx: W * 0.62, floorY: H * 0.8, s: H / 760 });
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const sw = Math.sin(t * 1.4 + i * 1.3) * 0.5; g.save(); g.translate(W * (0.15 + i * 0.18), -40); g.rotate(sw); const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, hexA([C.orange, C.seafoam, '#FFD36B'][i % 3], 0.32 + 0.2 * pulseAt(t))); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.lineTo(180, H); g.lineTo(-180, H); g.closePath(); g.fill(); g.restore(); }
  g.restore();
  drawFigure(g, W * 0.62, H * 0.45 - 20 * pulseAt(t), H / 760, loopPose(['vUp', 'clapTop', 'out', 'shimmy'], b, 1), COACH);
  const rev = clamp((t - MUSIC_T0) / 0.5); // circular colour reveal over the grey frame
  if (rev < 1) { g.save(); g.beginPath(); g.rect(0, 0, W, H); g.arc(W * 0.62, H * 0.45, eo(rev) * 2300, 0, Math.PI * 2, true); g.clip(); g.fillStyle = '#E9E6E1'; g.fillRect(0, 0, W, H); g.restore(); }
  text(g, 'DANCE', 520, 330, { size: 210, color: C.orange, italic: true, stroke: 30, p: since(t, 4.45, 0.4), rot: -0.4 });
  text(g, 'PARTY!', 560, 540, { size: 210, color: C.teal, italic: true, stroke: 30, p: since(t, 4.85, 0.4), rot: 0.4 });
  confetti(g, t, MUSIC_T0 + 0.05, W * 0.62, H * 0.4, 140, 1.1);
}
function s2(g, t) { // meet Groove Back + the physio's plan
  const b = beatAt(t);
  bg(g, t);
  text(g, 'Groove', 160, 330, { size: 190, align: 'left', p: since(t, 6.6, 0.5) });
  text(g, 'Back', 160, 500, { size: 190, align: 'left', p: since(t, 6.75, 0.5) });
  star(g, 760, 260, 44 * eoB(since(t, 7.0, 0.4)), C.orange);
  rrect(g, 160, 640, 620 * eo(since(t, 7.5, 0.6)), 10, 5, C.orange);
  text(g, 'Your physio picks the moves', 160, 720, { size: 64, align: 'left', color: C.orangeInk, p: since(t, 7.4, 0.5) });
  const cx = 1030, cy = 170, cw = 740, ch = 760;
  shadowCard(g, cx, cy, cw, ch, 44, '#fff', since(t, 6.9, 0.5));
  if (t > 7.1) {
    rrect(g, cx + 40, cy + 40, 250, 46, 23, '#DDF3F1'); g.font = `800 24px ${BODY}`; g.fillStyle = C.tealInk; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('PRESCRIBED PLAN', cx + 62, cy + 64);
    text(g, 'Dr. Anjali’s plan for you', cx + 40, cy + 140, { size: 52, align: 'left', p: since(t, 7.1) });
    const rows = [['Mini squats', '2 × 10', 'halfSquat'], ['Side leg raises', '2 × 6', 'sideLegR'], ['Calf raises', '2 × 10', 'calfUp']];
    rows.forEach(([name, tgt, shape], i) => {
      const p = since(t, 7.5 + i * 0.32, 0.45); if (p <= 0) return;
      const ry = cy + 220 + i * 170 + (1 - eoB(p)) * 60;
      g.save(); g.globalAlpha = clamp(p * 2); rrect(g, cx + 40, ry, cw - 80, 140, 30, '#FFFAEF', '#F0E7D6');
      rrect(g, cx + 60, ry + 15, 110, 110, 24, '#fff');
      drawFigure(g, cx + 115, ry + 66, 0.17, shape === 'sideLegR' ? seqPose(['rest', 'sideLegR', 'rest', 'sideLegL'], b + i) : repPose(shape, b + i), { ...COACH, glow: false });
      g.font = `800 40px ${DISPLAY}`; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(name, cx + 200, ry + 70);
      rrect(g, cx + cw - 220, ry + 44, 150, 54, 27, '#FFE6D6'); g.font = `800 30px ${BODY}`; g.fillStyle = C.orangeInk; g.textAlign = 'center'; g.fillText(tgt, cx + cw - 145, ry + 72);
      g.restore();
    });
  }
}
function s3(g, t) { // the song counts: move track + rep ring
  const b = beatAt(t), b0 = beatAt(10.3);
  bg(g, t);
  stage(g, t, 70, 90, 1180, 860, 'room', (w, h, s) => {
    const pose = withArms(repPose('halfSquat', b, 4), loopPose(['out', 'out', 'floatOut', 'floatOut'], b, 1));
    drawFigure(g, w / 2, h * 0.43, s * 1.05, pose, { ...COACH, showCore: true, coreParts: ['legs'] });
    moveTrack(g, b, w, h, ['halfSquat'], 4, 2);
  });
  const reps = clamp(Math.floor((b - b0) / 4) + 1, 0, 10);
  const rx = 1590, ry = 420, r = 190, frac = clamp(((b - b0) / 4 + 1) / 10);
  shadowCard(g, 1330, 140, 520, 640, 44, '#fff', since(t, 10.1, 0.5));
  if (t > 10.2) {
    g.lineCap = 'round'; g.lineWidth = 28; g.strokeStyle = C.cream; g.beginPath(); g.arc(rx, ry, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = C.orange; g.beginPath(); g.arc(rx, ry, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.stroke();
    const bump = 1 + 0.12 * Math.pow(1 - clamp((((b - b0) / 4) % 1) * 4), 2);
    g.save(); g.translate(rx, ry - 10); g.scale(bump, bump); g.font = `800 150px ${DISPLAY}`; g.fillStyle = C.ink; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(reps), 18, 0);
    g.font = `800 70px ${DISPLAY}`; g.fillStyle = '#A0AAAE'; g.textAlign = 'left'; g.fillText('/10', 22, 18); g.restore();
    g.font = `700 32px ${BODY}`; g.fillStyle = C.ink2; g.textAlign = 'center'; g.fillText('reps', rx, ry + 100);
    text(g, 'Mini squats', rx, 690, { size: 52, p: since(t, 10.4) });
  }
  text(g, 'The song', 1590, 860, { size: 62, color: C.tealInk, p: since(t, 10.2) });
  text(g, 'does the counting', 1590, 930, { size: 52, color: C.tealInk, p: since(t, 10.45) });
  if (t > 13.6) text(g, 'Hit the line!', 420, 735, { size: 64, color: C.orange, italic: true, stroke: 16, p: since(t, 13.6, 0.4), rot: -0.3 });
}
function s4(g, t) { // camera cheers every rep
  const b = beatAt(t);
  bg(g, t, 1);
  stage(g, t, 70, 90, 1780, 860, 'porch', (w, h, s) => {
    const seq = ['rest', 'sideLegR', 'rest', 'sideLegL'];
    const arms = loopPose(['out', 'out', 'floatOut', 'floatOut'], b, 1);
    drawFigure(g, w * 0.62, h * 0.43, s * 1.0, withArms(seqPose(seq, b, 8), arms), { ...COACH, showCore: true, coreParts: ['legs'] });
    drawFigure(g, w * 0.3, h * 0.5, s * 0.78, withArms(seqPose(seq, b - 0.35, 8), arms), { body: C.seafoam, skin: '#EDBB93', glove: C.orange, glow: false, alpha: 0.92 });
    rrect(g, w * 0.3 - 60, h * 0.66, 120, 48, 24, 'rgba(255,255,255,0.92)'); g.font = `800 26px ${BODY}`; g.fillStyle = C.tealInk; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('YOU', w * 0.3, h * 0.66 + 25);
    moveTrack(g, b, w, h, ['sideLegR', 'sideLegL'], 4, 2);
    // camera chip
    rrect(g, w - 470, 34, 430, 64, 32, 'rgba(255,255,255,0.94)'); g.font = `800 28px ${BODY}`; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Camera on · stays on your device', w - 445, 67);
    const jx = w * 0.3, jy = h * 0.14;
    judge(g, 'PERFECT', '#E8692B', t, 19.25, jx, jy, 3, 'Spot on!');
    judge(g, 'GREAT', C.tealInk, t, 19.95, jx, jy, 2, 'Nice shape!');
    judge(g, 'GOOD', '#5B8DD6', t, 20.65, jx, jy, 1, 'Getting there');
    judge(g, 'PERFECT', '#E8692B', t, 21.55, jx, jy, 3, 'Combo ×4');
    const combo = t > 21.55 ? 4 : t > 20.65 ? 3 : t > 19.95 ? 2 : t > 19.25 ? 1 : 0;
    if (combo >= 2) { rrect(g, 34, 34, 250, 70, 35, C.orange); g.font = `italic 800 40px ${DISPLAY}`; g.fillStyle = '#2A1408'; g.textAlign = 'left'; g.fillText(`Combo ×${combo}`, 62, 70); }
    if (t > 21.55) confetti(g, t, 21.55, jx, jy + 40, 70, 0.6);
  });
}
function s5(g, t) { // 100 points for showing up
  const b = beatAt(t);
  bg(g, t);
  const k = clamp((t - 23.4) / 1.1), pts = Math.round(100 * eo(k));
  const pop = t > 24.5 ? 1 + 0.08 * Math.sin((t - 24.5) * 18) * Math.exp(-(t - 24.5) * 5) : 1;
  g.save(); g.translate(560, 380); g.scale(pop, pop);
  text(g, `+${pts}`, 0, 0, { size: 300, color: C.orange, stroke: 36, p: since(t, 22.8, 0.5) });
  g.restore();
  text(g, 'points for finishing', 560, 590, { size: 64, p: since(t, 23.6) });
  text(g, 'your session', 560, 670, { size: 64, p: since(t, 23.8) });
  if (t > 24.5) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t; star(g, 560 + Math.cos(a) * 330, 380 + Math.sin(a) * 160, 22 * clamp((t - 24.5) * 3) * (0.6 + 0.4 * Math.sin(t * 6 + i)), i % 2 ? C.gold : C.orange); }
  drawFigure(g, 1440, 470, 0.95, loopPose(['vUp', 'clapTop', 'vUp', 'out'], b, 1), COACH);
  // badges pop under
  const bs = [['shoe', 'First Step', C.orange, '#FFE6D6'], ['calendar', 'Week Warrior', C.teal, '#DDF3F1'], ['heart', 'Body Listener', C.lav, '#ECE8FC']];
  if (t < 26.6) bs.forEach(([ic, name, col, soft], i) => { const p = since(t, 24.9 + i * 0.25, 0.45); if (p <= 0) return; const x = 260 + i * 210; shadowCard(g, x - 90, 760, 180, 200, 32, '#fff', p); g.save(); g.globalAlpha = clamp(p * 2); rrect(g, x - 48, 790, 96, 96, 28, soft); g.restore(); drawIcon(g, ic, col, x, 838, 60, p); text(g, name, x, 920, { size: 24, font: BODY, p }); });
  // extra reps earn nothing
  if (t > 26.4) {
    const p = since(t, 26.6, 0.5);
    shadowCard(g, 140, 760, 840, 220, 40, '#fff', p);
    text(g, 'Extra reps?', 200, 830, { size: 54, align: 'left', p });
    text(g, '+0', 880, 870, { size: 110, color: C.lav, stroke: 0, p: since(t, 27.2, 0.4) });
    text(g, 'Never a reason to overdo it.', 200, 910, { size: 40, align: 'left', color: C.ink2, font: BODY, weight: 700, p: since(t, 27.6) });
  }
}
function s6(g, t) { // rest days + that hurt
  bg(g, t, 1);
  text(g, 'Rest days never', 140, 190, { size: 84, align: 'left', p: since(t, 30.1) });
  text(g, 'break your streak', 140, 290, { size: 84, align: 'left', color: C.tealInk, p: since(t, 30.3) });
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], st = ['done', 'rest', 'done', 'free', 'done', 'rest', 'done'];
  days.forEach((d, i) => {
    const p = since(t, 30.6 + i * 0.16, 0.4); if (p <= 0) return; const x = 200 + i * 118, y = 460, r = 46 * (0.5 + 0.5 * eoB(p));
    g.save(); g.globalAlpha = clamp(p * 2); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = st[i] === 'done' ? C.orange : st[i] === 'rest' ? '#DDF3F1' : '#FFF7E2'; g.fill();
    if (st[i] === 'free') { g.setLineDash([8, 8]); g.strokeStyle = '#E6DAC3'; g.lineWidth = 4; g.stroke(); g.setLineDash([]); }
    g.restore();
    drawIcon(g, st[i] === 'done' ? 'check' : st[i] === 'rest' ? 'moon' : 'sun', st[i] === 'done' ? '#FFFFFF' : st[i] === 'rest' ? C.teal : '#E6DAC3', x, y, 44, p);
    text(g, d, x, y + 82, { size: 32, font: BODY, color: C.ink2, p });
  });
  if (t > 31.7) { const p = since(t, 31.7, 0.5); shadowCard(g, 160, 600, 520, 170, 36, '#fff', p); drawIcon(g, 'flame', C.orange, 250, 685, 90, p); text(g, '7', 360, 680, { size: 110, p }); text(g, 'days on plan', 540, 690, { size: 40, font: BODY, color: C.ink2, weight: 700, p }); }
  // that hurt: a tap stops safely
  const p0 = since(t, 32.6, 0.5);
  shadowCard(g, 1050, 150, 720, 780, 44, '#fff', p0);
  if (t > 32.8) {
    text(g, 'Something hurts?', 1410, 260, { size: 64, p: since(t, 32.8) });
    const press = t > 33.6 && t < 33.9 ? 0.93 : 1;
    g.save(); g.translate(1410, 420); g.scale(press, press); rrect(g, -230, -60, 460, 120, 60, '#fff', '#F0C4BC'); g.restore();
    drawIcon(g, 'alert', '#D9513F', 1270, 420, 56, 1); g.font = `800 50px ${DISPLAY}`; g.fillStyle = '#D9513F'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('That hurt', 1320, 422);
    // finger tap
    const fp = clamp((t - 33.0) / 0.6), fx = 1600 - 120 * eo(fp), fy = 560 - 110 * eo(fp);
    g.save(); g.globalAlpha = clamp((t - 33.0) * 3) * (t > 34.4 ? clamp(1 - (t - 34.4) * 3) : 1); g.beginPath(); g.arc(fx, fy, 30, 0, Math.PI * 2); g.fillStyle = 'rgba(30,42,47,0.25)'; g.fill(); g.beginPath(); g.arc(fx, fy, 16, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.restore();
    if (t > 33.6) { const a = t - 33.6; g.save(); g.globalAlpha = clamp(1 - a * 2); g.strokeStyle = '#D9513F'; g.lineWidth = 6; g.beginPath(); g.arc(1410, 420, 80 + a * 260, 0, Math.PI * 2); g.stroke(); g.restore(); }
    const p2 = since(t, 34.1, 0.5);
    if (p2 > 0) { g.save(); g.globalAlpha = clamp(p2 * 2); rrect(g, 1110, 560, 600, 300, 36, '#DDF3F1'); g.restore(); drawIcon(g, 'check', C.teal, 1220, 650, 80, p2); text(g, 'Stopped safely', 1290, 640, { size: 54, align: 'left', color: C.tealInk, p: p2 }); text(g, 'Still counts toward your week', 1150, 740, { size: 38, align: 'left', font: BODY, weight: 700, color: C.ink2, p: since(t, 34.4) }); text(g, '+50', 1600, 800, { size: 70, color: C.orange, p: since(t, 34.8, 0.4) }); }
  }
}
function s7(g, t) { // groove together
  const b = beatAt(t);
  drawScene(g, W, H, 'rooftop', { t, pulse: pulseAt(t), cx: W / 2, floorY: H * 0.82, s: H / 820 });
  shadowCard(g, 360, 60, 1200, 230, 44, 'rgba(255,255,255,0.95)', since(t, 37.1, 0.5));
  if (t > 37.2) {
    text(g, 'Groove Together', 960, 135, { size: 76, color: C.tealInk, p: since(t, 37.25) });
    const fill = clamp(0.38 + 0.62 * eo((t - 38.4) / 3.8));
    rrect(g, 440, 200, 1040, 40, 20, '#FFF0C5'); rrect(g, 440, 200, 1040 * fill, 40, 20, C.teal);
    g.font = `800 34px ${BODY}`; g.fillStyle = C.ink; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(`${Math.round(fill * 21)}/21 sessions`, 1480, 268);
  }
  CREW.forEach((m, i) => {
    const x = 330 + i * 315, lag = i * 0.12;
    drawFigure(g, x, 620, 0.68, loopPose(i % 2 ? ['swayL', 'clapTop', 'swayR', 'out'] : ['out', 'vUp', 'clapTop', 'shimmy'], b - lag, 1), { ...m, glove: C.orange, glow: false });
    const tp = 38.6 + i * 0.7, a = t - tp;
    if (a > 0 && a < 1.2) { text(g, '+1', x, 340 - a * 60, { size: 64, color: C.orange, stroke: 14, p: since(t, tp, 0.3), alpha: clamp((1.2 - a) * 3) }); }
  });
  if (t > 42.2) { const p = since(t, 42.2, 0.4); shadowCard(g, 720, 310, 480, 100, 50, C.orange, p); text(g, 'Goal reached!', 960, 360, { size: 54, color: '#2A1408', p }); confetti(g, t, 42.2, W / 2, 300, 160, 1.2); }
}
function s8(g, t) { // the promise + logo
  const b = beatAt(t);
  bg(g, t);
  const lines = [['Your physio picks the moves.', C.orangeInk, 44.45], ['The song does the counting.', C.tealInk, 45.9], ['Your league cheers you on.', '#6A5BC8', 47.4]];
  if (t < 49.1) lines.forEach(([s, col, at], i) => text(g, s, W / 2, 330 + i * 170, { size: 104, color: col, p: since(t, at, 0.5), alpha: t > 48.8 ? clamp(1 - (t - 48.8) * 3) : 1 }));
  else {
    for (let i = 0; i < 5; i++) drawFigure(g, 260 + i * 350, 900, 0.42, loopPose(['vUp', 'clapTop', 'out', 'shimmy'], b - i * 0.1, 1), { ...CREW[i], glove: C.orange, glow: false });
    text(g, 'All you have to do…', W / 2, 250, { size: 92, color: C.ink2, p: since(t, 49.3, 0.5) });
    text(g, 'is SHOW UP.', W / 2, 410, { size: 210, color: C.orange, italic: true, stroke: 34, p: since(t, 50.45, 0.45), rot: -0.3 });
    confetti(g, t, 50.5, W / 2, 380, 170, 1.3);
    if (t > 51.6) {
      const p = since(t, 51.6, 0.5);
      text(g, 'Groove Back', W / 2 - 40, 590, { size: 96, p });
      star(g, W / 2 + 260, 560, 26 * eoB(p), C.orange);
      shadowCard(g, W / 2 - 360, 650, 720, 76, 38, C.ink, since(t, 52.0, 0.5));
      text(g, 'keyarafern.github.io/groove-back', W / 2, 689, { size: 36, color: '#fff', font: BODY, p: since(t, 52.1, 0.5) });
    }
  }
  if (t > 54.2) { g.fillStyle = hexA('#FFFCF6', clamp((t - 54.2) / 0.8)); g.fillRect(0, 0, W, H); }
}
const SCENES = [[0, 6.5, s1], [6.5, 10, s2], [10, 17, s3], [17, 22.5, s4], [22.5, 30, s5], [30, 37, s6], [37, 44, s7], [44, DUR, s8]];
export function draw(g, t) {
  g.save(); g.clearRect(0, 0, W, H);
  const sc = SCENES.find(([a, z]) => t >= a && t < z) || SCENES[SCENES.length - 1];
  sc[2](g, t);
  captions(g, t);
  wipe(g, t);
  g.restore();
}

// ---------------------------------------------------------------- audio: the Groove Back band + narration, rendered offline
const durs = {};
async function loadVO(ctx) {
  const out = {};
  for (const v of VO) { const buf = await (await fetch(`./vo/${v.f}.wav`)).arrayBuffer(); out[v.f] = await ctx.decodeAudioData(buf); durs[v.f] = out[v.f].duration; }
  return out;
}
export async function renderAudio() {
  const ctx = new OfflineAudioContext(2, 48000 * DUR, 48000);
  setAudioContext(ctx);
  const vo = await loadVO(ctx);
  const kindAt = (b) => (b < 9 ? 'verse' : b < 21 ? 'verse' : b < 30 ? 'chorus' : b < 54 ? 'verse' : b < 66 ? 'chorus' : 'chorus');
  const band = new Band(BPM, 'pop', (b) => ({ kind: kindAt(b), spotlight: false, firstBeatOfEight: b % 8 === 0, firstOfSection: b % 16 === 0, nextKind: kindAt(b + 8) }), 0);
  const G = band.bus, at = (beat) => MUSIC_T0 + beat * SPB, setG = (bus, v, time) => bus.gain.setTargetAtTime(v, time, 0.08);
  for (const k of ['drums', 'arp', 'lead', 'sparkle']) G[k].gain.setValueAtTime(0, 0);
  setG(G.drums, 1, MUSIC_T0); setG(G.arp, 1, MUSIC_T0); setG(G.lead, 0.7, MUSIC_T0);
  setG(G.lead, 1, 10); setG(G.sparkle, 0.7, 17); setG(G.sparkle, 1, 37);
  setG(G.drums, 0.45, 44); setG(G.lead, 0, 44); setG(G.sparkle, 0.4, 44); setG(G.drums, 1, 50.4); setG(G.lead, 1, 50.4);
  for (let step = 0; step <= (BEATS + 1) * 2; step++) band.play(step / 2, at(step / 2));
  // duck the band under the voice
  const out = band.out.gain; out.setValueAtTime(0.5, 0); out.setValueAtTime(0.8, MUSIC_T0 - 0.01);
  for (const v of VO) { const s = Math.max(MUSIC_T0, v.at - 0.12), e = v.at + durs[v.f] + 0.1; if (e < MUSIC_T0) continue; out.setTargetAtTime(0.34, s, 0.06); out.setTargetAtTime(0.8, e, 0.25); }
  // sound effects, all on the band's own instruments
  for (const tk of [0.5, 1.5, 2.5, 3.5]) band.click(tk, false);
  scratch(ctx, band.bus.fx, 3.9);
  band.boom(MUSIC_T0); band.crash(MUSIC_T0, 1); band.hey(MUSIC_T0 + 0.02);
  const chime = (time, notes, vol = 0.07) => notes.forEach((n, i) => band.bell(time + i * 0.06, 440 * Math.pow(2, (n - 69) / 12), vol, 'fx'));
  [6.6, 7.5, 7.82, 8.14, 10.1, 22.8, 30.6, 31.7, 32.6, 37.2, 44.45, 45.9, 47.4, 49.3, 51.6].forEach((x) => chime(x, [84], 0.05));
  chime(19.25, [76, 81, 88]); chime(19.95, [76, 81]); chime(20.65, [76]); chime(21.55, [76, 81, 88, 93]);
  for (let i = 0; i < 10; i++) chime(23.4 + i * 0.11, [72 + i * 2], 0.04); chime(24.55, [84, 88, 91, 96]);
  band.crash(33.6, 0.5); chime(34.1, [79, 84]);
  [38.6, 39.3, 40, 40.7, 41.4].forEach((x, i) => chime(x, [79 + i * 2], 0.05));
  band.boom(42.2); band.crash(42.2, 1); chime(42.2, [84, 88, 91, 96]);
  band.boom(50.45); band.crash(50.45, 1); band.hey(50.45);
  // narration on top
  for (const v of VO) { const src = ctx.createBufferSource(); src.buffer = vo[v.f]; const gn = ctx.createGain(); gn.gain.value = 1.05; src.connect(gn).connect(ctx.destination); src.start(v.at); }
  return ctx.startRendering();
}
function scratch(ctx, dest, t) { // a record scratch before the drop
  const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(260, t + 0.32);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  s.connect(bp).connect(g).connect(dest); s.start(t); s.stop(t + 0.4);
}

// ---------------------------------------------------------------- MP4 render (WebCodecs + mp4-muxer)
export async function renderMp4(onProgress = () => {}) {
  const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm');
  const audio = await renderAudio();
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory' });
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { throw e; } });
  venc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 10_000_000, framerate: FPS });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { throw e; } });
  aenc.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 });
  const L = audio.getChannelData(0), R = audio.getChannelData(1), CH = 4800;
  for (let i = 0; i < audio.length; i += CH) { const n = Math.min(CH, audio.length - i), data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n); const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data }); aenc.encode(ad); ad.close(); }
  await aenc.flush();
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const frames = Math.round(DUR * FPS);
  for (let i = 0; i < frames; i++) {
    draw(g, i / FPS);
    const vf = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
    if (venc.encodeQueueSize > 8) await new Promise((r) => venc.addEventListener('dequeue', r, { once: true }));
    if (i % 30 === 0) onProgress(i / frames);
  }
  await venc.flush(); muxer.finalize();
  window.__mp4 = new Uint8Array(muxer.target.buffer);
  return window.__mp4.length;
}
// hand the file to whoever is driving this page, in base64 slices
window.mp4Slice = (start, len) => { const u = window.__mp4.subarray(start, start + len); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };

// ---------------------------------------------------------------- boot: preview loop
async function boot() {
  await Promise.all([document.fonts.load(`800 100px "Bricolage Grotesque"`), document.fonts.load('700 40px Figtree'), document.fonts.load('800 40px Figtree')]);
  await Promise.all([['shoe', C.orange], ['calendar', C.teal], ['heart', C.lav], ['check', '#FFFFFF'], ['check', C.teal], ['moon', C.teal], ['sun', '#E6DAC3'], ['flame', C.orange], ['alert', '#D9513F']].map(([n, c]) => loadIcon(n, c)));
  const vo = new AudioContext(); await loadVO(vo); vo.close();
  window.draw = (t) => draw(document.getElementById('c').getContext('2d'), t);
  window.renderMp4 = renderMp4;
  window.ready = true;
  document.getElementById('msg').textContent = 'Preview (looping). Run renderMp4() in the console to export.';
  if (!new URLSearchParams(location.search).has('still')) { const t0 = performance.now(); (function loop(now) { window.draw(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); })(t0); }
}
boot();
