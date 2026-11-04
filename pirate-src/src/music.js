// The music: recorded orchestral pirate and battle tracks (public-domain / CC-BY, see the credits in Settings),
// streamed from the app's files and looped, with a soft cross-fade when the track changes.
const FILES = {
  title: 'treasure', beach: 'battle_theme', jungle: 'pirates', snow: 'orchestra', volcano: 'battle_theme', coral: 'pirates', night: 'orchestra',
  fight: 'boss', bossfight: 'pursuit', win: 'victory',
};
let cur = null, el = null, volume = 0.75, fades = [];
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
  warm(list) { for (const n of list) audio(n); },
  play(name) {
    if (cur === name && el && !el.paused) return;
    const next = audio(name);
    if (el && el !== next) { const old = el; fade(old, 0, 500, () => old.pause()); }
    cur = name; el = next;
    if (next.paused) { if (FILES[name] !== 'boss' && FILES[name] !== 'pursuit' && FILES[name] !== 'victory') { /* keep position */ } else next.currentTime = 0; const p = next.play(); if (p && p.catch) p.catch(() => { cur = null; }); }
    fade(next, volume, 700);
  },
  stop() { if (el) { const old = el; fade(old, 0, 350, () => old.pause()); } el = null; cur = null; },
  pauseAll() { Object.values(els).forEach(a => a.pause()); el = null; cur = null; },
  setVolume(v) { volume = v; if (el) el.volume = v; },
};
