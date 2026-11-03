// The small sound engine: one AudioContext, a master compressor, an effects bus and a music bus, and helpers that
// make sounds from oscillators and filtered noise. Sound effects are registered by name with Audio.extend({...})
// and played with Audio.sfx(name, delay). On phones audio may only start after a touch, so resume() is called on
// every tap and also plays a silent buffer, which unlocks audio on Android WebView and iOS.
let ctx = null, master = null, bus = null, mbus = null, comp = null, noiseBuf = null, muted = false;
const fx = {};
function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return null; }
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; comp.connect(master); master.connect(ctx.destination);
  bus = ctx.createGain(); bus.gain.value = 0.8; bus.connect(comp);
  mbus = ctx.createGain(); mbus.gain.value = 0.55; mbus.connect(comp);
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  H.ctx = ctx; H.bus = bus; H.mbus = mbus;
  return ctx;
}
// building blocks for sound effects
const H = {
  ctx: null, bus: null, mbus: null,
  osc(type, f, t, dur, vol, dest = H.bus, attack = 0.005) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  noise(t, dur, vol, type = 'lowpass', f0 = 1000, f1 = f0, Q = 1, dest = H.bus) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.Q.value = Q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s;
  },
  // a buzzy voice-like tone through two formant filters (birds, little shouts)
  voice(t, dur, freqs, forms, vol, vib = 0) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(freqs[0], t);
    freqs.forEach((f, i) => { if (i) o.frequency.linearRampToValueAtTime(f, t + dur * i / (freqs.length - 1)); });
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = freqs[0] * 0.05; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(H.bus);
    for (const f of forms) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6; o.connect(bp); bp.connect(g); }
    o.start(t); o.stop(t + dur + 0.05); return o;
  },
};
let unlocked = false;
export const Audio = {
  H,
  init,
  extend(o) { Object.assign(fx, o); },
  sfx(name, delay = 0, arg) {
    if (muted || !init() || ctx.state !== 'running') return;
    const f = fx[name]; if (!f) return;
    try { f(ctx.currentTime + 0.01 + delay, arg); } catch (e) { /* a sound must never stop the game */ }
  },
  resume() {
    if (!init()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!unlocked) { try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); unlocked = true; } catch (e) { /* ignore */ } }
  },
  suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; },
};
