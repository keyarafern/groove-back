// Splash screen, fox illustrations and the GSAP motion layer for the onboarding and page changes.
import gsap from 'gsap';
import { POSES } from './content.js';
import { drawFigure, lerpPose, eio, clamp } from './figure.js';

// ---------------------------------------------------------------- motion helpers
// Reduced motion (the OS setting or the in-game setting) turns every tween into an instant set.
export const reduced = () => document.documentElement.classList.contains('a11y-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
export { gsap };
// Bring a page's blocks in: a soft rise with a short stagger.
export function revealPage(root = document) {
  const items = [...root.querySelectorAll('.content > * > *, .content > .page > *')].slice(0, 14);
  if (!items.length || reduced()) return;
  gsap.fromTo(items, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.045, clearProps: 'transform,opacity' });
}
// Onboarding step in: heading first, then the cards with a little spring.
export function revealStep(main, dir = 1) {
  if (!main || reduced()) return;
  const parts = [...main.querySelectorAll(':scope > *')];
  const tl = gsap.timeline();
  tl.fromTo(parts, { x: 36 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity' });
  const cards = main.querySelectorAll('.injc, .playc, .ob-swrow .sw');
  if (cards.length) tl.fromTo(cards, { y: 22, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.05, clearProps: 'transform,opacity' }, 0.15);
  const fill = main.parentElement.querySelectorAll('.segs i.on b');
  if (fill.length) tl.fromTo(fill[fill.length - 1], { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.1);
  return tl;
}
export function leaveStep(main, dir = 1) {
  return new Promise((res) => {
    if (!main || reduced()) return res();
    gsap.to(main.querySelectorAll(':scope > *'), { x: -28 * dir, opacity: 0, duration: 0.24, ease: 'power2.in', stagger: 0.025, onComplete: res });
  });
}
export function pop(el) { if (el && !reduced()) gsap.fromTo(el, { scale: 0.4, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2.4)' }); }
export function bounce(el) { if (el && !reduced()) gsap.fromTo(el, { y: 8, scale: 0.96 }, { y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }); }
export function flash(el) { if (el && !reduced()) gsap.fromTo(el, { scale: 0.97, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' }); }

// ---------------------------------------------------------------- fox art canvases
// <canvas class="foxart" data-poses="vUp,clapTop" data-beat=".5" data-face="excited" data-zoom="1" data-hy=".5" data-band="#C6B6FF">
// zoom scales the fox, hy is where the hip sits (fraction of the canvas height). Big zoom + high hy = a peeking bust.
export function fox({ w = 200, h = 240, poses = 'out,clapTop,swayL,swayR', beat = 0.55, face = 'happy', zoom = 1, hy = 0.5, hx = 0.5, band = '', fur = '', cls = '', label = '' } = {}) {
  return `<canvas class="foxart ${cls}" width="${w * 2}" height="${h * 2}" style="width:${w}px;height:${h}px" data-poses="${poses}" data-beat="${beat}" data-face="${face}" data-zoom="${zoom}" data-hy="${hy}" data-hx="${hx}"${band ? ` data-band="${band}"` : ''}${fur ? ` data-fur="${fur}"` : ''} ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}></canvas>`;
}
const arts = new Set();
export function hydrateFox(root = document) { root.querySelectorAll('canvas.foxart').forEach((c) => arts.add(c)); }
const poseOf = (k) => POSES[k] || POSES.rest;
(function loop(now) {
  const t = now / 1000;
  for (const c of arts) {
    if (!c.isConnected) { arts.delete(c); continue; }
    const g = c.getContext('2d'), W = c.width, H = c.height, d = c.dataset;
    const list = d.poses.split(','), beat = +d.beat || 0.55;
    const bt = reduced() ? 0.2 : t / beat, i = Math.floor(bt), p = bt - i;
    const pose = lerpPose(poseOf(list[i % list.length]), poseOf(list[(i + 1) % list.length]), eio(clamp(p * 1.4)));
    g.clearRect(0, 0, W, H);
    const s = (H / 640) * (+d.zoom || 1);
    drawFigure(g, W * (+d.hx || 0.5), H * (+d.hy || 0.5), s, pose, { face: d.face, body: d.band || '#C6B6FF', skin: d.fur || undefined, glow: false, t: reduced() ? 0 : t });
  }
  requestAnimationFrame(loop);
})(0);

// ---------------------------------------------------------------- decoration
export const SPARK = (c = '#FF8C52', size = 24) => `<svg class="spk" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.7 5.2 3.3 7.8 10.5 10.5-7.2 2.7-9.8 5.3-10.5 10.5C11.3 17.3 8.7 14.7 1.5 12 8.7 9.3 11.3 6.7 12 1.5z" fill="${c}"/></svg>`;
export const NOTE = (c = '#FF8C52', size = 30) => `<svg class="note" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.2l11-2.2v12.3" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="6.6" cy="17.6" rx="3" ry="2.4" fill="${c}"/><ellipse cx="17.6" cy="15.4" rx="3" ry="2.4" fill="${c}"/></svg>`;
// Soft organic blobs for the corners, with a thin line drawn over each (the splash look).
export function blobs(kind = 'splash') {
  const B = {
    tl: `<svg class="blob tl" viewBox="0 0 400 360" aria-hidden="true"><path d="M0 0H330C350 70 300 120 230 140C160 160 110 175 80 240C55 290 30 320 0 330Z" fill="#FF9A52"/><path d="M0 230C40 170 120 150 190 150C260 150 330 120 355 40" fill="none" stroke="#FFC46B" stroke-width="3"/></svg>`,
    tl2: `<svg class="blob tl2" viewBox="0 0 400 520" aria-hidden="true"><path d="M0 170C70 150 140 160 200 210C260 260 300 330 250 410C210 470 110 470 0 520Z" fill="#FFE2C6" opacity=".7"/></svg>`,
    tr: `<svg class="blob tr" viewBox="0 0 320 320" aria-hidden="true"><path d="M60 0H320V300C260 320 210 290 190 230C170 170 120 150 80 110C40 70 30 30 60 0Z" fill="#E4D6F2"/><path d="M90 0C70 80 100 170 170 210C220 240 280 240 320 205" fill="none" stroke="#FFC46B" stroke-width="3"/></svg>`,
    bl: `<svg class="blob bl" viewBox="0 0 440 300" aria-hidden="true"><path d="M0 20C70 0 130 30 170 90C200 135 260 150 330 190C400 230 420 270 420 300H0Z" fill="#D9C9EE"/><path d="M0 120C80 70 190 60 220 120C240 170 210 240 200 300" fill="none" stroke="#A98BE6" stroke-width="3"/></svg>`,
    br: `<svg class="blob br" viewBox="0 0 440 460" aria-hidden="true"><path d="M440 60C380 50 330 90 320 150C300 230 250 280 170 300C100 320 80 400 120 460H440Z" fill="#FFE2C6" opacity=".8"/><path d="M440 110C340 120 300 200 310 280C320 350 380 400 440 410Z" fill="#FFC864"/><path d="M180 460C230 380 300 330 360 330C410 330 440 360 440 360" fill="none" stroke="#FF8A5B" stroke-width="3"/></svg>`,
  };
  if (kind === 'side') return `<div class="blobs side" aria-hidden="true">${B.tr}${`<svg class="blob bm" viewBox="0 0 420 300" aria-hidden="true"><path d="M0 300C10 200 70 120 160 110C250 100 300 170 330 240C345 275 380 290 420 300Z" fill="#FFD8B5" opacity=".75"/></svg>`}</div>`;
  return `<div class="blobs" aria-hidden="true">${B.tl2}${B.tl}${B.tr}${B.bl}${B.br}</div>`;
}

// ---------------------------------------------------------------- splash
const LINES = ['Getting your moves ready…', 'Tuning up the band…', 'Lacing the fox’s sneakers…', 'Warming up the dance floor…'];
// Plays the loading screen, then resolves once it has animated out. `next` renders the screen behind it first.
export function splash(next) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'splash';
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = `${blobs()}
      <div class="spl-deco" aria-hidden="true">
        <span class="d d1">${SPARK('#FFB347', 54)}</span><span class="d d2">${SPARK('#FFC98C', 30)}</span><span class="d d3">${NOTE('#FF8C52', 46)}</span>
        <span class="d d4">${SPARK('#FFB347', 26)}</span><span class="d d5">${NOTE('#B9A6FF', 34)}</span><span class="d d6">${NOTE('#FF8C52', 34)}</span><span class="d d7">${SPARK('#FFB347', 28)}</span>
      </div>
      <div class="spl-in">
        <h1 class="spl-logo" aria-label="Groove Back"><span class="w1">Groove</span><span class="w2">Back</span><i class="spl-star">${SPARK('#FF8C52', 46)}</i></h1>
        <p class="spl-tag">Dance your way back.</p>
        <div class="spl-fox"><div class="spl-shadow"></div>${fox({ w: 320, h: 360, poses: 'waveR,swayL,clapTop,swayR', beat: 0.48, face: 'happy', zoom: 1.18, hy: 0.46, label: 'The Groove Back fox dancing' })}
          <svg class="swish s1" viewBox="0 0 40 60" aria-hidden="true"><path d="M8 6C20 18 24 34 18 54M20 4C32 18 36 36 30 56" fill="none" stroke="#FF9A52" stroke-width="3" stroke-linecap="round"/></svg>
          <svg class="swish s2" viewBox="0 0 40 60" aria-hidden="true"><path d="M30 6C18 18 14 34 20 54M18 4C6 18 2 36 8 56" fill="none" stroke="#FF9A52" stroke-width="3" stroke-linecap="round"/></svg></div>
        <div class="spl-bar" role="progressbar" aria-label="Loading" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <p class="spl-msg">${LINES[0]}</p>
      </div>`;
    document.body.appendChild(el);
    hydrateFox(el);
    const q = (s) => el.querySelector(s), bar = q('.spl-bar i'), msg = q('.spl-msg'), pb = q('.spl-bar');
    const prog = { v: 0 };
    const setP = () => { bar.style.transform = `scaleX(${prog.v})`; pb.setAttribute('aria-valuenow', String(Math.round(prog.v * 100))); };
    const fonts = Promise.race([(document.fonts && document.fonts.ready) || Promise.resolve(), new Promise((r) => setTimeout(r, 3200))]);
    const out = () => {
      if (reduced()) { next && next(); el.remove(); resolve(); return; }
      const tl = gsap.timeline({ onComplete: () => { el.remove(); resolve(); } });
      tl.call(() => next && next(), null, 0.62);
      tl.to(q('.spl-fox'), { y: -26, duration: 0.22, ease: 'power2.out' })
        .to(q('.spl-fox'), { y: 0, scale: 0.92, duration: 0.2, ease: 'power2.in' })
        .to([q('.spl-msg'), pb], { y: 10, opacity: 0, duration: 0.25, ease: 'power2.in' }, '<')
        .to(q('.spl-in'), { scale: 1.06, opacity: 0, duration: 0.45, ease: 'power3.in' }, '+=0.02')
        .to(el.querySelectorAll('.d'), { scale: 0, opacity: 0, duration: 0.3, stagger: 0.02, ease: 'back.in(2)' }, '<')
        .to(q('.blob.tl'), { xPercent: -60, yPercent: -60, duration: 0.6, ease: 'power3.in' }, '<')
        .to(q('.blob.tl2'), { xPercent: -80, duration: 0.6, ease: 'power3.in' }, '<')
        .to(q('.blob.tr'), { xPercent: 60, yPercent: -60, duration: 0.6, ease: 'power3.in' }, '<')
        .to(q('.blob.bl'), { xPercent: -60, yPercent: 60, duration: 0.6, ease: 'power3.in' }, '<')
        .to(q('.blob.br'), { xPercent: 60, yPercent: 60, duration: 0.6, ease: 'power3.in' }, '<')
        .to(el, { backgroundColor: 'rgba(251,243,234,0)', duration: 0.35, ease: 'none' }, '-=0.3');
    };
    if (reduced()) { prog.v = 1; setP(); fonts.then(() => setTimeout(out, 500)); return; }
    let li = 0;
    const tl = gsap.timeline();
    tl.from(el.querySelectorAll('.blob'), { scale: 0.6, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, transformOrigin: (i, t) => (t.classList.contains('tl') || t.classList.contains('tl2') ? '0% 0%' : t.classList.contains('tr') ? '100% 0%' : t.classList.contains('bl') ? '0% 100%' : '100% 100%') })
      .from([q('.w1'), q('.w2')], { y: 50, opacity: 0, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.1 }, 0.15)
      .from(q('.spl-star'), { scale: 0, rotate: -180, duration: 0.7, ease: 'back.out(2.5)' }, 0.45)
      .from(q('.spl-tag'), { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.55)
      .from(q('.spl-fox'), { y: 40, scale: 0.7, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' }, 0.5)
      .from(el.querySelectorAll('.d'), { scale: 0, opacity: 0, rotate: -40, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.07 }, 0.7)
      .from([pb, msg], { y: 12, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08 }, 0.8)
      .to(prog, { v: 1, duration: 2.3, ease: 'power1.inOut', onUpdate: () => { setP(); const k = Math.min(LINES.length - 1, Math.floor(prog.v * LINES.length)); if (k !== li) { li = k; gsap.fromTo(msg, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }); msg.textContent = LINES[k]; } } }, 0.9);
    // idle float on the decorations while loading
    el.querySelectorAll('.d').forEach((d, i) => gsap.to(d, { y: i % 2 ? 10 : -10, rotate: i % 2 ? 12 : -12, duration: 1.6 + i * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    gsap.to(el.querySelectorAll('.swish'), { opacity: 0.25, duration: 0.24, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.12 });
    Promise.all([fonts, new Promise((r) => tl.eventCallback('onComplete', r))]).then(() => { msg.textContent = 'Ready!'; setTimeout(out, 250); });
  });
}

// ---------------------------------------------------------------- body-area illustrations (line art + orange accent)
const STK = 'fill="none" stroke="#3A2D26" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const SKN = '#FCE6D4', ACC = '#FF8C52';
const ticks = (pts) => pts.map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${ACC}" stroke-width="2.4" stroke-linecap="round"/>`).join('');
export const BODY_ART = {
  knee: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M20 4C19 14 18 22 19 28C18 36 20 44 21 52H30C30 44 31 36 31 28C32 22 32 14 32 4Z" fill="${SKN}"/><circle cx="25.5" cy="29" r="7" fill="${ACC}" opacity=".35"/><path d="M20 4C19 14 18 22 19 28C18 36 20 44 21 52M32 4C32 14 32 22 31 28C31 36 30 44 30 52" ${STK}/><path d="M21.5 27.5C23 25 28 25 29.5 27.5C28 31 23 31 21.5 27.5Z" ${STK}/>${ticks([[11, 23, 6, 20], [10, 29, 4, 29], [11, 35, 6, 38]])}</svg>`,
  shoulder: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M8 52C8 36 12 25 22 22C25 21 31 21 34 22C44 25 48 36 48 52Z" fill="${SKN}"/><circle cx="16" cy="27" r="8" fill="${ACC}" opacity=".45"/><path d="M8 52C8 36 12 25 22 22M34 22C44 25 48 36 48 52M24 22C24 17 25 12 28 12C31 12 32 17 32 22M14 38C14 44 13 48 13 52" ${STK}/>${ticks([[9, 17, 6, 13], [14, 14, 13, 9], [20, 15, 21, 11]])}</svg>`,
  back: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M15 6C13 18 15 30 13 42C19 49 37 49 43 42C41 30 43 18 41 6Z" fill="${SKN}"/><ellipse cx="28" cy="34" rx="8" ry="7" fill="${ACC}" opacity=".45"/><path d="M15 6C13 18 15 30 13 42C19 49 37 49 43 42C41 30 43 18 41 6" ${STK}/><path d="M28 10V42" stroke="#3A2D26" stroke-width="2" stroke-dasharray="2 3.5" stroke-linecap="round"/>${ticks([[10, 30, 5, 28], [10, 35, 4, 36], [46, 30, 51, 28], [46, 35, 52, 36]])}</svg>`,
  ankle: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M24 4V32C24 38 20 42 13 44C8 45 8 51 12 51H41C45 51 45 45 41 43C37 41 35 37 35 32V4Z" fill="${SKN}"/><circle cx="32" cy="36" r="5" fill="${ACC}" opacity=".5"/><path d="M24 4V32C24 38 20 42 13 44C8 45 8 51 12 51H41C45 51 45 45 41 43C37 41 35 37 35 32V4" ${STK}/>${ticks([[17, 33, 11, 30], [16, 38, 9, 38], [44, 31, 49, 28]])}</svg>`,
  hip: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M12 4C12 18 14 26 16 30L18 52H26L27 34C27.5 31 28.5 31 29 34L30 52H38L40 30C42 26 44 18 44 4Z" fill="${SKN}"/><circle cx="16" cy="22" r="9" fill="${ACC}" opacity=".7"/><path d="M12 4C12 18 14 26 16 30L18 52M44 4C44 18 42 26 40 30L38 52M26 52L27 34C27.5 31 28.5 31 29 34L30 52" ${STK}/></svg>`,
  neck: `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M7 52C7 39 15 33 23 31V25H33V31C41 33 49 39 49 52Z" fill="${SKN}"/><circle cx="28" cy="15" r="10" fill="#5A3B2C"/><circle cx="32" cy="28" r="5.5" fill="${ACC}" opacity=".6"/><path d="M7 52C7 39 15 33 23 31V25M33 25V31C41 33 49 39 49 52" ${STK}/>${ticks([[40, 22, 45, 19], [41, 27, 47, 27]])}</svg>`,
};
