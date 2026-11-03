// The music maker: little island-band tunes rendered once into looping audio buffers (no timers, so they never stutter).
// Instruments are made in plain JavaScript: a steel drum, marimba and bells for the tunes, a plucked ukulele
// (Karplus-Strong string) strumming the off-beats, a round bass, soft accordion chords, shaker, kick and rim clicks,
// all through a small stereo reverb. Each loop is 8 bars; the reverb tail wraps around so the loop is seamless.
const SR = 24000;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = s => { const m = s.match(/^([A-G][#b]?)(\d)$/); return NOTE[m[1]] + (+m[2] + 1) * 12; };
function chord(sym) { const m = sym.match(/^([A-G][#b]?)(m?)(7?)$/), r = NOTE[m[1]]; return { root: r, minor: !!m[2], seventh: !!m[3] }; }

// ---------------- tunes: 8 bars of 8 eighth notes; '-' holds the note, '.' is a rest ----------------
const MEL = {
  island: 'E5 . G5 . C6 - G5 . D5 . G5 . B5 - G5 . C5 . E5 . A5 - G5 E5 F5 - A5 - G5 - F5 . E5 G5 C6 G5 E5 . G5 . D5 G5 B5 G5 D6 - B5 . A5 - C6 - A5 G5 F5 D5 E5 - D5 - C5 - - .',
  adventure: 'A4 . C5 E5 A5 - G5 E5 D5 - C5 - B4 - A4 . F4 . A4 C5 F5 - E5 D5 D5 - G5 - B4 - D5 . E5 . A5 . C6 - B5 A5 A5 - F5 - C5 - A4 . B4 . D5 . G#5 - E5 D5 E5 - - . B4 - - .',
  fight: 'A5 E5 A5 C6 B5 A5 G5 E5 G5 D5 G5 B5 A5 G5 E5 D5 F5 C5 F5 A5 G5 F5 E5 C5 E5 B4 E5 G#5 B5 - G#5 E5 A5 E5 A5 C6 B5 A5 G5 E5 G5 D5 G5 B5 A5 G5 E5 D5 F5 C5 F5 A5 G5 F5 E5 C5 E5 - G#5 - B5 - E6 .',
  win: 'C5 E5 G5 C6 - . G5 . A5 - C6 - A5 . F5 . G5 B5 D6 - B5 . G5 . C6 - - - G5 - - . A5 C6 E6 - C6 . A5 . F5 A5 C6 - A5 . F5 . G5 . B5 . D6 . B5 . C6 - - - - - . .',
};
const PROG = { island: 'C G Am F C G F G', adventure: 'Am Am F G Am F E E', fight: 'Am G F E Am G F E', win: 'C F G C Am F G C' };
// each track: tune, key shift, tempo, lead instrument and what the band plays
const TRACKS = {
  title: { tune: 'island', key: 0, bpm: 96, lead: 'pan', kick: false, uke: true, pad: true, shaker: 0.5 },
  beach: { tune: 'island', key: 0, bpm: 112, lead: 'pan', kick: true, uke: true, shaker: 1 },
  jungle: { tune: 'island', key: 2, bpm: 118, lead: 'marimba', kick: true, uke: true, shaker: 1 },
  snow: { tune: 'island', key: 5, bpm: 100, lead: 'bell', kick: true, uke: true, pad: true, shaker: 0.6 },
  volcano: { tune: 'adventure', key: 0, bpm: 126, lead: 'marimba', kick: true, uke: true, pad: true, shaker: 1 },
  coral: { tune: 'island', key: 3, bpm: 110, lead: 'pan', kick: true, uke: true, pad: true, shaker: 0.8 },
  night: { tune: 'adventure', key: -2, bpm: 100, lead: 'bell', kick: true, uke: true, pad: true, shaker: 0.6 },
  fight: { tune: 'fight', key: 0, bpm: 148, lead: 'marimba', kick: true, busy: true, uke: true, pad: true, shaker: 1.2 },
  win: { tune: 'win', key: 0, bpm: 120, lead: 'pan', kick: true, uke: true, pad: true, shaker: 1 },
};

// ---------------- instruments (write into stereo float arrays) ----------------
function add(L, R, i0, buf, gain, pan) {   // pan -1..1
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4), n = L.length;
  for (let i = 0; i < buf.length; i++) { const j = (i0 + i) % n; L[j] += buf[i] * gl; R[j] += buf[i] * gr; }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function partials(f, dur, parts, bend = 0) {   // parts: [ratio, amp, decay]
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  for (const [r, a, d] of parts) { let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, ff = f * r * (1 + bend * Math.exp(-t * 30)); ph += 2 * Math.PI * ff / SR; out[i] += Math.sin(ph) * a * env(t, 0.004, d); } }
  return out;
}
const INST = {
  pan: (f, d) => partials(f, Math.min(1.6, d + 0.9), [[1, 1, 0.55], [2, 0.55, 0.3], [3.01, 0.22, 0.16], [4.18, 0.08, 0.08]], 0.012),
  marimba: (f, d) => partials(f, Math.min(1.2, d + 0.5), [[1, 1, 0.32], [3.93, 0.25, 0.05], [9.8, 0.08, 0.015]]),
  bell: (f, d) => partials(f, Math.min(1.8, d + 1), [[1, 0.8, 0.7], [2.76, 0.3, 0.3], [5.4, 0.12, 0.12], [2, 0.25, 0.5]]),
};
function pluck(f, dur, bright = 0.5) {   // Karplus-Strong string
  const n = Math.floor(dur * SR), out = new Float32Array(n), N = Math.max(2, Math.round(SR / f)), d = new Float32Array(N);
  let prev = 0; for (let i = 0; i < N; i++) { const w = Math.random() * 2 - 1; prev = prev + (w - prev) * bright; d[i] = prev; }
  let p = 0; for (let i = 0; i < n; i++) { const a = d[p], b = d[(p + 1) % N]; out[i] = a; d[p] = (a + b) * 0.5 * 0.996; p = (p + 1) % N; }
  for (let i = 0; i < n; i++) out[i] *= Math.min(1, (n - i) / (SR * 0.03));
  return out;
}
function bass(f, dur) {
  const n = Math.floor((dur + 0.08) * SR), out = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * f / SR; const e = Math.min(1, t / 0.008) * Math.exp(-t * 2.2) * Math.min(1, (n - i) / (SR * 0.05)); out[i] = Math.tanh((Math.sin(ph) + 0.35 * Math.sin(2 * ph)) * 1.3) * e; }
  return out;
}
function pad(fs, dur) {   // soft accordion-like chord: a few detuned harmonics with a gentle swell
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  for (const f of fs) for (const det of [0.997, 1.003]) { let ph = Math.random() * 6; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * f * det / SR; let s = 0; for (let h = 1; h <= 5; h++) s += Math.sin(ph * h) / (h * h * 0.7 + 0.3); const t = i / SR; out[i] += s * Math.min(1, t / 0.12) * Math.min(1, (n - i) / (SR * 0.15)) * (1 + 0.15 * Math.sin(t * 2 * Math.PI * 5)); } }
  return out;
}
function kick() { const n = Math.floor(0.3 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (48 + 90 * Math.exp(-t * 28)) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 11); } return o; }
function noiseHit(dur, hp, decay) { const n = Math.floor(dur * SR), o = new Float32Array(n); let last = 0, lp = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; const h = w - last * hp; last = w; lp += (h - lp) * 0.6; o[i] = lp * Math.exp(-i / SR / decay); } return o; }
function reverb(L, R, mix) {   // a small Freeverb-style room on the whole mix, wrapping around the loop
  const n = L.length, combs = [607, 647, 695, 738], aps = [302, 240];
  for (const [X, off] of [[L, 0], [R, 23]]) {
    const wet = new Float32Array(n);
    for (const c of combs) { const len = c + off, buf = new Float32Array(len); let p = 0, f = 0; for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) { const y = buf[p]; f = y * 0.75 + f * 0.25; buf[p] = X[i] * 0.25 + f * 0.8; p = (p + 1) % len; if (k) wet[i] += y; } }
    for (const a of aps) { const len = a + off, buf = new Float32Array(len); let p = 0; for (let i = 0; i < n; i++) { const b = buf[p], y = -wet[i] + b; buf[p] = wet[i] + b * 0.5; wet[i] = y; p = (p + 1) % len; } }
    for (let i = 0; i < n; i++) X[i] += wet[i] * mix;
  }
}
function render(name) {
  const T = TRACKS[name], e8 = 60 / T.bpm / 2, n = Math.round(64 * e8 * SR), L = new Float32Array(n), R = new Float32Array(n);
  const mel = MEL[T.tune].split(' '), prog = PROG[T.tune].split(' ').map(chord), at = k => Math.round(k * e8 * SR);
  const swing = k => (k % 2 ? e8 * 0.12 : 0);
  // tune
  for (let k = 0; k < 64; k++) {
    const tok = mel[k]; if (tok === '-' || tok === '.') continue;
    let len = 1; while (mel[k + len] === '-') len++;
    const f = mtof(midi(tok) + T.key);
    add(L, R, at(k) + Math.round(swing(k) * SR), INST[T.lead](f, len * e8), 0.2, 0.15);
  }
  for (let bar = 0; bar < 8; bar++) {
    const c = prog[bar], root = c.root + T.key, third = root + (c.minor ? 3 : 4), fifth = root + 7, b0 = bar * 8;
    // ukulele off-beat strums (calypso skank)
    if (T.uke) for (const k of T.busy ? [1, 2, 3, 5, 6, 7] : [1, 3, 5, 7]) {
      const notes = [60 + ((root - 60) % 12 + 12) % 12, 60 + ((third - 60) % 12 + 12) % 12, 60 + ((fifth - 60) % 12 + 12) % 12, 67 + ((root - 67) % 12 + 12) % 12].sort((a, b) => a - b);
      notes.forEach((m, j) => add(L, R, at(b0 + k) + Math.round((swing(k) + j * 0.009) * SR), pluck(mtof(m), e8 * 1.4, 0.45), 0.075, -0.35));
    }
    // bass
    for (const [k, m, d] of [[0, root, 2.6], [3, root, 1], [4, fifth, 2], [6, third + 12 > root + 12 ? root + 12 : third, 1.5]]) add(L, R, at(b0 + k) + Math.round(swing(k) * SR), bass(mtof(36 + ((m % 12) + 12) % 12), d * e8), 0.32, 0);
    // chords
    if (T.pad) add(L, R, at(b0), pad([mtof(48 + ((root % 12) + 12) % 12 + 12), mtof(48 + ((third % 12) + 12) % 12 + 12), mtof(48 + ((fifth % 12) + 12) % 12 + 12)], 8 * e8), 0.018, 0.3);
    // drums
    for (let k = 0; k < 8; k++) {
      const t = at(b0 + k) + Math.round(swing(k) * SR);
      if (T.kick && (k === 0 || k === 4 || (T.busy && (k === 2 || k === 6)) || (!T.busy && k === 7 && bar % 2))) add(L, R, t, kick(), 0.42, 0);
      if (k === 2 || k === 6) add(L, R, t, noiseHit(0.09, 0.5, 0.025), T.busy ? 0.2 : 0.13, 0.2);
      add(L, R, t, noiseHit(0.05, 0.98, 0.012), 0.05 * T.shaker * (k % 2 ? 1.4 : 0.8), 0.45);
      if (T.busy) add(L, R, t + Math.round(e8 / 2 * SR), noiseHit(0.04, 0.98, 0.01), 0.035 * T.shaker, -0.4);
    }
  }
  reverb(L, R, 0.22);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.85 / (peak || 1); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  return [L, R];
}


export { render, SR };
