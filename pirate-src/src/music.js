// The music: little island-band tunes rendered once into looping audio buffers (no timers, so they never stutter).
// Instruments are made in plain JavaScript: a steel drum, marimba and bells for the tunes, a plucked ukulele
// (Karplus-Strong string) strumming the off-beats, a round bass, soft accordion chords, shaker, kick and rim clicks,
// all through a small stereo reverb. Each loop is 8 bars; the reverb tail wraps around so the loop is seamless.
import { Audio } from './audio.js';
import { render, SR } from './musiccore.js';
import WORKER_SRC from 'music-worker-src';

const cache = {}, waiting = {};
let worker = null;
try {
  worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
  worker.onmessage = e => { const { name, L, R } = e.data; cache[name] = [L, R]; const w = waiting[name]; delete waiting[name]; if (w) w.forEach(f => f()); };
  worker.onerror = () => { worker = null; };
} catch (e) { worker = null; }
function get(name, cb) {   // the track's audio, made in the background (or right here if workers are not available)
  if (cache[name]) { cb(); return; }
  if (worker) { if (!waiting[name]) { waiting[name] = []; worker.postMessage(name); } waiting[name].push(cb); return; }
  cache[name] = render(name); cb();
}

let src = null, gain = null, cur = null, volume = 1;
export const Music = {
  // make the tracks ahead of time, one at a time, while the game is idle
  warm(list) { for (const k of list) get(k, () => {}); },
  play(name) {
    if (cur === name) return;
    const ctx = Audio.init(); if (!ctx) return;
    this.stop(); cur = name;
    get(name, () => { if (cur === name && !src) this.start(name); });
  },
  start(name) {
    const ctx = Audio.H.ctx, [L, R] = cache[name], b = ctx.createBuffer(2, L.length, SR); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
    src = ctx.createBufferSource(); src.buffer = b; src.loop = true; gain = ctx.createGain();
    const t = ctx.currentTime; gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.7 * volume, t + 0.6);
    src.connect(gain); gain.connect(Audio.H.mbus); src.start(t + 0.02);
  },
  stop() {
    if (src) { const ctx = Audio.H.ctx, s = src, g = gain, t = ctx.currentTime; try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); s.stop(t + 0.4); } catch (e) { /* stopped */ } }
    src = null; gain = null; cur = null;
  },
  setVolume(v) { volume = v; },
  _render: render,
};
