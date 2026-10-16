// A small band, synthesized live. One per music world. It is also the beat clock for the game.
// Layers join as your Groove fills: 0 pad + bass, 1 drums, 2 strums/plucks, 3 lead.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const WORLDS = {
  lofi: { chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], keys: 'rhodes', drums: 'lofi', arp: 'keys', lead: 'bell', crackle: true, swing: 0.12 },
  acoustic: { chords: [[55, 59, 62, 67], [50, 54, 57, 62], [52, 55, 59, 64], [48, 52, 55, 60]], keys: 'warm', drums: 'folk', arp: 'guitar', lead: 'whistle', swing: 0.06 },
  pop: { chords: [[59, 62, 66, 71], [55, 59, 62, 67], [57, 62, 66, 69], [57, 61, 64, 69]], keys: 'synth', drums: 'pop', arp: 'pluck', lead: 'bell', swing: 0 },
  dhol: { chords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]], keys: 'warm', drums: 'dhol', arp: 'tumbi', lead: 'tumbi', swing: 0.08 },
  dance: { chords: [[60, 63, 67, 72], [56, 60, 63, 68], [63, 67, 70, 75], [58, 62, 65, 70]], keys: 'synth', drums: 'house', arp: 'stab', lead: 'saw', swing: 0 },
};
const MOTIF = [0, null, 1, 2, null, 3, 2, null, 1, null, 0, 2, null, 1, null, null];
// Chorus hook: indexes into the chord tones plus the octave above (4..7). Two bars, two variations.
const HOOK = [[4, null, 4, 3, null, 2, 3, 4, null, 5, 4, null, 3, null, 2, null], [4, null, 4, 3, null, 2, 3, null, 1, 2, null, 3, 2, null, 0, null]];
const BRIDGE_MOTIF = [2, null, null, 3, null, null, 4, null, 3, null, null, 2, null, null, 1, null];

let shared = null; // one AudioContext for the whole app
export function audioCtx() {
  if (!shared) {
    const AC = window.AudioContext || window.webkitAudioContext;
    shared = new AC();
  }
  return shared;
}
// One master gain so the Sound setting mutes everything at once.
let master = null, muted = false;
function dest(c) { if (!master) { master = c.createGain(); master.gain.value = muted ? 0 : 1; master.connect(c.destination); } return master; }
export function setMuted(v) { muted = !!v; if (master) master.gain.value = muted ? 0 : 1; }
export async function unlockAudio() { try { await audioCtx().resume(); } catch (e) { /* ignore */ } }

function impulse(c, sec) {
  const len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  return b;
}
let noiseBuf = null;
function noise(c) {
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return noiseBuf;
}

export class Band {
  // tr: semitones to transpose, so two tracks in the same genre sound like different songs
  constructor(bpm, worldId, getSection, tr = 0) {
    const base = WORLDS[worldId] || WORLDS.pop;
    this.bpm = bpm; this.spb = 60 / bpm; this.w = { ...base, chords: base.chords.map((c) => c.map((n) => n + tr)) }; this.getSection = getSection;
    const c = this.c = audioCtx();
    this.out = c.createGain(); this.out.gain.value = 0.85;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    this.out.connect(comp).connect(dest(c));
    this.verb = c.createConvolver(); this.verb.buffer = impulse(c, 2.4);
    const vg = c.createGain(); vg.gain.value = 0.28; this.verb.connect(vg).connect(this.out);
    this.delay = c.createDelay(2); this.delay.delayTime.value = this.spb * 0.75;
    const fb = c.createGain(); fb.gain.value = 0.28; const dg = c.createGain(); dg.gain.value = 0.2;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(dg).connect(this.out);
    this.bus = {};
    for (const k of ['pad', 'bass', 'drums', 'arp', 'lead', 'sparkle', 'fx']) {
      const gn = c.createGain(); gn.gain.value = k === 'pad' || k === 'bass' || k === 'fx' ? 1 : 0;
      gn.connect(this.out); if (k !== 'bass' && k !== 'drums') gn.connect(this.verb);
      this.bus[k] = gn;
    }
    this.bus.arp.connect(this.delay); this.bus.lead.connect(this.delay); this.bus.sparkle.connect(this.delay);
    // the pad "pumps" with the kick in the bigger worlds, which makes slow tempos feel like they're moving
    this.pump = ['pop', 'dance', 'dhol'].includes(worldId);
    this.padDuck = c.createGain(); this.bus.pad.disconnect(); this.bus.pad.connect(this.padDuck); this.padDuck.connect(this.out); this.padDuck.connect(this.verb);
    this.level = 0; this.target = {}; this.t0 = 0; this.step = 0; this.timer = 0; this.total = 0; this.paused = false;
    this.crackleSrc = null; this.hum = null;
  }
  start(totalBeats, countIn = 4) {
    const c = this.c;
    this.total = totalBeats;
    this.t0 = c.currentTime + 0.3 + countIn * this.spb;
    this.step = -countIn * 2;
    this.countIn = countIn;
    if (this.w.crackle) this.crackle(true);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }
  beat() { return (this.c.currentTime - this.t0) / this.spb; }
  // jump the beat clock (restart or skip a move); the scheduler picks up from the new position
  seek(b) { this.t0 = this.c.currentTime + 0.06 - b * this.spb; this.step = Math.ceil(b * 2); }
  async pause() { this.paused = true; try { await this.c.suspend(); } catch (e) { /* */ } }
  async resume() { this.paused = false; try { await this.c.resume(); } catch (e) { /* */ } }
  stop(fade = 0.6) {
    clearInterval(this.timer);
    const t = this.c.currentTime;
    this.out.gain.setTargetAtTime(0, t, fade / 3);
    this.crackle(false);
    setTimeout(() => { try { this.out.disconnect(); } catch (e) { /* */ } }, fade * 1000 + 800);
  }
  // The band is full from the first beat; dancing well adds the shine on top.
  setGroove(level, section) {
    const rest = section === 'rest', soft = section === 'warm' || section === 'cool', chorus = section === 'chorus';
    const tg = {
      drums: rest ? 0 : soft ? 0.6 : 1,
      arp: rest ? 0.35 : soft ? 0.6 : 1,
      lead: rest || soft ? 0 : chorus || level >= 2 ? 1 : 0.55,
      sparkle: !rest && level >= 3 ? 1 : chorus && level >= 2 ? 0.6 : 0,
    };
    for (const k in tg) if (this.target[k] !== tg[k]) { this.bus[k].gain.setTargetAtTime(tg[k], this.c.currentTime, 0.45); this.target[k] = tg[k]; }
  }
  tick() {
    const c = this.c;
    for (;;) {
      const t = this.t0 + this.step * this.spb / 2;
      if (t > c.currentTime + 0.15) break;
      const b = this.step / 2;
      if (b > this.total + 1) { clearInterval(this.timer); break; }
      if (t >= c.currentTime - 0.05) this.play(b, t);
      this.step++;
    }
  }
  // ---------------------------------------------------------------- arrangement
  play(b, t) {
    const w = this.w;
    if (b < 0) { if (b % 1 === 0) this.click(t, b === -this.countIn); return; }
    if (b >= this.total) { if (b === this.total) { this.pad(t, w.chords[0].map((n) => n - 12), this.spb * 6, 0.035); this.bell(t, mtof(w.chords[0][3] + 12), 0.1, 'fx'); } return; }
    const sec = this.getSection ? this.getSection(b) : { kind: 'verse', spotlight: false };
    const bar = Math.floor(b / 4), pos = b - bar * 4;
    // the chorus and bridge get their own chord order, so sections actually sound different
    const order = sec.kind === 'chorus' ? [3, 0, 1, 2] : sec.kind === 'bridge' ? [1, 1, 2, 3] : [0, 1, 2, 3];
    const ch = w.chords[order[bar % 4]];
    const inEight = b - Math.floor(b / 8) * 8;
    const swing = (pos % 1 === 0.5) ? this.spb * w.swing : 0;
    const ts = t + swing;
    if (pos === 0) this.pad(t, ch.slice(0, 3).map((n) => n - 12), this.spb * 4.2, sec.kind === 'rest' ? 0.045 : 0.032);
    // bass
    const root = ch[0] - 24;
    if (w.drums === 'house') { if (pos % 1 === 0.5) this.bass(ts, mtof(root), this.spb * 0.45, 0.26); }
    else { if (pos === 0) this.bass(t, mtof(root), this.spb * 1.7, 0.3); if (pos === 2.5) this.bass(ts, mtof(root + 12), this.spb * 0.9, 0.16); if (pos === 3.5 && w.drums !== 'lofi') this.bass(ts, mtof(root + 7), this.spb * 0.4, 0.12); }
    // drums, plus a fill into every new 8-count and a crash on each new section
    if (sec.firstOfSection && pos === 0 && b > 0) this.crash(t, sec.kind === 'chorus' ? 1 : 0.6);
    if (inEight >= 7 && sec.kind !== 'rest' && sec.nextKind !== 'rest') this.fill(t, inEight - 7, sec.nextKind === 'chorus');
    else this.drums(w.drums, pos, t, ts);
    if (sec.kind === 'chorus' && (pos === 1 || pos === 3) && w.drums !== 'pop' && w.drums !== 'house') this.clap(t, 0.45);
    if (sec.nextKind === 'chorus' && sec.kind !== 'chorus' && inEight === 7.5) this.hey(ts);
    // sparkle: a glassy octave-up arpeggio that only shows up when you're grooving
    if (pos % 1 === 0.5) this.bell(ts, mtof(ch[[2, 3, 1, 3][Math.floor(pos)]] + 24), 0.025, 'sparkle');
    // arp / strum
    const s8 = Math.round(pos * 2);
    const arpNote = ch[[0, 1, 2, 3, 2, 1, 2, 3][s8]] + 12;
    if (w.arp === 'guitar') { if (pos % 1 === 0) this.strum(t, ch, pos === 0 || pos === 2 ? 1 : 0.6); }
    else if (w.arp === 'stab') { if (pos % 1 === 0.5) this.stab(ts, ch); }
    else if (w.arp === 'tumbi') { if ([0, 0.5, 1.5, 2, 3, 3.5].includes(pos)) this.tumbi(ts, mtof(arpNote + 12), 0.06, 'arp'); }
    else if (w.arp === 'keys') { if (pos % 1 === 0) this.rhodes(t, mtof(arpNote), 0.06, 'arp'); }
    else this.pluck(ts, mtof(arpNote));
    // lead
    const hook = sec.kind === 'chorus' ? HOOK[Math.floor(bar / 2) % 2] : sec.kind === 'bridge' ? BRIDGE_MOTIF : MOTIF;
    const m = hook[(bar % 2) * 8 + s8];
    if (m !== null && m !== undefined) {
      const note = (m >= 4 ? ch[m - 4] + 12 : ch[m]) + 24;
      if (w.lead === 'tumbi') this.tumbi(ts, mtof(note), 0.07, 'lead');
      else if (w.lead === 'saw') this.sawLead(ts, mtof(note));
      else if (w.lead === 'whistle') this.whistle(ts, mtof(note));
      else this.bell(ts, mtof(note), 0.06, 'lead');
    }
    if (pos === 0 && sec.firstBeatOfEight && (sec.spotlight || (sec.nextKind === 'chorus' && sec.kind !== 'chorus'))) this.riser(t, this.spb * 8);
    if (sec.firstOfSection && sec.kind === 'chorus' && pos === 0) this.boom(t);
  }
  drums(kind, pos, t, ts) {
    if (kind === 'lofi') {
      if (pos === 0 || pos === 2.5) this.kick(t, 0.7);
      if (pos === 1 || pos === 3) this.snare(t, 0.35, true);
      if (pos % 0.5 === 0) this.hat(ts, pos % 1 === 0 ? 0.35 : 0.22);
    } else if (kind === 'folk') {
      if (pos === 0 || pos === 2) this.kick(t, 0.6);
      if (pos === 1 || pos === 3) this.snare(t, 0.25, true);
      this.shaker(ts, pos % 1 === 0 ? 0.5 : 0.35);
    } else if (kind === 'pop') {
      if (pos === 0 || pos === 2 || pos === 2.5) this.kick(t, pos === 2.5 ? 0.6 : 0.9);
      if (pos === 1 || pos === 3) this.clap(t, 0.6);
      this.hat(ts, pos % 1 === 0 ? 0.3 : 0.4);
    } else if (kind === 'dhol') {
      // a bhangra-ish pattern: dha . na dha | . na dha na
      if ([0, 1.5, 2, 3.5].includes(pos)) this.dhol(t, true, 1);
      if ([0.5, 1, 2.5, 3].includes(pos)) this.dhol(ts, false, pos === 1 || pos === 3 ? 0.9 : 0.6);
      if (pos === 1 || pos === 3) this.clap(t, 0.3);
      this.shaker(ts, 0.3);
    } else if (kind === 'house') {
      if (pos % 1 === 0) this.kick(t, 1);
      if (pos === 1 || pos === 3) this.clap(t, 0.55);
      if (pos % 1 === 0.5) this.hat(ts, 0.55, true); else this.hat(ts, 0.2);
    }
  }
  // ---------------------------------------------------------------- instruments
  env(gn, t, a, peak, dur) { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  osc(type, f, t, dur, peak, a, dest, detune = 0) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune; this.env(gn, t, a, peak, dur);
    o.connect(gn).connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  pad(t, notes, dur, vol) {
    const c = this.c, f = c.createBiquadFilter(), gn = c.createGain();
    f.type = 'lowpass'; f.frequency.value = this.w.keys === 'synth' ? 1600 : 950;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + 0.7);
    gn.gain.setValueAtTime(vol, t + Math.max(0.8, dur - 0.5)); gn.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
    f.connect(gn).connect(this.bus.pad);
    for (const n of notes) for (const d of [-7, 7]) {
      const o = c.createOscillator(); o.type = this.w.keys === 'rhodes' ? 'triangle' : 'sawtooth';
      o.frequency.value = mtof(n); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.4);
    }
  }
  bass(t, f, dur, vol) { this.osc('sine', f, t, dur, vol, 0.015, this.bus.bass); this.osc('triangle', f, t, dur * 0.6, vol * 0.25, 0.01, this.bus.bass); }
  pluck(t, f) {
    const c = this.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; lp.connect(this.bus.arp);
    this.osc('triangle', f, t, 0.38, 0.075, 0.005, lp);
  }
  rhodes(t, f, vol, bus) { this.osc('sine', f, t, 1.1, vol, 0.006, this.bus[bus]); this.osc('sine', f * 2, t, 0.5, vol * 0.3, 0.004, this.bus[bus]); }
  strum(t, ch, v) {
    ch.forEach((n, i) => {
      const c = this.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(this.bus.arp);
      this.osc('sawtooth', mtof(n), t + i * 0.018, 0.5, 0.025 * v, 0.004, lp);
    });
  }
  stab(t, ch) {
    const c = this.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.2); lp.connect(this.bus.arp);
    ch.slice(0, 3).forEach((n) => { this.osc('sawtooth', mtof(n + 12), t, 0.22, 0.03, 0.004, lp, -6); this.osc('sawtooth', mtof(n + 12), t, 0.22, 0.03, 0.004, lp, 6); });
  }
  tumbi(t, f, vol, bus) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain(), bp = c.createBiquadFilter();
    o.type = 'square'; o.frequency.setValueAtTime(f * 1.03, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
    this.env(gn, t, 0.003, vol, 0.28); o.connect(bp).connect(gn).connect(this.bus[bus]); o.start(t); o.stop(t + 0.3);
  }
  sawLead(t, f) {
    const c = this.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.connect(this.bus.lead);
    this.osc('sawtooth', f, t, 0.3, 0.035, 0.01, lp, -8); this.osc('sawtooth', f, t, 0.3, 0.035, 0.01, lp, 8);
  }
  whistle(t, f) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.5; lg.gain.value = f * 0.008; lfo.connect(lg).connect(o.frequency);
    this.env(gn, t, 0.04, 0.05, 0.42); o.connect(gn).connect(this.bus.lead); o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
  }
  bell(t, f, vol, bus) { this.osc('sine', f, t, 1.4, vol, 0.004, this.bus[bus]); this.osc('sine', f * 2.76, t, 0.6, vol * 0.2, 0.003, this.bus[bus]); }
  kick(t, v) {
    if (this.pump) { const d = this.padDuck.gain; d.cancelScheduledValues(t); d.setValueAtTime(0.3, t); d.linearRampToValueAtTime(1, t + this.spb * 0.7); }
    const c = this.c, o = c.createOscillator(), gn = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.22);
    this.env(gn, t, 0.003, 0.55 * v, 0.38); o.connect(gn).connect(this.bus.drums); o.start(t); o.stop(t + 0.4);
  }
  snare(t, v, soft) {
    const c = this.c, n = c.createBufferSource(), bp = c.createBiquadFilter(), gn = c.createGain();
    n.buffer = noise(c); bp.type = soft ? 'lowpass' : 'bandpass'; bp.frequency.value = soft ? 3500 : 1800;
    this.env(gn, t, 0.003, 0.22 * v, soft ? 0.22 : 0.16); n.connect(bp).connect(gn).connect(this.bus.drums); n.start(t, Math.random() * 0.5, 0.3);
  }
  clap(t, v) { this.snare(t, v * 1.2, false); this.snare(t + 0.012, v * 0.8, false); }
  hat(t, v, open) {
    const c = this.c, n = c.createBufferSource(), hp = c.createBiquadFilter(), gn = c.createGain();
    n.buffer = noise(c); hp.type = 'highpass'; hp.frequency.value = 7200;
    this.env(gn, t, 0.002, 0.07 * v, open ? 0.16 : 0.045); n.connect(hp).connect(gn).connect(this.bus.drums); n.start(t, Math.random() * 0.5, 0.2);
  }
  shaker(t, v) {
    const c = this.c, n = c.createBufferSource(), bp = c.createBiquadFilter(), gn = c.createGain();
    n.buffer = noise(c); bp.type = 'bandpass'; bp.frequency.value = 6000; bp.Q.value = 0.8;
    this.env(gn, t, 0.006, 0.06 * v, 0.07); n.connect(bp).connect(gn).connect(this.bus.drums); n.start(t, Math.random() * 0.5, 0.1);
  }
  dhol(t, low, v) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain();
    o.type = 'sine';
    if (low) { o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(72, t + 0.25); this.env(gn, t, 0.003, 0.5 * v, 0.35); }
    else { o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(290, t + 0.08); this.env(gn, t, 0.002, 0.2 * v, 0.12); }
    o.connect(gn).connect(this.bus.drums); o.start(t); o.stop(t + 0.4);
    if (!low) this.snare(t, 0.35 * v, false);
  }
  // drum fill over the last beat of an 8-count: four 16th snares, then toms if the chorus is next
  fill(t, half, big) {
    const s16 = this.spb / 4;
    if (half === 0) { this.kick(t, 0.7); for (let i = 0; i < 2; i++) this.snare(t + i * s16, 0.35 + i * 0.12, false); }
    else for (let i = 0; i < 2; i++) { const tt = t + i * s16; if (big) this.tom(tt, 160 - i * 30, 0.6); else this.snare(tt, 0.55 + i * 0.15, false); }
  }
  tom(t, f, v) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.25);
    this.env(gn, t, 0.003, 0.45 * v, 0.3); o.connect(gn).connect(this.bus.drums); o.start(t); o.stop(t + 0.32);
  }
  crash(t, v) {
    const c = this.c, n = c.createBufferSource(), hp = c.createBiquadFilter(), gn = c.createGain();
    n.buffer = noise(c); n.loop = true; hp.type = 'highpass'; hp.frequency.value = 5200;
    this.env(gn, t, 0.004, 0.12 * v, 1.6); n.connect(hp).connect(gn).connect(this.bus.drums); gn.connect(this.verb); n.start(t); n.stop(t + 1.7);
  }
  // the "drop": a low sub hit as the chorus lands
  boom(t) {
    const c = this.c, o = c.createOscillator(), gn = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.7);
    this.env(gn, t, 0.005, 0.5, 0.9); o.connect(gn).connect(this.bus.fx); o.start(t); o.stop(t + 1);
  }
  // a crowd-style "Hey!": two detuned saws through vowel formants
  hey(t) {
    const c = this.c, gn = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = 1850; f2.Q.value = 7;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.35, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    for (const [f, d] of [[200, -14], [203, 9], [300, 0]]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.24); o.detune.value = d;
      o.connect(f1); o.connect(f2); o.start(t); o.stop(t + 0.3);
    }
    const ns = c.createBufferSource(); ns.buffer = noise(c); const nh = c.createBiquadFilter(); nh.type = 'highpass'; nh.frequency.value = 3000; const ng = c.createGain();
    this.env(ng, t, 0.002, 0.08, 0.05); ns.connect(nh).connect(ng).connect(this.bus.fx); ns.start(t, 0, 0.08);
    f1.connect(gn); f2.connect(gn); gn.connect(this.bus.fx); gn.connect(this.verb);
  }
  click(t, accent) { this.osc('sine', accent ? 1320 : 990, t, 0.07, accent ? 0.16 : 0.1, 0.002, this.bus.fx); }
  riser(t, dur) {
    const c = this.c, n = c.createBufferSource(), bp = c.createBiquadFilter(), gn = c.createGain();
    n.buffer = noise(c); n.loop = true; bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.95); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(gn).connect(this.bus.fx); n.start(t); n.stop(t + dur + 0.05);
  }
  crackle(on) {
    const c = this.c;
    if (on && !this.crackleSrc) {
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.01;
      const s = c.createBufferSource(); s.buffer = b; s.loop = true; const gn = c.createGain(); gn.gain.value = 0.18;
      s.connect(gn).connect(this.bus.pad); s.start(); this.crackleSrc = s;
    } else if (!on && this.crackleSrc) { try { this.crackleSrc.stop(); } catch (e) { /* */ } this.crackleSrc = null; }
  }
  // ---------------------------------------------------------------- game sounds
  stars(n, gold) {
    const t = this.c.currentTime, root = this.w.chords[0][0] + 12;
    const notes = [root + 7, root + 12, root + 16].slice(0, Math.max(1, n));
    notes.forEach((m, i) => this.bell(t + i * 0.07, mtof(m), n === 3 ? 0.09 : 0.06, 'fx'));
    if (gold) [0, 4, 7, 12].forEach((d, i) => this.bell(t + 0.25 + i * 0.05, mtof(root + 24 + d), 0.05, 'fx'));
  }
  humOn() {
    if (this.hum) return;
    const t = this.c.currentTime; const o = this.c.createOscillator(), gn = this.c.createGain();
    o.type = 'sine'; o.frequency.value = mtof(this.w.chords[0][0]); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.03, t + 0.5);
    o.connect(gn).connect(this.bus.fx); o.start(t); this.hum = { o, gn };
  }
  humOff() { if (!this.hum) return; const t = this.c.currentTime; this.hum.gn.gain.setTargetAtTime(0.0001, t, 0.15); this.hum.o.stop(t + 0.8); this.hum = null; }
}

// An 8-second taste of a track for the music screen.
let previewBand = null, previewTimer = 0;
export function preview(world, tr, bpm, onEnd) {
  stopPreview();
  const b = new Band(bpm, world, (beat) => ({ kind: beat < 4 ? 'verse' : 'chorus', firstBeatOfEight: beat % 8 === 0, firstOfSection: beat === 4, nextKind: 'chorus' }), tr);
  b.setGroove(3, 'chorus'); b.start(Math.ceil(8 / b.spb), 0); previewBand = b;
  previewTimer = setTimeout(() => { stopPreview(); onEnd && onEnd(); }, 8000);
}
export function stopPreview() { clearTimeout(previewTimer); if (previewBand) { previewBand.stop(0.3); previewBand = null; } }

// UI sounds outside songs
export const sfx = {
  tap() { const c = audioCtx(); const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08); o.connect(g).connect(dest(c)); o.start(); o.stop(c.currentTime + 0.1); },
  chime(notes = [72, 76, 79], gap = 0.08, vol = 0.07) {
    const c = audioCtx();
    notes.forEach((m, i) => { const t = c.currentTime + i * gap; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = mtof(m); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g).connect(dest(c)); o.start(t); o.stop(t + 1.3); });
  },
  fanfare() { this.chime([67, 72, 76, 79, 84, 88], 0.09, 0.08); },
  // 3, 2, 1, GO
  count(n) { this.chime([n === 0 ? 84 : 72], 0, n === 0 ? 0.12 : 0.09); if (n === 0) this.chime([79, 88], 0.06, 0.07); },
  whoosh() {
    const c = audioCtx(), t = c.currentTime, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(c); s.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(4000, t + 0.45);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    s.connect(bp).connect(g).connect(dest(c)); s.start(t); s.stop(t + 0.6);
  },
  pop() { this.chime([84], 0, 0.05); },
  // A small crowd: a swell of band-passed noise ("woo") plus a handful of claps. size 1..3.
  cheer(size = 1) {
    const c = audioCtx(), t = c.currentTime, buf = noise(c);
    const swell = c.createBufferSource(); swell.buffer = buf; swell.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.7;
    const g = c.createGain(); const peak = 0.035 + 0.02 * size;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 + 0.35 * size);
    bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.5);
    swell.connect(bp).connect(g).connect(dest(c)); swell.start(t); swell.stop(t + 1.4 + 0.35 * size);
    for (let i = 0; i < 4 + size * 4; i++) {
      const ct = t + 0.05 + Math.random() * (0.6 + 0.3 * size);
      const src = c.createBufferSource(); src.buffer = buf; src.playbackRate.value = 0.9 + Math.random() * 0.4;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
      const cg = c.createGain(); cg.gain.setValueAtTime(0.0001, ct); cg.gain.exponentialRampToValueAtTime(0.05, ct + 0.003); cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.06);
      src.connect(hp).connect(cg).connect(dest(c)); src.start(ct, Math.random() * 0.5); src.stop(ct + 0.08);
    }
  },
};
