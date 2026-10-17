import './style.css';
import { S, save, resetAll, today, day, lastCheckin, addCheckin, planFor, earnable, recordSession, setPainAfter, restDay, streak, weekDots, weekSessions, rank, unlocked, trackOf, sceneOf, outfitOf,
  badgeProgress, takeUnseen, hasCosmetic, wearItem, cosmeticFor, crew, teamGoal, cheerChain, sendCheer, cheeredToday, crewFeed, weekSummary, firstWeek, chart, setPlan, presetPlan, startGame,
  POINTS, listProfiles, switchProfile, newProfile, deleteProfile, activeProfile, scheduled, weekKey, DAY_NAMES, parse, addDays, dow, stats } from './state.js';
import { CORE, POSES, INJURIES, RANKS, TRACKS, PHASES, SCENES, GENRES, MOODS, OUTFITS, BADGES, COSMETICS, CHEERS, QUOTES, INTENSITY, PACES, SKIN } from './content.js';
import { buildRoutine, songPose, fmtTime, movePoses } from './song.js';
import { playSong } from './play.js';
import { drawMiniAvatar, drawFigure, drawPicto, lerpPose, eio, clamp, FUR } from './figure.js';
import { drawScene } from './scene.js';
import { tracker, startCamera, drawSkeleton } from './tracker.js';
import { sfx, unlockAudio, setMuted, preview, previewSong, stopPreview } from './audio.js';
import { $, $$, esc, on, toast, sheet, confetti, icon } from './ui.js';
import { gsap, reduced, revealPage, revealStep, leaveStep, pop, bounce, flash, fox as foxArt, hydrateFox, blobs, SPARK, BODY_ART, splash } from './intro.js';

const app = document.getElementById('app');

// ---------------------------------------------------------------- mini avatars (cards, lists)
const minis = new Set();
(function animateMinis(t) {
  for (const c of minis) { if (!c.isConnected) { minis.delete(c); continue; } drawMiniAvatar(c, c.dataset.color, t / 1000 + (+c.dataset.off || 0), (c.dataset.poses || 'out,clapTop,swayL,swayR').split(','), +c.dataset.beat || 0.6); }
  requestAnimationFrame(animateMinis);
})(0);
function mini(color, { size = 64, poses = '', off = 0, beat = 0.6, cls = '', hat = '', trail = '', skin = '', glove = '' } = {}) {
  return `<canvas class="mini ${cls}" aria-hidden="true" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px" data-color="${color}" data-poses="${poses}" data-off="${off}" data-beat="${beat}"${hat ? ` data-hat="${hat}"` : ''}${trail ? ` data-trail="${trail}"` : ''}${skin ? ` data-skin="${skin}"` : ''}${glove ? ` data-glove="${glove}"` : ''}></canvas>`;
}
function hydrate() { $$('canvas.mini').forEach((c) => minis.add(c)); hydrateFox(app); }
mini.hydrate = hydrate;
const me = (o = {}) => { const of = outfitOf(); return mini(of.color, { skin: S.profile.skin, glove: of.glove, hat: S.wear.hat || '', trail: S.wear.trail || '', ...o }); };

// ---------------------------------------------------------------- accessibility
function applyA11y() {
  const r = document.documentElement.classList;
  r.toggle('a11y-large', S.a11y.largeText); r.toggle('a11y-motion', S.a11y.reduceMotion); r.toggle('a11y-contrast', S.a11y.highContrast);
  setMuted(!S.a11y.sound);
}

// ---------------------------------------------------------------- shell + router
const NAV = [['home', 'Home'], ['sessions', 'Sessions'], ['progress', 'Progress'], ['league', 'League'], ['music', 'Music'], ['badges', 'Badges'], ['profile', 'Profile']];
const MOBILE = ['home', 'sessions', 'progress', 'league', 'profile'];
const LOGO = `<span class="logo-t">Groove<br>Back</span><svg class="logo-s" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#FF8C52"/></svg>`;
let current = 'home', liveSong = null;
function shell(content, tab) {
  const item = (id, label) => `<button class="nav-i ${tab === id ? 'on' : ''}" data-go="${id}" aria-current="${tab === id ? 'page' : 'false'}">${icon[id]}<span>${label}</span></button>`;
  return `<div class="shell">
    <aside class="side"><a class="logo" href="#" data-go="home" aria-label="Groove Back home">${LOGO}</a>
      <nav aria-label="Main">${NAV.map(([id, l]) => item(id, l)).join('')}</nav>
      <div class="side-foot"><button class="nav-i" data-go="profiles">${icon.people}<span>Switch profile</span></button><button class="nav-i" data-howto>${icon.help}<span>How to play</span></button><p class="proto">Prototype · demo data</p></div></aside>
    <div class="main">
      <header class="topbar"><a class="logo sm" href="#" data-go="home" aria-label="Groove Back home">${LOGO}</a>
        <div class="tb-r"><span class="pts-chip" title="Total points">${icon.star}<b>${S.points.toLocaleString()}</b> pts</span><button class="iconbtn" data-howto aria-label="How to play">${icon.help}</button><button class="avatar-btn" data-go="profile" aria-label="Your profile">${me({ size: 34, poses: 'out,vUp' })}</button></div></header>
      <main class="content" id="main">${content}</main>
    </div>
    <nav class="bottom" aria-label="Main">${NAV.filter(([id]) => MOBILE.includes(id)).map(([id, l]) => item(id, l)).join('')}</nav>
  </div>`;
}
function go(route, arg) {
  if (liveSong) { liveSong.stop(); liveSong = null; }
  stopPreview();
  current = route; window.scrollTo(0, 0);
  const R = { home, sessions, progress, league, music, badges, profile, physio, onboarding, profiles };
  (R[route] || home)(arg);
  hydrate(); hydrateFox(app);
  if (route !== 'onboarding' && route !== 'profiles') revealPage(app);
}
on(document, '[data-go]', 'click', (e, t) => { e.preventDefault(); sfx.tap(); go(t.dataset.go, t.dataset.arg); });
on(document, '[data-howto]', 'click', (e) => { e.preventDefault(); sfx.tap(); howToPlay(); });
on(document, '[data-rules]', 'click', (e) => { e.preventDefault(); ruleBook(); });
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const ring = (frac, label, sub, cls = '') => { const C = 2 * Math.PI * 42; return `<div class="ringw ${cls}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" class="trk"/><circle cx="50" cy="50" r="42" class="arc" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - clamp(frac))}"/></svg><div><b>${label}</b><small>${sub}</small></div></div>`; };
const bar = (frac, cls = '') => `<div class="bar ${cls}"><i style="width:${(clamp(frac) * 100).toFixed(1)}%"></i></div>`;
const playable = (t) => unlocked(t) && !!t.file;
const songLine = (t) => `${esc(t.artist || GENRES[t.world])}${t.genre ? ` · ${esc(t.genre)}` : ''}`;
// play a track's 8-second preview: real songs from their chorus, the band otherwise
function previewTrack(t, onEnd) { if (t.file) previewSong(t, onEnd); else preview(t.world, t.tr || 0, S.rx.bpm, onEnd); }
function fixTrack() { const cur = TRACKS.find((t) => t.id === S.prefs.track); if (!cur || !playable(cur)) { const f = TRACKS.find(playable); if (f) { S.prefs.track = f.id; save(); } } }
const routineFor = (opts = {}) => buildRoutine({ rx: S.rx, injury: S.profile.injury, plan: opts.plan || 'green', intensity: S.prefs.intensity, track: trackOf().id, scene: S.prefs.scene, practice: !!opts.practice });
const setsPre = (n) => (n > 1 ? `${n} × ` : '');
const targetText = (e) => setsPre(e.sets) + (e.timed ? `${e.secs} sec` : `${e.reps} ${CORE[e.move].hold ? 'holds' : 'reps'}`);
const exTarget = (x) => { const m = CORE[x.move]; return setsPre(x.sets || 1) + (x.secs ? `${x.secs} sec` : `${x.reps} ${m.hold ? 'holds' : 'reps'}`); };
const nextScheduled = () => { for (let i = 1; i <= 7; i++) { const k = addDays(today(), i); if (scheduled(k)) return i === 1 ? 'tomorrow' : DAY_NAMES[dow(k)]; } return 'soon'; };

// ---------------------------------------------------------------- onboarding
// Step 0 is the welcome. Steps 1–3 use the sidebar stepper; step 4 ("Your routine") is the How to play walkthrough.
const OB_STEPS = ['About you', 'Recovery focus', 'Play style', 'Your routine'];
const OB_BUDDY = ['', 'Let’s make you a dancer!', 'Small steps lead to big moves!', 'Your way to move. I’ll be with you!', 'That’s it. Let’s dance!'];
const OB_VERSION = 2; // bump when the setup flow changes, so existing players see the new one once
const OB_ICON = {
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="12" width="4" height="8" rx="1.5" fill="currentColor"/><rect x="10" y="7" width="4" height="13" rx="1.5" fill="currentColor"/><rect x="16" y="10" width="4" height="10" rx="1.5" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" fill="currentColor"/></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3" fill="currentColor"/><path d="M16 10.5l5-3v9l-5-3z" fill="currentColor"/></svg>',
  nocam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10.5l5-3v9l-5-3M3 3l18 18"/></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.2l11-2.2v12.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="6.6" cy="17.6" rx="3" ry="2.4" fill="currentColor"/><ellipse cx="17.6" cy="15.4" rx="3" ry="2.4" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M9 11h6M9 15h6M9 7h3"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h4l2-5 3 11 3-14 2.5 8H22"/></svg>',
};
let obStep = 0;
function onboarding(step = 0, dir = 1) {
  step = +step || 0;
  const P = S.profile, prev = obStep; obStep = step;
  const mainEl = $('.ob-main');
  if (mainEl && prev !== step && step > 0 && prev > 0) { leaveStep(mainEl, dir).then(() => renderOb(step, dir)); return; }
  renderOb(step, dir);
}
function planRows() {
  return S.rx.exercises.map((x) => { const m = CORE[x.move]; return `<li>${foxArt({ w: 30, h: 34, poses: movePoses(m), beat: 0.7, zoom: 1.1, hy: 0.42, face: 'focused' })}<span class="pn">${esc(m.name)}</span><b>${exTarget(x)}</b></li>`; }).join('');
}
function renderOb(step, dir) {
  const P = S.profile;
  if (step === 0) {
    app.innerHTML = `<div class="obwrap welcome">${blobs()}<div class="ob hero">
      <div class="logo big">${LOGO}</div>
      <div class="ob-art">${foxArt({ w: 250, h: 270, poses: 'vUp,clapTop,swayL,out', beat: 0.5, face: 'excited', hy: 0.47 })}</div>
      <h1>Dance your way back.</h1>
      <p class="lede">A music game built around your physiotherapy. Every session is made from the exercises your physio prescribes.</p>
      <div class="pillars"><div><b>Your physio picks the moves</b><span>Only exercises they approve, at their pace.</span></div><div><b>The song does the counting</b><span>Every rep lands on the beat. No counting needed.</span></div><div><b>Your league cheers you on</b><span>A small crew working toward one shared goal.</span></div><div><b>You just show up</b><span>100 points for every session you finish. That’s it.</span></div></div>
      <button class="btn primary big" data-next>Get started ${icon.arrow}</button>
      <p class="small">For adults working with a physiotherapist. A motivation tool for prescribed exercise, not treatment.</p></div></div>`;
    hydrateFox(app);
    if (!reduced()) gsap.fromTo($$('.ob.hero > *'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' });
    $('[data-next]').onclick = () => { sfx.tap(); unlockAudio(); const hero = $('.ob.hero'); if (reduced()) return onboarding(1); gsap.to(hero, { y: -30, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => onboarding(1) }); };
    return;
  }
  const stepper = OB_STEPS.map((n, i) => { const k = i + 1, cls = k < step ? 'done' : k === step ? 'now' : ''; return `<li class="${cls}" ${k === step ? 'aria-current="step"' : ''}><span class="dot">${k < step ? icon.check : k}</span><span>${n}</span></li>`; }).join('');
  const segs = OB_STEPS.map((_, i) => `<i class="${i + 1 <= step ? 'on' : ''}"><b></b></i>`).join('');
  const views = {
    1: () => `<h1>Make your dancer</h1>
      <p class="lede">Your league only ever sees this fox and your nickname. Never your real name, injury or pain.</p>
      <div class="ob-av"><div class="av-prev">${foxArt({ w: 210, h: 240, poses: 'out,clapTop,swayL,swayR', beat: 0.55, face: 'happy', hy: 0.47, fur: FUR.includes(P.skin) ? P.skin : FUR[0], band: outfitOf().color })}</div>
        <div class="ob-fields">
          <div class="field"><label for="nick">Nickname</label><input id="nick" maxlength="16" placeholder="e.g. kia_moves" value="${esc(P.nick)}" autocomplete="off"></div>
          <div class="field"><span class="flabel">Fur</span><div class="swatches ob-swrow" role="radiogroup" aria-label="Fur colour">${FUR.map((c, i) => `<button class="sw ${c === P.skin || (!FUR.includes(P.skin) && !i) ? 'on' : ''}" role="radio" aria-checked="${c === P.skin}" data-fur="${c}" style="background:${c}" aria-label="Fur colour ${i + 1}"></button>`).join('')}</div></div>
          <div class="field"><span class="flabel">Headband</span><div class="swatches ob-swrow" role="radiogroup" aria-label="Headband colour">${OUTFITS.filter((o) => !o.rank).map((o) => `<button class="sw ${o.id === P.outfit ? 'on' : ''}" role="radio" aria-checked="${o.id === P.outfit}" data-outfit="${o.id}" style="background:${o.color}" aria-label="${o.name}"></button>`).join('')}</div></div>
        </div></div>
      <button class="btn primary big" data-next>Continue ${icon.arrow}</button>`,
    2: () => `<h1>What are you recovering from?</h1>
      <p class="lede">Your physio sets the exact exercises. This picks which part of the body the routine focuses on.</p>
      <div class="injg" role="radiogroup" aria-label="Recovery focus">${Object.entries(INJURIES).map(([k, v]) => `<button class="injc ${k === P.injury ? 'on' : ''}" role="radio" data-inj="${k}" aria-checked="${k === P.injury}"><span class="ia">${BODY_ART[k]}</span><span class="it"><b>${v.name}</b><small>${v.detail}</small></span><span class="rad">${icon.check}</span></button>`).join('')}</div>
      <div class="field"><label for="code">Clinic code from your physio</label><input id="code" value="ANJALI-24" autocomplete="off"><small>Demo code: loads Dr. Anjali’s starter plan. In a real clinic this would come from your physio’s account.</small></div>
      <div class="plan-ld"><p class="eyebrow">${OB_ICON.doc} Plan loaded</p><h3 id="plTitle">${esc(S.rx.title)}</h3><ul id="plRows">${planRows()}</ul><p class="pl-foot">${OB_ICON.pulse}<span id="plFoot">${S.rx.perWeek} sessions a week · ${S.rx.bpm} BPM pace</span></p></div>
      <button class="btn primary big" data-next>Continue ${icon.arrow}</button>`,
    3: () => `<h1>How do you want to play?</h1>
      <p class="lede">Either way, points come from finishing your session. PERFECT and GOOD are for fun and feedback, never for points.</p>
      <div class="playg" role="radiogroup" aria-label="Play style">
        <button class="playc ${S.prefs.camera ? 'on' : ''}" role="radio" data-cam="1" aria-checked="${S.prefs.camera}">
          <span class="pc-t"><b>Camera: PERFECT / GOOD feedback</b> <em class="rec">Recommended</em></span>
          <span class="pc-d">Your camera watches each rep and the game cheers PERFECT, GREAT or GOOD, just like a dance game. Video stays on your device.</span>
          <span class="feats"><span><i>${OB_ICON.chart}</i>Real-time<br>feedback</span><span><i>${OB_ICON.star}</i>More<br>engaging</span><span><i>${OB_ICON.video}</i>Video stays<br>on your device</span></span>
          <span class="pc-art">${foxArt({ w: 230, h: 200, poses: 'vUp,clapTop', beat: 0.42, face: 'excited', zoom: 1.75, hy: 0.98, hx: 0.5, cls: 'bust', band: outfitOf().color })}<span class="perfect">PERFECT!</span></span>
          <span class="rad">${icon.check}</span></button>
        <button class="playc ${!S.prefs.camera ? 'on' : ''}" role="radio" data-cam="0" aria-checked="${!S.prefs.camera}">
          <span class="pc-t"><b>Follow along only</b></span>
          <span class="pc-d">No camera. Mirror the coach and the song counts your reps.</span>
          <span class="feats"><span><i>${OB_ICON.nocam}</i>No camera<br>needed</span><span><i>${OB_ICON.note}</i>Simple<br>and focused</span><span><i>${OB_ICON.heart}</i>Great for<br>casual practice</span></span>
          <span class="pc-art"><span class="screen">${foxArt({ w: 120, h: 90, poses: 'out,stepWideR,out,stepWideL', beat: 0.6, zoom: 1, hy: 0.36, cls: 'ghost' })}</span>${foxArt({ w: 190, h: 200, poses: 'out,stepWideR,out,stepWideL', beat: 0.6, face: 'happy', zoom: 1.45, hy: 0.85, hx: 0.42, band: outfitOf().color })}</span>
          <span class="rad">${icon.check}</span></button>
      </div>
      <button class="btn primary big" data-next>Show me how to play ${icon.arrow}</button>`,
    4: () => `<h1>How to play</h1>
      <p class="lede">Three things, then you’re dancing. Your plan: <b>${esc(S.rx.title)}</b>, about ${Math.max(1, Math.round(routineFor().secs / 60))} minutes to <b>${esc(trackOf().title)}</b>.</p>
      <div class="htg">
        <div class="htc"><span class="hn">1</span><div class="hart">${foxArt({ w: 170, h: 150, poses: movePoses(CORE[S.rx.exercises[0].move]), beat: 0.7, face: 'focused', zoom: 1.05, hy: 0.42 })}<span class="glow-tag">Your exercise glows green</span></div>
          <b>Mirror the fox</b><span>Face the screen and move like a mirror. The glowing part is your physio’s exercise; the rest is optional dance.</span></div>
        <div class="htc"><span class="hn">2</span><div class="hart lane"><i class="line"></i><span class="mc">${foxArt({ w: 40, h: 44, poses: 'vUp', zoom: 1, hy: 0.44 })}</span><span class="mc">${foxArt({ w: 40, h: 44, poses: 'out', zoom: 1, hy: 0.44 })}</span><span class="mc gold">${foxArt({ w: 40, h: 44, poses: 'clapTop', zoom: 1, hy: 0.44 })}</span><em class="pf">PERFECT!</em></div>
          <b>Hit the line</b><span>Move cards slide in on the beat. Make the shape as each one reaches the orange line. The song counts your reps.</span></div>
        <div class="htc"><span class="hn">3</span><div class="hart ctrls"><span class="k">${icon.pause} Pause</span><span class="k">${icon.leaf} Lite</span><span class="k red">${icon.alert} That hurt</span></div>
          <b>Stay in control</b><span>Lite makes every move smaller. “That hurt” stops straight away and tells your physio. Finish your session for <b>100 points</b>.</span></div>
      </div>
      <div class="row"><button class="btn primary big" data-next>Start dancing ${icon.arrow}</button><button class="link" id="fullGuide">See the full guide</button></div>`,
  };
  app.innerHTML = `<div class="obx">
    <aside class="ob-side"><div class="logo">${LOGO}</div><ol class="stepper">${stepper}</ol>
      <div class="ob-buddy">${foxArt({ w: 150, h: 120, poses: step >= 3 ? 'vUp,clapTop' : 'floatOut,floatIn', beat: step >= 3 ? 0.45 : 0.9, face: step >= 3 ? 'excited' : 'happy', zoom: 2.3, hy: 1.32, hx: 0.42, band: outfitOf().color })}<p class="bubble">${OB_BUDDY[step]} ${SPARK('#FF8C52', 16)}</p></div></aside>
    <main class="ob-main" id="main"><div class="ob-prog"><div class="segs">${segs}</div><span>Step ${step} of ${OB_STEPS.length}</span></div>${views[step]()}</main>
    ${blobs('side')}</div>`;
  hydrateFox(app);
  const main = $('.ob-main');
  revealStep(main, dir);
  pop($('.stepper .now .dot')); bounce($('.ob-buddy .bubble'));
  const n = $('#nick'); if (n) n.oninput = () => { P.nick = n.value.trim().replace(/\s+/g, '_'); };
  const pick = (sel, attr, apply) => $$(sel).forEach((b) => b.onclick = () => {
    sfx.tap(); apply(b.dataset[attr]); save();
    $$(sel).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
    pop(b.querySelector('.rad') || b);
  });
  const refreshFox = () => $$('canvas.foxart').forEach((c) => { if (c.closest('.av-prev')) c.dataset.fur = FUR.includes(P.skin) ? P.skin : FUR[0]; if (c.dataset.band) c.dataset.band = outfitOf().color; });
  pick('[data-fur]', 'fur', (v) => { P.skin = v; refreshFox(); bounce($('.av-prev')); });
  pick('[data-outfit]', 'outfit', (v) => { P.outfit = v; refreshFox(); bounce($('.av-prev')); });
  pick('[data-inj]', 'inj', (v) => { P.injury = v; S.rx = presetPlan(v); $('#plTitle').textContent = S.rx.title; $('#plRows').innerHTML = planRows(); $('#plFoot').textContent = `${S.rx.perWeek} sessions a week · ${S.rx.bpm} BPM pace`; hydrateFox($('#plRows')); flash($('.plan-ld')); });
  pick('[data-cam]', 'cam', (v) => { S.prefs.camera = v === '1'; });
  $('[data-next]').onclick = () => {
    sfx.tap(); unlockAudio();
    if (step === 1 && !P.nick) P.nick = 'groover' + Math.floor(Math.random() * 90 + 10);
    save();
    if (step < 4) return onboarding(step + 1, 1);
    P.onboarded = true; P.obv = OB_VERSION; startGame(); save();
    const m = $('.ob-main'); if (reduced() || !m) return go('home');
    gsap.to(m, { y: -24, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => go('home') });
  };
  const fg = $('#fullGuide'); if (fg) fg.onclick = () => howToPlay();
  if (step === 4 && !reduced()) {
    const cards = $$('.lane .mc');
    gsap.fromTo(cards, { x: 250 }, { x: -70, duration: 2.4, ease: 'none', stagger: { each: 0.8, repeat: -1 } });
    gsap.fromTo('.lane .pf', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(3)', repeat: -1, repeatDelay: 0.45, yoyo: true, delay: 1.5 });
  }
  $$('.stepper li.done').forEach((li, i) => { li.style.cursor = 'pointer'; li.onclick = () => onboarding(i + 1, -1); });
}

// ---------------------------------------------------------------- profile picker (every time the app opens)
function enterProfile(fresh) {
  applyA11y(); fixTrack();
  if (fresh) return go('onboarding', listProfiles().length > 1 ? 1 : 0);
  go(S.profile.onboarded && S.profile.obv === OB_VERSION ? 'home' : 'onboarding', S.profile.onboarded ? 1 : 0);
}
function profiles() {
  const list = listProfiles();
  const card = (p) => `<div class="pfc" data-pick="${p.id}" role="button" tabindex="0" aria-label="Play as ${esc(p.nick)}">
      <div class="pf-art">${foxArt({ w: 150, h: 150, poses: 'out,clapTop,swayL,swayR', beat: 0.6, face: 'happy', zoom: 1.5, hy: 0.78, fur: FUR.includes(p.skin) ? p.skin : FUR[0], band: (OUTFITS.find((o) => o.id === p.outfit) || OUTFITS[0]).color })}</div>
      <b>${esc(p.nick)}</b>
      <span class="pf-inj">${BODY_ART[p.injury] || ''}${esc((INJURIES[p.injury] || INJURIES.knee).name)}</span>
      <small>${p.onboarded ? `${p.sessions} session${p.sessions === 1 ? '' : 's'} · ${p.points.toLocaleString()} pts` : 'Setup not finished'}</small>
      <button class="pf-del" data-del="${p.id}" aria-label="Remove ${esc(p.nick)}">${icon.x}</button></div>`;
  app.innerHTML = `<div class="pfwrap">${blobs()}<div class="pf-in">
    <div class="logo big">${LOGO}</div>
    <h1>${list.length ? 'Who’s dancing today?' : 'Let’s make your profile'}</h1>
    <p class="lede">${list.length ? 'Pick your profile, or start a new one for someone else or a different part of the body.' : 'Each profile keeps its own plan, progress and fox.'}</p>
    <div class="pf-grid">${list.map(card).join('')}
      <button class="pfc new" id="pfNew"><span class="pf-plus">${icon.plus}</span><b>New profile</b><small>New dancer or a new body part</small></button></div>
  </div></div>`;
  hydrateFox(app);
  if (!reduced()) gsap.fromTo($$('.pf-in > *, .pfc'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity' });
  const leave = (fn) => { sfx.tap(); unlockAudio(); if (reduced()) return fn(); gsap.to('.pf-in', { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: fn }); };
  $$('[data-pick]').forEach((c) => {
    const pickIt = (e) => { if (e.target.closest('[data-del]')) return; leave(() => { switchProfile(c.dataset.pick); enterProfile(false); }); };
    c.onclick = pickIt; c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickIt(e); } };
  });
  $('#pfNew').onclick = () => leave(() => { newProfile(); enterProfile(true); });
  $$('[data-del]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const p = list.find((x) => x.id === b.dataset.del);
    const sh = sheet(`<h2>Remove ${esc(p.nick)}?</h2><p>This deletes that profile’s progress on this device. It can’t be undone.</p><div class="row"><button class="btn dark" id="pfYes">Remove profile</button><button class="btn ghost" data-close>Keep it</button></div>`);
    $('#pfYes', sh.el).onclick = () => { deleteProfile(p.id); sh.close(); profiles(); };
  });
}

// ---------------------------------------------------------------- home
function home() {
  if (!S.profile.onboarded || S.profile.obv !== OB_VERSION) return onboarding(S.profile.onboarded ? 1 : 0);
  const k = today(), d = day(k), can = earnable(), wkDone = weekSessions(), st = streak(), song = routineFor(), ci = lastCheckin();
  const first = S.rx.exercises[0], fm = CORE[first.move];
  const planPill = ci ? `<span class="pill ${ci.plan}">${ci.plan === 'green' ? 'Full routine' : ci.plan === 'amber' ? 'Lite today' : 'Gentle Groove'}</span>` : `<span class="pill">${INTENSITY[S.prefs.intensity].n}</span>`;
  let hero;
  if (d.rest) hero = { eyebrow: 'Rest day logged', title: 'Rest is part of the routine.', body: `Your streak is safe. Next session: ${nextScheduled()}.`, cta: '' };
  else if (can.weekLeft === 0) hero = { eyebrow: 'Weekly plan complete', title: `${wkDone} of ${S.rx.perWeek} done this week!`, body: 'That’s your whole plan. Extra sessions earn no points, so enjoy the rest.', cta: `<button class="btn ghost" data-go="sessions">Replay for fun · no points</button>` };
  else if (can.todayLeft === 0) hero = { eyebrow: 'Done for today', title: `See you ${nextScheduled()}, ${esc(S.profile.nick)}.`, body: 'Today’s session is in the bag. Rest well and cheer your crew.', cta: `<button class="btn dark" data-go="league">Cheer your crew ${icon.arrow}</button>` };
  else hero = { eyebrow: scheduled(k) ? 'Today’s session' : 'Optional today', title: esc(S.rx.title),
    body: `<div class="meta"><span>${icon.dumbbell} ${S.rx.exercises.length} moves</span><span>${icon.clock} ${Math.max(1, Math.round(song.secs / 60))} min</span>${planPill}</div>`,
    cta: `<button class="btn dark big" data-go="sessions">Start session ${icon.arrow}</button>${scheduled(k) ? '<button class="btn ghost" id="bRest">Rest day</button>' : ''}` };
  const dots = weekDots();
  const tg = teamGoal();
  const quote = QUOTES[(parse(k).getDate()) % QUOTES.length];
  const inbox = S.inbox.filter((x) => x.date === k).slice(0, 3);
  const content = `<div class="home">
    <section class="h-main">
      <div class="greet"><h1>${greet()}, ${esc(S.profile.nick)}! <span class="sunic">${icon.sun}</span></h1><p class="lede">Same moves. New groove.</p></div>
      <div class="hero-card">
        <div class="hc-txt"><p class="eyebrow">${hero.eyebrow}</p><h2>${hero.title}</h2>${hero.body.startsWith('<') ? hero.body : `<p>${hero.body}</p>`}<div class="row">${hero.cta}</div></div>
        <div class="hc-art" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="leafy"></span>${me({ size: 210, poses: `${fm.seq ? fm.seq.join(',') : `${fm.a},${fm.b},${fm.b},${fm.a}`}`, beat: 0.6 })}<span class="sticker">Dance<br>heals<br>slowly</span></div>
      </div>
      <h3 class="sec">Quick picks</h3>
      <div class="quick">
        <button class="qp" data-go="music"><span class="qi q1">${icon.music}</span><b>Music</b><small>Pick your vibe</small></button>
        <button class="qp" data-go="music" data-arg="scenes"><span class="qi q2">${icon.image}</span><b>Scenes</b><small>Change your room</small></button>
        <button class="qp" data-go="league"><span class="qi q3">${icon.league}</span><b>League</b><small>Check your crew</small></button>
        <button class="qp" data-go="progress"><span class="qi q4">${icon.progress}</span><b>Progress</b><small>See your week</small></button>
      </div>
      ${inbox.length ? `<div class="card inbox"><h3>Cheers for you</h3>${inbox.map((x) => `<div class="ib">${x.physio ? `<span class="pico sm">${icon.steth}</span>` : mini(x.color, { size: 36, skin: x.skin, poses: 'swayL,swayR' })}<p><b>${esc(x.from)}</b> ${esc(x.text)}</p></div>`).join('')}<p class="small">League cheers are from simulated demo players in this prototype.</p></div>` : ''}
    </section>
    <aside class="h-side">
      <div class="statrow">
        <div class="card stat"><span class="si flame">${icon.flame}</span><b>${st.days}</b><small>day${st.days === 1 ? '' : 's'} on plan</small></div>
        <div class="card stat">${ring(wkDone / S.rx.perWeek, `${wkDone}/${S.rx.perWeek}`, '')}<small>sessions this week</small></div>
      </div>
      <div class="card week"><h3>This week</h3>
        <div class="dots">${dots.map((x) => `<div class="dd ${x.state}" title="${x.name}: ${x.state}"><i>${x.state === 'done' ? icon.check : x.state === 'rest' ? icon.moon : ''}</i><span>${x.name}</span></div>`).join('')}</div>
        <p class="small">${st.passUsed ? 'Flex Pass used this week, so your streak is safe. ' : ''}Rest days and unscheduled days never break your streak.</p></div>
      <div class="card quote"><p>“${quote}”</p><button class="iconbtn" data-howto aria-label="How to play">${icon.arrow}</button></div>
      <button class="card together-mini" data-go="league"><div><p class="eyebrow">Groove Together</p><b>${tg.done}/${tg.target} sessions as a crew</b>${bar(tg.done / tg.target)}<small>You’ve added ${tg.mine} this week</small></div></button>
    </aside></div>`;
  app.innerHTML = shell(content, 'home');
  const br = $('#bRest'); if (br) br.onclick = restSheet;
  hydrate(); showUnlocks();
}
function restSheet() {
  const s = sheet(`<p class="eyebrow">${icon.moon} Rest day</p><h2>Resting is part of the plan.</h2><p>Logging a rest day keeps your streak safe. It doesn’t earn points, and it never counts against you.</p><div class="row"><button class="btn dark" data-ok>Log a rest day</button><button class="btn ghost" data-close>Not today</button></div>`);
  $('[data-ok]', s.el).onclick = () => { restDay(); s.close(); toast('Rest day logged. Enjoy it.'); home(); hydrate(); };
}
function showUnlocks() {
  const items = takeUnseen(); if (!items.length) return;
  confetti(); sfx.fanfare();
  const cos = items.map((b) => cosmeticFor(b.id)).filter(Boolean);
  sheet(`<div class="unlock"><p class="eyebrow">New badge${items.length > 1 ? 's' : ''}</p>
    <div class="ub-row">${items.map((b) => badgeIcon(b, true)).join('')}</div>
    <h2>${items.map((b) => esc(b.name)).join(' + ')}</h2><p>${items.map((b) => esc(b.desc)).join('. ')}.</p>
    ${cos.length ? `<p class="small">Unlocked for your avatar: <b>${cos.map((c) => esc(c.name)).join(', ')}</b></p><div class="row center"><button class="btn dark" data-wear="${cos[0].kind}:${cos[0].id}">Wear the ${esc(cos[0].name.toLowerCase())}</button><button class="btn ghost" data-close>Later</button></div>` : '<div class="row center"><button class="btn dark" data-close>Nice</button></div>'}</div>`);
}
on(document, '[data-wear]', 'click', (e, b) => { const [k, id] = b.dataset.wear.split(':'); if (S.wear[k] !== id) wearItem(k, id); const w = b.closest('.sheet-wrap'); if (w) w.click(); toast('Looking good'); if (current === 'profile') profile('avatar'); else if (current === 'home') home(); hydrate(); });
const CAT_COL = { Progress: 'o', Consistency: 't', Special: 'l', League: 'c' };
function badgeIcon(b, big = false) { const has = !!S.badges[b.id]; return `<span class="bi ${CAT_COL[b.cat]} ${has ? '' : 'off'} ${big ? 'big' : ''}">${icon[b.icon]}</span>`; }

// ---------------------------------------------------------------- session setup
function sessions() {
  const song = routineFor(), can = earnable(), T = trackOf(), rx = S.rx;
  const avail = TRACKS.filter(playable), scenesOk = SCENES.filter(unlocked);
  const status = can.ok ? `<p class="ok-line">${icon.star} Finishing earns <b>${POINTS.session} points</b> and adds 1 to Groove Together.</p>`
    : `<p class="warn-line">${icon.check} Your plan is done for ${can.weekLeft === 0 ? 'this week' : 'today'}. You can replay for fun, but it earns no points. Rest is part of the plan.</p>`;
  const content = `<div class="setup">
    <section class="col">
      <div><p class="eyebrow">${icon.steth} Prescribed by ${esc(rx.physio)}</p><h1>${esc(rx.title)}</h1>
        <p class="lede">${esc(rx.stage)} · ${rx.exercises.length} moves · about ${Math.max(1, Math.round(song.secs / 60))} min · ${rx.bpm} BPM pace</p></div>
      <div class="card"><div class="ch"><h3>Your routine</h3><span class="small">Set by your physio</span></div>
        <ol class="routine">${song.exercises.map((x, i) => `<li><span class="n">${i + 1}</span>${me({ size: 54, poses: `${movePoses(CORE[x.move])}`, beat: song.spb * CORE[x.move].cycle / 2 })}<div><b>${esc(x.name)}</b><small>${esc(x.cue)}</small></div><span class="tgt">${targetText(x)}</span></li>`).join('')}</ol>
        <p class="small">A warm-up, a short breather between moves and a cool-down are added for you. The music counts every rep.</p></div>
      <div class="card"><h3>Plan settings</h3>
        <div class="setrow"><div><b>Dance intensity</b><small>How much the rest of your body dances. Your exercises stay the same.</small></div></div>
        <div class="seg wide" role="radiogroup" aria-label="Dance intensity">${INTENSITY.map((x, i) => `<button role="radio" data-int="${i}" aria-checked="${S.prefs.intensity === i}" aria-pressed="${S.prefs.intensity === i}" ${i > rx.maxIntensity ? 'disabled' : ''}>${i > rx.maxIntensity ? icon.lock : ''}${x.n}</button>`).join('')}</div>
        <p class="small">${INTENSITY[S.prefs.intensity].d}.${rx.maxIntensity < 3 ? ` Higher levels need your physio’s approval.` : ''}</p>
        <label class="switch"><input type="checkbox" id="pLite" ${S.prefs.lite ? 'checked' : ''}><span></span><div><b>Start in Lite</b><small>Every move a step smaller. Always allowed, full points.</small></div></label>
        <label class="switch"><input type="checkbox" id="pCam" ${S.prefs.camera ? 'checked' : ''}><span></span><div><b>Camera feedback</b><small>PERFECT / GREAT / GOOD on every rep, your shadow and form tips. Just for fun: never affects points.</small></div></label>
      </div>
    </section>
    <aside class="col">
      <div class="card"><div class="ch"><h3>Music</h3><button class="link" data-go="music">Browse all</button></div>
        <div class="trk-now"><span class="cover" style="--a:${T.cover[0]};--b:${T.cover[1]}">${icon.music}</span><div><b>${esc(T.title)}</b><small>${songLine(T)} · danced at ${Math.round(song.bpm)} BPM</small></div><button class="iconbtn" id="bPrev" aria-label="Preview ${esc(T.title)}">${icon.play}</button></div>
        <div class="chips" role="radiogroup" aria-label="Track">${avail.map((t) => `<button class="chip ${t.id === T.id ? 'on' : ''}" role="radio" aria-checked="${t.id === T.id}" data-track="${t.id}">${esc(t.title)}</button>`).join('')}</div></div>
      <div class="card"><div class="ch"><h3>Scene</h3><button class="link" data-go="music" data-arg="scenes">See all</button></div>
        <div class="scene-mini">${scenesOk.map((x) => `<button class="sc ${x.id === S.prefs.scene ? 'on' : ''}" data-scene="${x.id}" aria-pressed="${x.id === S.prefs.scene}"><canvas class="scenecv" data-scene="${x.id}" width="200" height="120" aria-hidden="true"></canvas><span>${esc(x.name)}</span></button>`).join('')}</div></div>
      <div class="card startcard">${status}
        <button class="btn dark big block" id="bStart">${icon.play} Start session</button>
        <button class="btn ghost block" id="bPractice">Practice run · 1 min · no points</button>
        <p class="small center">Pause, Lite and “That hurt” are always one tap away.</p></div>
    </aside></div>`;
  app.innerHTML = shell(content, 'sessions');
  drawSceneThumbs();
  $$('[data-int]').forEach((b) => b.onclick = () => { S.prefs.intensity = +b.dataset.int; save(); sessions(); hydrate(); });
  $$('[data-track]').forEach((b) => b.onclick = () => { S.prefs.track = b.dataset.track; save(); stopPreview(); sessions(); hydrate(); });
  $$('button[data-scene]').forEach((b) => b.onclick = () => { S.prefs.scene = b.dataset.scene; save(); sessions(); hydrate(); });
  $('#pLite').onchange = (e) => { S.prefs.lite = e.target.checked; save(); };
  $('#pCam').onchange = (e) => { S.prefs.camera = e.target.checked; save(); };
  let playing = false;
  $('#bPrev').onclick = (e) => { unlockAudio(); const btn = e.currentTarget; if (playing) { stopPreview(); playing = false; btn.innerHTML = icon.play; return; } playing = true; btn.innerHTML = icon.pause; previewTrack(T, () => { playing = false; btn.innerHTML = icon.play; }); };
  $('#bStart').onclick = () => begin(false);
  $('#bPractice').onclick = () => begin(true);
}
function drawSceneThumbs() {
  $$('canvas.scenecv').forEach((c) => {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    drawScene(g, W, H, c.dataset.scene, { t: 0, pulse: 0, cx: W / 2, floorY: H * 0.74, s: H / 560, reduced: true });
    drawFigure(g, W / 2, H * 0.44, H / 820, POSES.vUp, { body: outfitOf().color, skin: S.profile.skin, glove: outfitOf().glove, glow: false, outline: c.dataset.scene === 'studio' ? 'rgba(255,248,242,.95)' : undefined });
  });
}

// ---------------------------------------------------------------- check-in → camera → play
function begin(practice) {
  unlockAudio();
  if (practice) return preSong(null, true);
  const ci = lastCheckin();
  if (ci) return preSong(ci, false);
  checkin();
}
function checkin() {
  const c = { pain: 2, settled: true, stiffness: 'some', energy: 'ok' };
  const prev = S.checkins[S.checkins.length - 1];
  app.innerHTML = shell(`<div class="flow">
    <button class="back" data-go="sessions">${icon.back} Back</button>
    <div class="ci">
      <div class="card ci-q"><p class="eyebrow">10-second check-in</p><h1>How’s your body today?</h1><p class="lede">This sets today’s version of your routine. There are no wrong answers.</p>
        <div class="q"><label for="pain">Pain right now <output id="pOut">2/10</output></label><input type="range" id="pain" min="0" max="10" value="2" aria-describedby="pTicks"><div class="ticks" id="pTicks"><span>0 none</span><span>5</span><span>10 worst</span></div></div>
        <div class="q"><span class="ql">Did yesterday’s pain settle by this morning?</span><div class="seg" data-k="settled"><button data-v="true">Yes</button><button data-v="false">No</button></div></div>
        <div class="q"><span class="ql">Stiffness</span><div class="seg" data-k="stiffness"><button data-v="low">Low</button><button data-v="some">Some</button><button data-v="lots">A lot</button></div></div>
        <div class="q"><span class="ql">Energy</span><div class="seg" data-k="energy"><button data-v="low">Low</button><button data-v="ok">OK</button><button data-v="good">Good</button></div></div>
        ${prev && prev.after != null ? `<p class="small">After your last session you rated pain ${prev.after}/10.</p>` : ''}</div>
      <div class="card ci-plan" id="plan" aria-live="polite"></div>
    </div></div>`, 'sessions');
  const pain = $('#pain');
  const sync = () => {
    c.pain = +pain.value; $('#pOut').textContent = `${c.pain}/10`;
    $$('.seg').forEach((sg) => $$('button', sg).forEach((b) => b.setAttribute('aria-pressed', String(String(c[sg.dataset.k]) === b.dataset.v))));
    const plan = planFor(c);
    const T = { green: ['Green · your full routine', 'Full routine', 'Every move as prescribed. Lite is always one tap away.'], amber: ['Amber · take it easier', 'Lite routine', 'Every move a step smaller and the music a little slower. Still full points.'], red: ['Red · Gentle Groove', 'Gentle Groove', 'Breathing and watch-and-imagine moves only. Still counts toward your week. If this keeps happening, tell your physio.'] }[plan];
    $('#plan').className = 'card ci-plan ' + plan;
    $('#plan').innerHTML = `<div class="lights" aria-hidden="true"><i class="${plan === 'green' ? 'on' : ''}"></i><i class="${plan === 'amber' ? 'on' : ''}"></i><i class="${plan === 'red' ? 'on' : ''}"></i></div>
      <p class="eyebrow">${T[0]}</p><h2>${T[1]}</h2><p>${T[2]}</p>
      <button class="btn dark big block" id="go">Let’s go ${icon.arrow}</button>
      <button class="btn ghost block" id="rest">Make today a rest day</button>`;
    $('#go').onclick = () => { const saved = addCheckin({ ...c }); sfx.tap(); preSong(saved, false); };
    $('#rest').onclick = () => { addCheckin({ ...c }); restDay(); toast('Rest day logged. Your streak is safe.'); go('home'); };
  };
  pain.oninput = sync;
  $$('.seg').forEach((sg) => sg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; c[sg.dataset.k] = v === 'true' ? true : v === 'false' ? false : v; sync(); });
  sync();
}
async function preSong(ci, practice) {
  const song = routineFor({ plan: ci ? ci.plan : 'green', practice });
  if (!S.prefs.camera) return startPlay(song);
  app.innerHTML = shell(`<div class="flow"><button class="back" data-go="sessions">${icon.back} Back</button>
    <div class="card camset"><p class="eyebrow">${icon.camera} Camera feedback</p><h2 id="cMsg">Starting your camera…</h2><p id="cSub">Prop your phone or laptop about 2 m away so your whole body is in view. Video stays on this device and is never saved.</p>
    <div class="camview"><canvas id="cPrev" width="640" height="480" aria-label="Camera preview"></canvas></div>
    <div class="camchecks" aria-live="polite"><span id="ckU">Shoulders and arms</span><span id="ckL">Legs</span><span id="ckF">Whole body</span></div>
    <div class="row"><button class="btn dark big" id="cGo" disabled>Start the session</button><button class="btn ghost" id="cSkip">Play without the camera</button></div></div></div>`, 'sessions');
  let alive = true;
  $('#cSkip').onclick = () => { alive = false; startPlay(song, false); };
  const prev = $('#cPrev');
  (function draw() { if (!alive || !prev.isConnected) return; drawSkeleton(prev.getContext('2d'), 640, 480, { color: '#FF8C52', guide: true }); requestAnimationFrame(draw); })();
  const ok = await startCamera();
  if (!prev.isConnected) return;
  if (!ok) {
    $('#cMsg').textContent = 'The camera isn’t available here';
    $('#cSub').textContent = tracker.error === 'blocked' ? 'Camera access was blocked. You can allow it in your browser, or play without it: points never depend on the camera.' : 'Body tracking couldn’t load (it downloads the first time). Check your connection, or play without it.';
    return;
  }
  $('#cMsg').textContent = 'Step back until your whole body shows';
  const chk = setInterval(() => {
    if (!prev.isConnected) { clearInterval(chk); return; }
    const seen = performance.now() / 1000 - tracker.lastSeen < 0.5;
    $('#ckU').classList.toggle('ok', seen); $('#ckL').classList.toggle('ok', seen && tracker.legsSeen); $('#ckF').classList.toggle('ok', seen && tracker.fullBody);
    if (seen) { $('#cMsg').textContent = tracker.fullBody ? 'Perfect. You’re fully in view.' : 'Nearly. Step back so your feet show too.'; $('#cGo').disabled = false; }
  }, 300);
  $('#cGo').onclick = () => { alive = false; clearInterval(chk); startPlay(song, true); };
}
function startPlay(song, camera = false) {
  unlockAudio();
  app.innerHTML = '<div id="playroot" class="playroot"></div>';
  liveSong = playSong($('#playroot'), {
    song, player: S.profile, outfit: outfitOf(), wear: S.wear, track: trackOf(song.track), camera: camera && tracker.ready, lite: S.prefs.lite, mini,
    onDone: (res) => { liveSong = null; complete(res); },
  });
  hydrate();
}

// ---------------------------------------------------------------- session complete
function complete(res) {
  const song = res.song, ci = lastCheckin();
  const out = recordSession({ status: res.status, practice: song.practice, secs: res.secs, played: res.played, lite: res.lite, plan: song.plan, track: song.track, scene: song.scene, moves: res.moves, hurt: res.hurt, fun: res.fun });
  takeUnseen(); // shown right here instead of as a pop-up
  const wk = weekKey(), tg = out.teamAfter, tgBefore = out.teamBefore;
  const kind = out.practice && res.status !== 'partial' ? 'practice' : res.status;
  const T = {
    complete: ['Session complete!', ['That’s today’s routine done. The song counted every rep.', 'Steady and on the beat. Exactly the point.', 'You showed up, and that’s the whole game.'][S.sessions.length % 3]],
    safe: ['You listened to your body.', 'Stopping when something hurts is the safest move there is. It’s logged for your physio, and it still counts toward your week.'],
    partial: ['Saved as a partial session', 'No points this time, and no penalty either. Pick it up again whenever you’re ready.'],
    practice: [song.practice ? 'Practice run done!' : 'Nice extra groove!', song.practice ? 'Now you know the moves. Your real session earns the points.' : 'Your plan was already done, so this one earns no points. Rest is part of the routine too.'],
  }[kind];
  const done = res.moves.length, total = song.exercises.length;
  const content = `<div class="done">
    <div class="card done-hero ${kind}"><canvas class="done-cv" id="doneCv" aria-hidden="true"></canvas>
      <div class="dh-txt"><p class="eyebrow">${kind === 'complete' ? 'Well done' : kind === 'safe' ? 'Safe stop' : kind === 'partial' ? 'Session saved' : 'Just for fun'}</p><h1>${T[0]}</h1><p class="lede">${T[1]}</p></div>
      <div class="pts-big ${out.points ? '' : 'zero'}"><b id="ptsN">+0</b><span>points</span></div>
    </div>
    ${res.fun ? `<div class="card groove-res"><div><p class="eyebrow">Your groove · just for fun</p><h3>${res.fun.stars >= 2.4 ? 'Dancing like a pro!' : res.fun.stars >= 1.6 ? 'Great moves!' : 'Nice effort, it gets easier!'}</h3><p class="small">How closely you matched the coach. It never changes your points.</p></div>
      <div class="gr-stars">${[1, 2, 3].map((n) => `<i class="${res.fun.stars >= n - 0.5 ? 'on' : ''}">${icon.star}</i>`).join('')}</div>
      <div class="gr-tally"><span class="p"><b>${res.fun.perfect}</b>Perfect</span><span class="g"><b>${res.fun.great}</b>Great</span><span class="o"><b>${res.fun.good}</b>Good</span><span class="a"><b>${res.fun.again}</b>Try again</span><span><b>×${res.fun.maxCombo}</b>Best combo</span></div></div>` : ''}
    <div class="done-stats">
      <div class="card stat"><span class="si o">${icon.dumbbell}</span><b>${done}/${total}</b><small>moves done</small></div>
      <div class="card stat"><span class="si t">${icon.clock}</span><b>${fmtTime(res.secs)}</b><small>time moving</small></div>
      <div class="card stat">${ring(out.week.done / out.week.target, `${out.week.done}/${out.week.target}`, '')}<small>${out.weekGoalJustMet ? 'weekly plan complete!' : 'sessions this week'}</small></div>
      <div class="card stat"><span class="si flame">${icon.flame}</span><b>${out.streak.days}</b><small>days on plan</small></div>
    </div>
    <div class="done-grid">
      <div class="card"><h3>${out.newBadges.length ? 'New badges' : 'Next milestones'}</h3>
        ${out.newBadges.length ? `<div class="nb">${out.newBadges.map((b) => { const c = cosmeticFor(b.id); return `<div class="nbi">${badgeIcon(b, true)}<div><b>${esc(b.name)}</b><small>${esc(b.desc)}${c ? ` · unlocks ${esc(c.name)}` : ''}</small></div></div>`; }).join('')}</div>` : nextMilestones(3)}
        ${out.rankAfter.i > out.rankBefore.i ? `<p class="rankup">${icon.star} New rank: <b>${esc(out.rankAfter.name)}</b>. New music, scenes or outfits unlocked.</p>` : ''}</div>
      <div class="card"><h3>Groove Together</h3><p class="small">${out.counted ? 'Your session went to the crew goal.' : 'Only planned sessions count toward the crew goal.'}</p>
        <div class="tg-num"><b>${tg.done}</b>/${tg.target} sessions</div>${bar(tg.done / tg.target, 'teal')}
        <p class="small">${tg.done >= tg.target ? 'Goal reached! Everyone unlocks the Team Player badge.' : `${tg.target - tg.done} to go this week. Every planned session counts the same.`}</p>
        <button class="btn ghost" data-go="league">Cheer your crew</button></div>
      <div class="card"><h3>How does it feel now?</h3><p class="small">Shared only with your physio. It never changes your points.</p>
        <div class="q"><label for="pa">Pain after <output id="paOut"></output></label><input type="range" id="pa" min="0" max="10" value="${ci ? ci.pain : 2}"><div class="ticks"><span>0</span><span>5</span><span>10</span></div></div>
        <p class="small" id="paNote"></p>
        <button class="btn dark big block" id="cdGo">Save and go home</button></div>
    </div></div>`;
  app.innerHTML = shell(content, 'sessions');
  hydrate();
  // points count up
  const ptsN = $('#ptsN'), t0 = performance.now(), P = out.points;
  (function count(now) { const k = clamp((now - t0) / 900), v = Math.round(P * (1 - Math.pow(1 - k, 3))); ptsN.textContent = (P ? '+' : '') + v; if (k < 1 && ptsN.isConnected) requestAnimationFrame(count); })(t0);
  if (out.counted) { confetti(); sfx.fanfare(); } else sfx.chime([72, 76, 79]);
  doneArt();
  const pa = $('#pa');
  const syncP = () => { const v = +pa.value; $('#paOut').textContent = v + '/10'; const before = ci ? ci.pain : v; $('#paNote').textContent = v > 5 ? 'That’s high. Rest today, and tell your physio if it hasn’t settled by tomorrow morning.' : v >= before + 2 ? 'A bit higher than before. It should settle by the next morning; tomorrow’s check-in will adjust.' : 'Good. Any pain after exercise should settle by the next morning.'; };
  pa.oninput = syncP; syncP();
  $('#cdGo').onclick = () => { setPainAfter(+pa.value); go('home'); };
  if (tg.done >= tg.target && tgBefore.done < tgBefore.target && !S.celebrated[wk]) { S.celebrated[wk] = true; save(); setTimeout(teamCelebration, 1200); }
}
function doneArt() {
  const c = $('#doneCv'); if (!c) return;
  const g = c.getContext('2d'), t0 = performance.now();
  (function loop(now) {
    if (!c.isConnected) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const t = Math.max(0, now - t0) / 1000, list = ['vUp', 'clapTop', 'shimmy', 'out'], bt = t / 0.5, k = Math.floor(bt);
    drawFigure(g, W / 2, H * 0.5, H / 720, lerpPose(POSES[list[k % 4]], POSES[list[(k + 1) % 4]], eio(clamp((bt - k) * 1.5))), { body: outfitOf().color, glove: outfitOf().glove, skin: S.profile.skin, hat: S.wear.hat, trail: S.wear.trail, glowColor: 'rgba(255,140,82,0.3)' });
    requestAnimationFrame(loop);
  })(t0);
}
function nextMilestones(n) {
  const next = BADGES.filter((b) => !S.badges[b.id]).map((b) => ({ b, p: badgeProgress(b) })).sort((x, y) => y.p.have / y.p.need - x.p.have / x.p.need).slice(0, n);
  return `<div class="ms">${next.map(({ b, p }) => `<div class="msi">${badgeIcon(b)}<div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>${bar(p.have / p.need)}</div><span class="small">${p.have}/${p.need}</span></div>`).join('') || '<p class="small">Every badge earned. Legend.</p>'}</div>`;
}
function teamCelebration() {
  confetti(3200); sfx.fanfare();
  const rows = crew();
  sheet(`<div class="unlock"><p class="eyebrow">Groove Together</p><div class="crewdance">${rows.slice(0, 5).map((r, i) => mini(r.color, { size: 70, skin: r.skin, poses: 'vUp,clapTop,out,swayL', off: i * 0.2 })).join('')}</div>
    <h2>Your crew hit the weekly goal!</h2><p>${teamGoal().done} sessions together, each one following its own plan. Everyone who took part earns the Team Player badge.</p>
    <div class="row center"><button class="btn dark" data-close>Celebrate</button></div></div>`);
  hydrate();
}

// ---------------------------------------------------------------- progress
function progress(range = 'week') {
  const st = streak(), sum = weekSummary(), base = weekSummary(firstWeek());
  const days = range === 'week' ? 7 : range === 'month' ? 35 : 100000;
  const since = addDays(today(), -days + 1);
  const ses = S.sessions.filter((s) => (range === 'week' ? weekKey(parse(s.date)) === weekKey() : s.date >= since));
  const done = ses.filter((s) => s.status !== 'partial' && !s.practice).length, pts = ses.reduce((a, s) => a + s.points, 0);
  const data = chart(range), max = Math.max(range === 'week' ? 1 : S.rx.perWeek, ...data.map((d) => d.v));
  const pains = S.checkins.slice(-14);
  const hist = [...S.sessions].reverse().slice(0, 8);
  const statusTxt = (s) => s.practice ? 'Practice · 0 pts' : s.status === 'complete' ? `Completed · +${s.points}` : s.status === 'safe' ? `Safe stop · +${s.points}` : 'Partial · 0 pts';
  const content = `<div class="page">
    <div class="ph"><div><h1>Your progress</h1><p class="lede">Participation, measured against your own starting point.</p></div>
      <div class="seg" role="tablist">${[['week', 'Week'], ['month', 'Month'], ['all', 'All time']].map(([k, l]) => `<button role="tab" aria-selected="${range === k}" aria-pressed="${range === k}" data-range="${k}">${l}</button>`).join('')}</div></div>
    <div class="stat3">
      <div class="card stat"><span class="si l">${icon.progress}</span><b>${done}</b><small>sessions completed</small></div>
      <div class="card stat"><span class="si o">${icon.star}</span><b>${pts.toLocaleString()}</b><small>points earned</small></div>
      <div class="card stat"><span class="si flame">${icon.flame}</span><b>${st.days}</b><small>days on plan · best ${Math.max(S.bestStreak, st.days)}</small></div>
    </div>
    <div class="card chartcard"><div class="ch"><h3>${range === 'week' ? 'Sessions this week' : 'Sessions per week'}</h3><span class="small">${range === 'week' ? `Plan: ${S.rx.perWeek} this week` : `Plan: ${S.rx.perWeek} a week`}</span></div>
      <div class="chart" role="img" aria-label="Sessions chart">${data.map((d) => `<div class="cb ${d.today ? 'today' : ''} ${d.rest ? 'rest' : ''}"><i style="--h:${(d.v / max) * 100}%">${d.v ? `<em>${d.v}</em>` : ''}</i><span>${esc(d.label)}</span></div>`).join('')}</div></div>
    <div class="grid2">
      <div class="card"><h3>This week’s summary</h3>
        <ul class="sumlist"><li><span>Planned sessions</span><b>${sum.sessions} of ${sum.target}</b></li><li><span>Time moving</span><b>${sum.minutes} min</b></li><li><span>Rest days logged</span><b>${sum.rests}</b></li><li><span>Sessions in Lite</span><b>${sum.lite}</b></li><li><span>Points</span><b>${sum.points}</b></li></ul>
        <p class="baseline">${icon.spark} ${weekKey() === firstWeek() ? 'This is your first week. It becomes your baseline: every week after is compared to you, nobody else.' : sum.sessions >= base.sessions ? `You’ve done ${sum.sessions - base.sessions} more session${sum.sessions - base.sessions === 1 ? '' : 's'} than in your first week.` : 'A quieter week than your first. That’s okay. Recovery isn’t a straight line.'}</p></div>
      <div class="card"><div class="ch"><h3>Milestones</h3><button class="link" data-go="badges">See all</button></div>${nextMilestones(4)}</div>
    </div>
    <div class="grid2">
      <div class="card"><h3>Session history</h3>${hist.length ? `<ul class="hist">${hist.map((s) => `<li><span class="hd">${parse(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span class="hs ${s.practice ? 'practice' : s.status}">${statusTxt(s)}</span><span class="small">${fmtTime(s.secs)}${s.lite ? ' · Lite' : ''}</span></li>`).join('')}</ul>` : '<p class="small">Your sessions will show up here.</p>'}</div>
      <div class="card clinical"><span class="tag clin">${icon.steth} For you and your physio</span><h3>How your body felt</h3>${spark(pains.map((c) => c.pain), pains.map((c) => c.plan))}
        <p class="small">Check-in pain is shared with your physio only, never your league. It isn’t a score: points measure showing up, and only your physio can judge your recovery.</p></div>
    </div></div>`;
  app.innerHTML = shell(content, 'progress');
  $$('[data-range]').forEach((b) => b.onclick = () => { progress(b.dataset.range); hydrate(); });
}
function spark(vals, plans) {
  if (vals.length < 2) return `<p class="small">${vals.length ? `Today: ${vals[0]}/10. The trend appears after your next check-in.` : 'No check-ins yet.'}</p>`;
  const w = 520, h = 130, n = vals.length;
  const x = (i) => 24 + (i / (n - 1)) * (w - 44), y = (v) => 12 + (1 - v / 10) * (h - 34);
  const col = { green: '#359FA0', amber: '#E8A33D', red: '#E05A47' };
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Pain over your last ${n} check-ins"><rect x="0" y="${y(10)}" width="${w}" height="${y(5) - y(10)}" fill="rgba(224,90,71,0.07)"/><rect x="0" y="${y(2)}" width="${w}" height="${y(0) - y(2)}" fill="rgba(53,159,160,0.08)"/>
    <polyline fill="none" stroke="#FF8C52" stroke-width="3" stroke-linejoin="round" points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${col[plans[i]] || '#FF8C52'}" stroke="#fff" stroke-width="2"/>`).join('')}
    <text x="2" y="${y(10) + 4}" fill="#7A878C" font-size="11">10</text><text x="6" y="${y(0) + 4}" fill="#7A878C" font-size="11">0</text></svg>`;
}

// ---------------------------------------------------------------- league
function league() {
  const rows = crew(), tg = teamGoal(), cc = cheerChain(), feed = crewFeed();
  const ranked = S.privacy.showRanking ? [...rows].sort((a, b) => b.pct - a.pct || a.nick.localeCompare(b.nick)) : [rows[0], ...rows.slice(1).sort((a, b) => a.nick.localeCompare(b.nick))];
  const content = `<div class="page">
    <div class="ph"><div><h1>Your league</h1><p class="lede">Move together. Every planned session counts the same, whatever the exercise.</p></div></div>
    <p class="demo-note">${icon.eye} Demo crew: the other players are simulated for this prototype.</p>
    <div class="together">
      <div class="tg-txt"><p class="eyebrow">This week’s crew goal</p><h2>Groove Together</h2><p class="tg-big"><b>${tg.done}</b>/${tg.target} sessions</p>${bar(tg.done / tg.target, 'teal big')}
        <p>${tg.done >= tg.target ? 'Goal reached! Everyone who took part earns Team Player.' : `${tg.target - tg.done} to go. You’ve added <b>${tg.mine}</b>.`} The target is 75% of everyone’s planned sessions, so nobody has to do extra.</p></div>
      <div class="tg-art" aria-hidden="true">${rows.slice(0, 5).map((r, i) => mini(r.color, { size: 92, skin: r.skin, poses: 'swayL,clapTop,swayR,out', off: i * 0.17, beat: 0.55 })).join('')}</div>
    </div>
    <div class="grid2 lg">
      <div class="card members"><div class="ch"><h3>Sunrise Crew <span class="small">· ${rows.length} people</span></h3>
        <label class="switch sm"><input type="checkbox" id="rankT" ${S.privacy.showRanking ? 'checked' : ''}><span></span><small>Show ranking</small></label></div>
        <ul class="mlist">${ranked.map((r, i) => `<li class="${r.me ? 'me' : ''}">${S.privacy.showRanking ? `<span class="rk">${i + 1}</span>` : ''}${mini(r.color, { size: 42, skin: r.skin, poses: 'swayL,swayR', off: i * 0.3, glove: r.me ? outfitOf().glove : '' })}
          <div class="mi"><b>${r.me ? 'You' : esc(r.nick)}</b><small>${r.done} of ${r.plan} planned${r.done >= r.plan ? ' · plan complete' : ''}</small>${bar(r.pct, r.done >= r.plan ? 'teal' : '')}</div>
          ${r.me ? `<span class="small">${S.privacy.shareStreak ? `${icon.flame} ${r.streak}` : ''}</span>` : cheeredToday(r.nick) ? `<span class="sent" aria-label="Cheer sent">${cheeredToday(r.nick)}</span>` : `<button class="btn ghost small" data-cheer="${esc(r.nick)}">Cheer</button>`}</li>`).join('')}</ul>
        <p class="small">${S.privacy.showRanking ? 'Ranked by share of each person’s own plan, so a 3-session plan and a 5-session plan are equal. Nobody is ever marked as last.' : 'No rankings: everyone’s progress is shown against their own plan.'}</p></div>
      <div class="col">
        <div class="card"><p class="eyebrow">Bonus challenge</p><h3>Cheer Chain</h3><p class="small">Send ${cc.target} cheers as a crew this week.</p>${bar(cc.done / cc.target)}<p class="small">${cc.done}/${cc.target} · you’ve sent ${cc.mine}</p></div>
        <div class="card"><h3>This week</h3><ul class="feed">${feed.map((f) => `<li>${mini(f.color, { size: 36, skin: f.skin, poses: 'out,vUp' })}<p><b>${esc(f.nick)}</b> ${esc(f.text)}<small>${f.ago < 24 ? `${f.ago}h ago` : `${Math.round(f.ago / 24)}d ago`}</small></p></li>`).join('') || '<li class="small">Quiet so far this week.</li>'}</ul></div>
        <div class="card privacy-c"><h3>${icon.eye} What your league sees</h3><p class="small">Your nickname, avatar, sessions out of your plan${S.privacy.shareStreak ? ', days on plan' : ''}${S.privacy.shareMilestones ? ' and badges' : ''}. Never your injury, exercises or pain. <button class="link" data-go="profile" data-arg="settings">Privacy settings</button></p></div>
      </div>
    </div></div>`;
  app.innerHTML = shell(content, 'league');
  $('#rankT').onchange = (e) => { S.privacy.showRanking = e.target.checked; save(); league(); hydrate(); };
  $$('[data-cheer]').forEach((b) => b.onclick = () => {
    const nick = b.dataset.cheer;
    const pop = document.createElement('div'); pop.className = 'cheerpop'; pop.setAttribute('role', 'menu');
    pop.innerHTML = CHEERS.map((c) => `<button role="menuitem" data-e="${c.e}">${c.e} ${esc(c.text)}</button>`).join('');
    $$('.cheerpop').forEach((x) => x.remove()); b.parentElement.appendChild(pop);
    pop.onclick = (e) => { const x = e.target.closest('[data-e]'); if (!x) return; const nb = sendCheer(nick, x.dataset.e); sfx.pop(); toast(`${x.dataset.e} sent to ${esc(nick)}`); league(); hydrate(); if (nb.length) showUnlocks(); };
  });
}

// ---------------------------------------------------------------- music + scenes
function music(tab = 'music') {
  const T = trackOf();
  const card = (t) => { const ok = playable(t); return `<div class="trk ${t.id === T.id ? 'on' : ''} ${ok ? '' : 'locked'}">
      <div class="cover big" style="--a:${t.cover[0]};--b:${t.cover[1]}"><span class="gen">${esc(t.genre || GENRES[t.world])}</span>${icon.music}${ok ? `<button class="playb" data-prev="${t.id}" aria-label="Preview ${esc(t.title)}">${icon.play}</button>` : `<span class="lockb">${icon.lock}</span>`}${t.id === T.id ? `<span class="selb">${icon.check}</span>` : ''}</div>
      <b>${esc(t.title)}</b><small>${esc(t.artist || '')}${ok ? '' : unlocked(t) ? ' · Locked: add the song file' : ` · Locked until ${RANKS[t.rank].name}`}</small>
      ${ok ? `<button class="btn ${t.id === T.id ? 'ghost' : 'dark'} small" data-use="${t.id}" ${t.id === T.id ? 'disabled' : ''}>${t.id === T.id ? 'Your session track' : 'Use this track'}</button>` : ''}</div>`; };
  const cur = Math.max(1, ...TRACKS.filter(playable).map((t) => t.phase));
  const content = `<div class="page">
    <div class="ph"><div><h1>${tab === 'music' ? 'Choose your music' : 'Choose your scene'}</h1><p class="lede">${tab === 'music' ? `Three songs per phase. Same moves, different vibes. Each song is fitted to your plan’s pace (${S.rx.bpm} BPM) and never runs faster.` : 'Move in a space that feels right. Scenes change the look, never the exercises.'}</p></div>
      <div class="seg" role="tablist"><button role="tab" aria-selected="${tab === 'music'}" aria-pressed="${tab === 'music'}" data-tab="music">Music</button><button role="tab" aria-selected="${tab === 'scenes'}" aria-pressed="${tab === 'scenes'}" data-tab="scenes">Scenes</button></div></div>
    ${tab === 'music' ? `${PHASES.map((ph) => { const list = TRACKS.filter((t) => t.phase === ph.n), open = list.some(playable);
      return `<section class="phase ${open ? '' : 'locked'} ${ph.n === cur ? 'cur' : ''}"><div class="phase-h"><h2>${ph.name}</h2><span class="small">${esc(ph.vibe)}</span>${ph.n === cur ? '<em class="here">You’re here</em>' : open ? '' : `<em class="lk">${icon.lock} ${RANKS[ph.n - 1].name}</em>`}</div>
        <div class="tracks">${list.map(card).join('')}</div></section>`; }).join('')}
    <p class="small">Prototype playtest: the songs are commercial tracks used for internal testing only. If a song file is missing, the Groove Back band plays instead at the same pace.</p>`
    : `<div class="scenes">${SCENES.map((x) => { const ok = unlocked(x); return `<button class="scn ${x.id === S.prefs.scene ? 'on' : ''} ${ok ? '' : 'locked'}" data-scene="${x.id}" ${ok ? '' : 'disabled'} aria-pressed="${x.id === S.prefs.scene}"><canvas class="scenecv" data-scene="${x.id}" width="420" height="260" aria-hidden="true"></canvas>
      <span class="sn"><b>${esc(x.name)}</b><small>${ok ? esc(x.d) : `Unlocks at ${RANKS[x.rank].name}`}</small></span>${x.id === S.prefs.scene ? `<span class="selb">${icon.check}</span>` : ''}${ok ? '' : `<span class="lockb">${icon.lock}</span>`}</button>`; }).join('')}</div>`}
  </div>`;
  app.innerHTML = shell(content, 'music');
  drawSceneThumbs();
  $$('[data-tab]').forEach((b) => b.onclick = () => { stopPreview(); music(b.dataset.tab); hydrate(); revealPage(app); });
  $$('[data-use]').forEach((b) => b.onclick = () => { S.prefs.track = b.dataset.use; save(); stopPreview(); toast(`${esc(trackOf().title)} is your session track`); music('music'); hydrate(); pop($(`[data-use="${b.dataset.use}"]`)?.closest('.trk')?.querySelector('.selb')); });
  $$('button.scn[data-scene]').forEach((b) => b.onclick = () => { S.prefs.scene = b.dataset.scene; save(); toast(`${esc(sceneOf().name)} selected`); music('scenes'); hydrate(); });
  let playingId = null;
  $$('[data-prev]').forEach((b) => b.onclick = () => {
    unlockAudio();
    $$('[data-prev]').forEach((x) => { x.innerHTML = icon.play; });
    if (playingId === b.dataset.prev) { stopPreview(); playingId = null; return; }
    const t = TRACKS.find((x) => x.id === b.dataset.prev); playingId = t.id; b.innerHTML = icon.pause;
    previewTrack(t, () => { playingId = null; b.innerHTML = icon.play; });
  });
}

// ---------------------------------------------------------------- badges
let badgeCat = 'All';
function badges() {
  const cats = ['All', 'Progress', 'Consistency', 'Special', 'League'];
  const list = BADGES.filter((b) => badgeCat === 'All' || b.cat === badgeCat);
  const have = BADGES.filter((b) => S.badges[b.id]).length;
  const content = `<div class="page">
    <div class="ph"><div><h1>Your badges</h1><p class="lede">Earned by showing up, resting well and supporting your crew. Never by doing more than your plan.</p></div><span class="count-chip">${have}/${BADGES.length} earned</span></div>
    <div class="chips">${cats.map((c) => `<button class="chip ${c === badgeCat ? 'on' : ''}" data-cat="${c}" aria-pressed="${c === badgeCat}">${c}</button>`).join('')}</div>
    <div class="bgrid">${list.map((b) => { const p = badgeProgress(b), c = cosmeticFor(b.id); return `<div class="bcard ${p.done ? 'got' : ''}">${badgeIcon(b, true)}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small>
      ${p.done ? `<span class="earned">${icon.check} Earned ${parse(S.badges[b.id]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>` : `${bar(p.have / p.need)}<span class="small">${p.have}/${p.need}</span>`}
      ${c ? `<span class="reward">Unlocks: ${esc(c.name)}</span>` : ''}</div>`; }).join('')}</div></div>`;
  app.innerHTML = shell(content, 'badges');
  $$('[data-cat]').forEach((b) => b.onclick = () => { badgeCat = b.dataset.cat; badges(); hydrate(); });
}

// ---------------------------------------------------------------- profile + settings
function profile(tab = 'overview') {
  const R = rank(), st = stats(), of = outfitOf();
  const tabs = [['overview', 'Overview'], ['avatar', 'Avatar'], ['plan', 'My plan'], ['settings', 'Settings']];
  const sw = (key, label, sub, val) => `<label class="switch"><input type="checkbox" data-set="${key}" ${val ? 'checked' : ''}><span></span><div><b>${label}</b><small>${sub}</small></div></label>`;
  let body = '';
  if (tab === 'overview') body = `<div class="stat4">
      <div class="card stat"><span class="si o">${icon.star}</span><b>${S.points.toLocaleString()}</b><small>total points</small></div>
      <div class="card stat"><span class="si flame">${icon.flame}</span><b>${streak().days}</b><small>days on plan</small></div>
      <div class="card stat"><span class="si l">${icon.progress}</span><b>${st.sessions}</b><small>sessions</small></div>
      <div class="card stat"><span class="si t">${icon.badges}</span><b>${Object.keys(S.badges).length}</b><small>badges</small></div></div>
    <div class="card"><h3>Ranks and what they unlock</h3><p class="small">Ranks come from points, so they only grow by finishing planned sessions. They unlock looks and music, and say nothing about your recovery.</p>
      <ol class="ranks">${RANKS.map((r, i) => { const u = [...TRACKS.filter((t) => t.rank === i).map((t) => t.title), ...SCENES.filter((x) => x.rank === i).map((x) => x.name), ...OUTFITS.filter((o) => o.rank === i).map((o) => o.name + ' outfit')]; return `<li class="${R.i >= i ? 'got' : ''} ${R.i === i ? 'now' : ''}"><span class="rd">${R.i >= i ? icon.check : i + 1}</span><div><b>${r.name}</b><small>${r.pts.toLocaleString()} pts${u.length ? ' · ' + u.join(', ') : ''}</small></div></li>`; }).join('')}</ol></div>`;
  if (tab === 'avatar') body = `<div class="card"><h3>Skin tone</h3><div class="swatches">${SKIN.map((c) => `<button class="sw ${c === S.profile.skin ? 'on' : ''}" data-skin="${c}" style="background:${c}" aria-label="Skin tone" aria-pressed="${c === S.profile.skin}"></button>`).join('')}</div></div>
    <div class="card"><h3>Outfit</h3><div class="outfits">${OUTFITS.map((o) => { const ok = unlocked(o); return `<button class="outfit ${o.id === S.profile.outfit ? 'on' : ''} ${ok ? '' : 'locked'}" data-outfit="${o.id}" ${ok ? '' : 'disabled'}>${mini(o.color, { size: 64, skin: S.profile.skin, glove: o.glove, poses: 'out,vUp' })}<b>${esc(o.name)}</b><small>${ok ? (o.id === S.profile.outfit ? 'Wearing' : 'Unlocked') : RANKS[o.rank].name}</small></button>`; }).join('')}</div></div>
    <div class="card"><h3>Accessories</h3><p class="small">Each one comes with a badge. Tap to wear, tap again to take off.</p><div class="outfits">${COSMETICS.map((c) => { const ok = hasCosmetic(c), on = S.wear[c.kind] === c.id, b = BADGES.find((x) => x.id === c.badge); return `<button class="outfit ${on ? 'on' : ''} ${ok ? '' : 'locked'}" data-cos="${c.kind}:${c.id}" ${ok ? '' : 'disabled'}>${mini(of.color, { size: 58, skin: S.profile.skin, glove: of.glove, poses: 'out,vUp', hat: c.kind === 'hat' ? c.id : '', trail: c.kind === 'trail' ? c.id : '' })}<b>${esc(c.name)}</b><small>${ok ? (on ? 'Wearing' : 'Unlocked') : esc(b.name)}</small></button>`; }).join('')}</div></div>`;
  if (tab === 'plan') { const rx = S.rx; body = `<div class="card planc"><div class="ch"><div><p class="eyebrow">${icon.steth} ${esc(rx.physio)}</p><h3>${esc(rx.title)}</h3><p class="small">${esc(rx.stage)}${rx.updated ? ` · updated ${parse(rx.updated).toLocaleDateString()}` : ''}</p></div></div>
      <ol class="routine">${rx.exercises.map((x, i) => `<li><span class="n">${i + 1}</span>${me({ size: 46, poses: `${movePoses(CORE[x.move])}` })}<div><b>${esc(CORE[x.move].name)}</b><small>${esc(CORE[x.move].cue)}</small></div><span class="tgt">${exTarget(x)}</span></li>`).join('')}</ol>
      <ul class="sumlist"><li><span>Sessions per week</span><b>${rx.perWeek}</b></li><li><span>Most per day</span><b>${rx.perDay}</b></li><li><span>Suggested days</span><b>${rx.days.map((d) => DAY_NAMES[d]).join(', ')}</b></li><li><span>Pace</span><b>${rx.bpm} BPM</b></li><li><span>Dance intensity allowed</span><b>Up to ${INTENSITY[rx.maxIntensity].n}</b></li><li><span>Position</span><b>${rx.standing ? 'Standing allowed' : 'Seated'}</b></li></ul>
      <p class="note">“${esc(rx.note)}”</p>
      <p class="small">Only your physio can change this plan. You can always make it easier with Lite or a rest day.</p>
      <button class="btn ghost" data-go="physio">${icon.steth} Open the physio view (demo)</button></div>`; }
  if (tab === 'settings') body = `<div class="grid2">
    <div class="card"><h3>Accessibility</h3>${sw('a11y.largeText', 'Larger text', 'Bigger type across the app', S.a11y.largeText)}${sw('a11y.reduceMotion', 'Reduce motion', 'Calmer animations and a still background', S.a11y.reduceMotion)}${sw('a11y.highContrast', 'High contrast', 'Stronger text and outlines', S.a11y.highContrast)}${sw('a11y.sound', 'Sound', 'Music and sound effects. Every cue is also shown on screen.', S.a11y.sound)}</div>
    <div class="card"><h3>Privacy</h3>${sw('privacy.shareMilestones', 'Share badges with my league', 'Your crew sees when you earn one', S.privacy.shareMilestones)}${sw('privacy.shareStreak', 'Share days on plan', 'Shown next to your name in the league', S.privacy.shareStreak)}${sw('privacy.showRanking', 'Show league ranking', 'Off by default. Ranks by share of each person’s own plan.', S.privacy.showRanking)}<p class="small">Pain, injury and exercises are never shared with your league.</p></div>
    <div class="card"><h3>Notifications <em class="beta">Prototype</em></h3>${sw('notify.reminders', 'Session reminder', 'On your suggested days', S.notify.reminders)}
      <div class="field inline"><label for="nTime">Reminder time</label><select id="nTime">${['08:00', '12:00', '18:00', '20:00'].map((t) => `<option ${t === S.notify.time ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      ${sw('notify.cheers', 'Cheers from my league', 'When someone cheers you on', S.notify.cheers)}<p class="small">This prototype saves your choices but doesn’t send real notifications.</p></div>
    <div class="card"><h3>Help</h3><div class="row"><button class="btn ghost small" data-howto>How to play</button><button class="btn ghost small" data-rules>Rule book</button><button class="btn ghost small" data-go="onboarding" data-arg="1">Redo setup</button><button class="btn ghost small" data-go="profiles">Switch profile</button></div>
      <h3 class="mt">Playtest tools</h3><p class="small">For demos: move time forward to try weekly rules. Game date: ${today()}.</p>
      <div class="row"><button class="btn ghost small" id="tNext">Next day →</button><button class="btn ghost small" id="tWeek">Next Monday →</button><button class="btn ghost small" id="tReset">Reset game</button></div></div></div>`;
  const content = `<div class="page">
    <div class="card prof-head"><div class="ph-av">${me({ size: 120, poses: 'out,clapTop,swayL,swayR' })}</div>
      <div class="ph-txt"><h1>${esc(S.profile.nick)}</h1><p>${esc(R.name)} · ${S.points.toLocaleString()} pts</p>${R.next ? `${bar(R.frac)}<small>${(R.need - R.pts).toLocaleString()} pts to ${esc(R.next)}</small>` : '<small>Top rank reached</small>'}</div>
      <button class="btn ghost small" data-ptab="avatar">${icon.settings} Edit avatar</button></div>
    <div class="seg tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" aria-pressed="${tab === k}" data-ptab="${k}">${l}</button>`).join('')}</div>
    ${body}</div>`;
  app.innerHTML = shell(content, 'profile');
  hydrate();
  $$('[data-ptab]').forEach((b) => b.onclick = () => profile(b.dataset.ptab));
  $$('[data-skin]').forEach((b) => b.onclick = () => { S.profile.skin = b.dataset.skin; save(); profile('avatar'); });
  $$('[data-outfit]').forEach((b) => b.onclick = () => { S.profile.outfit = b.dataset.outfit; save(); profile('avatar'); });
  $$('[data-cos]').forEach((b) => b.onclick = () => { const [k, id] = b.dataset.cos.split(':'); wearItem(k, id); profile('avatar'); });
  $$('[data-set]').forEach((i) => i.onchange = () => { const [a, k] = i.dataset.set.split('.'); S[a][k] = i.checked; save(); applyA11y(); });
  const nt = $('#nTime'); if (nt) nt.onchange = () => { S.notify.time = nt.value; save(); };
  const tn = $('#tNext'); if (tn) tn.onclick = () => { S.settings.dayOffset++; save(); toast(`It’s now ${today()}`); profile('settings'); };
  const tw = $('#tWeek'); if (tw) tw.onclick = () => { S.settings.dayOffset += 7 - dow(); save(); toast(`It’s now Monday ${today()}`); profile('settings'); };
  const tr = $('#tReset'); if (tr) tr.onclick = () => { const s = sheet(`<h2>Reset everything?</h2><p>This clears all progress in this browser.</p><div class="row"><button class="btn dark" data-ok>Reset</button><button class="btn ghost" data-close>Cancel</button></div>`); $('[data-ok]', s.el).onclick = () => { resetAll(); location.reload(); }; };
}

// ---------------------------------------------------------------- physio view (demo)
function physio() {
  const rx = JSON.parse(JSON.stringify(S.rx));
  const moves = Object.entries(CORE).filter(([k]) => k !== 'imagine');
  const render = () => {
    app.innerHTML = shell(`<div class="page physio">
      <button class="back" data-go="profile" data-arg="plan">${icon.back} Back to my plan</button>
      <div class="ph"><div><p class="eyebrow">${icon.steth} Physio view · demo</p><h1>Prescription for ${esc(S.profile.nick)}</h1><p class="lede">In a real clinic this lives in the physio’s own account. Here it shows what only a physio can change.</p></div></div>
      <div class="grid2">
        <div class="card"><h3>Exercises</h3>
          <div class="field"><label for="rxT">Routine name</label><input id="rxT" value="${esc(rx.title)}"></div>
          <div class="field"><label for="rxSt">Stage label</label><input id="rxSt" value="${esc(rx.stage)}"></div>
          ${rx.exercises.map((x, i) => `<div class="exrow"><span class="n">${i + 1}</span><select data-ex="${i}" aria-label="Exercise ${i + 1}">${moves.map(([k, m]) => `<option value="${k}" ${k === x.move ? 'selected' : ''}>${esc(m.name)}${m.standing ? ' (standing)' : ''}</option>`).join('')}</select>
            <select data-mode="${i}" aria-label="Measured by"><option value="reps" ${!x.secs ? 'selected' : ''}>reps</option><option value="secs" ${x.secs ? 'selected' : ''}>seconds</option></select>
            <input type="number" min="1" max="120" data-n="${i}" value="${x.secs || x.reps}" aria-label="Amount"><select data-sets="${i}" aria-label="Sets">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === (x.sets || 1) ? 'selected' : ''}>${n} set${n > 1 ? 's' : ''}</option>`).join('')}</select><button class="iconbtn" data-del="${i}" aria-label="Remove exercise" ${rx.exercises.length < 2 ? 'disabled' : ''}>${icon.x}</button></div>`).join('')}
          ${rx.exercises.length < 5 ? `<button class="btn ghost small" id="add">${icon.plus} Add exercise</button>` : ''}</div>
        <div class="card"><h3>Schedule and limits</h3>
          <div class="field"><label for="rxW">Sessions per week</label><select id="rxW">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option ${n === rx.perWeek ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="rxD">Most sessions per day</label><select id="rxD">${[1, 2].map((n) => `<option ${n === rx.perDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><span class="flabel">Suggested days</span><div class="daypick">${DAY_NAMES.map((d, i) => `<button data-day="${i}" aria-pressed="${rx.days.includes(i)}">${d}</button>`).join('')}</div></div>
          <div class="field"><label for="rxB">Pace (beats per minute)</label><select id="rxB">${PACES.map((n) => `<option ${n === rx.bpm ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="rxI">Highest dance intensity allowed</label><select id="rxI">${INTENSITY.map((x, i) => `<option value="${i}" ${i === rx.maxIntensity ? 'selected' : ''}>${x.n}: ${x.d}</option>`).join('')}</select></div>
          <label class="switch"><input type="checkbox" id="rxS" ${rx.standing ? 'checked' : ''}><span></span><div><b>Standing allowed</b><small>Off swaps standing moves for seated versions</small></div></label>
          <div class="field"><label for="rxN">Note to patient</label><textarea id="rxN" rows="2">${esc(rx.note)}</textarea></div>
          <button class="btn dark big block" id="save">Save prescription</button></div>
      </div></div>`, 'profile');
    const sync = () => { rx.title = $('#rxT').value; rx.stage = $('#rxSt').value; rx.perWeek = +$('#rxW').value; rx.perDay = +$('#rxD').value; rx.bpm = +$('#rxB').value; rx.maxIntensity = +$('#rxI').value; rx.standing = $('#rxS').checked; rx.note = $('#rxN').value;
      rx.exercises = rx.exercises.map((x, i) => { const n = clamp(+$(`[data-n="${i}"]`).value || 1, 1, 120); const mode = $(`[data-mode="${i}"]`).value; return { move: $(`[data-ex="${i}"]`).value, sets: +$(`[data-sets="${i}"]`).value, ...(mode === 'secs' ? { secs: n } : { reps: n }) }; }); };
    $$('[data-del]').forEach((b) => b.onclick = () => { sync(); rx.exercises.splice(+b.dataset.del, 1); render(); });
    const add = $('#add'); if (add) add.onclick = () => { sync(); rx.exercises.push({ move: 'breathe', secs: 30, sets: 1 }); render(); };
    $$('[data-day]').forEach((b) => b.onclick = () => { sync(); const d = +b.dataset.day; rx.days = rx.days.includes(d) ? rx.days.filter((x) => x !== d) : [...rx.days, d].sort(); render(); });
    $('#save').onclick = () => { sync(); if (!rx.days.length) { toast('Pick at least one suggested day'); return; } setPlan(rx); toast('Prescription saved. The routine rebuilds from it.'); go('profile', 'plan'); };
  };
  render();
}

// ---------------------------------------------------------------- how to play + rule book
const HOWTO = [
  { eyebrow: '1 · Dance', title: 'Follow the coach', demo: 'mirror', points: ['Face the screen and move like a mirror.', 'The coach lifts the arm on <b>your left</b>? Lift your left arm.', 'Slow and steady is perfect. You never need to match a dancer’s speed or range.'] },
  { eyebrow: '2 · Your plan', title: 'Your physio picks the moves', demo: 'core', points: ['The part of the coach glowing <b>green</b> is your exercise. Do it as prescribed.', 'The rest of the body adds a little dance. Join in as much as feels good.', 'Only your physio can change your exercises. You can always make them easier with <b>Lite</b>.'] },
  { eyebrow: '3 · Timing', title: 'Hit the line, Just Dance style', demo: 'track', points: ['Move cards slide along the bottom. When a card reaches the <b>orange line</b>, make that shape.', 'With the camera on, every rep gets a <b>PERFECT</b>, <b>GREAT</b>, <b>GOOD</b> or <b>TRY AGAIN</b>. Good reps build a combo.', 'The ring counts your reps for you. Gold cards are the last rep of a set.'] },
  { eyebrow: '4 · Rewards', title: 'Show up, earn 100', demo: 'points', points: ['<b>100 points</b> for every planned session you finish. Stop because something hurt? <b>50</b>, and it still counts.', 'Extra sessions, extra reps or moving faster earn <b>nothing</b>. Your plan is the goal.', 'Points unlock music, scenes and outfits. Badges come from milestones like your first week.'] },
  { eyebrow: '5 · League', title: 'Groove Together', demo: 'together', points: ['Your crew shares one weekly goal: a number of sessions together.', 'Every planned session adds 1, whatever the exercise or difficulty.', 'Cheer each other on. No one is ever ranked last.'] },
  { eyebrow: '6 · You’re in control', title: 'Play it safe', demo: 'safe', points: ['<kbd>Space</kbd> pauses. <kbd>L</kbd> turns on Lite. <kbd>H</kbd> is “That hurt”: it pauses straight away and logs it for your physio.', 'Rest days and red check-in days never break your streak.', 'Miss a planned day? A weekly Flex Pass keeps your streak going.'] },
];
function howToPlay({ after = null, cta = 'Got it' } = {}) {
  let i = 0, alive = true, done = false;
  const finish = () => { if (done) return; done = true; alive = false; document.removeEventListener('keydown', key); after && after(); };
  const s = sheet(`<div class="howto">
    <div class="ht-stage"><canvas id="htc"></canvas></div><div id="hts"></div>
    <div class="ht-nav"><div class="ht-dots">${HOWTO.map((_, k) => `<button data-k="${k}" aria-label="Step ${k + 1}"></button>`).join('')}</div>
      <button class="btn ghost" id="htPrev">Back</button><button class="btn dark" id="htNext">Next</button></div></div>`, { wide: true, onClose: finish });
  const box = $('#hts', s.el), cv = $('#htc', s.el), g = cv.getContext('2d');
  const song = routineFor(), coreB = song.blocks.find((e) => e.ex === 0 && e.kind !== 'rest');
  const of = outfitOf();
  const show = (k, dir = 1) => {
    i = clamp(k, 0, HOWTO.length - 1); const h = HOWTO[i];
    box.innerHTML = `<div class="ht-slide ${dir < 0 ? 'back' : ''}"><p class="eyebrow">${h.eyebrow}</p><h2>${h.title}</h2><ul>${h.points.map((x) => `<li><span>${x}</span></li>`).join('')}</ul></div>`;
    $$('.ht-dots button', s.el).forEach((b, k2) => b.setAttribute('aria-current', String(k2 === i)));
    $('#htPrev', s.el).style.visibility = i ? 'visible' : 'hidden';
    $('#htNext', s.el).textContent = i === HOWTO.length - 1 ? cta : 'Next';
  };
  $('#htNext', s.el).onclick = () => { sfx.tap(); if (i === HOWTO.length - 1) s.close(); else show(i + 1, 1); };
  $('#htPrev', s.el).onclick = () => { sfx.tap(); show(i - 1, -1); };
  $$('.ht-dots button', s.el).forEach((b) => b.onclick = () => show(+b.dataset.k, +b.dataset.k >= i ? 1 : -1));
  const key = (e) => { if (e.key === 'ArrowRight') $('#htNext', s.el).click(); if (e.key === 'ArrowLeft' && i) show(i - 1, -1); };
  document.addEventListener('keydown', key);
  show(0);
  const fig = { body: of.color, glove: of.glove, skin: S.profile.skin, hat: S.wear.hat, trail: S.wear.trail, glowColor: 'rgba(255,140,82,.25)' };
  const loop = (now) => {
    if (!alive || !cv.isConnected) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const t = now / 1000, sc = H / 760, cx = W / 2, cy = H * 0.46, demo = HOWTO[i].demo;
    drawScene(g, W, H, 'room', { t, cx, floorY: cy + 236 * sc, s: sc, reduced: true });
    const loopPose = (list, beat) => { const bt = t / beat, k = Math.floor(bt); return lerpPose(POSES[list[k % list.length]], POSES[list[(k + 1) % list.length]], eio(clamp((bt - k) * 1.5))); };
    const label = (txt, x, y, col) => { g.font = '800 13px Figtree, sans-serif'; g.textAlign = 'center'; const w = g.measureText(txt).width + 22; g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(x - w / 2, y - 15, w, 26, 13); g.fill(); g.fillStyle = col; g.fillText(txt, x, y + 3); };
    if (demo === 'mirror') {
      const list = ['swayL', 'clapTop', 'swayR', 'out'];
      drawFigure(g, cx + W * 0.14, cy, sc, loopPose(list, 0.6), fig);
      drawFigure(g, cx - W * 0.2, cy + 40 * sc, sc * 0.75, lerpPose(loopPose(list, 0.6), POSES.rest, 0.1), { body: '#8AD6D1', skin: S.profile.skin, glow: false, alpha: 0.85 });
      label('COACH', cx + W * 0.14, H - 16, '#C2541C'); label('YOU', cx - W * 0.2, H - 16, '#23797A');
    } else if (demo === 'core' && coreB) {
      const b = coreB.startBeat + ((t / song.spb) % 8);
      drawFigure(g, cx, cy, sc, songPose(song, b, false).pose, { ...fig, showCore: true, coreParts: song.coreParts, seated: song.seated });
      label('EXERCISE · ' + CORE[coreB.core].name.toUpperCase(), cx, 26, '#23797A');
    } else if (demo === 'track') {
      const sz = Math.min(80, H * 0.34), y = H * 0.66, lineX = W * 0.16, gap = sz * 1.2, k = t / 0.9;
      drawFigure(g, cx + W * 0.2, H * 0.36, sc * 0.6, loopPose(['rest', 'sideLegR', 'rest', 'sideLegL'], 0.6), fig);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.roundRect(10, y - sz * 0.7, W - 20, sz * 1.4, 20); g.fill();
      g.save(); g.shadowColor = '#FF8C52'; g.shadowBlur = 14; g.strokeStyle = '#FF8C52'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(lineX, y - sz * 0.6); g.lineTo(lineX, y + sz * 0.6); g.stroke(); g.restore();
      const poses = ['sideLegR', 'sideLegL', 'halfSquat', 'calfUp', 'sideBendL', 'sideBendR'];
      for (let n = Math.floor(k) - 1; n < Math.floor(k) + 8; n++) { const x = lineX + (n - k) * gap; if (x < lineX - sz * 0.5 || x > W) continue; drawPicto(g, x, y, sz, POSES[poses[((n % 6) + 6) % 6]], { alpha: clamp((x - lineX + sz * 0.5) / (sz * 0.5)), gold: ((n % 5) + 5) % 5 === 4, now: Math.abs(x - lineX) < gap / 2, color: '#FF8C52' }); }
      const ph = k % 1, words = [['PERFECT', '#E8692B'], ['GREAT', '#2E8F90'], ['GOOD', '#5B8DD6']], w = words[Math.floor(k) % 3];
      g.globalAlpha = 1 - clamp((ph - 0.6) * 3); g.font = `800 italic ${Math.round(H * 0.15)}px "Bricolage Grotesque", sans-serif`; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#fff';
      g.strokeText(w[0], cx - W * 0.12, H * 0.3); g.fillStyle = w[1]; g.fillText(w[0], cx - W * 0.12, H * 0.3); g.globalAlpha = 1;
    } else if (demo === 'count') {
      const m = coreB ? CORE[coreB.core] : CORE.heelSlide, reps = 12, per = m.cycle * song.spb, n = Math.floor(t / per) % (reps + 1);
      if (coreB) drawFigure(g, cx - W * 0.16, cy, sc, songPose(song, coreB.startBeat + ((t / song.spb) % m.cycle), false).pose, { ...fig, showCore: true, coreParts: song.coreParts, seated: song.seated });
      const rx = cx + W * 0.2, ry = H * 0.45, r = H * 0.26;
      g.lineWidth = 12; g.lineCap = 'round'; g.strokeStyle = '#FFF0C5'; g.beginPath(); g.arc(rx, ry, r, 0, 7); g.stroke();
      g.strokeStyle = '#FF8C52'; g.beginPath(); g.arc(rx, ry, r, -Math.PI / 2, -Math.PI / 2 + (n / reps) * Math.PI * 2); g.stroke();
      g.fillStyle = '#1E2A2F'; g.font = `800 ${Math.round(r * 0.62)}px "Bricolage Grotesque", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${n}/${reps}`, rx, ry - 4);
      g.font = '700 13px Figtree, sans-serif'; g.fillStyle = '#4C5A60'; g.fillText('reps', rx, ry + r * 0.42); g.textBaseline = 'alphabetic';
    } else if (demo === 'points') {
      drawFigure(g, cx - W * 0.18, cy, sc * 0.95, loopPose(['vUp', 'clapTop', 'shimmy', 'out'], 0.5), fig);
      const ph = (t % 2.2) / 2.2, k = clamp(ph * 3), x0 = cx + W * 0.18;
      g.globalAlpha = clamp(ph * 5) * (1 - clamp((ph - 0.85) * 7));
      g.font = `800 ${Math.round(H * 0.2)}px "Bricolage Grotesque", sans-serif`; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#fff'; g.lineJoin = 'round';
      const txt = '+' + Math.round(100 * (1 - Math.pow(1 - k, 3))); g.strokeText(txt, x0, H * 0.5); g.fillStyle = '#FF8C52'; g.fillText(txt, x0, H * 0.5);
      g.font = '800 15px Figtree, sans-serif'; g.fillStyle = '#4C5A60'; g.fillText('points for showing up', x0, H * 0.5 + 34); g.globalAlpha = 1;
    } else if (demo === 'together') {
      const cols = ['#E8628F', '#359FA0', '#F2B33D', '#9C8CE8', of.color], skins = ['#D49D72', '#A9704A', '#F7D9C0', '#7A4E31', S.profile.skin];
      for (let k = 0; k < 5; k++) { const x = W * (0.14 + k * 0.18); drawFigure(g, x, cy + 30 * sc, sc * 0.62, loopPose(['swayL', 'clapTop', 'swayR', 'out'], 0.55 + k * 0.03), { body: cols[k], skin: skins[k], glow: false }); }
      const fill = 0.35 + 0.5 * ((t % 4) / 4), bw = W * 0.7, bx = (W - bw) / 2, by = 22;
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(bx - 12, by - 10, bw + 24, 34, 17); g.fill();
      g.fillStyle = '#FFF0C5'; g.beginPath(); g.roundRect(bx, by, bw, 14, 7); g.fill(); g.fillStyle = '#359FA0'; g.beginPath(); g.roundRect(bx, by, bw * fill, 14, 7); g.fill();
    } else {
      drawFigure(g, cx, cy, sc, loopPose(['floatIn', 'floatOut'], 1.6), fig);
      label((t % 6.4) < 3.2 ? 'Breathe in…' : 'Breathe out…', cx, H - 18, '#23797A');
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
const RULES = [
  ['Your session is your physio’s plan.', 'Their exercises, reps and pace, with a warm-up, breathers and a cool-down added.'],
  ['PERFECT / GREAT / GOOD are feedback, not points.', 'With the camera on, each rep is cheered and you get a fun Groove rating. Points never depend on it.'],
  ['Finish a planned session: +100 points.', 'Finishing means playing at least 60% of the routine. Lite and Gentle Groove sessions count in full.'],
  ['Stop because something hurt: +50 points.', 'It’s logged for your physio and still counts toward your week, your streak and the crew goal.'],
  ['Ending early for another reason saves a partial session.', 'No points, no penalty. Try again when you’re ready.'],
  ['Points stop when your plan is done.', 'Up to your sessions per day and per week. Extra sessions, reps or speed earn nothing.'],
  ['Your streak counts days on plan.', 'Rest days, red check-ins and unscheduled days never break it. One missed planned day a week is covered by a Flex Pass.'],
  ['Badges celebrate milestones.', 'First sessions, full weeks, rest days, trying new music, cheering your crew. Some unlock accessories.'],
  ['Ranks come from points.', 'They unlock music, scenes and outfits. They say nothing about your recovery.'],
  ['Groove Together is a shared weekly goal.', 'Every planned session adds 1, whatever the exercise. The target is 75% of everyone’s plans.'],
  ['Rankings are optional and fair.', 'Off by default. When on, they use each person’s share of their own plan.'],
  ['Only your physio changes your exercises.', 'You can always choose Lite, a lower dance intensity, a rest day or stopping.'],
  ['Your league sees your avatar and participation only.', 'Never your injury, exercises or pain.'],
];
function ruleBook() {
  sheet(`<p class="eyebrow">Rule book</p><h2>How Groove Back works</h2><p class="small">Your physio picks the moves. The song does the counting. Your league cheers you on. All you have to do is show up.</p>
    <ol class="rules">${RULES.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ol>
    <button class="btn dark" data-close>Close</button>`, { wide: true });
}

// ---------------------------------------------------------------- boot
applyA11y();
fixTrack();
document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
splash(() => go('profiles'));
