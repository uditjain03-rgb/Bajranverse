// The music: tracks streamed from the app's files and looped, with a soft cross-fade when the track changes.
// Each game tells it its tracks (Music.config).
let FILES = {}, GAIN = {};
let cur = null, el = null, volume = 0.95, fades = [];
const els = {};
function audio(name) {
  const f = FILES[name] || name; if (els[f]) return els[f];
  const a = new window.Audio('music/' + f + '.ogg'); a.loop = true; a.preload = 'auto'; a.volume = 0; return (els[f] = a);
}
function fade(a, to, ms, done) {
  const from = a.volume, t0 = performance.now(); fades = fades.filter(f => f.a !== a);
  const f = { a, step() { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) { fades = fades.filter(x => x !== f); if (done) done(); } } };
  fades.push(f);
}
setInterval(() => fades.slice().forEach(f => f.step()), 40);
export const Music = {
  config(files, gain) { FILES = files; GAIN = gain; },
  warm(list) { for (const n of list) audio(n); },
  play(name) {
    if (cur === name && el && !el.paused) return;
    const next = audio(name);
    if (el && el !== next) { const old = el; fade(old, 0, 500, () => old.pause()); }
    cur = name; el = next;
    if (next.paused) { if (name === 'win' || name === 'race' || name === 'boss') next.currentTime = 0; const p = next.play(); if (p && p.catch) p.catch(() => { cur = null; }); }
    fade(next, volume * (GAIN[FILES[name] || name] ?? 0.6), 700);
  },
  stop() { if (el) { const old = el; fade(old, 0, 350, () => old.pause()); } el = null; cur = null; },
  pauseAll() { Object.values(els).forEach(a => a.pause()); el = null; cur = null; },
  setVolume(v) { volume = v; },
};
