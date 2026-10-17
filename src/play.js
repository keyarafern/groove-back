// The session: the physio's routine, danced to the Groove Back band.
// Big demonstration in the middle, the move list on the left, reps + what's next on the right.
// Nothing here scores accuracy. The music counts reps; the camera (optional) only gives gentle tips.
import { Band, SongPlayer, unlockAudio, sfx } from './audio.js';
import { drawFigure, drawPicto, hexA, clamp } from './figure.js';
import { songPose, blockAt, corePose, repsAt, fmtTime, peaksOf, movePoses } from './song.js';
import { drawScene, DARK_SCENES } from './scene.js';
import { CORE, GENRES } from './content.js';
import { tracker, matchPose, drawSkeleton, trackedPose, scoreFrame, resetBaseline } from './tracker.js';
import { $, $$, esc, icon } from './ui.js';

const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-motion');
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// Camera tips. They never ask for more range than the coach shows; "too far" is met with "smaller is fine".
const CUES = {
  arms: { under: 'Lift your arms a little higher', over: 'Bring your arms down a touch', shape: 'Copy the coach’s elbows' },
  legs: { under: 'Lift your leg a little higher', over: 'A bit smaller with your legs', shape: 'Copy the coach’s knees' },
};
const PUSH = ['Only as far as feels comfortable.', 'Small and steady still counts.', 'Take a breath, then match the shape.'];
const PRAISE = ['Lovely control.', 'Nice and steady.', 'That’s it.'];
// Just Dance-style judgements for each rep (camera only). Kind wording: the lowest is "try again", never "miss".
const JUDGE = [
  { min: 0.76, word: 'PERFECT', col: '#E8692B', sub: ['Beautiful!', 'Spot on!', 'Lovely control!'], stars: 3 },
  { min: 0.6, word: 'GREAT', col: '#2E8F90', sub: ['Nice shape!', 'Smooth!', 'Keep it up!'], stars: 2 },
  { min: 0.42, word: 'GOOD', col: '#5B8DD6', sub: ['Getting there', 'Nice try', 'Good rhythm'], stars: 1 },
  { min: -1, word: 'TRY AGAIN', col: '#7A6BD0', sub: ['Match the coach’s shape', 'Smaller is fine', 'Watch, then copy'], stars: 0 },
];

export function playSong(root, { song, player, outfit, wear = {}, track, camera = false, lite = false, mini, onDone }) {
  const dark = DARK_SCENES.includes(song.scene);
  const exs = song.exercises;
  const target = (e) => `${e.sets > 1 ? `${e.sets} × ` : ''}${e.timed ? `${e.secs} sec` : `${e.reps} ${CORE[e.move].hold ? 'holds' : 'reps'}`}`;
  root.innerHTML = `
  <section class="play ${dark ? 'dark' : ''}" aria-label="Session: ${esc(song.title)}">
    <header class="p-top">
      <button class="p-exit" id="bExit">${icon.back}<span>Exit session</span></button>
      <div class="p-bar" aria-hidden="true"><i id="pBar"></i></div>
      <span class="p-time" id="pTime">0:00 / ${fmtTime(song.secs)}</span>
    </header>
    <aside class="p-moves card">
      <h2>${esc(song.title)}</h2><p class="small" id="pMoveOf">Warm-up</p>
      <ol id="pList">${exs.map((e, i) => `<li data-i="${i}">${mini(outfit.color, { size: 46, poses: `${movePoses(CORE[e.move])}`, beat: song.spb * CORE[e.move].cycle / 2, skin: player.skin, glove: outfit.glove })}<div><b>${esc(e.name)}</b><small>${target(e)}${e.changed ? ` · Lite of ${esc(e.changed)}` : ''}</small></div><span class="n">${i + 1}</span></li>`).join('')}</ol>
      ${song.practice ? '<p class="p-note">Practice run · 2 reps each · no points</p>' : song.plan !== 'green' ? `<p class="p-note">${song.plan === 'amber' ? 'Lite routine today, a little slower' : 'Gentle Groove: watch, breathe and imagine'}</p>` : ''}
    </aside>
    <div class="p-stage">
      <canvas id="stage" aria-label="Coach demonstration"></canvas>
      <div class="p-cue" id="cue" hidden role="status" aria-live="polite"><b></b><small></small></div>
      ${camera ? '<canvas class="cammini" id="camMini" width="320" height="240" aria-label="Your camera"></canvas><div class="lost" id="lost" hidden></div>' : ''}
      <div class="p-controls">
        <button class="pc" id="bPrev" aria-label="Restart this move" title="Restart this move (←)">${icon.prev}</button>
        <button class="pc big" id="bPause" aria-label="Pause" title="Pause (Space)">${icon.pause}</button>
        <button class="pc" id="bNext" aria-label="Skip to the next move" title="Skip to the next move (→)">${icon.next}</button>
      </div>
    </div>
    <aside class="p-side">
      <div class="p-track card"><span class="cover" style="--a:${track.cover[0]};--b:${track.cover[1]}">${icon.music}</span><div><b>${esc(track.title)}</b><small>${esc(track.artist || GENRES[track.world])} · ${Math.round(song.bpm)} BPM</small></div><div class="beatdots" id="hBeat" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
      <div class="p-now card">
        <div class="ring" id="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="trk"/><circle cx="60" cy="60" r="52" class="arc" id="ringArc"/></svg>
          <div class="ring-in" aria-live="off"><b><span id="rN">0</span><i id="rT"></i></b><small id="rU">get ready</small></div></div>
        <h3 id="mName">Warm-up</h3><p id="mCue">In for 4, out for 4</p>
        <p class="p-flair" id="mFlair"></p>
        <div class="p-safe"><button class="chipbtn" id="bLite" aria-pressed="${!!lite}" title="Lite (L)">${icon.leaf} Lite</button><button class="chipbtn hurt" id="bHurt" title="That hurt (H)">${icon.alert} That hurt</button></div>
      </div>
      <div class="p-next card" id="pNext"></div>
    </aside>
    <div class="pover" id="pover" hidden></div>
    <div class="countdown" id="cd" aria-live="assertive">
      <div class="cd-intro"><p class="eyebrow">${esc(track.title)} · ${esc(track.artist || GENRES[track.world])}</p><h2>${esc(song.title)}</h2>
        <p class="cd-meta">${exs.length} moves · about ${Math.max(1, Math.round(song.secs / 60))} min${song.practice ? ' · practice' : ''}</p>
        <p class="cd-tip">${song.seated ? 'Sit tall in a sturdy chair. Mirror the coach.' : 'Clear a little space around you. Mirror the coach.'}</p></div>
      <div class="cd-num" id="cdNum"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="trk"/><circle cx="60" cy="60" r="54" class="arc" id="cdArc"/></svg><b id="cdTxt"></b></div>
    </div>
  </section>`;

  const cv = $('#stage', root), g = cv.getContext('2d');
  let W = 0, H = 0;
  const LAY = {};
  function layout() {
    const dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    LAY.sz = clamp(H * 0.12, 50, 88); LAY.trackY = H - 104 - LAY.sz / 2; LAY.s = Math.min((LAY.trackY - LAY.sz * 0.8) / 640, W / 600); LAY.cx = W / 2; LAY.cy = LAY.trackY - LAY.sz * 0.8 - 250 * LAY.s; LAY.floor = LAY.cy + 236 * LAY.s;
  }
  const ro = new ResizeObserver(layout); ro.observe(cv); layout();

  // ---------------------------------------------------------------- move cards (one per rep peak)
  const events = [];
  for (const blk of song.blocks) {
    if (!blk.reps || blk.kind === 'rest' || blk.kind === 'warm' || blk.kind === 'cool') continue;
    const m = CORE[blk.core];
    for (let k = 0; k < blk.reps; k++) for (const pk of m.hold ? [0.5] : peaksOf(m)) events.push({ beat: blk.startBeat + (k + pk) * blk.cycle, blk, rep: k, gold: k === blk.reps - 1, judge: !(m.invisible || m.rest || m.imagine), best: -1, seen: 0, res: null });
  }
  let evI = 0;

  // ---------------------------------------------------------------- state
  const st = { lite: !!lite, liteUsed: !!lite, paused: false, ended: false, started: false, hurt: 0, played: 0, lastT: 0, fb: null, particles: [], cur: -1, lastReps: -1, said: {}, groove: 1, exPlayed: {}, combo: 0, maxCombo: 0, tally: [0, 0, 0, 0], jfb: null, hintT: 0, viewT: 0,
    live: { form: 0.5, worst: null, diffs: null, glow: {}, kind: 'none', since: 0, cueAt: 0, cueKind: '' } };
  const makeBand = () => new Band(song.bpm, track.world, (b) => {
    const e = blockAt(song, b), next = song.blocks[e.index + 1], k = b - e.startBeat;
    const nextKind = k >= e.beats - 8 ? (next ? next.kind : 'end') : e.kind;
    return { kind: e.kind, spotlight: false, firstBeatOfEight: k % 8 === 0, firstOfSection: b === e.startBeat, nextKind };
  }, track.tr || 0);
  // a real song is the clock when its file is there; otherwise the synthesised band plays at the same pace
  let band = track.file && song.track === track.id ? new SongPlayer(track, song) : makeBand();
  if (import.meta.env.DEV) window.__gb = () => ({ band, song });
  const songReady = band instanceof SongPlayer ? band.ready().then((ok) => { if (!ok) { band.stop(0); band = makeBand(); } }) : Promise.resolve();

  // ---------------------------------------------------------------- 3, 2, 1, GO
  const cd = $('#cd', root), cdTxt = $('#cdTxt', root), cdNum = $('#cdNum', root), cdArc = $('#cdArc', root);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    await unlockAudio(); sfx.whoosh();
    await Promise.all([wait(REDUCED() ? 900 : 1700), songReady]);
    cd.classList.add('counting');
    for (const n of [3, 2, 1, 0]) {
      if (st.ended) return;
      cdTxt.textContent = n ? String(n) : 'GO!';
      cdNum.classList.toggle('go', !n);
      cdNum.classList.remove('tick'); void cdNum.offsetWidth; cdNum.classList.add('tick');
      cdArc.style.transition = 'none'; cdArc.style.strokeDashoffset = '0'; void cdArc.getBoundingClientRect();
      cdArc.style.transition = 'stroke-dashoffset 820ms linear'; cdArc.style.strokeDashoffset = n ? '340' : '0';
      sfx.count(n);
      if (!n) { band.start(song.totalBeats, 0); st.started = true; if (camera) resetBaseline(); }
      await wait(n ? 850 : 650);
    }
    cd.classList.add('done'); setTimeout(() => cd.remove(), 400);
  })();

  // ---------------------------------------------------------------- controls
  const bLite = $('#bLite', root), bPause = $('#bPause', root), pover = $('#pover', root);
  const setLite = (v) => { st.lite = v; if (v) st.liteUsed = true; bLite.setAttribute('aria-pressed', String(v)); st.cur = -1; };
  bLite.onclick = () => setLite(!st.lite);
  $('#bHurt', root).onclick = () => hurt();
  bPause.onclick = () => (st.paused ? resume() : pause());
  $('#bExit', root).onclick = () => pause(true);
  $('#bPrev', root).onclick = () => seekBlock(0);
  $('#bNext', root).onclick = () => seekBlock(1);
  const key = (e) => {
    if (st.ended || !st.started) return;
    if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); st.paused ? resume() : pause(); }
    else if (e.key === 'l' || e.key === 'L') setLite(!st.lite);
    else if (e.key === 'h' || e.key === 'H') hurt();
    else if (e.key === 'ArrowLeft' && !st.paused) seekBlock(0);
    else if (e.key === 'ArrowRight' && !st.paused) seekBlock(1);
  };
  document.addEventListener('keydown', key);
  const vis = () => { if (document.hidden && !st.paused && !st.ended && st.started) pause(); };
  document.addEventListener('visibilitychange', vis);

  function overlay(html) { pover.innerHTML = `<div class="pcard" role="dialog" aria-modal="true">${html}</div>`; pover.hidden = false; const f = pover.querySelector('button'); if (f) f.focus(); }
  async function pause(exit = false) {
    if (st.ended || !st.started) return;
    if (!st.paused) { st.paused = true; await band.pause(); }
    bPause.innerHTML = icon.play; bPause.setAttribute('aria-label', 'Resume');
    const frac = st.played / song.totalBeats;
    overlay(`<p class="eyebrow">${exit ? 'Leave the session?' : 'Paused'}</p><h2>${exit ? 'You can stop any time.' : 'Take your time.'}</h2>
      <p>${frac >= 0.6 ? 'You’ve done most of today’s routine, so ending now still completes the session.' : 'Ending now saves it as a partial session: no points, and no penalty either.'}</p>
      <div class="row"><button class="btn primary" data-a="resume">${icon.play} Resume</button>${st.lite ? '' : '<button class="btn ghost" data-a="lite">Resume with Lite</button>'}<button class="btn ghost" data-a="end">End session</button></div>`);
  }
  async function resume() { pover.hidden = true; st.paused = false; st.lastT = 0; bPause.innerHTML = icon.pause; bPause.setAttribute('aria-label', 'Pause'); await band.resume(); }
  async function hurt() {
    if (st.ended || !st.started) return; st.hurt++;
    if (!st.paused) { st.paused = true; await band.pause(); }
    bPause.innerHTML = icon.play;
    overlay(`<p class="eyebrow warn">${icon.alert} Logged for your physio</p><h2>Stopping was the right call.</h2>
      <p>If pain goes above 5 out of 10, or anything feels wrong, stop for today. A safe stop still counts toward your week and your streak.</p>
      <div class="row"><button class="btn primary" data-a="stop">Stop for today</button><button class="btn ghost" data-a="lite">Continue with Lite</button></div>`);
  }
  pover.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a;
    if (k === 'resume') resume();
    if (k === 'lite') { setLite(true); resume(); }
    if (k === 'end') finish('ended');
    if (k === 'stop') finish('safe');
  });
  // restart (dir 0) or skip (dir 1) the current move. Skipped time doesn't count as played.
  function seekBlock(dir) {
    if (!st.started || st.ended) return;
    const e = blockAt(song, band.beat());
    let to = e;
    if (dir === 1) { to = song.blocks[e.index + 1]; while (to && to.kind === 'rest') to = song.blocks[to.index + 1]; if (!to) { finish('ended'); return; } }
    band.seek(to.startBeat); st.lastReps = -1; st.said = {}; st.cur = -1;
    sfx.pop();
  }

  // ---------------------------------------------------------------- encouragement
  function say(big, small, col = '#FF8C52', burstCol = null) {
    st.fb = { big, small, col, t: performance.now() };
    if (burstCol) burst(burstCol, REDUCED() ? 10 : 30);
  }
  function burst(col, n) {
    const x = LAY.cx, y = H * 0.14, cols = [col, '#FFD36B', '#8AD6D1', '#FF8C52'];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 120 + Math.random() * 300; st.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 1, col: cols[i % 4], r: 3 + Math.random() * 4, rot: Math.random() * 6 }); }
  }
  function milestones(e, b) {
    if (!e.reps || e.kind === 'rest' || e.kind === 'warm' || e.kind === 'cool' || e.timed) return;
    const n = repsAt(e, b), id = (k) => `${e.index}:${k}`;
    if (n === st.lastReps) return; st.lastReps = n;
    const left = e.reps - n, unit = CORE[e.core].hold ? 'holds' : 'reps';
    if (n >= e.reps && !st.said[id('done')]) { st.said[id('done')] = 1; say('Set complete!', `${e.reps} ${unit} of ${CORE[e.core].name.toLowerCase()}`, '#2E8F90', '#359FA0'); band.stars(3, false); }
    else if (e.reps >= 6 && n === Math.floor(e.reps / 2) && !st.said[id('half')]) { st.said[id('half')] = 1; say('Halfway there!', 'Nice and steady', '#FF8C52'); }
    else if (e.reps >= 8 && left === 3 && !st.said[id('3')]) { st.said[id('3')] = 1; say('3 to go!', 'You’ve got this', '#FF8C52'); }
  }

  // ---------------------------------------------------------------- judging each rep (camera) / counting it (no camera)
  function judgeTick(b) {
    const fresh = camera && tracker.ready && performance.now() / 1000 - tracker.lastSeen < 0.5;
    for (let i = evI; i < events.length; i++) {
      const ev = events[i];
      if (ev.beat - 0.6 > b) break;
      if (ev.res) continue;
      // the window opens just before the peak and stays open a beat after it, so a slight lag is fine
      if (b <= ev.beat + 1.0) {
        if (fresh && ev.judge) { const sc = scoreFrame(songPose(song, ev.beat, st.lite).pose, song.coreParts); if (sc != null) { ev.best = Math.max(ev.best, sc); ev.seen++; } }
        if (!camera && b >= ev.beat && !ev.counted) { ev.counted = true; st.jfb = { word: String(ev.rep + 1), col: '#E8692B', sub: '', t: performance.now(), small: true }; }
        continue;
      }
      ev.res = 'done';
      if (!camera || !ev.judge) continue;
      if (!ev.seen) { if (performance.now() - st.viewT > 4000) { st.viewT = performance.now(); st.jfb = { word: 'STEP INTO VIEW', col: '#8A5A0E', sub: 'So the camera can see you', t: performance.now() }; } continue; }
      const J = JUDGE.find((j) => ev.best >= j.min);
      ev.res = J.word; st.tally[3 - J.stars]++;
      if (J.stars >= 1) { st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); } else st.combo = 0;
      st.jfb = { word: J.word, col: J.col, sub: st.combo >= 3 && J.stars ? `Combo ×${st.combo}` : pick(J.sub), t: performance.now(), stars: J.stars };
      if (J.stars === 3) { burst('#FF8C52', REDUCED() ? 8 : 22); band.stars(3, ev.gold); } else if (J.stars) band.stars(J.stars, false);
    }
    while (evI < events.length && events[evI].res) evI++;
  }

  // ---------------------------------------------------------------- camera tips (optional, never scored)
  const cueEl = $('#cue', root);
  function showCue(kind, title, sub) { const L = st.live; L.cueAt = performance.now(); L.cueKind = kind; cueEl.className = 'p-cue ' + kind; cueEl.hidden = false; cueEl.firstChild.textContent = title; cueEl.lastChild.textContent = sub; }
  const LIMBS = { lArm: ['lUA', 'lFA'], rArm: ['rUA', 'rFA'], lLeg: ['lTH', 'lSH'], rLeg: ['rTH', 'rSH'] };
  function limbGlow() {
    const D = st.live.diffs, G = st.live.glow, out = {}; if (!D) return null;
    for (const k in LIMBS) { const ds = LIMBS[k].map((j) => D[j]).filter((d) => d != null); if (!ds.length) continue; const ok = Math.max(...ds) < 35 ? 1 : 0; G[k] = (G[k] ?? ok) + (ok - (G[k] ?? ok)) * 0.12; out[k] = G[k] > 0.5 ? hexA('#3FC18F', 0.9) : hexA('#FF8C52', 0.9); }
    return out;
  }
  function cameraTick(b) {
    const fresh = tracker.ready && performance.now() / 1000 - tracker.lastSeen < 0.5;
    const lost = $('#lost', root);
    const sp = songPose(song, b, st.lite), m = CORE[sp.core];
    if (lost) { const legs = song.coreParts.includes('legs') && !m.rest; const msg = !fresh ? 'Can’t see you. Step back so your whole body is in view.' : legs && !tracker.legsSeen ? 'Step back a little so your legs show too.' : ''; lost.hidden = !msg; if (msg) lost.textContent = msg; }
    if (!fresh) { cueEl.hidden = true; return; }
    let best = null;
    for (const lag of [0, 0.25, 0.5, 0.75]) { const mm = matchPose(songPose(song, b - lag, st.lite).pose, song.coreParts); if (!mm) continue; const v = (mm.flair ?? 0) + (mm.core ?? 0); if (!best || v > best.v) best = { ...mm, v }; }
    const L = st.live, now = performance.now();
    if (best) { const v = best.core != null && best.flair != null ? best.core * 0.7 + best.flair * 0.3 : best.core ?? best.flair; if (v != null) L.form += (v - L.form) * 0.06; L.worst = best.worst; L.diffs = best.diffs; }
    const still = m.rest || m.imagine || m.invisible;
    const state = still ? (tracker.energy > 1.6 ? 'fidget' : 'calm') : L.worst && ((L.form < 0.45 && L.worst.d > 30) || L.worst.d > 70) ? 'off' : L.form >= 0.75 ? 'good' : 'ok';
    if (state !== L.kind) { L.kind = state; L.since = now; }
    const held = (now - L.since) / 1000, since = (now - L.cueAt) / 1000;
    if (state === 'off' && held > 1.5 && since > 4) { const c = CUES[L.worst.region], fine = ['UA', 'TH'].includes(L.worst.k.slice(1)); showCue('fix', fine ? (L.worst.under ? c.under : c.over) : c.shape, L.worst.under || !fine ? pick(PUSH) : 'Smaller is fine. No need to push.'); }
    else if (state === 'fidget' && held > 1.5 && since > 4) showCue('fix', m.invisible ? 'Squeeze without moving' : 'Nice and still', 'Just breathe with the music.');
    else if (state === 'good' && held > 3 && since > 7 && L.cueKind !== 'good') showCue('good', pick(PRAISE), '');
    else if (!cueEl.hidden && since > 2.5 && (L.cueKind === 'good' ? state !== 'good' || since > 3 : state !== 'off' && state !== 'fidget')) cueEl.hidden = true;
  }

  // ---------------------------------------------------------------- render
  const eoB = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function render(b, t) {
    const bf = ((b % 1) + 1) % 1, pulse = b > 0 && !st.paused ? Math.pow(1 - bf, 3) : 0;
    g.clearRect(0, 0, W, H);
    drawScene(g, W, H, song.scene, { t, pulse, cx: LAY.cx, floorY: LAY.floor, s: LAY.s, reduced: REDUCED() });
    const sp = songPose(song, Math.max(0, b), st.lite), e = sp.block;
    if (sp.imagine && e.imagineOf) drawFigure(g, LAY.cx + 6, LAY.cy, LAY.s, corePose(e.imagineOf, sp.k).pose, { body: '#9C8CE8', skin: player.skin, alpha: 0.3, glow: false, seated: song.seated });
    const me = camera && b >= 0 && tracker.ready && performance.now() / 1000 - tracker.lastSeen < 0.5 ? trackedPose() : null;
    LAY.youX = Math.max(110, LAY.cx - Math.min(W * 0.3, 300 * LAY.s));
    if (me) { drawFigure(g, LAY.youX, LAY.cy + 70 * LAY.s, LAY.s * 0.72, me, { body: '#8AD6D1', skin: player.skin, alpha: 0.9, glow: false, seated: song.seated }); if (!st.jfb || st.jfb.small || performance.now() - st.jfb.t > 1300) pill('YOU', LAY.cy - 120 * LAY.s, '#1F7374', LAY.youX); }
    drawFigure(g, LAY.cx, LAY.cy, LAY.s, sp.pose, {
      face: st.jfb && performance.now() - st.jfb.t < 1400 ? (st.jfb.stars >= 3 ? 'excited' : st.jfb.stars ? 'happy' : 'surprised') : e.kind === 'rest' || CORE[sp.core].rest ? 'neutral' : !CORE[sp.core].rest && sp.core ? 'focused' : 'happy',
      body: outfit.color, glove: outfit.glove, hat: wear.hat, trail: wear.trail, outline: dark ? 'rgba(255,248,242,0.95)' : undefined,
      showCore: !CORE[sp.core].rest, coreParts: song.coreParts, seated: song.seated, pulse: sp.invisible, pulseAmt: sp.pulse,
      limbGlow: me && !CORE[sp.core].rest ? limbGlow() : null, glowColor: dark ? hexA(outfit.color, 0.6) : 'rgba(255,140,82,0.22)',
    });
    moveTrack(b);
    // instruction pill above the move track
    const pillY = LAY.trackY - LAY.sz * 0.75 - 28;
    if (b >= 0 && (e.kind === 'rest' || CORE[sp.core].rest)) pill((sp.k % 8) < 4 ? 'Breathe in…' : 'Breathe out…', pillY, '#2E8F90');
    else if (sp.invisible && b >= 0) { const m = CORE[sp.core]; pill((sp.k % m.cycle) < m.cycle / 2 ? 'Squeeze… hold' : 'Release', pillY, '#2E8F90'); }
    else if (sp.imagine && b >= 0) pill('Watch and imagine doing it', pillY, '#7A6BD0');
    // encouragement callout
    if (st.fb) {
      const age = (performance.now() - st.fb.t) / 1000;
      if (age < 1.8) {
        const pop = REDUCED() ? 1 : eoB(clamp(age / 0.32)), a = age > 1.35 ? 1 - (age - 1.35) / 0.45 : 1, size = Math.round(Math.min(W * 0.09, 52));
        g.save(); g.globalAlpha = a; g.translate(LAY.cx, H * 0.085); g.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
        g.font = `800 ${size}px "Bricolage Grotesque", Figtree, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = size * 0.22; g.strokeStyle = '#FFFFFF'; g.strokeText(st.fb.big, 0, 0);
        g.fillStyle = st.fb.col; g.fillText(st.fb.big, 0, 0);
        g.font = `700 ${Math.round(Math.max(14, size * 0.32))}px Figtree, sans-serif`; g.lineWidth = 6; g.strokeText(st.fb.small, 0, size * 0.8); g.fillStyle = '#33464C'; g.fillText(st.fb.small, 0, size * 0.8);
        g.restore();
      }
    }
    // judgement: big Just Dance-style word that pops in and tilts
    if (st.jfb) {
      const age = (performance.now() - st.jfb.t) / 1000;
      if (age < 1.3) {
        const pop = REDUCED() ? 1 : eoB(clamp(age / 0.28)), a = age > 0.95 ? 1 - (age - 0.95) / 0.35 : 1;
        const size = Math.round(Math.min(W * (st.jfb.small ? 0.07 : 0.085), st.jfb.small ? 44 : 56));
        const x = st.jfb.small ? LAY.trackX + LAY.sz * 0.1 : camera ? LAY.youX : LAY.cx, y = st.jfb.small ? LAY.trackY - LAY.sz - 10 : camera ? Math.max(70, LAY.cy - 210 * LAY.s) : H * 0.12;
        g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(st.jfb.small ? 0 : -0.05); g.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        g.font = `800 italic ${size}px "Bricolage Grotesque", Figtree, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = size * 0.24; g.strokeStyle = '#FFFFFF'; g.strokeText(st.jfb.word, 0, 0);
        g.fillStyle = st.jfb.col; g.fillText(st.jfb.word, 0, 0);
        if (st.jfb.stars != null) for (let i = 0; i < 3; i++) { const pi = clamp((age - 0.08 - i * 0.07) / 0.25); star(-36 + i * 36, size * 0.78, 14 * eoB(pi), i < st.jfb.stars ? '#FFB547' : 'rgba(30,42,47,0.14)'); }
        if (st.jfb.sub) { g.font = `800 ${Math.max(14, Math.round(size * 0.3))}px Figtree, sans-serif`; g.lineWidth = 6; const sy = size * (st.jfb.stars != null ? 1.35 : 0.85); g.strokeText(st.jfb.sub, 0, sy); g.fillStyle = '#33464C'; g.fillText(st.jfb.sub, 0, sy); }
        g.restore();
      }
    }
    if (camera && st.combo >= 3) { g.save(); g.font = '800 italic 20px "Bricolage Grotesque", sans-serif'; const t = `Combo ×${st.combo}`, w = g.measureText(t).width + 28; g.fillStyle = '#FF8C52'; g.beginPath(); g.roundRect(18, 18, w, 38, 19); g.fill(); g.fillStyle = '#2A1408'; g.textBaseline = 'middle'; g.fillText(t, 32, 38); g.restore(); }
    if (camera && b < 8 && b >= -4 && tracker.ready) pill('Stand tall and still for a moment', H * 0.2, '#2E8F90');
    if (!camera && b >= 0 && b < 16) { g.save(); g.font = '700 13px Figtree, sans-serif'; const t = 'Turn on camera tips for PERFECT / GOOD feedback', w = g.measureText(t).width + 24; g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.roundRect(W - w - 16, 16, w, 30, 15); g.fill(); g.fillStyle = '#4A585E'; g.textBaseline = 'middle'; g.fillText(t, W - w - 4, 31); g.restore(); }
    const dt = 1 / 60;
    for (let i = st.particles.length - 1; i >= 0; i--) { const p = st.particles[i]; p.life -= dt * 1.1; if (p.life <= 0) { st.particles.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.rot += dt * 5; g.save(); g.globalAlpha = p.life; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
  }
  // Just Dance move track: a card for every rep slides left to the line. Gold = last rep of the set.
  function moveTrack(b) {
    const sz = LAY.sz, y = LAY.trackY, x0 = 16, x1 = W - 16, lineX = x0 + sz * 0.85; LAY.trackX = lineX;
    const ppb = Math.max((x1 - lineX) / 7, sz * 0.62);
    g.save();
    g.fillStyle = dark ? 'rgba(15,32,38,0.55)' : 'rgba(255,255,255,0.72)'; g.beginPath(); g.roundRect(x0, y - sz * 0.72, x1 - x0, sz * 1.44, sz * 0.36); g.fill();
    const k = b > 0 && !st.paused ? Math.pow(1 - ((b % 1) + 1) % 1, 3) : 0;
    g.shadowColor = 'rgba(255,140,82,0.9)'; g.shadowBlur = 8 + 14 * k; g.strokeStyle = '#FF8C52'; g.lineWidth = 4 + 2 * k; g.lineCap = 'round';
    g.beginPath(); g.moveTo(lineX, y - sz * 0.62); g.lineTo(lineX, y + sz * 0.62); g.stroke(); g.shadowBlur = 0;
    let any = false;
    for (let i = Math.max(0, evI - 3); i < events.length; i++) {
      const ev = events[i], x = lineX + (ev.beat - b) * ppb;
      if (x > x1 + sz) break;
      if (x < x0 - sz * 0.2) continue;
      any = true;
      const a = clamp((x1 - x) / (sz * 0.6)) * clamp((x - x0 + sz * 0.1) / (sz * 0.7));
      const now = Math.abs(ev.beat - b) < 0.5;
      drawPicto(g, x, y, sz, songPose(song, ev.beat, st.lite).pose, { gold: ev.gold, alpha: a, now, seated: song.seated, color: '#FF8C52' });
      if (ev.res && ev.res !== 'done') { const J = JUDGE.find((j) => j.word === ev.res); g.globalAlpha = a; g.fillStyle = J.col; g.beginPath(); g.arc(x + sz * 0.38, y - sz * 0.38, 9, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    if (!any) { g.fillStyle = dark ? '#8AD6D1' : '#6F7D82'; g.font = '700 14px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const blk = blockAt(song, Math.max(0, b)); g.fillText(blk.kind === 'cool' ? 'Cool-down: breathe and relax' : 'Breathe… the next move is coming up', (lineX + x1) / 2, y); }
    g.restore();
  }
  function star(x, y, r, fill) { if (r <= 0) return; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill(); }
  function pill(text, y, col, cx = LAY.cx) {
    g.save(); g.font = '700 18px Figtree, sans-serif'; const w = g.measureText(text).width + 36;
    g.fillStyle = dark ? 'rgba(20,40,46,0.85)' : 'rgba(255,255,255,0.94)'; g.shadowColor = 'rgba(30,42,47,0.15)'; g.shadowBlur = 16;
    g.beginPath(); g.roundRect(cx - w / 2, y - 20, w, 40, 20); g.fill(); g.shadowBlur = 0;
    g.fillStyle = dark ? '#8AD6D1' : col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cx, y + 1); g.restore();
  }

  // ---------------------------------------------------------------- side panels
  const pBar = $('#pBar', root), pTime = $('#pTime', root), rN = $('#rN', root), rT = $('#rT', root), rU = $('#rU', root), ringArc = $('#ringArc', root);
  const mName = $('#mName', root), mCue = $('#mCue', root), mFlair = $('#mFlair', root), pMoveOf = $('#pMoveOf', root), pNext = $('#pNext', root);
  const items = $$('#pList li', root), hBeat = [...$('#hBeat', root).children], camMini = $('#camMini', root);
  const CIRC = 2 * Math.PI * 52;
  ringArc.style.strokeDasharray = CIRC;
  function panels(b) {
    const bb = Math.max(0, b), e = blockAt(song, bb);
    pBar.style.width = (clamp(bb / song.totalBeats) * 100).toFixed(1) + '%';
    pTime.textContent = `${fmtTime(bb * song.spb)} / ${fmtTime(song.secs)}`;
    const bi = b >= 0 ? Math.floor(b) % 4 : -1; hBeat.forEach((el, i) => el.classList.toggle('on', i === bi));
    // ring: reps, or seconds left on timed moves and breaks
    let n, tot = '', unit, frac;
    if (e.reps && e.kind !== 'rest') {
      if (e.timed) { n = Math.max(0, Math.ceil((e.startBeat + e.beats - bb) * song.spb)); unit = 'seconds left'; frac = (bb - e.startBeat) / e.beats; }
      else { n = repsAt(e, bb); tot = `/${e.reps}`; unit = CORE[e.core].hold ? 'holds' : 'reps'; frac = n / e.reps; }
    } else { n = b < 0 ? '–' : Math.max(0, Math.ceil((e.startBeat + e.beats - bb) * song.spb)); unit = b < 0 ? 'get ready' : 'seconds'; frac = b < 0 ? 0 : (bb - e.startBeat) / e.beats; }
    if (rN.textContent !== String(n)) rN.textContent = n;
    if (rT.textContent !== tot) rT.textContent = tot;
    if (rU.textContent !== unit) rU.textContent = unit;
    ringArc.style.strokeDashoffset = (CIRC * (1 - clamp(frac))).toFixed(1);
    if (e.index !== st.cur) {
      st.cur = e.index;
      const ex = e.ex != null && e.kind !== 'rest' ? exs[e.ex] : null;
      const mv = ex ? CORE[st.lite && !CORE[e.core].rest ? songPose(song, bb, true).core : e.core] : null;
      mName.textContent = e.kind === 'rest' ? e.label : e.kind === 'warm' ? 'Warm-up' : e.kind === 'cool' ? 'Cool-down' : mv.name;
      mCue.textContent = !ex ? 'In for 4, out for 4' : mv.cue;
      mFlair.innerHTML = e.flair && ex ? `<span class="tag flair">Dance</span> ${esc(e.flairName)}` : '';
      const active = ex ? e.ex : -1;
      items.forEach((li, i) => { li.classList.toggle('now', i === active); li.classList.toggle('done', e.kind === 'cool' || (e.kind === 'rest' ? i < e.ex : active >= 0 && i < active)); });
      const setTxt = (k) => exs[e.ex] && exs[e.ex].sets > 1 ? ` · set ${k + 1} of ${exs[e.ex].sets}` : '';
      pMoveOf.textContent = e.kind === 'warm' ? `Warm-up · ${exs.length} moves` : e.kind === 'cool' ? 'Cool-down' : e.kind === 'rest' ? `Up next: move ${e.ex + 1} of ${exs.length}${setTxt(e.set)}` : `Move ${e.ex + 1} of ${exs.length}${setTxt(e.set)}`;
      const nx = song.blocks.slice(e.index + 1).find((x) => x.kind !== 'rest' && x.kind !== 'cool');
      const nxe = nx ? exs[nx.ex] : null;
      pNext.innerHTML = nxe ? `${mini(outfit.color, { size: 44, poses: `${movePoses(CORE[nxe.move])}`, skin: player.skin, glove: outfit.glove })}<div><small>Next</small><b>${esc(nxe.name)}</b></div>${icon.next}` : `<span class="nx-ic">${icon.check}</span><div><small>Next</small><b>${e.kind === 'cool' ? 'All done' : 'Cool-down, then done'}</b></div>`;
      mini.hydrate && mini.hydrate();
      if (ex && st.started && !st.jfb) say(e.set > 0 ? `Set ${e.set + 1}` : mv.name, e.set > 0 ? mv.name : `Move ${e.ex + 1} of ${exs.length}`, '#FF8C52');
      st.lastReps = -1;
      // the band grows as you go: one more layer for every move you reach
      st.groove = Math.min(3, 1 + (ex ? e.ex : e.kind === 'cool' ? 3 : 0));
    }
    if (camMini) drawSkeleton(camMini.getContext('2d'), camMini.width, camMini.height, { color: '#FF8C52' });
  }

  // ---------------------------------------------------------------- loop
  let raf = 0;
  const t0 = performance.now();
  function frame(now) {
    if (st.ended) return;
    const t = (now - t0) / 1000;
    const b = band.t0 ? band.beat() : -4;
    if (st.started && !st.paused && b >= 0 && b < song.totalBeats) {
      const e = blockAt(song, b);
      if (st.lastT) { const db = Math.min(0.25, (now - st.lastT) / 1000) / song.spb; st.played += db; if (e.kind !== 'rest' && e.ex != null) st.exPlayed[e.ex] = (st.exPlayed[e.ex] || 0) + db; }
      st.lastT = now;
      milestones(e, b);
      judgeTick(b);
      band.setGroove(st.groove, e.kind);
      if (camera) cameraTick(b);
    }
    if (b >= song.totalBeats + 1) { finish('complete'); return; }
    render(b, t); panels(b);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // status: complete (played at least 60% of the routine), safe (stopped for pain), partial (ended early)
  function finish(why) {
    if (st.ended) return; st.ended = true;
    cancelAnimationFrame(raf); band.stop(); ro.disconnect();
    document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', vis);
    const played = clamp(st.played / song.totalBeats);
    const status = why === 'safe' ? 'safe' : played >= 0.6 ? 'complete' : 'partial';
    const movesDone = exs.filter((x) => (st.exPlayed[x.i] || 0) >= x.beats * 0.8).map((x) => x.move);
    const judged = st.tally.reduce((a, n) => a + n, 0);
    onDone({ status, why, played, secs: st.played * song.spb, lite: st.liteUsed, hurt: st.hurt, moves: movesDone, song, fun: camera && judged ? { perfect: st.tally[0], great: st.tally[1], good: st.tally[2], again: st.tally[3], judged, maxCombo: st.maxCombo, stars: (st.tally[0] * 3 + st.tally[1] * 2 + st.tally[2]) / judged } : null });
  }
  return { stop: () => finish('ended') };
}
