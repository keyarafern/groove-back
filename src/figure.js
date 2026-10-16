// The coach: a front-facing, Just Dance-style dancer drawn on canvas.
// Tapered limbs, a shaped torso, shading and a glowing outline, so it reads as a character, not a stick figure.
import { POSES, LIMBS } from './content.js';

const KEYS = Object.keys(POSES.rest);
const rad = (d) => (d * Math.PI) / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function lerpPose(a, b, t) { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], t); return o; }
export function mergePose(corePose, flairPose, coreParts) {
  const o = { ...flairPose };
  for (const part of coreParts) for (const k of LIMBS[part]) o[k] = corePose[k];
  return o;
}
export function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
// Lighten (amt > 0) or darken (amt < 0) a hex colour.
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const ch = (v) => Math.round(v + (t - v) * p);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

// A limb segment: two circles joined by their outer tangents, so limbs taper from joint to joint.
function capsule(g, a, b, r1, r2) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 0.001;
  const ang = Math.atan2(dy, dx), off = Math.acos(clamp((r1 - r2) / d, -1, 1));
  g.moveTo(a[0] + Math.cos(ang + off) * r1, a[1] + Math.sin(ang + off) * r1);
  g.arc(a[0], a[1], r1, ang + off, ang - off + Math.PI * 2);
  g.arc(b[0], b[1], r2, ang - off, ang + off);
  g.closePath();
}
// Smooth closed outline through points (quadratic curves between midpoints).
function blob(g, pts) {
  const n = pts.length, mid = (i) => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
  const m0 = mid(n - 1); g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(i); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  g.closePath();
}

// Returns joint positions too, so the HUD can point at limbs.
export function drawFigure(g, x, y, s, pose, o = {}) {
  // light UI: a soft ink outline reads like illustration linework; skin is separate from the outfit
  const body = o.body || '#359FA0', out = o.outline || 'rgba(34,50,58,0.92)', glove = o.glove || '#FF8C52';
  const skin = o.skin || '#EDBB93', hair = o.hair || '#2E2220';
  const coreCol = o.coreColor || '#3FC18F';
  const core = o.coreParts || [];
  const seated = o.seated ? 1 : 0;
  const v = (a, l) => [Math.sin(rad(a)) * l * s, Math.cos(rad(a)) * l * s];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const hip = [x, y + pose.drop * s + seated * 60 * s];
  const tA = 180 - pose.lean, td = v(tA, 1);
  const up = [td[0] / s, td[1] / s], perp = [-td[1] / s, td[0] / s];
  const neck = add(hip, v(tA, 150));
  const T = (u, w) => [hip[0] + up[0] * u * s + perp[0] * w * s, hip[1] + up[1] * u * s + perp[1] * w * s]; // torso-local point
  const sh = (k) => [neck[0] + perp[0] * 50 * s * k, neck[1] + perp[1] * 50 * s * k];
  const hp = (k) => [hip[0] + perp[0] * 30 * s * k, hip[1] + perp[1] * 30 * s * k];
  const rS = sh(1), lS = sh(-1), rH = hp(1), lH = hp(-1);
  const lE = add(lS, v(pose.lSh, 92)), lW = add(lE, v(pose.lSh + pose.lEl, 88));
  const rE = add(rS, v(pose.rSh, 92)), rW = add(rE, v(pose.rSh + pose.rEl, 88));
  const thighL = 112 * (1 - seated * 0.6);
  const lTh = seated ? pose.lTh * 0.4 - 12 : pose.lTh, rTh = seated ? pose.rTh * 0.4 + 12 : pose.rTh;
  const lK = add(lH, v(lTh, thighL)), rK = add(rH, v(rTh, thighL));
  const lF = add(lK, v(lTh + pose.lKn, 112)), rF = add(rK, v(rTh + pose.rKn, 112));
  const head = add(neck, v(tA + pose.head * 0.7, 58));
  g.save(); g.globalAlpha *= o.alpha ?? 1;
  if (seated && !o.mono) {
    const cg = g.createLinearGradient(0, hip[1] - 160 * s, 0, hip[1] + 170 * s);
    cg.addColorStop(0, o.chair || 'rgba(176,120,66,0.55)'); cg.addColorStop(1, o.chair || 'rgba(150,98,50,0.45)');
    g.fillStyle = cg;
    g.beginPath(); g.roundRect(hip[0] - 100 * s, hip[1] - 6 * s, 200 * s, 28 * s, 12 * s); g.fill();
    g.beginPath(); g.roundRect(hip[0] - 100 * s, hip[1] - 160 * s, 22 * s, 330 * s, 11 * s); g.fill();
    g.beginPath(); g.roundRect(hip[0] + 78 * s, hip[1] - 160 * s, 22 * s, 330 * s, 11 * s); g.fill();
  }
  const isCore = (part) => core.includes(part) && o.showCore;
  const pants = shade(body, -0.32);
  const legC = isCore('legs') ? coreCol : pants;
  const armC = isCore('arms') ? coreCol : body;
  const trunkC = isCore('trunk') ? coreCol : body;
  // shapes in paint order: legs, torso, arms (arms sit in front of the body)
  const shapes = [
    { t: 'cap', a: lH, b: lK, r1: 23, r2: 16, c: legC, side: 'lLeg' }, { t: 'cap', a: lK, b: lF, r1: 16, r2: 11, c: legC, side: 'lLeg' },
    { t: 'cap', a: rH, b: rK, r1: 23, r2: 16, c: legC, side: 'rLeg' }, { t: 'cap', a: rK, b: rF, r1: 16, r2: 11, c: legC, side: 'rLeg' },
    { t: 'cap', a: T(140, 0), b: neck, r1: 14, r2: 13, c: isCore('head') ? coreCol : skin, side: '' },
    { t: 'torso', c: trunkC, side: '' },
    { t: 'cap', a: lS, b: lE, r1: 16, r2: 12, c: armC, side: 'lArm' }, { t: 'cap', a: lE, b: lW, r1: 12, r2: 9.5, c: armC, side: 'lArm' },
    { t: 'cap', a: rS, b: rE, r1: 16, r2: 12, c: armC, side: 'rArm' }, { t: 'cap', a: rE, b: rW, r1: 12, r2: 9.5, c: armC, side: 'rArm' },
  ];
  const torsoPts = (k) => [T(150 + k, -60 - k), T(150 + k, 60 + k), T(96, 44 + k), T(54, 34 + k), T(8, 44 + k), T(-18 - k, 40 + k), T(-18 - k, -40 - k), T(8, -44 - k), T(54, -34 - k), T(96, -44 - k)];
  const path = (sh, k) => { // k = inflate (px at scale 1), for the outline pass
    g.beginPath();
    if (sh.t === 'cap') capsule(g, sh.a, sh.b, (sh.r1 + k) * s, (sh.r2 + k) * s);
    else blob(g, torsoPts(k));
  };
  // glow trail behind the hands (cosmetic)
  if (o.trail && !o.mono) {
    const tc = TRAILS[o.trail] || '#ffc857';
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of [lW, rW]) { const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 70 * s); gr.addColorStop(0, hexA(tc, 0.55)); gr.addColorStop(1, hexA(tc, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], 70 * s, 0, 7); g.fill(); }
    g.restore();
  }
  if (o.mono) {
    g.fillStyle = o.mono;
    for (const sh of shapes) { path(sh, 0); g.fill(); }
    g.beginPath(); g.arc(head[0], head[1], 38 * s, 0, 7); g.fill();
    g.restore();
    return { lW, rW, lK, rK, lF, rF, lS, rS, lE, rE, lH, rH, head, hip, neck };
  }
  // 1. outline + glow: every shape inflated, in the outline colour (or the per-limb match colour)
  g.save();
  if (o.glow !== false) { g.shadowColor = o.glowColor || hexA(body.startsWith('#') ? body : '#ffffff', 0.35); g.shadowBlur = 36 * s; }
  for (const sh of shapes) {
    const lg = o.limbGlow && o.limbGlow[sh.side];
    path(sh, lg ? 9 : 6); g.fillStyle = lg || (sh.c === coreCol ? hexA(coreCol, 0.95) : out); g.fill();
  }
  g.beginPath(); g.arc(head[0], head[1], 44 * s, 0, 7); g.fillStyle = isCore('head') ? coreCol : out; g.fill();
  for (const [p, r] of [[lF, 22], [rF, 22]]) { g.beginPath(); g.ellipse(p[0], p[1] + 4 * s, r * s, 14 * s, 0, 0, 7); g.fill(); }
  g.restore();
  // 2. shaded fill: light from the top-left
  const grads = {};
  const fillOf = (c) => {
    if (grads[c]) return grads[c];
    const gr = g.createLinearGradient(hip[0] - 160 * s, neck[1] - 120 * s, hip[0] + 160 * s, hip[1] + 220 * s);
    const hex = c.startsWith('#') ? c : null;
    gr.addColorStop(0, hex ? shade(hex, 0.28) : c); gr.addColorStop(0.5, c); gr.addColorStop(1, hex ? shade(hex, -0.22) : c);
    return (grads[c] = gr);
  };
  for (const sh of shapes) { path(sh, 0); g.fillStyle = fillOf(sh.c); g.fill(); }
  // shirt hem + collar give the body an outfit, not just a fill
  g.save(); path(shapes[5], 0); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); blob(g, [T(10, -50), T(10, 50), T(-30, 50), T(-30, -50)]); g.fill();
  if (!isCore('trunk')) { // a chevron print across the chest, in the glove colour, so the top reads as clothing
    g.fillStyle = glove; g.globalAlpha *= 0.9; g.beginPath();
    const p1 = T(118, -64), p2 = T(92, 0), p3 = T(118, 64), p4 = T(98, 64), p5 = T(72, 0), p6 = T(98, -64);
    g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.lineTo(p5[0], p5[1]); g.lineTo(p6[0], p6[1]); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4 * s; g.beginPath(); const c1 = T(150, -18), c2 = T(132, 0), c3 = T(150, 18); g.moveTo(c1[0], c1[1]); g.quadraticCurveTo(c2[0], c2[1], c3[0], c3[1]); g.stroke();
  g.restore();
  // 3. gloss: a soft highlight running down each limb, toward the light
  g.save(); g.lineCap = 'round';
  for (const sh of shapes) {
    if (sh.t !== 'cap') continue;
    const dx = sh.b[0] - sh.a[0], dy = sh.b[1] - sh.a[1], d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d; if (nx + ny > 0) { nx = -nx; ny = -ny; }
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = Math.max(1, 4 * s);
    g.beginPath(); g.moveTo(sh.a[0] + nx * sh.r1 * 0.5 * s, sh.a[1] + ny * sh.r1 * 0.5 * s); g.lineTo(sh.b[0] + nx * sh.r2 * 0.5 * s, sh.b[1] + ny * sh.r2 * 0.5 * s); g.stroke();
  }
  g.restore();
  // feet: sneakers pointing along the shin
  for (const [k, f, side] of [[lK, lF, -1], [rK, rF, 1]]) {
    g.save(); g.translate(f[0], f[1] + 4 * s); g.rotate(Math.atan2(f[1] - k[1], f[0] - k[0]) - Math.PI / 2);
    g.beginPath(); g.ellipse(side * 4 * s, 0, 18 * s, 11 * s, 0, 0, 7); g.fillStyle = '#fff8f2'; g.fill();
    g.beginPath(); g.ellipse(side * 4 * s, 6 * s, 18 * s, 5 * s, 0, 0, Math.PI); g.fillStyle = glove; g.fill();
    g.restore();
  }
  // head: skin-tone-free, in the outfit colour, with hair and a friendly face
  g.save(); g.translate(head[0], head[1]); g.rotate(-rad(tA - 180 + pose.head * 0.3)); g.scale(s, s);
  const hg = g.createRadialGradient(-12, -14, 4, 0, 0, 40); hg.addColorStop(0, shade(skin, 0.25)); hg.addColorStop(1, skin);
  g.beginPath(); g.arc(0, 0, 38, 0, 7); g.fillStyle = isCore('head') ? coreCol : hg; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, 38, 0, 7); g.clip();
  g.fillStyle = hair;
  g.beginPath(); g.moveTo(-40, -2); g.bezierCurveTo(-38, -46, 38, -50, 40, -6); g.bezierCurveTo(22, -20, 0, -14, -10, -24); g.bezierCurveTo(-18, -12, -30, -8, -40, -2); g.fill();
  g.restore();
  g.fillStyle = 'rgba(24,14,40,0.8)'; g.beginPath(); g.ellipse(-13, 4, 3.6, 4.8, 0, 0, 7); g.ellipse(13, 4, 3.6, 4.8, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(24,14,40,0.75)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(0, 12, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,120,150,0.28)'; g.beginPath(); g.arc(-22, 14, 6, 0, 7); g.arc(22, 14, 6, 0, 7); g.fill();
  g.restore();
  // squeeze pulse for moves the eye can't see
  if (o.pulse) {
    const pts = o.pulse === 'thigh' ? [[lH, lK], [rH, rK]] : o.pulse === 'hips' ? [[lH, rH]] : [[neck, head]];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [a, b] of pts) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const r = 46 * s * (0.8 + 0.4 * o.pulseAmt); const gr = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], r); gr.addColorStop(0, hexA(coreCol, 0.75 * o.pulseAmt)); gr.addColorStop(1, hexA(coreCol, 0)); g.fillStyle = gr; g.beginPath(); g.arc(m[0], m[1], r, 0, 7); g.fill(); }
    g.restore();
  }
  // hands: the signature glove on the right, a plain hand on the left
  const glv = g.createRadialGradient(rW[0] - 6 * s, rW[1] - 6 * s, 2 * s, rW[0], rW[1], 20 * s); glv.addColorStop(0, '#fffbe8'); glv.addColorStop(0.35, glove); glv.addColorStop(1, glove);
  g.save(); g.shadowColor = hexA(glove.startsWith('#') ? glove : '#ffc857', 0.9); g.shadowBlur = 24 * s;
  g.beginPath(); g.arc(rW[0], rW[1], 18 * s, 0, 7); g.fillStyle = glv; g.fill(); g.restore();
  g.beginPath(); g.arc(lW[0], lW[1], 12 * s, 0, 7); g.fillStyle = skin; g.fill();
  if (o.hat) drawHat(g, head, tA, s, o.hat);
  if (o.sparkle) for (let i = 0; i < 10; i++) { const a = i * 2.4 + o.sparkle; const rr = (60 + (i * 37) % 70) * s; g.fillStyle = hexA('#ffffff', 0.5 + 0.5 * Math.sin(o.sparkle * 3 + i)); g.beginPath(); g.arc(neck[0] + Math.cos(a) * rr * 0.6, neck[1] + 60 * s + Math.sin(a) * rr, 2.4 * s + 1, 0, 7); g.fill(); }
  g.restore();
  return { lW, rW, lK, rK, lF, rF, lS, rS, lE, rE, lH, rH, head, hip, neck };
}

// Cosmetics. Kept here so every figure (coach, minis, previews) draws them the same way.
const TRAILS = { sun: '#ffc857', mint: '#7fe8b8', lilac: '#b9a6ff', pink: '#ff7eb6' };
function drawHat(g, head, tA, s, kind) {
  g.save(); g.translate(head[0], head[1]); g.rotate(-rad(tA - 180)); g.scale(s * 1.25, s * 1.25);
  const fill = (c) => { g.fillStyle = c; g.fill(); };
  g.beginPath();
  if (kind === 'cap') { g.ellipse(0, -30, 44, 22, 0, Math.PI, 0); g.closePath(); fill('#ff7a7a'); g.beginPath(); g.ellipse(30, -30, 30, 7, 0, 0, 7); fill('#ff7a7a'); }
  else if (kind === 'beanie') { g.ellipse(0, -26, 42, 30, 0, Math.PI, 0); g.closePath(); fill('#7cc8ff'); g.beginPath(); g.arc(0, -58, 10, 0, 7); fill('#fbf1ea'); }
  else if (kind === 'crown') { g.moveTo(-32, -30); g.lineTo(-36, -70); g.lineTo(-16, -50); g.lineTo(0, -78); g.lineTo(16, -50); g.lineTo(36, -70); g.lineTo(32, -30); g.closePath(); fill('#ffc857'); }
  else if (kind === 'headphones') { g.lineWidth = 9; g.strokeStyle = '#2a1d40'; g.arc(0, -6, 46, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.beginPath(); g.roundRect(-56, -14, 18, 30, 8); g.roundRect(38, -14, 18, 30, 8); fill('#ff7eb6'); }
  else if (kind === 'flower') { for (let i = 0; i < 5; i++) { const a = i * 1.256; g.beginPath(); g.arc(26 + Math.cos(a) * 12, -38 + Math.sin(a) * 12, 9, 0, 7); fill('#ff7eb6'); } g.beginPath(); g.arc(26, -38, 7, 0, 7); fill('#ffc857'); }
  else if (kind === 'party') { g.moveTo(-22, -32); g.lineTo(0, -98); g.lineTo(22, -32); g.closePath(); fill('#b9a6ff'); g.beginPath(); g.arc(0, -100, 9, 0, 7); fill('#ffc857'); }
  else if (kind === 'halo') { g.lineWidth = 7; g.strokeStyle = 'rgba(255,200,87,0.9)'; g.ellipse(0, -66, 36, 10, 0, 0, 7); g.stroke(); }
  else if (kind === 'bandana') { g.ellipse(0, -22, 42, 16, 0, Math.PI, 0); g.closePath(); fill('#7fe8b8'); g.beginPath(); g.moveTo(38, -24); g.lineTo(62, -10); g.lineTo(56, -30); g.closePath(); fill('#7fe8b8'); }
  g.restore();
}

// Move card on the track: a glassy tile with a silhouette, gold for Spotlight Moves.
export function drawPicto(g, x, y, sz, pose, { gold = false, alpha = 1, seated = false, label = '', now = false, color = '#ffb38a' } = {}) {
  g.save(); g.globalAlpha *= alpha;
  const r = sz * 0.24, x0 = x - sz / 2, y0 = y - sz / 2;
  if (now || gold) { g.shadowColor = gold ? 'rgba(255,200,87,0.8)' : hexA(color, 0.7); g.shadowBlur = sz * 0.35; }
  const bg = g.createLinearGradient(x0, y0, x0, y0 + sz);
  if (gold) { bg.addColorStop(0, 'rgba(255,214,120,0.42)'); bg.addColorStop(1, 'rgba(255,160,60,0.18)'); }
  else if (now) { bg.addColorStop(0, hexA(color, 0.36)); bg.addColorStop(1, hexA(color, 0.12)); }
  else { bg.addColorStop(0, 'rgba(255,255,255,0.9)'); bg.addColorStop(1, 'rgba(255,240,197,0.6)'); }
  g.beginPath(); g.roundRect(x0, y0, sz, sz, r); g.fillStyle = bg; g.fill();
  g.shadowBlur = 0;
  g.lineWidth = now || gold ? 3 : 1.5; g.strokeStyle = gold ? '#ffd27a' : now ? color : 'rgba(255,250,246,0.22)'; g.stroke();
  // top sheen
  g.save(); g.beginPath(); g.roundRect(x0, y0, sz, sz, r); g.clip();
  const sheen = g.createLinearGradient(0, y0, 0, y0 + sz * 0.5); sheen.addColorStop(0, 'rgba(255,255,255,0.16)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sheen; g.fillRect(x0, y0, sz, sz * 0.5); g.restore();
  drawFigure(g, x, y - sz * 0.04, sz / 560, pose, { mono: gold ? '#E8692B' : '#2B3F45', seated });
  if (label) { g.fillStyle = '#4C5A60'; g.font = `700 ${Math.round(sz * 0.12)}px Figtree, system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(label, x, y + sz / 2 + sz * 0.17); }
  g.restore();
}

// Small looping avatar for feeds, cards and league rows.
export function drawMiniAvatar(canvas, color, t, poses = ['out', 'clapTop', 'swayL', 'swayR'], beat = 0.6) {
  const g = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  const bt = t / beat, i = Math.floor(bt), p = bt - i;
  const a = POSES[poses[i % poses.length]] || POSES.rest, b = POSES[poses[(i + 1) % poses.length]] || POSES.rest;
  drawFigure(g, w / 2, h * 0.5, h / 640, lerpPose(a, b, eio(clamp(p * 1.4))), { body: color, glove: canvas.dataset.glove || '#FF8C52', skin: canvas.dataset.skin, glow: false, hat: canvas.dataset.hat, trail: canvas.dataset.trail });
}
