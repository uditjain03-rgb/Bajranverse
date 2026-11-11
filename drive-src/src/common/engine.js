// The shared runtime of the BajrangVerse driving games: renderer and lights, phone-friendly resolution steps, batched
// particles (puffs, sparks, splashes), explosions, floating words, banners, and the frame loop.
import * as THREE from 'three';
import { gunzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { canvasTex, bendPoint } from './gfx.js';

// the game only runs from its own app (or a local test page): copies put on other websites stop here
{ const h = location.hostname, ok = location.protocol === 'file:' || ['appassets.androidplatform.net', 'localhost', '127.0.0.1'].includes(h); if (!ok) { document.body.innerHTML = ''; throw new Error('x'); } }

export const PI = Math.PI, $ = id => document.getElementById(id), Q = new URLSearchParams(location.search);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
export const lerp = (a, b, k) => a + (b - a) * k;

// ---------------- renderer, lights ----------------
export const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: !/aa=0/.test(location.search), powerPreference: 'high-performance' });   // MSAA is nearly free on phone GPUs
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = false;   // soft blob shadows instead of a shadow pass (phones)
export const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(58, 1, 0.3, 420);
export const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x9a8a6a, 2.5); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffeccc, 2.9); sun.position.set(-8, 22, 10); scene.add(sun, sun.target);
export const rim = new THREE.DirectionalLight(0x9ac8ff, 0.7); rim.position.set(6, 6, -10); scene.add(rim);
export const E = { shake: 0, slow: 1, fov: 58, onSfx: null, quality: 2, fovBase: 58 };
// render resolution (pixels per screen point): never below 1.5, so the picture stays sharp on a phone
const DPR = [1.5, 1.75, 2];
export function setQuality(q) { E.quality = q; resize(); }
export function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, DPR[E.quality])); renderer.setSize(w, h, false); cam.aspect = w / h; E.fovBase = w / h < 0.6 ? 62 : 54; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------- particles: soft dots / stars, normal / glowing; one draw call each ----------------
export const dotTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
export const starTex = canvasTex(64, 64, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 - PI / 2, r = i % 2 ? 12 : 30; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill(); });
const fx = [];
class Particles {
  constructor(map, add, cap = 420) {
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !add });
    mat.onBeforeCompile = sh => { THREE.Material.prototype.onBeforeCompile.call(mat, sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float iA; varying float vA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvA = iA;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vA;'); };
    mat.customProgramCacheKey = () => 'parts' + THREE.Material.prototype.customProgramCacheKey.call(mat);
    const g = new THREE.PlaneGeometry(1, 1); this.a = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1); g.setAttribute('iA', this.a);
    this.mesh = new THREE.InstancedMesh(g, mat, cap); this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = add ? 4 : 3; this.cap = cap; this.n = 0; scene.add(this.mesh);
  }
}
const PSYS = {};
export function psys(star, add) { const k = (star ? 's' : 'd') + (add ? 'a' : 'n'); return PSYS[k] || (PSYS[k] = new Particles(star ? starTex : dotTex, add)); }
[false, true].forEach(s => [false, true].forEach(a => psys(s, a)));
const _pc = new THREE.Color(), rgbCache = new Map();
function rgbOf(h) { let v = rgbCache.get(h); if (!v) { _pc.set(h); v = [_pc.r, _pc.g, _pc.b]; rgbCache.set(h, v); } return v; }
export function puff(p, n = 8, col = 0xffffff, o = {}) {
  const sys = psys(o.star, o.add);
  for (let i = 0; i < n; i++) {
    if (fx.length > 700) break;
    const sz = o.size || rnd(0.5, 1.1), v = new THREE.Vector3(rnd(-1, 1), rnd(0.3, 1.2), rnd(-1, 1)).multiplyScalar(o.speed ?? 3); if (o.vel) v.add(o.vel);
    fx.push({ sys, p: p.clone(), v, life: o.life || rnd(0.4, 0.8), t: 0, sz, g: o.grav ?? 2, grow: o.grow ?? 0.6, col: o.cols ? pick(o.cols) : col });
  }
}
export const flashAt = (p, s = 0.7) => puff(p, 1, 0xffc85a, { size: s, speed: 0, life: 0.09, grav: 0, add: true, grow: 0.5 });
export function splash(p, s = 1) { puff(p, Math.round(10 * s), 0xe8f8ff, { size: 0.7 * s, speed: 4.5 * s, life: 0.8, grav: 9 }); puff(p, Math.round(4 * s), 0xffffff, { size: 1.6 * s, speed: 1.2, life: 0.5, grav: 1, grow: 1.2 }); }
const _fm = new THREE.Matrix4(), _fs = new THREE.Vector3();
export function updateFx(dt) {
  for (const k in PSYS) PSYS[k].n = 0;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.obj) { f.v.y -= f.g * dt; f.obj.position.addScaledVector(f.v, dt); f.obj.rotation.x += dt * (f.spin || 8); f.obj.rotation.z += dt * (f.spin || 8) * 0.6; if (f.t >= f.life) { f.obj.parent && f.obj.parent.remove(f.obj); if (f.done) f.done(); fx.splice(i, 1); } continue; }
    const k = f.t / f.life; if (k >= 1) { fx.splice(i, 1); continue; }
    f.v.y -= f.g * dt; f.p.addScaledVector(f.v, dt);
    const S = f.sys; if (S.n >= S.cap) continue; const j = S.n++;
    S.mesh.setMatrixAt(j, _fm.compose(f.p, cam.quaternion, _fs.setScalar(f.sz * (1 + k * f.grow)))); S.mesh.instanceColor.setXYZ(j, ...rgbOf(f.col)); S.a.setX(j, 1 - k);
  }
  for (const k in PSYS) { const S = PSYS[k]; S.mesh.count = S.n; S.mesh.instanceMatrix.needsUpdate = true; S.mesh.instanceColor.needsUpdate = true; S.a.needsUpdate = true; }
}
// a thrown object (debris, fruit, a cone...) that flies and spins, then disappears
export function fling(obj, v, life = 1.6, g = 16, spin = 8, done) { scene.add(obj); fx.push({ obj, v, life, t: 0, g, spin, done }); }
export function clearFx() { for (const f of fx) if (f.obj && f.obj.parent) f.obj.parent.remove(f.obj); fx.length = 0; }
// explosions: fireball, smoke, sparks and a shock ring (rings are kept and reused: no new shader mid-game)
const rings = [], ringGeo = new THREE.RingGeometry(0.6, 0.9, 24), ringPool = [];
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
export function boom(p, s = 1) {
  puff(p, Math.round(5 + 3 * s), 0xffffff, { cols: [0xfff2a0, 0xffc040, 0xff7a20, 0xff4a10], add: true, size: 1.1 * s, speed: 3.5 * s, life: 0.35, grav: -1, grow: 1.4 });
  puff(p, Math.round(3 + 2 * s), 0x5a5550, { size: 1.4 * s, speed: 1.6 * s, life: 1.1, grav: -1.6, grow: 1.2 });
  puff(p, Math.round(4 * s), 0xffd060, { star: true, add: true, size: 0.3, speed: 7 * s, life: 0.5, grav: 8 });
  if (rings.length < 12) { const r = ringPool.pop() || new THREE.Mesh(ringGeo, ringMat.clone()); r.scale.setScalar(1); r.rotation.set(-PI / 2, 0, 0); r.position.copy(p); r.position.y = 0.15; r.frustumCulled = false; scene.add(r); rings.push({ r, t: 0, s }); }
  E.shake = Math.max(E.shake, 0.12 * s); if (E.onSfx) E.onSfx(s > 1.5 ? 'bigBoom' : 'boom');
}
export function warmRing() { const r = ringPool.pop() || new THREE.Mesh(ringGeo, ringMat.clone()); scene.add(r); return () => { scene.remove(r); ringPool.push(r); }; }
function updateRings(dt) { for (let i = rings.length - 1; i >= 0; i--) { const R = rings[i]; R.t += dt; const k = R.t / 0.4; R.r.scale.setScalar(1 + k * 4 * R.s); R.r.material.opacity = 0.8 * (1 - k); if (k >= 1) { scene.remove(R.r); ringPool.push(R.r); rings.splice(i, 1); } } }
// ---------------- words on screen ----------------
const pops = [], _v = new THREE.Vector3(), popLast = {};
export function project(p) { bendPoint(p, _v).project(cam); return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z < 1]; }
export function popText(text, p, col = '#fff', size = 28, life = 1) { const now = performance.now(); if (pops.length > 10 || now - (popLast[text] || 0) < 1200) return; popLast[text] = now; const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; d.style.color = col; d.style.fontSize = size + 'px'; $('pops').appendChild(d); pops.push({ d, p: p.clone(), t: 0, life }); }
function updatePops(dt) { for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; const [x, y, ok] = project(q.p), k = q.t / q.life; q.d.style.transform = `translate(-50%,-50%) translate(${x}px,${y - k * 60}px) scale(${k < 0.15 ? 0.6 + k * 2.6 : 1})`; q.d.style.opacity = !ok ? 0 : k > 0.7 ? (1 - k) / 0.3 : 1; if (k >= 1) { q.d.remove(); pops.splice(i, 1); } } }
export function clearPops() { pops.forEach(q => q.d.remove()); pops.length = 0; }
let bannerT = 0;
export function banner(t, sub = '', dur = 1.4) { const b = $('banner'); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = dur; }
export function flash(c = '#fff', a = 0.6) { const f = $('flash'); f.style.background = c; f.style.opacity = a; setTimeout(() => { f.style.opacity = 0; }, 90); }
// ---------------- the frame loop ----------------
export const PERF = window.__perf = { upd: 0, ren: 0, n: 0, reset() { this.upd = this.ren = this.n = 0; } };
window.__R = renderer; window.__S = scene; window.__C = cam; window.__T = THREE;
export function startLoop(L) {   // L: { update(dt), camera(dt), active() → frames count for the quality check, frozen() → just render }
  let last = performance.now(), ft = 0, fn = 0, slow = 0, t = 0;
  const WARP = +(Q.get('warp') || 1);
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = now - last; let dt = Math.max(0, Math.min(0.067, raw / 1000)); last = now;   // the game keeps its real speed down to 15 frames a second
    if (L.active() && raw < 500) { t += raw; if (t > 4000) { ft += raw; fn++; } if (ft > 2500) { slow = ft / fn > 30 ? slow + 1 : 0; ft = fn = 0; if (slow >= 2 && E.quality > 0) { slow = 0; setQuality(E.quality - 1); } } }
    if (L.frozen()) { renderer.render(scene, cam); if (L.post) L.post(); return; }
    dt *= E.slow;
    const t0 = performance.now();
    for (let i = 0; i < WARP; i++) L.update(WARP > 1 ? 0.05 * E.slow : dt);
    updateFx(dt); updateRings(dt); updatePops(dt); if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    L.camera(WARP > 1 ? 0.05 : dt);
    if (E.shake > 0) { E.shake = Math.max(0, E.shake - dt); cam.position.x += rnd(-1, 1) * E.shake * 0.4; cam.position.y += rnd(-1, 1) * E.shake * 0.4; }
    const t1 = performance.now(); renderer.render(scene, cam); const calls = renderer.info.render.calls, tris = renderer.info.render.triangles; if (L.post) L.post();
    PERF.upd += t1 - t0; PERF.ren += performance.now() - t1; PERF.n++; PERF.calls = calls; PERF.tris = tris;
  }
  requestAnimationFrame(frame);
}
// load a file as bytes; ".gz" and ".pak" (gzip; Android's packager would unpack a ".gz") files are unpacked (the browser's own gzip decoder, or fflate on old WebViews).
// onProgress(bytesSoFar, total) lets a loading bar move.
export function loadBin(url, onProgress) {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
    if (onProgress) x.onprogress = e => onProgress(e.loaded, e.lengthComputable ? e.total : 0);
    x.onload = () => { if (!((x.status === 200 || x.status === 0) && x.response)) { no(new Error('load ' + x.status)); return; } if (onProgress) onProgress(x.response.byteLength, x.response.byteLength); if (!url.endsWith('.gz') && !url.endsWith('.pak')) { ok(x.response); return; } gunzip(x.response).then(ok, no); };
    x.onerror = () => no(new Error('load ' + url)); x.send();
  });
}
async function gunzip(buf) {
  if (typeof DecompressionStream === 'function') { try { return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); } catch (e) { /* fall back */ } }
  return gunzipSync(new Uint8Array(buf)).buffer;
}
