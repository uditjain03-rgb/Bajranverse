// Sounds of ROCKY'S PIRATE ARMY: talking pirates (a tiny formant voice), pistols, muskets, cannons and cartoon
// effects, all synthesised with the sound engine in audio.js. (The music is in music.js.)
import { Audio } from './audio.js';

const R = (a, b) => a + Math.random() * (b - a);
const H = Audio.H;

// ---------------- a tiny talking voice (formant synthesis): "Arrr!", "Yo-ho!", "Fire!", "Halt!" ----------------
const FORM = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [300, 2250, 3000], o: [520, 860, 2410], u: [320, 870, 2240], r: [460, 1250, 1600], er: [490, 1350, 1690], m: [250, 1000, 2200], n: [250, 1400, 2400], l: [380, 900, 2400] };
const NOISE = { h: [1500, 0.5], f: [5000, 0.5], s: [6000, 0.6], sh: [3000, 0.6], ch: [3200, 0.8], k: [2200, 0.9], t: [4000, 0.9], p: [800, 0.9], b: [500, 0.7], d: [1500, 0.8], g: [1200, 0.8], y: [2600, 0.3] };
function speak(t, segs, o = {}) {
  const ctx = H.ctx; if (!ctx) return;
  const f0 = o.f0 || 160, fk = o.fk || 1, vol = o.vol || 0.4, dur = segs.reduce((a, s) => a + s[1], 0);
  const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.03); out.gain.setValueAtTime(vol, t + dur - 0.06); out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); out.connect(H.bus);
  const src = ctx.createOscillator(); src.type = 'sawtooth';
  const ct = o.contour || [1, 1.15, 0.85]; src.frequency.setValueAtTime(f0 * ct[0], t); ct.forEach((c, i) => src.frequency.linearRampToValueAtTime(f0 * c, t + dur * (i / (ct.length - 1 || 1))));
  if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vibRate || 7; lg.gain.value = f0 * o.vib; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + 0.1); }
  const filters = [0, 1, 2].map(k => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [9, 11, 12][k]; const g = ctx.createGain(); g.gain.value = [1, 0.6, 0.3][k]; src.connect(f); f.connect(g); g.connect(out); return f; });
  let tt = t;
  for (const [ph, d] of segs) {
    const F = FORM[ph];
    if (F) filters.forEach((f, k) => f.frequency.linearRampToValueAtTime(F[k] * fk, tt + Math.min(0.05, d)));
    else if (NOISE[ph]) { const [freq, amp] = NOISE[ph]; H.noise(tt, d, amp * vol * 0.8, 'bandpass', freq, freq, 2); }
    tt += d;
  }
  src.start(t); src.stop(t + dur + 0.1);
}
const LINES = {
  arr: [['a', 0.14], ['r', 0.36]], yoho: [['y', 0.05], ['o', 0.2], ['h', 0.06], ['o', 0.3]], charge: [['ch', 0.08], ['a', 0.3], ['r', 0.12], ['d', 0.06]],
  hooray: [['h', 0.05], ['u', 0.14], ['r', 0.06], ['e', 0.12], ['i', 0.2]], ahoy: [['a', 0.12], ['h', 0.05], ['o', 0.16], ['i', 0.18]],
  halt: [['h', 0.06], ['a', 0.2], ['l', 0.08], ['t', 0.05]], oof: [['u', 0.16], ['f', 0.08]], fire: [['f', 0.09], ['a', 0.15], ['i', 0.12], ['er', 0.16]],
  stop: [['s', 0.08], ['t', 0.03], ['o', 0.22], ['p', 0.04]], nooo: [['n', 0.08], ['o', 0.75]], mama: [['m', 0.06], ['a', 0.16], ['m', 0.06], ['a', 0.3]], whoa: [['u', 0.08], ['o', 0.3], ['a', 0.18]],
};
const say = (t, w, o) => speak(t, LINES[w], o);

Audio.extend({
  // pirates (crew voices are higher and quicker; the captain is deep and growly)
  arr(t) { say(t, 'arr', { f0: R(140, 210), fk: R(0.95, 1.1), contour: [1.1, 1.3, 0.8], vib: 0.1, vibRate: 22, vol: 0.45 }); },
  yoho(t) { say(t, 'yoho', { f0: R(170, 230), contour: [1, 1.3, 1, 1.25], vol: 0.4 }); },
  charge(t) { say(t, 'charge', { f0: R(160, 220), contour: [1, 1.4, 1.2], vol: 0.5 }); },
  hooray(t) { for (let i = 0; i < 6; i++) say(t + Math.random() * 0.2, 'hooray', { f0: R(150, 260), fk: R(0.9, 1.15), contour: [1, 1.1, 1.5], vol: 0.18 }); },
  crewCheer(t) { for (let i = 0; i < 7; i++) say(t + Math.random() * 0.25, pickW(['arr', 'yoho', 'hooray']), { f0: R(140, 250), fk: R(0.9, 1.1), contour: [1, 1.3, 1], vol: 0.14 }); },
  capArr(t) { say(t, 'arr', { f0: 95, fk: 0.85, contour: [1.1, 1.25, 0.75], vib: 0.14, vibRate: 25, vol: 0.6 }); },
  capCharge(t) { say(t, 'charge', { f0: 105, fk: 0.85, contour: [1, 1.5, 1.2], vib: 0.05, vol: 0.65 }); },
  ahoy(t) { say(t, 'ahoy', { f0: 110, fk: 0.88, contour: [1, 1.3, 1.1], vol: 0.55 }); },
  // navy guards
  halt(t) { say(t, 'halt', { f0: R(120, 150), fk: 0.95, contour: [1.2, 1.3, 0.8], vol: 0.45 }); },
  oof(t) { say(t, 'oof', { f0: R(200, 280), contour: [1.3, 1, 0.7], vol: 0.35 }); },
  whoa(t) { say(t, 'whoa', { f0: R(240, 320), contour: [1, 1.4, 0.8], vol: 0.35 }); },
  // Admiral Snootington: a posh, wobbly high voice
  adFire(t) { say(t, 'fire', { f0: 210, fk: 1.05, contour: [1.2, 1.6, 1.1], vib: 0.06, vibRate: 9, vol: 0.6 }); },
  adStop(t) { say(t, 'stop', { f0: 220, fk: 1.05, contour: [1.1, 1.5, 1.3], vib: 0.06, vibRate: 9, vol: 0.55 }); },
  adNooo(t) { say(t, 'nooo', { f0: 260, fk: 1.05, contour: [1.4, 1.2, 0.6], vib: 0.1, vibRate: 7, vol: 0.6 }); },
  adMama(t) { say(t, 'mama', { f0: 300, fk: 1.1, contour: [1.2, 1.5, 1], vib: 0.12, vibRate: 8, vol: 0.55 }); },
  // Biscuit the parrot
  squawk(t) { for (let i = 0; i < 2; i++) { const f = R(1400, 2000); H.voice(t + i * 0.13, 0.12, [f, f * 1.4, f * 0.8], [2000, 3400], 0.25, 40); } },
  // cartoon effects
  cannon(t) { const o = H.osc('sine', 110, t, 0.6, 0.9); o.frequency.exponentialRampToValueAtTime(30, t + 0.5); H.noise(t, 0.5, 0.8, 'lowpass', 1800, 200, 1); H.noise(t + 0.02, 0.15, 0.4, 'highpass', 3000); },
  whistleDown(t) { const o = H.osc('sine', 1800, t, 0.9, 0.1); o.frequency.exponentialRampToValueAtTime(380, t + 0.85); },
  splash(t) { H.noise(t, 0.7, 0.5, 'lowpass', 2600, 300, 1); for (let i = 0; i < 8; i++) H.noise(t + 0.05 + Math.random() * 0.35, 0.05, 0.15, 'highpass', 3000); },
  bigSplash(t) { H.noise(t, 1.4, 0.8, 'lowpass', 1800, 150, 1); const o = H.osc('sine', 90, t, 0.5, 0.6); o.frequency.exponentialRampToValueAtTime(40, t + 0.4); for (let i = 0; i < 16; i++) H.noise(t + 0.1 + Math.random() * 0.9, 0.06, 0.2, 'highpass', 2500 + Math.random() * 2000); },
  bonk(t) { const o = H.osc('triangle', 520, t, 0.15, 0.4); o.frequency.exponentialRampToValueAtTime(150, t + 0.14); H.noise(t, 0.05, 0.25, 'bandpass', 2400, 900, 3); },
  boing(t) { const o = H.osc('sine', 170, t, 0.45, 0.35); o.frequency.exponentialRampToValueAtTime(560, t + 0.1); o.frequency.exponentialRampToValueAtTime(140, t + 0.4); },
  clang(t) { [1300, 1950, 3050].forEach((f, i) => H.osc('triangle', f, t, 0.3 - i * 0.06, 0.1)); H.noise(t, 0.05, 0.3, 'highpass', 3500); },
  wood(t) { H.osc('triangle', R(180, 260), t, 0.12, 0.35); H.noise(t, 0.08, 0.3, 'bandpass', 900, 600, 4); },
  brick(t) { for (let i = 0; i < 3; i++) H.noise(t + i * 0.03 + Math.random() * 0.02, 0.07, 0.35, 'bandpass', R(900, 2200), R(500, 900), 3); const o = H.osc('sine', 120, t, 0.2, 0.4); o.frequency.exponentialRampToValueAtTime(50, t + 0.18); },
  crumble(t) { H.noise(t, 2.4, 0.75, 'lowpass', 520, 80, 1); const o = H.osc('sine', 65, t, 1.8, 0.85); o.frequency.exponentialRampToValueAtTime(26, t + 1.7); for (let i = 0; i < 30; i++) H.noise(t + Math.random() * 2, 0.06, 0.25, 'bandpass', R(700, 2600), R(400, 900), 3); },
  coins(t) { for (let i = 0; i < 12; i++) { const tt = t + i * 0.05 + Math.random() * 0.03; H.osc('square', R(2400, 3200), tt, 0.05, 0.03); H.osc('sine', R(3000, 4200), tt + 0.02, 0.08, 0.04); } },
  coin(t) { const f = R(1700, 1900); H.osc('square', f, t, 0.05, 0.05); H.osc('square', f * 1.5, t + 0.05, 0.1, 0.05); },
  gateGood(t) { [523, 659, 784, 1047].forEach((f, i) => { H.osc('triangle', f, t + i * 0.055, 0.2, 0.16); H.osc('sine', f * 2, t + i * 0.055, 0.12, 0.05); }); },
  gateBad(t) { const o = H.osc('sawtooth', 400, t, 0.45, 0.08); o.frequency.exponentialRampToValueAtTime(120, t + 0.42); H.osc('square', 110, t + 0.3, 0.2, 0.06); },
  join(t) { [392, 523].forEach((f, i) => H.osc('triangle', f, t + i * 0.08, 0.16, 0.14)); },
  creak(t) { const o = H.osc('sawtooth', 85, t, 0.5, 0.05); o.frequency.linearRampToValueAtTime(130, t + 0.25); o.frequency.linearRampToValueAtTime(75, t + 0.5); H.noise(t, 0.45, 0.05, 'bandpass', 700, 400, 6); },
  roll(t) { for (let i = 0; i < 6; i++) H.noise(t + i * 0.09, 0.08, 0.18, 'lowpass', 380, 200, 1.5); },
  bell(t) { [880, 1320, 1760].forEach((f, i) => H.osc('sine', f, t, 1.2 - i * 0.3, 0.12 - i * 0.03)); },
  fanfare(t) { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => { H.osc('sawtooth', f, t + i * 0.13, 0.22, 0.05); H.osc('triangle', f / 2, t + i * 0.13, 0.22, 0.12); }); },
  sad(t) { [392, 370, 349, 294].forEach((f, i) => { const o = H.osc('triangle', f, t + i * 0.35, 0.32 + (i === 3 ? 0.7 : 0), 0.2); if (i === 3) o.frequency.linearRampToValueAtTime(f * 0.94, t + 1.6); }); },
  firework(t) { H.noise(t, 0.5, 0.12, 'bandpass', 600, 3000, 2); const o = H.osc('sine', 80, t + 0.5, 0.5, 0.5); o.frequency.exponentialRampToValueAtTime(30, t + 0.95); H.noise(t + 0.5, 0.6, 0.45, 'lowpass', 3000, 300, 0.6); },
  gull(t) { const f = R(1500, 1900); H.voice(t, 0.3, [f, f * 1.25, f * 0.9], [2200, 3200], 0.08, 18); },
  // guns: a pirate pistol crack, a guard's musket, a whole volley, a bullet hitting stone
  pistol(t) { H.noise(t, 0.12, 0.5, 'bandpass', 2400, 700, 1.2); const o = H.osc('square', 180, t, 0.07, 0.18); o.frequency.exponentialRampToValueAtTime(60, t + 0.06); H.noise(t + 0.01, 0.25, 0.12, 'lowpass', 900, 200, 1); },
  musket(t) { H.noise(t, 0.3, 0.6, 'lowpass', 2600, 300, 0.9); const o = H.osc('sine', 120, t, 0.25, 0.5); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); H.noise(t + 0.02, 0.5, 0.15, 'bandpass', 600, 200, 1); },
  volley(t, n = 6) { for (let i = 0; i < Math.min(10, n); i++) { const tt = t + Math.random() * 0.18; H.noise(tt, 0.1, 0.32, 'bandpass', R(1800, 3000), R(500, 900), 1.2); } H.noise(t, 0.6, 0.25, 'lowpass', 700, 120, 1); },
  ricochet(t) { const o = H.osc('sine', R(2400, 3400), t, 0.25, 0.06); o.frequency.exponentialRampToValueAtTime(R(900, 1400), t + 0.22); H.noise(t, 0.04, 0.2, 'highpass', 3000); },
  ouch(t) { say(t, 'oof', { f0: R(220, 300), contour: [1.4, 1.1, 0.8], vol: 0.3 }); },
  // bombs
  whoosh(t) { H.noise(t, 0.28, 0.16, 'bandpass', 500, 2400, 1.5); },
  boom(t) { const o = H.osc('sine', 95, t, 0.55, 0.85); o.frequency.exponentialRampToValueAtTime(32, t + 0.5); H.noise(t, 0.7, 0.75, 'lowpass', 2400, 120, 0.8); H.noise(t, 0.12, 0.35, 'highpass', 2500); for (let i = 0; i < 5; i++) H.noise(t + 0.08 + Math.random() * 0.3, 0.06, 0.12, 'bandpass', R(800, 2400), R(400, 900), 3); },
  bigBoom(t) { const o = H.osc('sine', 70, t, 1.2, 1); o.frequency.exponentialRampToValueAtTime(24, t + 1.1); H.noise(t, 1.5, 0.9, 'lowpass', 1600, 80, 0.7); H.noise(t, 0.2, 0.45, 'highpass', 2000); for (let i = 0; i < 12; i++) H.noise(t + 0.1 + Math.random() * 0.8, 0.07, 0.15, 'bandpass', R(600, 2600), R(300, 900), 3); },
  pop(t) { const o = H.osc('sine', 600, t, 0.08, 0.3); o.frequency.exponentialRampToValueAtTime(1400, t + 0.06); },
});
function pickW(a) { return a[Math.floor(Math.random() * a.length)]; }

