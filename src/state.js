// Game state, saved in this browser. Every rule in the Rule Book (DESIGN.md §3) lives here.
//
// The short version:
//   • Finish a prescribed session            → +100 points
//   • Stop because something hurt            → +50 points ("safe stop"), logged for your physio
//   • Extra sessions beyond the plan         → practice, 0 points
//   • Points never depend on speed, range, accuracy or extra reps.
//   • Streak = days on plan. Rest days, red days and unscheduled days never break it,
//     and one missed scheduled day a week is covered by a Flex Pass.
import { BADGES, COSMETICS, RANKS, TRACKS, SCENES, OUTFITS, CREW, PLAN_PRESETS, SKIN, CORE } from './content.js';

const KEY = 'groove-back.v3';
export const POINTS = { session: 100, safeStop: 50, minPlayed: 0.6 };

export function presetPlan(injury = 'knee') {
  const p = PLAN_PRESETS[injury] || PLAN_PRESETS.knee;
  return {
    physio: 'Dr. Anjali (demo)', title: p.title, stage: p.stage, exercises: p.exercises.map((e) => ({ ...e })),
    perWeek: 4, perDay: 1, days: [0, 2, 4, 5], bpm: p.bpm, maxIntensity: 2, standing: true,
    note: 'Move slowly and stay in a pain-free range. Stop if pain goes above 5 out of 10.', updated: null,
  };
}

const fresh = () => ({
  v: 2, started: null,
  profile: { nick: '', skin: SKIN[1], outfit: 'teal', injury: 'knee', onboarded: false },
  rx: presetPlan('knee'),
  prefs: { track: 'sunny-steps', scene: 'room', intensity: 1, camera: true, lite: false },
  a11y: { largeText: false, reduceMotion: false, highContrast: false, sound: true },
  privacy: { shareMilestones: true, shareStreak: true, showRanking: false },
  notify: { reminders: true, time: '18:00', cheers: true },
  checkins: [], sessions: [], days: {}, points: 0, bestStreak: 0,
  badges: {}, unseen: [], wear: { hat: null, trail: null },
  played: { genres: [], scenes: [], moves: [] },
  cheers: { sent: 0, byDay: {}, to: {} }, inbox: [], celebrated: {}, teamWeeks: [],
  settings: { dayOffset: 0 },
});

export let S = load();
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const f = fresh(), d = JSON.parse(raw); return { ...f, ...d, prefs: { ...f.prefs, ...d.prefs }, a11y: { ...f.a11y, ...d.a11y }, privacy: { ...f.privacy, ...d.privacy }, notify: { ...f.notify, ...d.notify } }; } } catch (e) { /* new player */ }
  return fresh();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: progress lasts this visit */ } }
export function resetAll() { S = fresh(); save(); }

// ---------------------------------------------------------------- dates (with a playtest offset)
export function now() { return new Date(Date.now() + S.settings.dayOffset * 86400000); }
export const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => dstr(now());
export const parse = (k) => new Date(k + 'T12:00');
export const addDays = (k, n) => dstr(new Date(parse(k).getTime() + n * 86400000));
export function weekKey(d = now()) { const m = new Date(d); const day = (m.getDay() + 6) % 7; m.setDate(m.getDate() - day); return dstr(m); }
export const dow = (k = today()) => (parse(k).getDay() + 6) % 7; // 0 = Monday
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function day(k = today()) { return S.days[k] || (S.days[k] = { sessions: 0, points: 0, practice: 0, rest: false, red: false }); }
const peek = (k) => S.days[k] || null;
export function startGame() { if (!S.started) { S.started = today(); save(); } }
export const scheduled = (k) => S.rx.days.includes(dow(k));

// ---------------------------------------------------------------- check-ins and the traffic light
export function planFor(c) {
  if (c.pain > 5 || !c.settled) return 'red';
  if (c.pain > 2 || c.stiffness === 'lots' || c.energy === 'low') return 'amber';
  return 'green';
}
export function lastCheckin() { const c = S.checkins[S.checkins.length - 1]; return c && c.date === today() ? c : null; }
export function addCheckin(c) {
  c.date = today(); c.plan = planFor(c); S.checkins.push(c);
  if (c.plan === 'red') day().red = true;
  save(); return c;
}

// ---------------------------------------------------------------- the weekly plan
export function weekSessions(wk = weekKey()) {
  return Object.entries(S.days).filter(([k]) => weekKey(parse(k)) === wk).reduce((a, [, d]) => a + d.sessions, 0);
}
export function weekPoints(wk = weekKey()) {
  return Object.entries(S.days).filter(([k]) => weekKey(parse(k)) === wk).reduce((a, [, d]) => a + d.points, 0);
}
// Does a session started now earn points? Only while today's and this week's plan aren't done.
export function earnable() {
  const d = peek(today());
  const todayLeft = S.rx.perDay - (d ? d.sessions : 0), weekLeft = S.rx.perWeek - weekSessions();
  return { ok: todayLeft > 0 && weekLeft > 0, todayLeft: Math.max(0, todayLeft), weekLeft: Math.max(0, weekLeft) };
}

// Records a finished, stopped or ended session. status: 'complete' | 'safe' | 'partial'.
export function recordSession(r) {
  const k = today(), d = day(k), before = rank(), teamBefore = teamGoal();
  const wkBefore = weekSessions();
  const can = earnable();
  const practice = r.practice || !can.ok;
  let points = 0, counted = false;
  if (!practice && (r.status === 'complete' || r.status === 'safe')) {
    points = r.status === 'complete' ? POINTS.session : POINTS.safeStop;
    counted = true; d.sessions++; d.points += points; S.points += points;
  } else if (practice && r.status !== 'partial') d.practice++;
  const gap = lastSessionGap();
  S.sessions.push({ date: k, status: r.status, practice, points, secs: Math.round(r.secs), played: r.played, lite: r.lite, plan: r.plan, track: r.track, scene: r.scene, moves: r.moves, hurt: r.hurt, fun: r.fun || null, painAfter: null });
  if (r.status !== 'partial') {
    const T = TRACKS.find((t) => t.id === r.track);
    if (T && !S.played.genres.includes(T.world)) S.played.genres.push(T.world);
    if (!S.played.scenes.includes(r.scene)) S.played.scenes.push(r.scene);
    for (const m of r.moves) if (!CORE[m].rest && !S.played.moves.includes(m)) S.played.moves.push(m);
    if (gap >= 7) S.comeback = true;
    if (r.lite || r.status === 'safe' || r.plan !== 'green') S.listened = true;
  }
  const weekGoalJustMet = counted && wkBefore < S.rx.perWeek && weekSessions() >= S.rx.perWeek;
  const st = streak(); S.bestStreak = Math.max(S.bestStreak, st.days);
  const teamAfter = teamGoal();
  if (teamAfter.done >= teamAfter.target && teamAfter.mine > 0 && !S.teamWeeks.includes(weekKey())) S.teamWeeks.push(weekKey());
  if (counted) simulateCheers();
  const newBadges = checkBadges();
  save();
  return { points, counted, practice, weekGoalJustMet, streak: st, rankBefore: before, rankAfter: rank(), teamBefore, teamAfter, newBadges, week: { done: weekSessions(), target: S.rx.perWeek } };
}
export function setPainAfter(v) { const s = S.sessions[S.sessions.length - 1]; if (s) s.painAfter = v; const c = lastCheckin(); if (c) c.after = v; save(); }
function lastSessionGap() {
  const prev = [...S.sessions].reverse().find((s) => s.status !== 'partial');
  if (!prev) return 0;
  return Math.round((parse(today()) - parse(prev.date)) / 86400000);
}
export function restDay() { const d = day(); d.rest = true; checkBadges(); save(); }

// ---------------------------------------------------------------- streak: days on plan
// A day is "on plan" if you did a session, logged rest, had a red check-in, or it wasn't a
// scheduled day. Today never counts against you. One missed scheduled day per week is
// covered by a Flex Pass; a second one starts the count again (your best is kept).
export function onPlan(k) { const d = peek(k); return !!(d && (d.sessions > 0 || d.practice > 0 || d.rest || d.red)) || !scheduled(k); }
export function streak() {
  if (!S.started) return { days: 0, passUsed: false };
  let n = 0, k = today(), passes = {}, passUsed = false;
  if (!onPlan(k)) k = addDays(k, -1); // today is still open
  while (k >= S.started) {
    if (onPlan(k)) n++;
    else { const wk = weekKey(parse(k)); if (passes[wk]) break; passes[wk] = true; if (weekKey(parse(k)) === weekKey()) passUsed = true; n++; }
    k = addDays(k, -1);
  }
  return { days: n, passUsed };
}
// The 7 dots on Home: done, rest, missed, today, planned, free.
export function weekDots() {
  const wk = weekKey(), t = today();
  return Array.from({ length: 7 }, (_, i) => {
    const k = addDays(wk, i), d = peek(k);
    const state = d && d.sessions > 0 ? 'done' : d && (d.rest || d.red) ? 'rest' : d && d.practice ? 'done' : k === t ? 'today' : k > t ? (scheduled(k) ? 'planned' : 'free') : scheduled(k) && S.started && k >= S.started ? 'missed' : 'free';
    return { k, label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], name: DAY_NAMES[i], state, scheduled: scheduled(k) };
  });
}

// ---------------------------------------------------------------- rank + unlocks (cosmetic only)
export function rank(p = S.points) {
  let i = 0; for (let k = 0; k < RANKS.length; k++) if (p >= RANKS[k].pts) i = k;
  const next = RANKS[i + 1];
  return { i, name: RANKS[i].name, pts: p, next: next ? next.name : null, need: next ? next.pts : null, frac: next ? (p - RANKS[i].pts) / (next.pts - RANKS[i].pts) : 1 };
}
export const unlocked = (item) => rank().i >= (item.rank || 0);
export const trackOf = (id = S.prefs.track) => TRACKS.find((t) => t.id === id) || TRACKS[0];
export const sceneOf = (id = S.prefs.scene) => SCENES.find((t) => t.id === id) || SCENES[0];
export const outfitOf = (id = S.profile.outfit) => OUTFITS.find((o) => o.id === id) || OUTFITS[0];

// ---------------------------------------------------------------- badges
export function stats() {
  const done = S.sessions.filter((s) => s.status !== 'partial');
  const weeks = new Set(Object.keys(S.days).map((k) => weekKey(parse(k)))); let weeksMet = 0;
  for (const wk of weeks) if (weekSessions(wk) >= S.rx.perWeek) weeksMet++;
  return {
    sessions: done.length, weeks: weeksMet, streak: Math.max(S.bestStreak, streak().days), rests: Object.values(S.days).filter((d) => d.rest).length,
    comeback: S.comeback ? 1 : 0, listen: S.listened ? 1 : 0, moves: S.played.moves.length, genres: S.played.genres.length, scenes: S.played.scenes.length,
    team: S.teamWeeks.length, cheers: S.cheers.sent,
  };
}
export function badgeProgress(b) { const t = stats(); const [k, need] = b.rule; return { have: Math.min(t[k], need), need, done: !!S.badges[b.id] }; }
export function checkBadges() {
  const t = stats(), out = [];
  for (const b of BADGES) {
    if (S.badges[b.id]) continue;
    if (t[b.rule[0]] >= b.rule[1]) { S.badges[b.id] = today(); S.unseen.push(b.id); out.push(b); }
  }
  if (out.length) save();
  return out;
}
export function takeUnseen() { const ids = S.unseen.splice(0); save(); return ids.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean); }
export const hasCosmetic = (c) => !!S.badges[c.badge];
export function wearItem(kind, id) { S.wear[kind] = S.wear[kind] === id ? null : id; save(); }
export const cosmeticFor = (badgeId) => COSMETICS.find((c) => c.badge === badgeId);

// ---------------------------------------------------------------- league: Groove Together (simulated crew)
function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const hashStr = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
// How far through the week we are, so the demo crew fills up gradually.
const weekFrac = () => (dow() + now().getHours() / 24 + 0.3) / 7;
export function crew() {
  const wk = weekKey();
  const rows = CREW.map((m) => {
    const r = seeded(hashStr(wk + m.nick));
    const done = Math.min(m.plan, Math.floor(m.plan * m.adh * Math.min(1, weekFrac() * (0.9 + r() * 0.3)) + r() * 0.6));
    return { ...m, done, pct: done / m.plan, me: false, streak: Math.round(2 + r() * 12 * m.adh) };
  });
  const mine = weekSessions();
  rows.unshift({ nick: S.profile.nick || 'you', color: outfitOf().color, skin: S.profile.skin, plan: S.rx.perWeek, done: mine, pct: mine / S.rx.perWeek, me: true, streak: streak().days });
  return rows;
}
// Everyone's planned sessions count the same, whatever the exercise. Target = 75% of the crew's combined plan.
export function teamGoal() {
  const rows = crew();
  const plan = rows.reduce((a, r) => a + r.plan, 0);
  return { target: Math.round(plan * 0.75), done: rows.reduce((a, r) => a + r.done, 0), mine: rows[0].done, members: rows.length };
}
export function cheerChain() {
  const r = seeded(hashStr('cheer' + weekKey()));
  const mates = Math.round(weekFrac() * (14 + r() * 6));
  const mine = Object.entries(S.cheers.byDay).filter(([k]) => weekKey(parse(k)) === weekKey()).reduce((a, [, n]) => a + n, 0);
  return { target: 25, done: Math.min(25, mates + mine), mine };
}
export function sendCheer(nick, e) {
  const k = today();
  S.cheers.sent++; S.cheers.byDay[k] = (S.cheers.byDay[k] || 0) + 1;
  (S.cheers.to[k] ||= {})[nick] = e;
  const b = checkBadges(); save(); return b;
}
export const cheeredToday = (nick) => (S.cheers.to[today()] || {})[nick];
// After you finish a session, a couple of demo crew members cheer you (shown as simulated).
function simulateCheers() {
  if (!S.privacy.shareMilestones) return;
  const r = seeded(hashStr(today() + S.sessions.length));
  const pool = [...CREW].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 2));
  const cheers = ['👏 Well done!', '💪 Keep going', '❤️ I’m with you', '🔥 On a roll'];
  for (const m of pool) S.inbox.unshift({ from: m.nick, color: m.color, skin: m.skin, text: cheers[Math.floor(r() * cheers.length)], date: today() });
  S.inbox = S.inbox.slice(0, 12);
}
// This week's crew activity, simulated. Only participation, never injuries or exercises.
export function crewFeed() {
  const items = [];
  for (const m of CREW) {
    const r = seeded(hashStr(weekKey() + 'feed' + m.nick));
    const row = crew().find((x) => x.nick === m.nick);
    if (row.done > 0) items.push({ ...m, text: `finished session ${row.done} of ${m.plan} this week`, ago: 1 + Math.floor(r() * 20) });
    if (r() < 0.45) items.push({ ...m, text: r() < 0.5 ? `is ${row.streak} days on plan` : 'earned the Week Warrior badge', ago: 2 + Math.floor(r() * 40) });
  }
  return items.sort((a, b) => a.ago - b.ago).slice(0, 7);
}

// ---------------------------------------------------------------- progress + weekly summary
export function weekSummary(wk = weekKey()) {
  const ses = S.sessions.filter((s) => weekKey(parse(s.date)) === wk && s.status !== 'partial');
  const rests = Object.entries(S.days).filter(([k, d]) => weekKey(parse(k)) === wk && (d.rest || d.red)).length;
  return { wk, sessions: weekSessions(wk), target: S.rx.perWeek, minutes: Math.round(ses.reduce((a, s) => a + s.secs, 0) / 60), rests, points: weekPoints(wk), lite: ses.filter((s) => s.lite).length };
}
export function firstWeek() { return S.started ? weekKey(parse(S.started)) : weekKey(); }
// Sessions per bucket for the progress chart.
export function chart(range) {
  if (range === 'week') return weekDots().map((d) => ({ label: d.name, v: (peek(d.k) || {}).sessions || 0, rest: d.state === 'rest', today: d.k === today() }));
  const n = range === 'month' ? 5 : 10, wk = weekKey();
  return Array.from({ length: n }, (_, i) => { const w = addDays(wk, -(n - 1 - i) * 7); return { label: i === n - 1 ? 'This wk' : parse(w).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), v: weekSessions(w), target: S.rx.perWeek }; });
}

// ---------------------------------------------------------------- physio (demo)
export function setPlan(rx) { S.rx = { ...S.rx, ...rx, updated: today() }; if (S.prefs.intensity > S.rx.maxIntensity) S.prefs.intensity = S.rx.maxIntensity; S.inbox.unshift({ from: S.rx.physio, physio: true, text: 'Updated your plan', date: today() }); save(); }
export { SKIN };
