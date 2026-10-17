// The coach: a front-facing, Just Dance-style dancer drawn on canvas.
// Tapered limbs, a shaped torso, shading and a glowing outline, so it reads as a character, not a stick figure.
import { POSES, LIMBS } from './content.js';
import { drawFox, FUR } from './fox.js';
export { FUR };

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

// The coach is the Groove Back fox (fox.js). drawFigure keeps its old signature so every caller still works:
// o.body = outfit colour (worn as the headband), o.skin = fur choice, o.pants = trouser colour, o.face = expression.
const SKIN_TO_FUR = { '#F7D9C0': FUR[0], '#EDBB93': FUR[1], '#D49D72': FUR[2], '#A9704A': FUR[3], '#7A4E31': FUR[4], '#563524': FUR[5] };
export function drawFigure(g, x, y, s, pose, o = {}) {
  const coreCol = o.coreColor || '#3FC18F';
  const seated = o.seated ? 1 : 0;
  g.save(); g.globalAlpha *= o.alpha ?? 1;
  if (seated && !o.mono) { // a chair, so seated routines read as seated
    const hipY = y + 40 * s;
    const cg = g.createLinearGradient(0, hipY - 160 * s, 0, hipY + 190 * s);
    cg.addColorStop(0, o.chair || 'rgba(176,120,66,0.55)'); cg.addColorStop(1, o.chair || 'rgba(150,98,50,0.45)');
    g.fillStyle = cg;
    g.beginPath(); g.roundRect(x - 110 * s, hipY + 10 * s, 220 * s, 28 * s, 12 * s); g.fill();
    g.beginPath(); g.roundRect(x - 110 * s, hipY - 150 * s, 22 * s, 340 * s, 11 * s); g.fill();
    g.beginPath(); g.roundRect(x + 88 * s, hipY - 150 * s, 22 * s, 340 * s, 11 * s); g.fill();
  }
  const fur = FUR.includes(o.skin) ? o.skin : SKIN_TO_FUR[(o.skin || '').toUpperCase()] || o.fur;
  const J = drawFox(g, x, y, s, pose, {
    face: o.face, fur, pants: o.pants, band: o.body && o.body.startsWith('#') ? o.body : undefined, seated: !!seated,
    mono: o.mono, outline: o.mono ? false : (o.outline || undefined), glow: o.glow, glowColor: o.glowColor,
    showCore: o.showCore, coreParts: o.coreParts, coreColor: coreCol, limbGlow: o.limbGlow, t: o.t ?? performance.now() / 1000,
    hat: o.hat, drawHat,
  });
  if (o.mono) { g.restore(); return J; }
  // glow trail behind the hands (cosmetic), painted underneath the fox
  if (o.trail) {
    const tc = TRAILS[o.trail] || '#ffc857';
    g.save(); g.globalCompositeOperation = 'destination-over';
    for (const p of [J.lW, J.rW]) { const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 70 * s); gr.addColorStop(0, hexA(tc, 0.55)); gr.addColorStop(1, hexA(tc, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], 70 * s, 0, 7); g.fill(); }
    g.restore();
  }
  // squeeze pulse for moves the eye can't see
  if (o.pulse) {
    const pts = o.pulse === 'thigh' ? [[J.lH, J.lK], [J.rH, J.rK]] : o.pulse === 'hips' ? [[J.lH, J.rH]] : [[J.neck, J.head]];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [a, b] of pts) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const r = 46 * s * (0.8 + 0.4 * o.pulseAmt); const gr = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], r); gr.addColorStop(0, hexA(coreCol, 0.75 * o.pulseAmt)); gr.addColorStop(1, hexA(coreCol, 0)); g.fillStyle = gr; g.beginPath(); g.arc(m[0], m[1], r, 0, 7); g.fill(); }
    g.restore();
  }
  if (o.sparkle) for (let i = 0; i < 10; i++) { const a = i * 2.4 + o.sparkle; const rr = (60 + (i * 37) % 70) * s; g.fillStyle = hexA('#ffffff', 0.5 + 0.5 * Math.sin(o.sparkle * 3 + i)); g.beginPath(); g.arc(J.neck[0] + Math.cos(a) * rr * 0.6, J.neck[1] + 60 * s + Math.sin(a) * rr, 2.4 * s + 1, 0, 7); g.fill(); }
  g.restore();
  return J;
}

// Cosmetics. Kept here so every figure (coach, minis, previews) draws them the same way.
const TRAILS = { sun: '#ffc857', mint: '#7fe8b8', lilac: '#b9a6ff', pink: '#ff7eb6' };
function drawHat(g, kind) {
  g.save(); g.translate(0, -14); g.scale(1.05, 1.05);
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
  drawFigure(g, w / 2, h * 0.5, h / 640, lerpPose(a, b, eio(clamp(p * 1.4))), { body: color, pants: canvas.dataset.pants || undefined, face: canvas.dataset.face || 'happy', t, glove: canvas.dataset.glove || '#FF8C52', skin: canvas.dataset.skin, glow: false, hat: canvas.dataset.hat, trail: canvas.dataset.trail });
}
