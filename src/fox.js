// The Groove Back fox: a cut-out rig built from the character sheet (fox-rig.js), drawn on canvas.
// Every limb is a group with a pivot, so the same joint angles that drove the old coach drive the fox:
// 0 = limb points down, 90 = screen right, 180 = up (see content.js POSES).
import { FOX } from './fox-rig.js';

const rad = (d) => (d * Math.PI) / 180;
const BASE = { FUR: '#FF8A3D', FUR_D: '#EE7128', PANTS: '#4A4478', PANTS_D: '#3B3664', BAND: '#C6B6FF', BAND_D: '#8B7CF6' };
export const FUR = ['#FF8A3D', '#F6A54A', '#D9652B', '#A9A3B5', '#9A6444', '#5E5468'];
export const FACES = Object.keys(FOX.faces);

function mix(hex, amt) { // amt < 0 darkens, > 0 lightens
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const ch = (v) => Math.round(v + (t - v) * p).toString(16).padStart(2, '0');
  return '#' + ch(n >> 16) + ch((n >> 8) & 255) + ch(n & 255);
}
const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Colour swaps: fur, trousers and headband follow the options; everything else keeps the sheet's colours.
function palette(o) {
  const fur = isHex(o.fur) ? o.fur : BASE.FUR, pants = isHex(o.pants) ? o.pants : BASE.PANTS, band = isHex(o.band) ? o.band : BASE.BAND;
  const map = { [BASE.FUR]: fur, [BASE.FUR_D]: mix(fur, -0.12), [BASE.PANTS]: pants, [BASE.PANTS_D]: mix(pants, -0.2) };
  return { key: fur + pants + band, c: (h) => (h && map[h.toUpperCase()]) || h, band, bandD: mix(band, -0.3) };
}

// Path2D cache, one per shape.
function pathOf(sh) {
  if (sh._p) return sh._p;
  const p = new Path2D(), g = sh.g;
  if (sh.k === 'p') p.addPath(new Path2D(sh.d));
  else if (sh.k === 'r') { if (p.roundRect) p.roundRect(g[0], g[1], g[2], g[3], g[4]); else p.rect(g[0], g[1], g[2], g[3]); }
  else if (sh.k === 'c') p.arc(g[0], g[1], g[2], 0, Math.PI * 2);
  else if (sh.k === 'e') p.ellipse(g[0], g[1], g[2], g[3], 0, 0, Math.PI * 2);
  return (sh._p = p);
}
const gradCache = new Map();
function paint(g, val, sh, pal) {
  if (!val || val === 'none') return null;
  const m = /url\(#(\w+)\)/.exec(val);
  if (!m) return pal.c(val);
  const key = m[1] + sh.bb.join() + pal.key;
  let gr = gradCache.get(key);
  if (!gr) { gr = g.createLinearGradient(0, sh.bb[1], 0, sh.bb[3]); for (const [o, c] of FOX.grads[m[1]]) gr.addColorStop(o, pal.c(c)); if (gradCache.size > 400) gradCache.clear(); gradCache.set(key, gr); }
  return gr;
}
const clipPaths = {};
const clipOf = (id) => clipPaths[id] || (clipPaths[id] = new Path2D(FOX.clips[id]));

function applyT(g, ops, rot) {
  for (const op of ops || []) {
    const [n, a, b, c] = op;
    if (n === 'translate') g.translate(a, b || 0);
    else if (n === 'scale') g.scale(a, b ?? a);
    else if (n === 'rotate') { const r = rot ?? a; if (b != null) { g.translate(b, c); g.rotate(rad(r)); g.translate(-b, -c); } else g.rotate(rad(r)); }
  }
}

// Which node ids belong to each body part (for core highlights and camera limb glows).
const PART = {
  legs: ['leg-upper-L', 'leg-upper-R', 'hips'], arms: ['arm-upper-L', 'arm-upper-R'], trunk: ['torso', 'hips'], head: ['head-group', 'neck'],
  lArm: ['arm-upper-L'], rArm: ['arm-upper-R'], lLeg: ['leg-upper-L'], rLeg: ['leg-upper-R'],
};

// Draw one node. mode: 'fill' (normal), 'line' (outline pass: stroke shapes fat), 'mono' (silhouette).
function drawNode(g, n, ctx, mode, line) {
  g.save();
  const id = n.id;
  if (n.t) applyT(g, n.t, id ? ctx.rot[id] : undefined);
  if (id && ctx.extra[id]) ctx.extra[id](g);
  if (id && ctx.marks[id] !== undefined) ctx.marks[id] = ctx.inv.multiply(g.getTransform()).transformPoint(new DOMPoint(0, 0));
  if (n.clip) { if (mode !== 'fill') { g.restore(); return; } g.clip(clipOf(n.clip)); }
  let ln = line;
  if (mode === 'line' && id && ctx.lineCol[id]) ln = ctx.lineCol[id];
  // swap face + ears for the current expression
  let kids = n.c;
  if (id === 'head') kids = kids.map((k) => (k.id === 'face' ? FOX.faces[ctx.face] || k : k));
  if (id === 'head-group') kids = kids.map((k) => (k.id === 'ear-left' ? FOX.ears[ctx.face][0] : k.id === 'ear-right' ? FOX.ears[ctx.face][1] : k));
  for (const k of kids) {
    if (k.c) { if (id === 'head' && k.id === 'face' && mode !== 'fill') continue; drawNode(g, k, ctx, mode, ln); continue; }
    const p = pathOf(k), filled = k.f && k.f !== 'none';
    if (mode === 'line') {
      if (!filled || !ln) continue;
      g.lineJoin = 'round'; g.strokeStyle = ln; g.lineWidth = ctx.lw; g.stroke(p); g.fillStyle = ln; g.fill(p);
    } else if (mode === 'mono') {
      if (filled && (k.o ?? 1) > 0.5) { g.fillStyle = ctx.mono; g.fill(p); }
    } else {
      const a0 = g.globalAlpha; if (k.o != null) g.globalAlpha = a0 * k.o;
      const f = paint(g, k.f, k, ctx.pal); if (f) { g.fillStyle = f; g.fill(p); }
      const st = paint(g, k.s, k, ctx.pal);
      if (st) { g.strokeStyle = st; g.lineWidth = k.w || 1; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); }
      g.globalAlpha = a0;
    }
  }
  if (id === 'head' && mode === 'fill') ctx.onHead && ctx.onHead(g);
  g.restore();
}

// Forward kinematics of one leg in hip space (for keeping the feet on the floor).
function footY(th, kn, squash) { return 20 + 60 * squash * Math.cos(rad(th)) + 62 * Math.cos(rad(th + kn)); }

// drawFox(g, x, y, s, pose, o): x/y is where the old coach's hip sat, so callers didn't need to change.
// o: face, fur, pants, band, outline, coreParts/showCore/coreColor, limbGlow, mono, seated, hat (drawn via o.drawHat), t
export function drawFox(g, x, y, s, pose, o = {}) {
  const seated = !!o.seated, squash = seated ? 0.42 : 1;
  const fs = s * 1.32; // fox units → old coach units
  const lTh = seated ? pose.lTh * 0.5 - 8 : pose.lTh, rTh = seated ? pose.rTh * 0.5 + 8 : pose.rTh;
  const fy = Math.max(footY(lTh, pose.lKn, squash), footY(rTh, pose.rKn, squash));
  const floor = y + 230 * s; // the old coach's sole line
  let hipY = floor - (fy + 18) * fs;
  if (pose.drop < 0) hipY += pose.drop * s * 0.9; // calf raises lift the whole fox
  if (seated) hipY = Math.min(hipY, y + 40 * s);
  const wag = o.t != null ? Math.sin(o.t * 3.2) * 7 : 0;
  const rot = {
    tail: -38 + pose.lean * 1.4 + wag,
    'leg-upper-L': -lTh, 'leg-lower-L': -pose.lKn, 'foot-L': lTh + pose.lKn,
    'leg-upper-R': -rTh, 'leg-lower-R': -pose.rKn, 'foot-R': rTh + pose.rKn,
    'upper-body': pose.lean,
    'arm-upper-L': -pose.lSh - pose.lean, 'arm-lower-L': -pose.lEl,
    'arm-upper-R': -pose.rSh - pose.lean, 'arm-lower-R': -pose.rEl,
    'head-group': pose.head * 0.8,
  };
  const extra = {};
  if (seated) { extra['leg-upper-L'] = extra['leg-upper-R'] = (gg) => gg.scale(1, squash); extra['leg-lower-L'] = extra['leg-lower-R'] = (gg) => gg.scale(1, 1 / squash); }
  const pal = palette(o);
  const marks = { 'hand-L': 0, 'hand-R': 0, 'leg-lower-L': 0, 'leg-lower-R': 0, 'foot-L': 0, 'foot-R': 0, 'arm-upper-L': 0, 'arm-upper-R': 0, 'arm-lower-L': 0, 'arm-lower-R': 0, 'leg-upper-L': 0, 'leg-upper-R': 0, 'head': 0, hips: 0, neck: 0 };
  g.save();
  const inv = g.getTransform().inverse();
  g.translate(x, hipY); g.scale(fs, fs);
  const ctx = { rot, extra, marks, inv, pal, face: FOX.faces[o.face] ? o.face : 'happy', lw: 8, lineCol: {}, mono: o.mono };
  // headband (+ the player's hat) ride on the head
  ctx.onHead = (gg) => {
    if (o.headband !== false) {
      gg.lineCap = 'round'; gg.strokeStyle = pal.band; gg.lineWidth = 9; gg.beginPath(); gg.moveTo(-47, -27); gg.quadraticCurveTo(0, -60, 47, -27); gg.stroke();
      gg.strokeStyle = pal.bandD; gg.globalAlpha *= 0.45; gg.lineWidth = 2; gg.stroke(); gg.globalAlpha /= 0.45;
    }
    if (o.hat && o.drawHat) o.drawHat(gg, o.hat);
  };
  if (o.mono) { drawNode(g, FOX.rig, ctx, 'mono'); g.restore(); return { marks }; }
  // 1. sticker outline (and coloured outlines for the core part / camera limb feedback)
  const core = o.showCore ? o.coreParts || [] : [];
  for (const part of core) for (const id of PART[part] || []) ctx.lineCol[id] = o.coreColor || 'rgba(63,193,143,0.95)';
  if (o.limbGlow) for (const k in o.limbGlow) for (const id of PART[k] || []) ctx.lineCol[id] = o.limbGlow[k];
  if (o.outline !== false) {
    g.save(); if (o.glow !== false && o.glowColor) { g.shadowColor = o.glowColor; g.shadowBlur = 30; }
    ctx.lw = 7; drawNode(g, FOX.rig, ctx, 'line', o.outline || 'rgba(255,250,244,0.96)');
    g.restore();
    if (core.length || o.limbGlow) { ctx.lw = 12; const keep = ctx.lineCol; drawNode(g, FOX.rig, ctx, 'line', null); ctx.lineCol = keep; }
  }
  // 2. the fox
  drawNode(g, FOX.rig, ctx, 'fill');
  g.restore();
  // marks are in the caller's space (before our translate/scale), so they match the old joint names
  const m = (k) => (marks[k] ? [marks[k].x, marks[k].y] : [x, y]);
  return { lW: m('hand-L'), rW: m('hand-R'), lK: m('leg-lower-L'), rK: m('leg-lower-R'), lF: m('foot-L'), rF: m('foot-R'), lS: m('arm-upper-L'), rS: m('arm-upper-R'), lE: m('arm-lower-L'), rE: m('arm-lower-R'), lH: m('leg-upper-L'), rH: m('leg-upper-R'), head: m('head'), hip: m('hips'), neck: m('neck') };
}
