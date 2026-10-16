// The Routine Builder: turns the physio's plan into a song.
// Warm-up → exercise 1 → breathe → exercise 2 → breathe → … → cool-down.
// Each exercise block lasts exactly its prescribed reps (or seconds) at the plan's pace,
// so the music does the counting. Flair (the dance for the rest of the body) never changes the dose.
import { CORE, INJURIES, FLAIR_SETS, FLAIR_NAMES, POSES } from './content.js';
import { lerpPose, mergePose, eio, clamp } from './figure.js';

export function liteOf(id, seated) {
  let m = id, guard = 0;
  do { m = CORE[m].lite || 'breathe'; guard++; } while (seated && CORE[m].standing && guard < 6);
  return m;
}
function fitSeated(id, seated) {
  let m = id, guard = 0;
  while (seated && CORE[m].standing && guard < 6) { m = CORE[m].lite || 'breathe'; guard++; }
  return m;
}
// The key shapes of a move, for small looping previews (lists, next card, avatars).
export const movePoses = (m) => (m.seq ? m.seq.join(',') : `${m.a},${m.b}`);
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// opts: { rx, injury, plan: 'green'|'amber'|'red', intensity (0..rx.maxIntensity), track, scene, practice }
export function buildRoutine(opts) {
  const { rx } = opts;
  const seated = !rx.standing, red = opts.plan === 'red', amber = opts.plan === 'amber';
  const bpm = Math.round(rx.bpm * (amber ? 0.9 : red ? 0.85 : 1)), spb = 60 / bpm;
  const intensity = clamp(red ? 0 : Math.min(opts.intensity, rx.maxIntensity), 0, 3);
  const flairs = FLAIR_SETS[Math.round(intensity)];
  const blocks = [], exercises = [];
  let beat = 0;
  const push = (b) => { b.index = blocks.length; b.startBeat = beat; beat += b.beats; blocks.push(b); return b; };
  const flairFor = (i) => {
    const loop = flairs[i % flairs.length];
    const seq = loop.length === 4 ? loop : intensity <= 1 ? [loop[0], loop[1], loop[0], loop[1]] : [loop[0], loop[1], loop[1], loop[0]];
    return { flair: seq, flairName: FLAIR_NAMES[loop.join(',')] || 'Free arms' };
  };
  push({ kind: 'warm', core: 'breathe', beats: 8, label: 'Warm-up', ...flairFor(0), flair: ['floatIn', 'floatOut', 'floatOut', 'floatIn'], flairName: 'Arms float with the breath' });
  rx.exercises.forEach((ex, i) => {
    let move = fitSeated(ex.move, seated);
    if (amber) move = liteOf(move, seated);
    const m = CORE[move];
    const target = ex.secs ? Math.max(1, Math.round((ex.secs / spb) / m.cycle)) : ex.reps;
    const reps = opts.practice ? Math.min(target, 2) : target;
    const sets = opts.practice ? 1 : Math.max(1, ex.sets || 1);
    // red days: watch-and-imagine instead of the real move, with breathing in between
    const core = red && !m.rest ? 'imagine' : move;
    const ids = [];
    for (let s = 0; s < sets; s++) {
      if (i > 0 || s > 0) push({ kind: 'rest', core: 'breathe', beats: 8, label: s > 0 ? 'Rest between sets' : 'Breathe and reset', flair: null, flairName: 'Rest', ex: i, set: s });
      const b = push({ kind: i % 2 ? 'chorus' : 'verse', core, imagineOf: red ? move : null, reps, beats: reps * m.cycle, cycle: m.cycle, ex: i, set: s, sets, label: CORE[core].name, timed: !!ex.secs, ...(m.rest || red ? { flair: null, flairName: red ? 'Watch and imagine' : 'Rest' } : flairFor(i + s)) });
      ids.push(b.index);
    }
    exercises.push({ i, move, core, name: CORE[core === 'imagine' ? move : core].name, cue: CORE[move].cue, reps, sets, secs: ex.secs ? Math.round(reps * m.cycle * spb) : null, timed: !!ex.secs, block: ids[0], blocks: ids, beats: sets * reps * m.cycle, changed: move !== ex.move ? CORE[ex.move].name : null });
  });
  push({ kind: 'cool', core: 'breathe', beats: 8, label: 'Cool-down', flair: ['floatIn', 'floatOut', 'floatOut', 'floatIn'], flairName: 'Arms float with the breath' });
  const totalBeats = beat;
  return {
    title: rx.title, blocks, exercises, totalBeats, bpm, spb, secs: totalBeats * spb, seated, coreParts: (INJURIES[opts.injury] || INJURIES.knee).core,
    plan: opts.plan, intensity, track: opts.track, scene: opts.scene, practice: !!opts.practice,
  };
}

export function blockAt(song, b) {
  const bb = clamp(b, 0, song.totalBeats - 0.001);
  for (let i = song.blocks.length - 1; i >= 0; i--) if (bb >= song.blocks[i].startBeat) return song.blocks[i];
  return song.blocks[0];
}

// Core pose for a move at beat-in-block k. Returns {pose, phase, pulse}
export function corePose(moveId, k) {
  const m = CORE[moveId];
  const ph = ((k % m.cycle) + m.cycle) % m.cycle / m.cycle;
  if (m.hold) return { pose: POSES[m.b], phase: ph, pulse: 0 };
  if (m.seq) { // e.g. rest → right → rest → left: hold each shape briefly so it reads on the beat
    const q = ph * 4, i = Math.floor(q) % 4, f = q - Math.floor(q);
    return { pose: lerpPose(POSES[m.seq[i]], POSES[m.seq[(i + 1) % 4]], eio(clamp(f * 1.35))), phase: ph, pulse: 0 };
  }
  const t = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
  const pulse = m.invisible ? (ph < 0.5 ? Math.sin(ph * 2 * Math.PI) * 0.5 + 0.5 : 0) : 0;
  return { pose: lerpPose(POSES[m.a], POSES[m.b], eio(clamp(t))), phase: ph, pulse };
}
export function flairPose(seq, k) {
  if (!seq) return POSES.rest;
  const bt = k / 2, i = Math.floor(bt), p = bt - i;
  const a = POSES[seq[((i % 4) + 4) % 4]], b = POSES[seq[(((i + 1) % 4) + 4) % 4]];
  return lerpPose(a, b, eio(clamp(p * 1.6)));
}
// Full coach pose at song beat b, with Lite applied when asked.
export function songPose(song, b, lite) {
  const e = blockAt(song, Math.max(0, b));
  const k = Math.max(0, b) - e.startBeat;
  let core = e.core;
  if (lite && !CORE[core].rest && !CORE[core].imagine) core = liteOf(core, song.seated);
  const cp = corePose(core, k);
  if (CORE[core].rest || CORE[core].imagine) {
    const f = flairPose(['floatIn', 'floatOut', 'floatOut', 'floatIn'], k * 0.5);
    return { pose: CORE[core].imagine ? mergePose(POSES.rest, f, song.coreParts) : corePose('breathe', k).pose, core, block: e, k, pulse: 0, imagine: !!CORE[core].imagine };
  }
  const fp = flairPose(e.flair, k);
  return { pose: mergePose(cp.pose, fp, song.coreParts), core, block: e, k, pulse: cp.pulse, invisible: CORE[core].invisible };
}
// Reps finished in a block at beat b (the music counts them).
// Beats inside one rep where the shape is at its fullest. Those are the moments we judge.
export const peaksOf = (m) => (m.seq ? [0.25, 0.75] : [0.5]);
export function repsAt(block, b) { return block.reps ? clamp(Math.floor((b - block.startBeat) / block.cycle + 1e-6), 0, block.reps) : 0; }
