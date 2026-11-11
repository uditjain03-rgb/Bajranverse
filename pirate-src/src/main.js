// ROCKY'S PIRATE ARMY — by BajrangVerse Studios
// Greedy Lord Lalchi has locked the island's gold in his fort. Captain Rocky leads a growing army of pirates down
// winding island paths: drag to steer through the blue gates, swipe UP to jump barrel walls and DOWN to slide under
// spiky logs, sail Rocky's ship down a river and TAP to sink Lalchi's gunboats, and fire the CANNON STORM super move
// when its meter is full. At the fort the army bombs the walls (TAP the 🎯 targets for big hits); every 5th level
// Lalchi attacks in his giant Gold Crab. Then the army climbs the golden treasure stairs (×1 … ×10 coins) and a
// treasure chest may hold a new crew hero with a special power.
import * as THREE from 'three';
import { WORLDS, PATH_W, buildWorld, setBend, bendPoint, slopeAt, canvasTex, flat, mesh, setNature, oneMesh } from './world.js';
import { loadPeople, Crowd, Actor, Blobs, EXPR } from './people.js';
// the faces of the whole army change together: laugh at a good gate, scared near cannons, angry at Lalchi
let crewE = 0, crewET = 0; function crewExpr() { return crewET > 0 ? crewE : EXPR.happy; } function setCrewExpr(e, dur = 1.2) { crewE = EXPR[e] ?? 0; crewET = dur; if (rocky) rocky.expr = crewE; }
import { buildCastle, setCastleModel, GATE_TOP } from './castle.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Audio } from './audio.js';
import { Music } from './music.js';
import './sfx.js';

// the game only runs from its own app (or a local test page): copies put on other websites stop here
{ const h = location.hostname, ok = location.protocol === 'file:' || ['appassets.androidplatform.net', 'localhost', '127.0.0.1'].includes(h); if (!ok) { document.body.innerHTML = ''; throw new Error('x'); } }

const PI = Math.PI, $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------- save ----------------
const SAVE = 'rockyarmy_v1';
const DEF = { level: 1, apples: 0, best: 0, up: { start: 0, apples: 0 }, coats: ['mixed'], coat: 'mixed', gift: null, heroes: [], wins: 0, set: { sound: true, music: true, vib: true, hi: true } };
let PF; try { PF = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { PF = {}; }
PF = { ...DEF, ...PF, up: { ...DEF.up, ...(PF.up || {}) }, set: { ...DEF.set, ...(PF.set || {}) }, heroes: Array.isArray(PF.heroes) ? PF.heroes : [] };
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(PF)); } catch (e) { /* private mode */ } };
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
const NATIVE = window.PirateNative;
const vib = ms => { if (!PF.set.vib) return; try { if (NATIVE) NATIVE.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* none */ } };

// ---------------- the people: names, looks ----------------
const CREW_NAMES = ['Golu', 'Pinky', 'Bunty', 'Chintu', 'Sonu', 'Monu', 'Tinku', 'Bablu', 'Guddu', 'Raju', 'Pappu', 'Dolly', 'Munni', 'Chotu', 'Lucky', 'Happy', 'Rinku', 'Sweety', 'Bittu', 'Jolly', 'Kaju', 'Laddoo'];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0xa86b3c, 0x8d5524, 0xd4a373, 0xb07a4f];
const HAIRS = [0x1a1210, 0x2a1a10, 0x3a2414, 0x120e0c, 0x5a3a1a, 0x1a1210, 0x6a6a6a];
const KINDS = ['pirate', 'pirate', 'pirate2', 'pirate3', 'pirate3', 'pirateF', 'pirateF2'];   // the looks in the army (men with different hair and beards, women)
const COATS = {   // the shop: what the army wears
  mixed: { name: 'Rainbow Crew', icon: '🌈', price: 0, cols: [0x2b6fd0, 0x2ba060, 0xe0a020, 0x8a3ab0, 0x1aa0a0, 0xd0602b, 0x3a4ab8] },
  navy: { name: 'Midnight Blue', icon: '🔵', price: 300, cols: [0x1f3a8a, 0x26449a, 0x1a3070] },
  green: { name: 'Jungle Green', icon: '🟢', price: 500, cols: [0x1f8a3a, 0x2a9a46, 0x187030] },
  gold: { name: 'Golden Coats', icon: '🟡', price: 900, cols: [0xe8b020, 0xf0c030, 0xd8a018] },
  pink: { name: 'Pink Power', icon: '🩷', price: 1200, cols: [0xe8508a, 0xf06aa0, 0xd84078] },
  black: { name: 'Shadow Crew', icon: '⚫', price: 1800, cols: [0x26262c, 0x303038, 0x1c1c22] },
};
const GUARD_COATS = [0xc8302a, 0xd03a2a, 0xb82822];
// crew heroes: found in treasure chests, each one joins the army and brings a power
const HEROES = [
  { id: 'chacha', icon: '🍳', name: 'Cook Chacha', rar: 0, power: '+3 pirates at the start of every level', coat: 0xf0f0f0 },
  { id: 'laddoo', icon: '💰', name: 'Lucky Laddoo', rar: 0, power: '+25% gold coins', coat: 0x2ab8a0 },
  { id: 'bunty', icon: '💣', name: 'Bomber Bunty', rar: 1, power: 'Bigger bombs at the fort from the start', coat: 0x303038 },
  { id: 'kaka', icon: '🦜', name: 'Kaka the Parrot', rar: 1, power: 'Cannon Storm charges 50% faster', coat: 0x2ac83a },
  { id: 'nisha', icon: '🥷', name: 'Ninja Nisha', rar: 2, power: 'Shields the first 5 pirates you would lose', coat: 0x1a1a2a },
  { id: 'masti', icon: '🐒', name: 'Monkey Masti', rar: 2, power: 'Coin magnet: grabs coins from far away', coat: 0x8a5a2a },
  { id: 'golu', icon: '👑', name: 'Golden Golu', rar: 3, power: 'Cannon Storm ready at the start + 5 pirates', coat: 0xffc21a },
];
const RARITY = [['COMMON', '#7a8a98'], ['RARE', '#2f8cf0'], ['EPIC', '#a03ad8'], ['LEGENDARY', '#f0a010']];
const hasHero = id => PF.heroes.includes(id);
const heroBonusStart = () => (hasHero('chacha') ? 3 : 0) + (hasHero('golu') ? 5 : 0);
const coatCol = () => pick((COATS[PF.coat] || COATS.mixed).cols);

// ---------------- renderer, lights ----------------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: !/aa=0/.test(location.search), powerPreference: 'high-performance' });   // MSAA is nearly free on phone (tile) GPUs and stops edges shimmering
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = false;   // no real-time shadow pass: soft blob shadows under everyone instead (phones)
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.3, 320);
const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x9a8a6a, 2.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeccc, 2.9);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 20, bottom: -14, near: 1, far: 80 }); scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9ac8ff, 0.7); rim.position.set(6, 6, -10); scene.add(rim);

// render resolution (pixels per screen point). Never below 1.5, so the picture always stays sharp on a phone.
let QUAL = PF.set.hi ? 2 : 0; const DPR = [1.5, 1.75, 2];
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, DPR[QUAL])); renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.6 ? 60 : 52; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------- little effects: puffs, sparks, smoke (sprites); bullets ----------------
const dotTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
const starTex = canvasTex(64, 64, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 - PI / 2, r = i % 2 ? 12 : 30; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill(); });
// particles (puffs, fire, smoke, stars): four batched systems (soft dot / star, normal / glowing), each one draw call
const fx = [];
class Particles {
  constructor(map, add, cap = 360) {
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !add });
    mat.onBeforeCompile = sh => { THREE.Material.prototype.onBeforeCompile.call(mat, sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float iA; varying float vA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvA = iA;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vA;'); };
    mat.customProgramCacheKey = () => 'parts' + THREE.Material.prototype.customProgramCacheKey.call(mat);
    const g = new THREE.PlaneGeometry(1, 1); this.a = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1); g.setAttribute('iA', this.a);
    this.mesh = new THREE.InstancedMesh(g, mat, cap); this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = add ? 3 : 2; this.cap = cap; this.n = 0; scene.add(this.mesh);
  }
}
const PSYS = {};
function psys(star, add) { const k = (star ? 's' : 'd') + (add ? 'a' : 'n'); return PSYS[k] || (PSYS[k] = new Particles(star ? starTex : dotTex, add)); }
const _pc = new THREE.Color();
function puff(p, n = 8, col = 0xffffff, o = {}) {
  const sys = psys(o.star, o.add);
  for (let i = 0; i < n; i++) {
    if (fx.length > 600) break;
    const sz = o.size || rnd(0.5, 1.1);
    fx.push({ sys, p: p.clone(), v: new THREE.Vector3(rnd(-1, 1), rnd(0.3, 1.2), rnd(-1, 1)).multiplyScalar(o.speed ?? 3), life: o.life || rnd(0.4, 0.8), t: 0, sz, g: o.grav ?? 2, grow: o.grow ?? 0.6, col: o.cols ? pick(o.cols) : col });
  }
}
const _fm = new THREE.Matrix4(), _fs = new THREE.Vector3();
function updateFx(dt) {
  for (const k in PSYS) PSYS[k].n = 0;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.coin) { f.v.y -= f.g * dt; f.s.position.addScaledVector(f.v, dt); f.s.rotation.x += dt * 8; if (f.t >= f.life) { scene.remove(f.s); fx.splice(i, 1); } continue; }
    const k = f.t / f.life; if (k >= 1) { fx.splice(i, 1); continue; }
    f.v.y -= f.g * dt; f.p.addScaledVector(f.v, dt);
    const S = f.sys; if (S.n >= S.cap) continue; const j = S.n++;
    S.mesh.setMatrixAt(j, _fm.compose(f.p, cam.quaternion, _fs.setScalar(f.sz * (1 + k * f.grow))));
    S.mesh.instanceColor.setXYZ(j, ...rgbOf(f.col)); S.a.setX(j, 1 - k);
  }
  for (const k in PSYS) { const S = PSYS[k]; S.mesh.count = S.n; S.mesh.instanceMatrix.needsUpdate = true; S.mesh.instanceColor.needsUpdate = true; S.a.needsUpdate = true; }
}
const rgbCache = new Map();
function rgbOf(h) { let v = rgbCache.get(h); if (!v) { _pc.set(h); v = [_pc.r, _pc.g, _pc.b]; rgbCache.set(h, v); } return v; }
const flashAt = (p, s = 0.7) => puff(p, 1, 0xffc85a, { size: s, speed: 0, life: 0.09, grav: 0, add: true, grow: 0.5 });
// bullets: short glowing streaks (one instanced mesh)
const bulletGeo = new THREE.BoxGeometry(0.05, 0.05, 0.7); bulletGeo.translate(0, 0, -0.35);
const bulletMesh = new THREE.InstancedMesh(bulletGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a0, toneMapped: false }), 300); bulletMesh.frustumCulled = false; bulletMesh.count = 0; scene.add(bulletMesh);
const bullets = [];
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bv = new THREE.Vector3(), _bs = new THREE.Vector3(1, 1, 1), _Z = new THREE.Vector3(0, 0, -1);
function shoot(from, to, T, hit) { if (bullets.length > 290) { hit(); return; } bullets.push({ a: new THREE.Vector3(...from), b: new THREE.Vector3(...to), t: 0, T, hit }); }
function updateBullets(dt) {
  let n = 0;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const B = bullets[i]; if (!B) continue; B.t += dt; const k = B.t / B.T;
    if (k >= 1) { bullets.splice(i, 1); B.hit(); continue; }
    _bv.lerpVectors(B.a, B.b, k); _bq.setFromUnitVectors(_Z, _bs.subVectors(B.b, B.a).normalize()); _bs.set(1, 1, 1);
    bulletMesh.setMatrixAt(n++, _bm.compose(_bv, _bq, _bs));
  }
  bulletMesh.count = n; bulletMesh.instanceMatrix.needsUpdate = true;
}
// bombs: thrown in an arc with a sputtering fuse; explosions: a fireball, smoke, sparks, a shock ring and a flash
const bombMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.55, roughness: 0.3 }), 220);
bombMesh.frustumCulled = false; bombMesh.count = 0; bombMesh.castShadow = true; scene.add(bombMesh);
const sparkPos = new Float32Array(220 * 3), sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffd060, size: 0.45, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; scene.add(sparks);
const bombs = [];
function throwBomb(from, to, T, h, hit, big = 1) { if (bombs.length >= 48) { setTimeout(hit, T * 1000); return; } bombs.push({ a: new THREE.Vector3(...from), b: new THREE.Vector3(...to), t: 0, T, h, hit, big, spin: rnd(4, 9) }); sfxT('whoosh', 0.06); }
function updateBombs(dt) {
  let n = 0;
  for (let i = bombs.length - 1; i >= 0; i--) {
    const B = bombs[i]; if (!B) continue; B.t += dt; const k = B.t / B.T;
    if (k >= 1) { bombs.splice(i, 1); B.hit(); continue; }
    _bv.lerpVectors(B.a, B.b, k); _bv.y += Math.sin(k * PI) * B.h; _bq.setFromAxisAngle(_Z, B.t * B.spin); _bs.setScalar(B.big);
    bombMesh.setMatrixAt(n, _bm.compose(_bv, _bq, _bs)); sparkPos[n * 3] = _bv.x + rnd(-0.05, 0.05); sparkPos[n * 3 + 1] = _bv.y + 0.24 * B.big; sparkPos[n * 3 + 2] = _bv.z; n++;
  }
  bombMesh.count = n; bombMesh.instanceMatrix.needsUpdate = true; sparkGeo.setDrawRange(0, n); sparkGeo.attributes.position.needsUpdate = true; _bs.set(1, 1, 1);
}
const rings = [], ringGeo = new THREE.RingGeometry(0.6, 0.9, 24), ringPool = [];   // blast rings are kept and reused: making and freeing them made the phone rebuild a shader in the middle of the fight
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
function boom(p, s = 1, o = {}) {
  puff(p, Math.round(5 + 3 * s), 0xffffff, { cols: [0xfff2a0, 0xffc040, 0xff7a20, 0xff4a10], add: true, size: 1.1 * s, speed: 3.5 * s, life: 0.35, grav: -1, grow: 1.4 });
  puff(p, Math.round(3 + 2 * s), 0x5a5550, { size: 1.4 * s, speed: 1.6 * s, life: 1.1, grav: -1.6, grow: 1.2 });
  puff(p, Math.round(4 * s), 0xffd060, { star: true, add: true, size: 0.3, speed: 7 * s, life: 0.5, grav: 8 });
  if (rings.length < 12) { const r = ringPool.pop() || new THREE.Mesh(ringGeo, ringMat.clone()); r.scale.setScalar(1); r.rotation.set(0, 0, 0); r.position.copy(p); r.position.y = Math.max(0.1, p.y * (o.wall ? 1 : 0) + 0.1); if (o.wall) r.rotation.set(0, 0, 0); else r.rotation.x = -PI / 2; r.frustumCulled = false; scene.add(r); rings.push({ r, t: 0, s }); }
  puff(p, 1, 0xffe8b0, { add: true, size: 3.2 * s, speed: 0, life: 0.14, grav: 0, grow: 0.3 });
  sfxT(s > 1.5 ? 'bigBoom' : 'boom', 0.05); G.shake = Math.max(G.shake, 0.12 * s);
}
const _p2 = new THREE.Vector3();
function updateBooms(dt) {
  for (let i = rings.length - 1; i >= 0; i--) { const R = rings[i]; R.t += dt; const k = R.t / 0.4; R.r.scale.setScalar(1 + k * 4 * R.s); R.r.material.opacity = 0.8 * (1 - k); if (k >= 1) { scene.remove(R.r); ringPool.push(R.r); rings.splice(i, 1); } }
}
// floating words (DOM)
const pops = [];
const _v = new THREE.Vector3();
function project(p) { bendPoint(p, _v).project(cam); return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z < 1]; }
const popLast = {};
function popText(text, p, col = '#fff', size = 28, life = 1) { const now = performance.now(); if (pops.length > 10 || now - (popLast[text] || 0) < 1500) return; popLast[text] = now; const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; d.style.color = col; d.style.fontSize = size + 'px'; $('pops').appendChild(d); pops.push({ d, p: p.clone(), t: 0, life }); }
function updatePops(dt) { for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; const [x, y, ok] = project(q.p), k = q.t / q.life; q.d.style.transform = `translate(-50%,-50%) translate(${x}px,${y - k * 60}px) scale(${k < 0.15 ? 0.6 + k * 2.6 : 1})`; q.d.style.opacity = !ok ? 0 : k > 0.7 ? (1 - k) / 0.3 : 1; if (k >= 1) { q.d.remove(); pops.splice(i, 1); } } }
let bannerT = 0;
function banner(t, sub = '', dur = 1.4) { const b = $('banner'); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = dur; }
function flash(c = '#fff') { const f = $('flash'); f.style.background = c; f.style.opacity = 0.6; setTimeout(() => { f.style.opacity = 0; }, 90); }

// ---------------- levels ----------------
// one level = a winding path with gates, castaways, coins, hazards, jump/slide obstacles and a pirate-ship ride, then
// the fort (a Lalchi boss fight every 5th level). Same number → same level.
const UNLOCK = { jump: 1, slide: 2, wolves: 2, cannons: 3, ramp: 3, hay: 4, kraken: 4, boulder: 6, bridge: 6, spinner: 7, rival: 7, log: 8, parrots: 9, pendulum: 11 };
// how much of an ordinary army each hazard costs (used to make the fort fair)
const LOSS = { boulder: 0.05, parrots: 0.06, pendulum: 0.05, cannons: 0.07, kraken: 0.07, hay: 0.05, log: 0.06, bridge: 0.06, ramp: 0.04, spinner: 0.05, jump: 0.05, slide: 0.05 };
const SHIP_FROM = 2;
function makeLevel(n) {
  let seed = n * 9301 + 49297; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const wi = Math.floor((n - 1) / 5), boss = n % 5 === 0, world = WORLDS[wi % WORLDS.length], d = Math.min(1, (n - 1) / 25);
  const L = Math.round(Math.min(1150, 560 + n * 20)), ev = [];
  const start = 5;   // upgrades and heroes are not counted here: they really make the game easier
  let best = start, avg = start, z = -34, k = 0, ship = n < SHIP_FROM;   // best: perfect play; avg: an ordinary player
  const has = q => n >= UNLOCK[q];
  const apply = (o, h) => o[0] === '+' ? h + o[1] : o[0] === 'x' ? h * o[1] : o[0] === '-' ? Math.max(0, h - o[1]) : Math.ceil(h / o[1]);
  const gate = () => {   // two choices side by side: usually one good, one less good (or bad)
    const ops = [['+', Math.round(r(5, 12) + d * 10)], ['x', 2], ['+', Math.round(r(10, 20) + d * 20)], ['x', 3], ['-', Math.round(r(3, 8))], ['÷', 2]];
    let a = pk(ops.slice(0, 4)), b = R() < 0.55 || k <= 2 ? pk(ops.slice(0, 4)) : pk(ops.slice(4));   // the first two gates are always both good
    if (a[0] === b[0] && a[1] === b[1]) b = ['+', a[1] + 4];
    if (best > 60 && (a[0] === 'x' || b[0] === 'x')) { if (a[0] === 'x') a = ['+', Math.round(r(10, 20))]; if (b[0] === 'x') b = ['-', Math.round(r(4, 10))]; }
    const L2 = R() < 0.5 ? [a, b] : [b, a]; ev.push({ t: 'gate', z, ops: L2 });
    best = Math.min(240, Math.max(apply(L2[0], best), apply(L2[1], best)));
    const ga = apply(L2[0], avg), gb = apply(L2[1], avg); avg = Math.min(240, Math.max(ga, gb) * 0.7 + Math.min(ga, gb) * 0.3);
  };
  while (z > -L + 40) {
    k++;
    // the pirate-ship ride: once a level, around the middle
    if (!ship && z < -L * 0.38 && z - 190 > -L + 60) {
      ship = true; const len = Math.round(150 + d * 30), boats = [];
      for (let bz = -40; bz > -len + 25; bz -= r(26, 36)) boats.push({ dz: bz, side: pk([-1, 1]), hp: 2 + Math.round(d * 2) });
      ev.push({ t: 'ship', z, len, boats }); avg += boats.length * 2.2; best += boats.length * 3; z -= len + 34; continue;
    }
    if (has('rival') && !ev.some(e => e.t === 'rival') && z < -L * 0.55 && k > 3) { const c = Math.max(4, Math.round(avg * 0.35)); ev.push({ t: 'rival', z, n: c, pull: 0.32 + d * 0.3 }); avg += c * 0.4; best += c; z -= 44; continue; }
    let p = k <= 2 || R() < 0.26 ? 'gate' : pk(['strays', 'apples', 'powder', 'boost', ...(has('boulder') ? ['boulder', 'boulder'] : []), ...(has('parrots') ? ['parrots', 'parrots'] : []), ...(has('pendulum') ? ['pendulum'] : []), ...(has('jump') ? ['jump', 'jump'] : []), ...(has('slide') ? ['slide', 'slide'] : []), ...(has('hay') ? ['hay'] : []), ...(has('wolves') ? ['wolves', 'wolves'] : []), ...(has('cannons') ? ['cannons', 'cannons'] : []), ...(has('ramp') ? ['ramp'] : []), ...(has('kraken') ? ['kraken', 'kraken'] : []), ...(has('bridge') ? ['bridge'] : []), ...(has('spinner') ? ['spinner'] : []), ...(has('log') ? ['log'] : [])]);
    if ((p === 'powder' || p === 'boost') && ev.filter(e => e.t === p).length >= 2) p = 'apples';
    if (!['gate', 'strays', 'apples', 'powder', 'boost'].includes(p) && ev.filter(e => e.t === p).length >= (p === 'jump' || p === 'slide' ? 3 : 2)) p = R() < 0.5 ? 'gate' : 'strays';
    const fresh = Object.keys(UNLOCK).find(q => UNLOCK[q] === n && !ev.some(e => e.t === q));
    if (k === 3 && fresh) p = fresh;
    if (p === 'gate') gate();
    else if (p === 'strays') { const c = Math.round(r(3, 7) + d * 6); ev.push({ t: 'strays', z, x: pk([-2.6, 2.6]), n: c }); best += c; avg += c * 0.85; }
    else if (p === 'apples') ev.push({ t: 'apples', z, x: r(-3, 3), n: 8 });
    else if (p === 'hay') ev.push({ t: 'hay', z, sp: r(4, 6) + d * 3, ph: R() * 6, n: R() < 0.3 + d * 0.4 ? 2 : 1 });
    else if (p === 'wolves') { const c = Math.max(3, Math.round(avg * r(0.15, 0.25))); ev.push({ t: 'wolves', z, n: c, x: pk([-1.8, 0, 1.8]) }); best -= c; avg -= c; }
    else if (p === 'bridge') ev.push({ t: 'bridge', z, len: r(18, 26), w: r(4.6, 5.6) - d * 0.8 });
    else if (p === 'spinner') ev.push({ t: 'spinner', z, x: pk([-2, 0, 2]), sp: r(1.2, 1.8) + d });
    else if (p === 'log') ev.push({ t: 'log', z, sp: r(1.4, 1.9) + d * 0.6 });
    else if (p === 'powder') ev.push({ t: 'powder', z, x: pk([-2.4, 2.4]) });
    else if (p === 'boost') ev.push({ t: 'boost', z });
    else if (p === 'cannons') ev.push({ t: 'cannons', z, side: pk([-1, 1]), shots: 3 + Math.round(d * 2) });
    else if (p === 'ramp') ev.push({ t: 'ramp', z, w: r(6.4, 7.2) - d * 0.8 });
    else if (p === 'kraken') ev.push({ t: 'kraken', z, side: pk([-1, 1]), ph: R() * 3 });
    else if (p === 'jump') ev.push({ t: 'jump', z });
    else if (p === 'slide') ev.push({ t: 'slide', z });
    else if (p === 'boulder') ev.push({ t: 'boulder', z, x: pk([-3.3, 3.3]), n: R() < 0.35 + d * 0.4 ? 2 : 1 });
    else if (p === 'parrots') ev.push({ t: 'parrots', z, shots: 4 + Math.round(d * 3) });
    else if (p === 'pendulum') ev.push({ t: 'pendulum', z, sp: r(1.6, 2.2) + d * 0.6, ph: R() * 6 });
    else if (p === 'rival') { const c = Math.max(4, Math.round(avg * 0.35)); ev.push({ t: 'rival', z, n: c, pull: 0.32 + d * 0.3 }); avg += c * 0.4; best += c; z -= 20; }
    if (LOSS[p]) avg *= 1 - LOSS[p] * (0.6 + d * 0.8);
    avg = Math.max(start, avg);
    z -= p === 'bridge' ? 46 : p === 'ramp' ? 36 : p === 'boost' ? 18 : r(26, 34);
  }
  { const spots = ev.filter(e => ['cannons', 'boulder', 'parrots', 'pendulum', 'kraken', 'hay', 'spinner', 'log', 'jump', 'slide', 'wolves'].includes(e.t)); const pickN = []; while (pickN.length < 3 && spots.length) pickN.push(spots.splice(Math.floor(R() * spots.length), 1)[0]);
    while (pickN.length < 3) pickN.push({ z: -L * (0.25 + pickN.length * 0.25) }); pickN.forEach(e => ev.push({ t: 'skull', z: e.z - (e.t === 'jump' || e.t === 'slide' ? 1 : 7), x: pk([-3.6, 3.6]) })); }
  // the fort needs a share of an ordinary player's army that grows gently with the level (boss forts a little more):
  // an ordinary player arrives with about 1.3-2x what it takes, so nobody gets stuck on one level
  const need = Math.max(6, Math.round(avg * (0.42 + 0.3 * d) * (boss ? 1.1 : 1)));
  const guards = n <= 1 || boss ? 0 : Math.min(24, Math.round(need * 0.25));
  const hp = Math.max(5, need - guards);
  return { n, world, boss, L, ev, hp, d, guards, avg: Math.round(avg), need };
}

// ---------------- state ----------------
const G = { state: 'load', t: 0, z: 0, x: 0, tx: 0, speed: 0, crew: [], flying: [], apples: 0, lost: 0, finale: null, shake: 0, slow: 1 };
let MIT = null;
let P = null, lv = null, W = null, castle = null, rocky = null, lalchi = null, crowds = {}, crowdG = null, crowdGL = null, blobs = null;
const objs = [];
const HERD_SPEED = 15, SP = 0.66, MAX_DRAWN = 80;
// the army stays inside the path: rows of up to 9 pirates across, more rows behind
const colsFor = n => Math.max(1, Math.min(9, Math.ceil(Math.sqrt(n * 1.15))));
function slot(i, n) { const c = colsFor(n), r = Math.floor(i / c), k = i % c, inRow = Math.min(c, n - r * c); return [(k - (inRow - 1) / 2) * SP + (r % 2 ? SP * 0.22 : 0), 1.1 + r * SP * 0.92]; }
const herdHalf = () => (colsFor(G.crew.length) - 1) / 2 * SP + 0.45;
const herdDepth = () => 1.1 + Math.ceil(G.crew.length / colsFor(G.crew.length)) * SP * 0.92;
let nameI = 0;
function newPirate(o = {}) {
  const kind = pick(KINDS);
  return { x: G.x, y: 0, z: G.z + 2, ox: 0, oz: 0, ph: Math.random() * 3, kind, tint: coatCol(), skin: pick(SKINS), hair: pick(HAIRS), st: 'run', s: 1, name: CREW_NAMES[nameI++ % CREW_NAMES.length], ...o };
}
function addPirate(from) { const q = newPirate(from ? { x: from.x, z: from.z } : {}); G.crew.push(q); return q; }
function reslot() { const n = G.crew.length; G.crew.forEach((q, i) => { [q.ox, q.oz] = slot(i, n); }); }
function losePirate(q, how, dir = 1) {
  const i = G.crew.indexOf(q); if (i < 0) return;
  if (G.storm > 0) return;   // nothing can hurt the army during a Cannon Storm
  if (G.shield > 0) { G.shield--; puff(_p.set(q.x, 1.2, q.z), 3, 0xa8e0ff, { star: true, size: 0.4 }); if (G.shield === 0 || Math.random() < 0.3) popText('🥷 SHIELD!', _p.set(q.x, 2.6, q.z), '#a8e0ff', 22, 0.7); return; } G.crew.splice(i, 1);
  q.st = how; q.t = 0; q.vx = dir * rnd(3, 6); q.vy = how === 'fall' ? 0 : rnd(5, 8); q.vz = rnd(1, 4); q.spin = rnd(5, 9) * dir;
  G.flying.push(q); if (G.flying.length > 50) G.flying.shift(); G.lost++; sfxT('whoa', 0.25);
  if (G.crew.length === 0 && G.state === 'play') setTimeout(() => fail(how === 'shot' ? 'Lalchi\'s guards won the fight!' : 'The whole army got lost!'), 700);
}

function startLevel(n, playNow) {
  lv = makeLevel(n);
  if (W) W.dispose(); objs.forEach(o => scene.remove(o.obj)); objs.length = 0;
  if (castle) castle.dispose(); fortExtras(true);
  bullets.length = 0; bombs.length = 0;
  setBend(n, -lv.L + 30);   // the last stretch before the fort is straight
  W = buildWorld(lv, scene);
  hemi.color.set(lv.world.night ? 0x8a9aff : 0xdcecff); hemi.intensity = lv.world.night ? 1.0 : 1.5; sun.intensity = lv.world.night ? 1.1 : 2.6;
  Object.assign(G, { t: 0, z: 6, x: 0, tx: 0, speed: 0, crew: [], flying: [], apples: 0, lost: 0, finale: null, shake: 0, slow: 1, guardFight: null, bombPow: 1, combo: 0, air: 0, acts: [], ract: null, teach: null, power: 0, storm: 0, ship: null, shield: 0, fireCD: 0 });
  G.skulls = 0; G.tug = null; $('tug').classList.add('hidden'); $('mitthu').classList.add('hidden'); updateSkulls();
  for (let i = 0; i < 5 + PF.up.start + heroBonusStart(); i++) addPirate();
  for (const h of HEROES) if (hasHero(h.id)) addPirate({ hero: h.id, tint: h.coat, name: h.name, s: 1.08 });
  G.power = hasHero('golu') ? 1 : 0.2; G.shield = hasHero('nisha') ? 5 : 0; G.bombPow = hasHero('bunty') ? 2 : 1;
  reslot(); G.crew.forEach(q => { q.x = q.ox; q.z = G.z + q.oz; });
  for (const e of lv.ev) spawnEvent(e);
  castle = buildCastle(scene, lv.world, -lv.L - 22, lv.hp); castle.group.traverse(o => { o.frustumCulled = false; });
  castle.onTopple = n => { sfx('crumble'); G.shake = Math.max(G.shake, 0.5); for (let i = 0; i < 6; i++) puff(_p.set((n.endsWith('L') ? -1 : n.endsWith('R') ? 1 : 0) * rnd(2, 9), rnd(0.5, 4), castle.z + rnd(-3, 2)), 3, 0xc8bca8, { size: 2.6, speed: 3, life: 1.6, grav: -0.4 }); };
  lalchi.position.set(0, GATE_TOP, castle.z + 0.4); lalchi.rotation.set(0, PI, 0); lalchi.scale.setScalar(1.15); lalchi.visible = true; lalchi.play('idle');
  rocky.position.set(0, 0, G.z - 1.2); rocky.rotation.set(0, 0, 0); rocky.visible = true;
  $('lvl').textContent = 'LEVEL ' + n; $('appleN').textContent = '0';
  G.state = playNow ? 'play' : 'home';
  // send everything to the graphics chip now (while the level starts) rather than in the middle of the run
  try { W.cull(-1e6, true); objs.forEach(o => { o.obj.visible = true; }); const ring = ringPool.pop() || new THREE.Mesh(ringGeo, ringMat.clone()); scene.add(ring);
    const extra = [crab, stairs, bossKit.wave, bossKit.target, ...bossKit.marks]; extra.forEach(o => { o.visible = true; }); crab.userData.core.visible = true;
    renderer.compile(scene, cam); renderer.render(scene, cam); extra.forEach(o => { o.visible = false; }); scene.remove(ring); ringPool.push(ring); W.cull(G.z); } catch (e) { /* not needed */ }
  if (playNow) {
    music(lv.world.music); banner(lv.boss ? '💰 LALCHI\'S BIG FORT!' : 'LEVEL ' + n, lv.world.name, 1.5); sfx('capCharge'); sfx('crewCheer', 0.3);
    popText('CHALO, ARMY! LET\'S GO!', _p.set(0, 3.4, G.z - 1), '#ffe066', 26, 1.3);
    if (PF.heroes.length) setTimeout(() => G.state === 'play' && popText(PF.heroes.map(id => HEROES.find(h => h.id === id).icon).join(' ') + ' HEROES WITH YOU!', _p.set(G.x, 4.4, G.z - 2), '#bff4ff', 22, 1.4), 1400);
    if (n <= 2) { $('hint').innerHTML = '<span class="hand">👆</span><br>DRAG TO STEER THE ARMY<br>PICK THE BLUE GATES!'; $('hint').classList.remove('hidden'); setTimeout(() => $('hint').classList.add('hidden'), 3500); }
    const fr = Object.keys(UNLOCK).find(q => UNLOCK[q] === n); if (fr) setTimeout(() => G.state === 'play' && banner(TIPS[fr][0], TIPS[fr][1], 2.2), 2600);
  }
}
const TIPS = { boulder: ['🪨 BOULDER ROLLING!', 'Steer out of its way!'], parrots: ['🦜 LALCHI\'S PARROTS!', 'Keep moving — dodge the coconuts!'], pendulum: ['⚓ SWINGING ANCHOR!', 'Time it — run past when it swings away'], rival: ['🏴‍☠️ RIVAL CREW!', 'Tug of war — TAP TAP TAP!'], jump: ['⬆️ BARREL WALL!', 'Swipe UP to jump over it'], slide: ['⬇️ SPIKY LOG!', 'Swipe DOWN to slide under it'], cannons: ['💥 CANNON ATTACK!', 'Dodge the red circles!'], ramp: ['🚀 MEGA JUMP!', 'Stay in the middle of the ramp'], kraken: ['🐙 THE KRAKEN!', 'Watch its shadow — then run!'], hay: ['🛢️ ROLLING BARRELS!', 'Steer around them'], wolves: ['💂 LALCHI\'S GUARDS!', 'Bomb them! A bigger army wins'], bridge: ['🌉 NARROW BRIDGE!', 'Keep the army in the middle'], spinner: ['🌀 SPINNING MAST!', 'Time your run'], log: ['⚓ SWINGING ANCHOR!', 'Wait for the gap'] };

// ---------------- the things on the path ----------------
const opTex = {};
function gateTex(op) {
  const k = op.join(''); if (opTex[k]) return opTex[k];
  const good = op[0] === '+' || op[0] === 'x';
  return (opTex[k] = canvasTex(256, 192, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); if (good) { g.addColorStop(0, 'rgba(120,210,255,.75)'); g.addColorStop(1, 'rgba(30,110,255,.45)'); } else { g.addColorStop(0, 'rgba(255,140,140,.75)'); g.addColorStop(1, 'rgba(230,40,60,.45)'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 2);
    c.strokeStyle = good ? '#e0f4ff' : '#ffe0e2'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.font = 'bold 104px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 14; c.strokeStyle = good ? 'rgba(10,40,110,.9)' : 'rgba(110,10,20,.9)'; const t = (op[0] === 'x' ? '×' : op[0]) + op[1]; c.strokeText(t, w / 2, h / 2 + 8); c.fillStyle = '#fff'; c.fillText(t, w / 2, h / 2 + 8);
  }));
}
const moveMats = {};
function moveMat(type) {   // "⬆ JUMP!" / "⬇ SLIDE!" signs over the obstacles
  return moveMats[type] || (moveMats[type] = new THREE.SpriteMaterial({ map: canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = type === 'jump' ? '#3fcf6e' : '#2f8cf0'; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 30); c.fill(); c.lineWidth = 8; c.strokeStyle = '#3a2410'; c.stroke();
    c.font = 'bold 58px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeText((type === 'jump' ? '⬆ JUMP' : '⬇ SLIDE'), w / 2, h / 2 + 4); c.fillStyle = '#fff'; c.fillText((type === 'jump' ? '⬆ JUMP' : '⬇ SLIDE'), w / 2, h / 2 + 4);
  }), transparent: true, depthWrite: false }));
}
function signTex(text, col) { return canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#f6e3b0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a4020'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.font = 'bold 50px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(text, w / 2, h / 2 + 4); }); }
function spawnEvent(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, done: false };
  if (e.t === 'gate') {
    e.ops.forEach((op, i) => { const s = i ? 1 : -1; const pl = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W / 2 - 0.2, 2.9), new THREE.MeshBasicMaterial({ map: gateTex(op), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); pl.position.set(s * PATH_W / 4, 1.65, 0); g.add(pl); o['p' + i] = pl; });
    for (const x of [-PATH_W / 2, 0, PATH_W / 2]) { mesh(new THREE.CylinderGeometry(0.17, 0.2, 3.4, 8), flat(0x8a5a2a), x, 1.7, 0, g); mesh(new THREE.SphereGeometry(0.26, 10, 8), flat(0xf2c14e, { metalness: 0.6, roughness: 0.3 }), x, 3.5, 0, g); }
    mesh(new THREE.BoxGeometry(PATH_W + 0.4, 0.28, 0.28), flat(0x8a5a2a), 0, 3.25, 0, g);
  } else if (e.t === 'strays') {   // castaways waving on the path; run through them and they join
    o.list = []; for (let i = 0; i < e.n; i++) { const [ox, oz] = slot(i, e.n); o.list.push(newPirate({ x: e.x + ox * 0.9, z: e.z + oz - 1, st: 'idle', ph: Math.random() * 2 })); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), new THREE.MeshStandardMaterial({ map: signTex('+' + e.n + ' 🙋', '#2a7a1a'), side: THREE.DoubleSide })); sign.position.set(e.x, 2.8, -0.4); g.add(sign);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), flat(0x6a4020), e.x, 1.2, -0.42, g);
  } else if (e.t === 'apples') {
    o.list = []; for (let i = 0; i < e.n; i++) { const a = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), flat(0xffc21a, { metalness: 0.7, roughness: 0.25, emissive: 0x6a4000 }), e.x + Math.sin(i * 0.6) * 1.2, 0.7, -i * 1.6, g); a.rotation.x = PI / 2; o.list.push(a); }
  } else if (e.t === 'hay') {
    o.bales = []; for (let i = 0; i < e.n; i++) { const b = new THREE.Group(); g.add(b); const c = mesh(new THREE.CylinderGeometry(1.1, 0.95, 1.8, 14), flat(0x9a5a2a), 0, 0, 0, b); c.rotation.z = PI / 2; for (const xx of [-0.62, 0, 0.62]) mesh(new THREE.TorusGeometry(xx ? 1.04 : 1.1, 0.07, 4, 18), flat(0x4a4a52, { metalness: 0.5 }), xx, 0, 0, b).rotation.y = PI / 2; b.position.set(0, 1.1, -i * 5); o.bales.push(b); }
  } else if (e.t === 'wolves') {   // a squad of Lalchi's red-coat guards blocks the path
    o.list = []; for (let i = 0; i < e.n; i++) { const [ox, oz] = slot(i, e.n); o.list.push({ x: clamp(e.x + ox, -PATH_W / 2 + 0.7, PATH_W / 2 - 0.7), z: e.z - oz, y: 0, t: Math.random() * 2, clip: 'idle', tint: pick(GUARD_COATS), skin: pick(SKINS), hair: 0xffffff, st: 'idle' }); }
  } else if (e.t === 'bridge') {
    const water = mesh(new THREE.PlaneGeometry(90, e.len, 10, Math.ceil(e.len / 2)), new THREE.MeshStandardMaterial({ color: lv.world.id === 'volcano' ? 0xff5a1a : 0x3a9ae8, emissive: lv.world.id === 'volcano' ? 0xc83a00 : 0x000000, roughness: 0.15, metalness: 0.1 }), 0, 0.12, -e.len / 2, g); water.rotation.x = -PI / 2;
    for (let i = 0; i < Math.ceil(e.len / 0.6); i++) mesh(new THREE.BoxGeometry(e.w, 0.14, 0.5), flat(i % 2 ? 0xa8783a : 0x98682a), 0, 0.3, -i * 0.6 + 0.2, g);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.1, e.len, 1, 1, Math.ceil(e.len / 2)), flat(0x6a4a2a), s * e.w / 2, 0.42, -e.len / 2, g);
  } else if (e.t === 'spinner') {
    mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.4, 8), flat(0x7a5a3a), e.x, 0.7, 0, g);
    const bar = new THREE.Group(); bar.position.set(e.x, 1.0, 0); g.add(bar); const l = mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 8), flat(0x9a6a3a), 0, 0, 0, bar); l.rotation.z = PI / 2; o.bar = bar;
  } else if (e.t === 'log') {
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.2, 0.25, 6, 6), flat(0x7a5a3a), s * (PATH_W / 2 + 0.4), 3, 0, g);
    mesh(new THREE.BoxGeometry(PATH_W + 1.2, 0.35, 0.35), flat(0x7a5a3a), 0, 6, 0, g);
    const piv = new THREE.Group(); piv.position.y = 6; g.add(piv); mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 4), flat(0x3a2a1a), 0, -1.8, 0, piv);
    const an = new THREE.Group(); an.position.y = -4.1; piv.add(an); mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), flat(0x4a4a52, { metalness: 0.6 }), 0, 0.4, 0, an); const cr = mesh(new THREE.TorusGeometry(0.9, 0.18, 6, 16, Math.PI), flat(0x4a4a52, { metalness: 0.6 }), 0, -0.2, 0, an); cr.rotation.z = Math.PI; mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), flat(0x4a4a52, { metalness: 0.6 }), 0, 1.1, 0, an); o.piv = piv;
  } else if (e.t === 'powder') {   // a barrel of gunpowder: run into it for bigger bombs at the fort
    const b = new THREE.Group(); b.position.set(e.x, 0.75, 0); g.add(b); o.b = b;
    mesh(new THREE.CylinderGeometry(0.62, 0.52, 1.3, 16), flat(0x6a3a18), 0, 0, 0, b);
    for (const y of [-0.42, 0.42]) mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 20), flat(0x3a3a42, { metalness: 0.6 }), 0, y, 0, b).rotation.x = PI / 2;
    mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.5, roughness: 0.3 }), 0, 1.05, 0, b);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffa030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(3.2); glow.position.y = 0.4; b.add(glow); o.glow = glow;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 26); c.fill(); c.lineWidth = 7; c.strokeStyle = '#3a2410'; c.stroke(); c.font = 'bold 48px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3a2410'; c.fillText('💣 BIG BOMBS', w / 2, h / 2 + 4); }), transparent: true })); sign.scale.set(2.6, 0.98, 1); sign.position.y = 2.4; b.add(sign);
  } else if (e.t === 'boost') {   // a speed pad: glowing arrows across the path
    const arrowTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; for (const y of [10, 60]) { c.beginPath(); c.moveTo(w / 2, y); c.lineTo(w - 12, y + 44); c.lineTo(w - 36, y + 44); c.lineTo(w / 2, y + 16); c.lineTo(36, y + 44); c.lineTo(12, y + 44); c.closePath(); c.fill(); } });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W - 0.6, 4), new THREE.MeshBasicMaterial({ map: arrowTex, color: 0x40e0ff, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    pad.rotation.x = -PI / 2; pad.position.y = 0.06; g.add(pad); arrowTex.wrapS = THREE.RepeatWrapping; arrowTex.repeat.set(4, 1); o.pad = pad;
  } else if (e.t === 'cannons') {   // one of Lalchi's cannons beside the path fires at the army
    const c = makeCannon(); c.scale.setScalar(1.3); c.position.set(e.side * (PATH_W / 2 + 2.6), 0.5, 0); c.rotation.y = e.side > 0 ? PI / 2 : -PI / 2; g.add(c); o.c = c;
    mesh(new THREE.BoxGeometry(3, 0.5, 3), flat(0x8a8478), e.side * (PATH_W / 2 + 2.6), 0.25, 0, g);
    o.cd = 0.4; o.fired = 0; o.rings = [];
  } else if (e.t === 'ramp') {   // a ramp, a deep chasm, and a mega jump
    const rampLen = 4, gap = 12, ang = Math.atan2(1.6, rampLen);
    const rp = mesh(new THREE.BoxGeometry(e.w, 0.3, Math.hypot(rampLen, 1.6)), flat(0xb07840), 0, 0.72, -rampLen / 2, g); rp.rotation.x = ang;
    for (let i = 0; i < 6; i++) { const st = mesh(new THREE.BoxGeometry(e.w + 0.05, 0.05, 0.12), flat(0xffd23f), 0, 0, 0, g); st.position.set(0, 0.2 + (i + 0.5) / 6 * 1.6 + 0.1, -(i + 0.5) / 6 * rampLen); st.rotation.x = ang; }
    for (const sx of [-1, 1]) { const rl = mesh(new THREE.BoxGeometry(0.16, 0.5, Math.hypot(rampLen, 1.6)), flat(0x7a4a20), sx * e.w / 2, 1.0, -rampLen / 2, g); rl.rotation.x = ang; }
    const chasm = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W + 30, gap), new THREE.MeshBasicMaterial({ map: canvasTex(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a4a2a'); gr.addColorStop(0.08, '#2a1a0e'); gr.addColorStop(0.3, '#050302'); gr.addColorStop(0.7, '#050302'); gr.addColorStop(0.92, '#2a1a0e'); gr.addColorStop(1, '#6a4a2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,90,20,.35)'; c.fillRect(0, h * 0.45, w, h * 0.1); }) }));
    chasm.rotation.x = -PI / 2; chasm.position.set(0, 0.05, -rampLen - gap / 2); g.add(chasm);
    const land = mesh(new THREE.BoxGeometry(e.w + 2, 0.3, 2), flat(0xb07840), 0, 0.12, -rampLen - gap - 1, g); void land;
    o.coins = []; for (let i = 0; i < 9; i++) { const k = (i + 1) / 10, cz = -rampLen - k * gap, cy = 1.6 * (1 - k) + Math.sin(k * PI) * 4.2 + 1.0; const a = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16), flat(0xffc21a, { metalness: 0.7, roughness: 0.25, emissive: 0x8a5a00 }), 0, cy, cz, g); a.rotation.x = PI / 2; o.coins.push(a); }
  } else if (e.t === 'ship') {   // a river: the army sails Rocky's ship past Lalchi's gunboats
    const water = mesh(new THREE.PlaneGeometry(38, e.len + 12, 6, Math.ceil((e.len + 12) / 3)), new THREE.MeshStandardMaterial({ color: lv.world.sea, map: waterTex, roughness: 0.2 }), 0, 0.32, -e.len / 2 + 1, g); water.rotation.x = -PI / 2;
    const docks = new THREE.Group();
    for (const [zc, dl] of [[1.5, 9], [-e.len - 1.5, 11]]) { mesh(new THREE.BoxGeometry(PATH_W, 0.4, dl), flat(0xa8783a), 0, 0.5, zc, docks); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 6), flat(0x5a3418), sx * (PATH_W / 2 - 0.2), 0.4, zc - dl / 2 + 0.5 + k * (dl - 1) / 2, docks); }
    g.add(oneMesh(docks));
    const S = buildShip(); S.position.set(0, 0, -6.5); g.add(S); o.ship = S;
    o.boats = e.boats.map(b => { const m = buildBoat(); m.position.set(b.side * 8.5, 0, b.dz); g.add(m); return { m, x: b.side * 8.5, z: e.z + b.dz, side: b.side, hp: b.hp, alive: true, st: 'ok', t: 0, cd: 0.6 }; });
  } else if (e.t === 'jump') {   // a wall of barrels across the whole path: swipe UP to jump it
    const w = new THREE.Group();
    for (let i = 0; i < 5; i++) { const x = -PATH_W / 2 + 1 + i * 2; const b = mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.9, 12), flat(i % 2 ? 0x8a4a1a : 0x9a5a22), x, 0.5, 0, w); b.rotation.z = PI / 2; for (const xx of [-0.6, 0.6]) mesh(new THREE.TorusGeometry(0.51, 0.05, 4, 16), flat(0x3a3a42), x + xx, 0.5, 0, w).rotation.y = PI / 2; }
    mesh(new THREE.BoxGeometry(PATH_W + 0.6, 0.12, 0.3), flat(0xffd23f), 0, 1.06, 0, w);
    g.add(oneMesh(w)); const sg = new THREE.Sprite(moveMat('jump')); sg.scale.set(2.6, 1.3, 1); sg.position.set(0, 2.9, 0); g.add(sg); o.sign = sg;
  } else if (e.t === 'slide') {   // a spinning spiked log at head height: swipe DOWN to slide under it
    const w = new THREE.Group();
    for (const sx of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.4, 8), flat(0x6a4020), sx * (PATH_W / 2 + 0.3), 1.7, 0, w); mesh(new THREE.SphereGeometry(0.3, 10, 8), flat(0xf2c14e), sx * (PATH_W / 2 + 0.3), 3.45, 0, w); }
    g.add(oneMesh(w));
    const bar = new THREE.Group(); bar.position.set(0, 1.55, 0); g.add(bar);
    const lg = new THREE.Group(); const l = mesh(new THREE.CylinderGeometry(0.3, 0.3, PATH_W + 0.6, 12), flat(0x9a6a3a), 0, 0, 0, lg); l.rotation.z = PI / 2;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const c = mesh(new THREE.ConeGeometry(0.11, 0.42, 6), flat(0xd8d8e0), -PATH_W / 2 + 0.6 + i * 1.1, 0, 0, lg); const a = j * PI / 2 + i * 0.4; c.position.y = Math.cos(a) * 0.45; c.position.z = Math.sin(a) * 0.45; c.rotation.x = a; }
    for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.25, 12), flat(0xc8302a), -PATH_W / 2 + 1 + i * 2, 0, 0, lg).rotation.z = PI / 2;
    bar.add(oneMesh(lg)); o.bar = bar;
    const sg = new THREE.Sprite(moveMat('slide')); sg.scale.set(2.6, 1.3, 1); sg.position.set(0, 3.2, 0); g.add(sg); o.sign = sg;
  } else if (e.t === 'kraken') {   // a giant octopus arm rises from a pool and slams across the path
    const bx = e.side * (PATH_W / 2 + 1.8);
    const pool = mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshStandardMaterial({ color: 0x1a6ab0, roughness: 0.1, metalness: 0.2 }), bx, 0.06, 0, g); pool.rotation.x = -PI / 2;
    const skin = new THREE.MeshStandardMaterial({ color: 0x8a2a9a, roughness: 0.45 }), sucker = new THREE.MeshStandardMaterial({ color: 0xf0b8d8, roughness: 0.6 });
    const head = mesh(new THREE.SphereGeometry(1.5, 18, 14), skin, bx + e.side * 0.8, 0.2, 0.6, g); head.scale.set(1, 0.8, 1);
    for (const sz of [-0.5, 0.5]) { mesh(new THREE.SphereGeometry(0.32, 12, 10), flat(0xfff6c0), bx + e.side * 0.1, 0.95, 0.6 + sz, g); mesh(new THREE.SphereGeometry(0.16, 10, 8), flat(0x101010), bx - e.side * 0.12, 0.98, 0.6 + sz, g); }
    const piv = new THREE.Group(); piv.position.set(bx, 0.1, 0); g.add(piv);
    const segs = []; let parent = piv; const SEG = 10, LEN = 0.88;
    for (let i = 0; i < SEG; i++) {
      const r0 = 0.62 * (1 - i / SEG) + 0.1, r1 = 0.62 * (1 - (i + 1) / SEG) + 0.08;
      const sg = new THREE.Group(); sg.position.y = i ? LEN : 0; parent.add(sg);
      mesh(new THREE.CylinderGeometry(r1, r0, LEN * 1.04, 12), skin, 0, LEN / 2, 0, sg);
      for (const yy of [0.25, 0.65]) mesh(new THREE.SphereGeometry(r0 * 0.38, 8, 6), sucker, -e.side * r0 * 0.85, LEN * yy, 0, sg);
      segs.push(sg); parent = sg;
    }
    o.piv = piv; o.segs = segs; o.reach = SEG * LEN; o.bx = bx;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(o.reach, 2.2), new THREE.MeshBasicMaterial({ color: 0x200010, transparent: true, opacity: 0, depthWrite: false })); sh.rotation.x = -PI / 2; sh.position.set(bx - e.side * o.reach / 2, 0.08, 0); g.add(sh); o.shadow = sh;
  }
  else if (e.t === 'boulder') {   // a giant boulder rolls down the path at the army: steer out of its lane
    o.rocks = []; for (let i = 0; i < e.n; i++) { const r = mesh(new THREE.DodecahedronGeometry(1.5, 1), flat(pick([0x8a8278, 0x7a7268, 0x9a9084])), 0, 1.5, 0, g); const p = r.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * rnd(0.9, 1.1), p.getY(k) * rnd(0.9, 1.1), p.getZ(k) * rnd(0.9, 1.1)); r.geometry.computeVertexNormals(); o.rocks.push({ m: r, x: i ? -e.x : e.x, z: -38 - i * 16, go: false }); r.position.set(o.rocks[i].x, 1.5, o.rocks[i].z); }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshStandardMaterial({ map: signTex('🪨 LOOK OUT!', '#a83a1a'), side: THREE.DoubleSide })); sg.position.set(PATH_W / 2 + 0.6, 1.6, 2); sg.rotation.y = -0.4; g.add(sg); mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), flat(0x6a4a2a), PATH_W / 2 + 0.6, 0.8, 2, g);
  } else if (e.t === 'parrots') {   // Lalchi's parrots fly over the army and drop coconuts where it is going
    o.birds = []; for (let i = 0; i < 3; i++) { const b = parrotModel(i ? 0x2ad83a : 0xe8302a); g.add(b); o.birds.push(b); } o.drops = []; o.cd = 1.2; o.fired = 0;
  } else if (e.t === 'pendulum') {   // a giant anchor swings across the path on a chain
    const fr = new THREE.Group(), wood = flat(0x6a4422); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, 7.4, 0.5), wood, s * (PATH_W / 2 + 0.6), 3.7, 0, fr); mesh(new THREE.BoxGeometry(PATH_W + 2, 0.5, 0.6), wood, 0, 7.4, 0, fr); g.add(oneMesh(fr));
    const piv = new THREE.Group(); piv.position.set(0, 7.2, 0); g.add(piv); const chain = mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 5), flat(0x4a4a50, { metalness: 0.5 }), 0, -2.3, 0, piv); void chain;
    const an = new THREE.Group(), iron = flat(0x2a2a30, { metalness: 0.6, roughness: 0.4 }); mesh(new THREE.BoxGeometry(0.35, 2.0, 0.35), iron, 0, -0.9, 0, an); mesh(new THREE.TorusGeometry(1.1, 0.22, 6, 16, PI), iron, 0, -1.4, 0, an).rotation.z = PI; mesh(new THREE.TorusGeometry(0.35, 0.1, 6, 12), iron, 0, 0.25, 0, an); for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.3, 0.6, 4), iron, s * 1.1, -1.2, 0, an);
    an.position.y = -4.6; piv.add(an); o.piv = piv; o.anchor = an;
  } else if (e.t === 'rival') {   // a rival pirate crew blocks the path: tug of war!
    o.list = []; for (let i = 0; i < Math.min(e.n, 24); i++) { const [ox, oz] = slot(i, Math.min(e.n, 24)); o.list.push(newPirate({ x: ox * 0.9, z: e.z - oz - 1.5, st: 'idle', kind: pick(['pirate2', 'pirate3']), tint: pick([0x1a1a1e, 0x3a1a2a, 0x2a2a3a]), ph: Math.random() * 2 })); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshStandardMaterial({ map: signTex('☠️ KALA DAKU\'S CREW ☠️', '#2a1a1a'), side: THREE.DoubleSide })); sign.position.set(0, 3.6, -1.2); g.add(sign);
    const rope = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), flat(0xc89a5a), 0, 1.1, 0, g); rope.rotation.x = PI / 2; rope.visible = false; o.rope = rope; o.v = 0.5;
  } else if (e.t === 'skull') {   // a golden skull: collect all three for the third star
    const sk = new THREE.Group(), gold = flat(0xffc21a, { metalness: 0.7, roughness: 0.25, emissive: 0x6a4a00 }); mesh(new THREE.SphereGeometry(0.45, 14, 10), gold, 0, 0, 0, sk); mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), gold, 0, -0.32, 0.05, sk); for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.12, 8, 6), flat(0x1a1a1a), s * 0.17, 0.02, 0.38, sk); mesh(new THREE.ConeGeometry(0.07, 0.14, 4), flat(0x1a1a1a), 0, -0.12, 0.42, sk).rotation.x = PI;
    sk.position.set(e.x, 1.3, 0); g.add(sk); o.sk = sk;
  }
  g.traverse(q => { q.frustumCulled = false; }); objs.push(o);
}
// height of the ground (ramps and jumps) at z
function rampAt(z) { for (const o of objs) if (o.t === 'ramp') { const l = o.z - z; if (l >= 0 && l < 4) return { y: l / 4 * 1.6, o, air: false }; if (l >= 4 && l < 16) { const k = (l - 4) / 12; return { y: 1.6 * (1 - k) + Math.sin(k * PI) * 4.2, o, air: true }; } } return null; }

// ---------------- update ----------------
const _p = new THREE.Vector3();
const lists = { pirate: [], pirate2: [], pirate3: [], pirateF: [], pirateF2: [], pirate_lo: [], pirate2_lo: [], pirate3_lo: [], pirateF_lo: [], pirateF2_lo: [], g: [], gl: [] };
const NEAR = 10;   // the first rows are drawn in full detail, the rest with the lighter version
function person(q, extra) { const o = { x: q.x, y: q.y || 0, z: q.z, ry: q.ry || 0, rx: q.rx || 0, rz: q.rz || 0, s: q.s ?? 1, clip: q.clip || 'run', t: q.t || 0, tint: q.tint, skin: q.skin, hair: q.hair, ...extra }; o.expr = o.clip === 'hit' ? EXPR.scared : o.clip === 'victory' || o.clip === 'throw' ? EXPR.laugh : q.expr ?? crewExpr(); return o; }
function pushCrew(q, extra, far) { (lists[far ? q.kind + '_lo' : q.kind] || lists.pirate).push(person(q, extra)); }
function update(dt) {
  if (window.__bot) window.__bot(dt);
  crewET -= dt; if (crewET <= 0 && rocky && rocky.expr !== 0) rocky.expr = 0;
  if (mitT > 0) { mitT -= dt; if (mitT <= 0) $('mitthu').classList.add('hidden'); }
  if (MIT && rocky) { const fl = G.state === 'play' || G.state === 'home'; MIT.visible = fl && !G.finale; MIT.position.set(rocky.position.x + 0.9 + Math.sin(G.t * 1.3) * 0.3, rocky.position.y + 2.5 + Math.sin(G.t * 2.6) * 0.25, rocky.position.z + 0.3); MIT.rotation.y = G.state === 'home' ? 0 : PI; MIT.userData.wl.rotation.z = Math.sin(G.t * 16) * 0.7; MIT.userData.wr.rotation.z = -Math.sin(G.t * 16) * 0.7; }
  G.t += dt; G.storm = Math.max(0, (G.storm || 0) - dt); G.fireCD = Math.max(0, (G.fireCD || 0) - dt); W.update(dt, G.t); W.cull(G.finale ? castle.z + 20 : G.z); if ((G.state === 'play' || G.state === 'home') && Math.random() < dt * 0.06) sfxT('gull', 6); if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  for (const k in lists) lists[k].length = 0;
  let airborne = false;
  const play = G.state === 'play';
  if (play) {
    const sl = slopeAt(G.z);
    G.boost = Math.max(0, (G.boost || 0) - dt);
    G.speed = damp(G.speed, HERD_SPEED * clamp(1 - sl * 0.9, 0.75, 1.3) * (G.guardFight ? 0.2 : 1) * (G.tug ? 0 : 1) * (G.boost > 0 || G.storm > 0 ? 1.6 : 1) * (G.ship ? 0.85 : 1), G.boost > 0 || G.storm > 0 ? 6 : 3, dt);
    if (G.storm > 0 && Math.random() < dt * 9) skyBomb(G.x + rnd(-5, 5), 0.3, G.z - rnd(16, 42), 0.25);
    if ((G.boost > 0 || G.storm > 0) && Math.random() < dt * 40) puff(_p.set(G.x + rnd(-5, 5), rnd(0.5, 3), G.z - rnd(4, 12)), 1, 0xffffff, { size: 0.25, speed: 0, life: 0.25, grav: 0, grow: 3 });
    G.z -= G.speed * dt;
    const lim = Math.max(0, (G.ship ? 6.6 : PATH_W / 2 - 0.45) - herdHalf()); G.tx = clamp(G.tx, -lim, lim); G.x = damp(G.x, G.tx, 8, dt);
    if (G.z < -lv.L) startFinale();
  }
  // the army: each pirate runs to his place in the formation (and never outside the path)
  const lim = G.ship ? 9 : PATH_W / 2 - 0.4, runRate = G.speed / HERD_SPEED;
  // runners share two running rhythms (half a stride apart): far fewer poses on screen, far fewer draw calls
  G.runT = (G.runT || 0) + dt * (0.4 + runRate * 0.75);
  G.crew.forEach((q, i) => {
    if (q.st === 'run') {
      q.pz = q.z;
      q.x = clamp(damp(q.x, G.x + q.ox, 7, dt), -lim, lim); q.z = damp(q.z, G.z + q.oz, 7, dt); q.t = (q.t || 0) + dt * (G.state === 'home' ? 0 : 0.4 + runRate * 0.75); q.ph += dt;
      q.clip = G.state === 'home' ? 'idle' : 'run'; if (G.state === 'home') q.t = G.t + q.ph;
      if (q.clip === 'run') { if (q.beat === undefined) q.beat = Math.random() < 0.5 ? 0 : 0.333; q.t = G.runT + q.beat; }
      if (q.thr > 0) { q.thr -= dt; q.clip = 'throw'; q.t = 0.75 - q.thr; }
      q.ry = G.state === 'home' ? PI : (G.tx - G.x) * -0.06; q.rx = 0; q.y = 0;
      if (q.actN === undefined) q.actN = G.acts.length;
      while (q.actN < G.acts.length && q.z <= G.acts[q.actN].z) { const a = G.acts[q.actN++]; q.act = { type: a.type, t: 0, T: a.type === 'jump' ? JUMP_T : SLIDE_T }; }
      if (q.act) { if (movePose(q, q.act, dt)) { q.clip = 'jump'; q.t = q.act.type === 'jump' ? q.act.t : 0.25; } else q.act = null; }
      if (G.ship) { q.y = G.ship.deckY || 1.45; q.clip = q.thr > 0 ? 'throw' : 'idle'; q.t = q.thr > 0 ? 0.75 - q.thr : G.t + q.ph; }
      const ra = play && !G.ship && rampAt(q.z); if (ra) { q.y = ra.y; if (ra.air) { q.clip = 'jump'; airborne = true; if (Math.abs(q.x) > ra.o.w / 2 + 0.25) { losePirate(q, 'fall', Math.sign(q.x)); q.vy = -1; sfxT('whoa', 0.2); } } }
    }
    if (i < MAX_DRAWN) pushCrew(q, undefined, i >= NEAR);
  });
  G.air = airborne;
  // lost pirates tumble away
  for (let i = G.flying.length - 1; i >= 0; i--) {
    const q = G.flying[i]; q.t += dt; q.vy -= 20 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rx = (q.rx || 0) + q.spin * dt * 0.6; q.rz = (q.rz || 0) + q.spin * 0.5 * dt;
    if (q.st !== 'fall' && q.y < 0 && q.t > 0.2) { q.y = 0; q.vy *= -0.35; q.vx *= 0.6; q.vz *= 0.6; q.spin *= 0.5; }
    pushCrew(q, { clip: 'hit', t: Math.min(q.t, 0.5), s: Math.max(0.01, 1 - Math.max(0, q.t - 1.3)) }, i < G.flying.length - 4);   // only the newest few in full detail
    if (q.t > 2.3) G.flying.splice(i, 1);
  }
  for (const o of objs) updateObj(o, dt);
  if (G.finale) updateFinale(dt);
  // Captain Rocky leads from the front
  if (!G.finale) {
    rocky.visible = true;
    const ra = play && rampAt(G.z - 0.2);
    rocky.position.set(G.x, ra ? ra.y : 0, G.z - 0.2); rocky.rotation.set(0, play ? (G.tx - G.x) * -0.08 : G.state === 'home' ? PI : 0, 0);
    if (G.ship) { rocky.position.y = G.ship.deckY || 1.45; if (rocky.clip !== 'throw' || rocky.done()) rocky.play(G.fireCD > 0 ? 'throw' : 'idle', G.fireCD > 0.15); }
    let moving = false; if (G.ract) { const o = { y: 0, rx: 0 }; if (movePose(o, G.ract, dt)) { moving = true; rocky.position.y += o.y; rocky.rotation.x = o.rx; } else G.ract = null; }
    if (moving) rocky.play('jump');
    else if (G.ship) { /* on deck */ }
    else if (G.guardFight) { if (rocky.clip !== 'throw' || rocky.done()) rocky.play('throw', true); } else if (!(rocky.clip === 'hit' && !rocky.done())) rocky.play(G.state === 'home' ? 'idle' : ra && ra.air ? 'jump' : 'run');
    rocky.update(dt, G.state === 'home' || G.guardFight ? 1 : 0.4 + runRate * 0.75);
    lalchi.play('idle'); lalchi.update(dt);
  }
  if (castle) { castle.group.visible = !!G.finale || G.z - castle.z < 190; castle.update(dt); }   // hidden while it is still lost in the fog
  updateFx(dt); updateBullets(dt); updateBombs(dt); updateBooms(dt);
  for (const k in crowds) crowds[k].draw(lists[k]); crowdG.draw(lists.g); crowdGL.draw(lists.gl);
  blobs.draw([...Object.keys(crowds).map(k => lists[k]), lists.g, lists.gl, [{ x: rocky.position.x, z: rocky.position.z, y: rocky.position.y, s: 1.2 }]], 0.95);
  // the army counter over the army
  const [hx, hy, ok] = project(_p.set(G.x, 3.3, G.z + 0.6));
  const hc = $('herdN'); hc.style.display = ok && G.state === 'play' ? 'block' : 'none'; hc.style.transform = `translate(${hx}px,${hy}px) translate(-50%,-100%)`; const tx = '🏴‍☠️ ' + (G.crew.length + 1); if (hc.textContent !== tx) { hc.textContent = tx; hc.classList.remove('bump'); void hc.offsetWidth; hc.classList.add('bump'); }
  $('progFill').style.width = clamp(-G.z / lv.L, 0, 1) * 100 + '%';
  updatePowerUI();
}
function near(q, x, z, rx, rz) { return Math.abs(q.x - x) < rx && Math.abs(q.z - z) < rz; }
function updateObj(o, dt) {
  const dz = o.z - G.z;
  o.obj.visible = G.finale ? false : o.t === 'ship' ? G.z < o.z + 140 && G.z > o.z - o.len - 30 : dz > -140 && dz < 25;   // far-away things are not drawn
  if (o.broken && o.t !== 'wolves') { o.obj.visible = false; return; }   // smashed by a Cannon Storm
  if (o.t === 'boulder') {
    for (const r of o.rocks) {
      if (!r.go && G.state === 'play' && dz + r.z > -62) { r.go = true; sfxT('crumble', 0.5); G.shake = Math.max(G.shake, 0.2); if (!o.told) { o.told = true; mitthu(pick(['Boulder! BHAAGO!', 'Squawk! Big rock coming!', 'Move move MOVE!']), 'scared'); setCrewExpr('scared', 1.6); } }
      if (r.go && !r.gone) { r.z += 16 * dt; r.m.position.set(r.x, 1.5, r.z); r.m.rotation.x += dt * 10; if (Math.random() < dt * 12) puff(_p.set(r.x + rnd(-1, 1), 0.3, o.z + r.z + 1.2), 1, 0xc8b89a, { size: 0.7, speed: 1, life: 0.5 }); G.shake = Math.max(G.shake, 0.06);
        const az = o.z + r.z; o.cap = o.cap ?? Math.ceil((G.crew.length + 1) * 0.3); for (const q of G.crew.slice()) if ((o.kills || 0) < o.cap && Math.abs(q.x - r.x) < 1.35 && Math.abs(q.z - az) < 1.4) { o.kills = (o.kills || 0) + 1; losePirate(q, 'hit', Math.sign(q.x - r.x) || 1); if (Math.random() < 0.3) popText(pick(['SQUASH!', 'BONK!', 'MUMMYYY!']), _p.set(q.x, 2.4, q.z), '#ffd0a0', 22, 0.7); }
        if (az > G.z + 30) { r.gone = true; r.m.visible = false; } }
    }
    return;
  }
  if (o.t === 'parrots') {
    const act = G.state === 'play' && dz > -55 && dz < 8;
    o.birds.forEach((b, i) => { const fx = act ? G.x + Math.sin(G.t * 1.7 + i * 2.1) * 3 : (i - 1) * 3, fz = act ? G.z - o.z - 14 - i * 3 : -6; b.position.set(damp(b.position.x, fx, 2, dt), 6 + Math.sin(G.t * 3 + i) * 0.6, damp(b.position.z, fz, 2, dt)); b.userData.wl.rotation.z = Math.sin(G.t * 18 + i) * 0.7; b.userData.wr.rotation.z = -Math.sin(G.t * 18 + i) * 0.7; b.rotation.y = PI; });
    if (act && o.fired < o.shots) { o.cd -= dt; if (o.cd <= 0) { o.cd = 1.1 - lv.d * 0.3; o.fired++; const b = pick(o.birds), tx = clamp(G.x + G.speed * 0 + rnd(-1.5, 1.5), -PATH_W / 2 + 1, PATH_W / 2 - 1), tz = G.z - G.speed * 1.0 - 1; const ring = ringPool.pop() || new THREE.Mesh(ringGeo, ringMat.clone()); ring.material.color.set(0xff3a2a); ring.material.opacity = 0.8; ring.rotation.set(-PI / 2, 0, 0); ring.scale.setScalar(2.2); ring.position.set(tx, 0.12, tz); scene.add(ring); sfxT('squawk', 0.3); o.drops.push({ x: tx, z: tz, t: 0, ring, from: new THREE.Vector3(o.obj.position.x + b.position.x, b.position.y, o.z + b.position.z) }); if (o.fired === 1) mitthu(pick(['Arre, coconuts?! Keep moving!', 'Squawk! Those are MY cousins!', 'Coconut rain!']), 'laugh'); } }
    for (const d of o.drops) { d.t += dt; if (d.t >= 1.0 && !d.done) { d.done = true; scene.remove(d.ring); ringPool.push(d.ring); boom(_p.set(d.x, 0.4, d.z), 0.9); puff(_p.set(d.x, 0.6, d.z), 8, 0x8a5a2a, { size: 0.35, speed: 5, life: 0.7, grav: 14 }); let k = 0; for (const q of G.crew.slice()) if (k < 5 && Math.abs(q.x - d.x) < 1.4 && Math.abs(q.z - d.z) < 1.4) { k++; losePirate(q, 'hit', Math.sign(q.x - d.x) || 1); } } else if (!d.done) d.ring.material.opacity = 0.5 + Math.sin(G.t * 20) * 0.3; }
    o.drops = o.drops.filter(d => !d.done || d.t < 1.1);
    return;
  }
  if (o.t === 'pendulum') {
    const a = Math.sin(G.t * o.sp + o.ph) * 1.0; o.piv.rotation.z = a; const ax = Math.sin(a) * 6.4, ay = 7.2 - Math.cos(a) * 6.4;
    if (G.state === 'play' && Math.abs(dz) < 12) { o.cap = o.cap ?? Math.ceil((G.crew.length + 1) * 0.25); for (const q of G.crew.slice()) if ((o.kills || 0) < o.cap && Math.abs(q.z - o.z) < 0.8 && Math.abs(q.x - ax) < 1.1 && ay < 2.2) { o.kills = (o.kills || 0) + 1; losePirate(q, 'hit', Math.sign(Math.cos(G.t * o.sp + o.ph)) || 1); sfxT('clang', 0.1); if (Math.random() < 0.3) popText('DHISHOOM!', _p.set(q.x, 2.4, q.z), '#ffd0a0', 22, 0.6); } }
    if (!o.told && dz > -30 && G.state === 'play') { o.told = true; mitthu(pick(['Wait for it… NOW!', 'Tick… tock… RUN!', 'Squawk! Time it right!']), 'calm'); }
    return;
  }
  if (o.t === 'rival') {
    for (const q of o.list) { if (q.joined) continue; if (o.state === 'won' || o.state === 'lost') q.x = damp(q.x, (Math.sign(q.x) || 1) * (PATH_W / 2 + 1.5), 2.5, dt); q.clip = o.state === 'won' ? 'hit' : o.state === 'lost' ? 'victory' : G.tug && G.tug.o === o ? 'throw' : 'idle'; q.t = G.t + q.ph; q.ry = 0; q.expr = o.state === 'won' ? EXPR.scared : EXPR.angry; if (q.flyT) { q.flyT += dt; q.y = Math.max(0, Math.sin(q.flyT * 3) * 1.2); } pushCrew(q, undefined, true); }
    if (!o.state && G.state === 'play' && dz > -7) { o.state = 'tug'; G.tug = { o, v: 0.5, t: 0, taps: 0 }; o.rope.visible = true; banner('🪢 TUG OF WAR!', 'TAP TAP TAP as fast as you can!', 1.4); mitthu(pick(['Kala Daku?! Pull, PULL!', 'Squawk! Tap fast, Captain!', 'Show them our muscles!']), 'angry'); setCrewExpr('angry', 9); sfx('capCharge'); $('tug').classList.remove('hidden'); }
    if (o.state === 'tug') {
      const T = G.tug; T.t += dt; const mine = Math.min(1.6, (G.crew.length + 1) / Math.max(4, o.n)) * 0.07; T.v -= o.pull * dt * (1.1 - mine * 4); T.v = clamp(T.v, 0, 1);
      { const a = G.z - 0.5 - o.z, b = -1.5; o.rope.position.set(0, 1.1, (a + b) / 2); o.rope.scale.y = Math.max(0.5, Math.abs(a - b)); } o.rope.position.x = Math.sin(G.t * 20) * 0.05;
      $('tugFill').style.width = (T.v * 100) + '%'; G.shake = Math.max(G.shake, 0.04);
      if (T.v >= 1 || T.v <= 0 || T.t > 9) endTug(o, T.v >= 0.5);
    }
    return;
  }
  if (o.t === 'skull') {
    if (!o.done) { o.sk.rotation.y += dt * 3; o.sk.position.y = 1.3 + Math.sin(G.t * 3) * 0.2; if (Math.random() < dt * 4) puff(_p.set(o.x + rnd(-0.4, 0.4), 1.4, o.z), 1, 0xffe066, { star: true, add: true, size: 0.25, speed: 1, life: 0.6 });
      if (G.state === 'play' && dz > -0.6 && dz < 1.5) { const hit = Math.abs(G.x - o.x) < 1.3 || G.crew.some(q => Math.abs(q.x - o.x) < 0.9 && Math.abs(q.z - o.z) < 1.2); if (hit) { o.done = true; o.sk.visible = false; G.skulls++; updateSkulls(); sfx('kaching'); sfx('gateGood', 0.1); popText('💀 GOLDEN SKULL ' + G.skulls + '/3', _p.set(o.x, 2.8, o.z), '#ffe066', 28, 1.1); puff(_p.set(o.x, 1.3, o.z), 16, 0xffe066, { star: true, add: true, speed: 5 }); setCrewExpr('laugh', 1.2); if (G.skulls === 3) mitthu('ALL THREE SKULLS! Shiny shiny!', 'laugh'); } else if (dz > 1.4) { o.done = true; } } }
    return;
  }
  if (o.t === 'gate') {
    if (!o.done && G.state === 'play' && dz > 0) {   // the army's front is through the gate
      o.done = true; const side = G.x >= 0 ? 1 : 0, op = o.ops[side], pl = o['p' + side]; const before = G.crew.length + 1; let after = before;
      if (op[0] === '+') after = before + op[1]; else if (op[0] === 'x') after = before * op[1]; else if (op[0] === '-') after = before - op[1]; else after = Math.ceil(before / op[1]);
      after = Math.min(240, Math.max(after, Math.ceil(before / 2)));   // a red gate never takes more than half the army
      const diff = after - before;
      const val = q => q[0] === '+' ? before + q[1] : q[0] === 'x' ? before * q[1] : q[0] === '-' ? before - q[1] : before / q[1];
      if (val(op) >= val(o.ops[1 - side])) { G.combo++; if (G.combo >= 2) { const b = G.combo * 5; G.apples += b; $('appleN').textContent = G.apples; popText('🔥 PERFECT x' + G.combo + '  +' + b + ' 🪙', _p.set(G.x, 5.2, G.z), '#ffb03a', 26, 1.2); sfx('coins', 0.1); } } else G.combo = 0;
      if (diff > 0) { setCrewExpr('laugh', 1.1); if (Math.random() < 0.3) mitthu(pick(['Squawk! More pirates, more masti!', 'Yo ho ho! Bigger army!', 'Lalchi is shaking in his socks!', 'Wah Captain, wah!']), 'laugh'); } else if (diff < 0) { setCrewExpr('sad', 1.2); if (Math.random() < 0.5) mitthu(pick(['Arre! Wrong gate!', 'Squawk! Red gate = BAD gate!', 'Oops… where did they go?']), 'sad'); }
      if (diff > 0) { addPower(0.16); for (const m of [50, 100, 150, 200]) if (before < m && before + diff >= m) setTimeout(() => { banner(m >= 150 ? '🔥 UNSTOPPABLE!' : m >= 100 ? '💪 MEGA ARMY!' : '⭐ AWESOME!', m + ' PIRATES!', 1.1); sfx('hooray'); }, 250); for (let i = 0; i < diff; i++) addPirate({ x: G.x + rnd(-2, 2), z: o.z - rnd(0, 1) }); sfx('gateGood'); sfx('crewCheer', 0.1); popText('+' + diff + ' PIRATES', _p.set(G.x, 3, G.z), '#bff4ff', 34); if (diff >= 10) popText(pick(['SHABAASH!', 'WAH! SUPERB!', 'BIGGER ARMY!']), _p.set(G.x, 4.2, G.z), '#ffe066', 26, 1.2); vib(25); puff(_p.set(G.x, 1.5, G.z), 14, 0xffffff, { star: true, cols: [0x8ad8ff, 0xffffff, 0xffe066], speed: 4, size: 0.4 }); }
      else if (diff < 0) { for (let i = 0; i < -diff && G.crew.length; i++) { const q = G.crew.pop(); puff(_p.set(q.x, 0.8, q.z), 2, 0xffffff); } G.lost -= diff; sfx('gateBad'); popText(diff + ' PIRATES', _p.set(G.x, 3, G.z), '#ff8a8a', 34); vib(60); if (!G.crew.length) setTimeout(() => fail('Oops — that gate sank the whole army!'), 500); }
      reslot(); pl.userData.pop = 0.001;
    }
    for (const k of ['p0', 'p1']) { const pl = o[k]; if (pl.userData.pop) { pl.userData.pop += dt; pl.scale.setScalar(1 + pl.userData.pop * 3); pl.material.opacity = Math.max(0, 1 - pl.userData.pop * 3); } }
  } else if (o.t === 'strays') {
    if (dz > -110 && dz < 20) for (const q of o.list) if (q.st === 'idle') { q.t = (q.t || 0) + dt; pushCrew(q, { clip: 'victory', ry: PI }, dz < -30); }
    if (!o.done && G.state === 'play' && Math.abs(dz) < 1.5 + herdDepth() * 0.5 && Math.abs(o.x - G.x) < herdHalf() + 2) {
      o.done = true; o.list.forEach(q => { q.st = 'run'; G.crew.push(q); }); reslot(); addPower(0.12); sfx('ahoy'); sfx('crewCheer', 0.1);
      popText(o.list[0].name + ' & ' + (o.n - 1) + ' friends joined!', _p.set(o.x, 3.2, o.z), '#c8ffb0', 24, 1.4); puff(_p.set(o.x, 1, o.z), 10, 0xffffff, { star: true, cols: [0xffd23f, 0xffffff] });
    }
  } else if (o.t === 'apples') {
    for (const a of o.list) { if (!a.visible) continue; a.rotation.z += dt * 4; a.position.y = 0.7 + Math.sin(G.t * 4 + a.position.z) * 0.12; const ax = a.position.x, az = o.z + a.position.z; if (G.state === 'play' && Math.abs(az - G.z - herdDepth() * 0.3) < herdDepth() * 0.5 + 0.6 + (hasHero('masti') ? 1.5 : 0) && Math.abs(ax - G.x) < herdHalf() + (hasHero('masti') ? 3 : 0.4)) { a.visible = false; G.apples += Math.round(1 + PF.up.apples * 0.2); $('appleN').textContent = G.apples; addPower(0.012); sfxT('coin', 0.04); puff(_p.set(ax, 1, az), 2, 0xffe066, { star: true, size: 0.4 }); } }
  } else if (o.t === 'hay') {
    o.bales.forEach((b, i) => {
      const x = Math.sin(G.t * o.sp * 0.3 + o.ph + i * 2) * (PATH_W / 2 - 1.1); const vx = Math.cos(G.t * o.sp * 0.3 + o.ph + i * 2);
      b.position.x = x; b.rotation.z -= vx * dt * o.sp * 0.3 * (PATH_W / 2) / 1.1;
      if (G.state === 'play') for (const q of [...G.crew]) if (near(q, x, o.z + b.position.z, 1.3, 1.2)) { losePirate(q, 'hit', Math.sign(vx) || 1); puff(_p.set(q.x, 1, q.z), 3, 0xffe8a0); sfxT('bonk', 0.1); }
    });
  } else if (o.t === 'spinner') {
    o.bar.rotation.y += dt * o.sp; const a = o.bar.rotation.y, c = Math.cos(a), s = Math.sin(a);
    if (G.state === 'play' && Math.abs(dz) < 6) for (const q of [...G.crew]) { const lx = q.x - o.x, lz = q.z - o.z, along = lx * c - lz * s, perp = lx * s + lz * c; if (Math.abs(along) < 4.5 && Math.abs(perp) < 0.6) { losePirate(q, 'hit', Math.sign(along) || 1); sfxT('bonk', 0.1); } }
  } else if (o.t === 'log') {
    o.piv.rotation.z = Math.sin(G.t * o.sp) * 1.0; const lx = Math.sin(o.piv.rotation.z) * 4.1, ly = 6 - Math.cos(o.piv.rotation.z) * 4.1;
    if (G.state === 'play' && ly < 2.2) for (const q of [...G.crew]) if (near(q, lx, o.z, 1.5, 1.4)) { losePirate(q, 'hit', Math.sign(Math.cos(G.t * o.sp)) || 1); sfxT('bonk', 0.1); }
  } else if (o.t === 'bridge') {
    if (G.state === 'play' && dz > -o.len - 1 && dz < herdDepth() + 1) for (const q of [...G.crew]) if (q.z < o.z && q.z > o.z - o.len && Math.abs(q.x) > o.w / 2) { losePirate(q, 'fall', Math.sign(q.x)); q.vy = 1; sfxT('splash', 0.12); puff(_p.set(q.x, 0.3, q.z), 4, 0x9ad8ff); }
  } else if (o.t === 'boost') {
    o.pad.material.opacity = 0.6 + Math.sin(G.t * 12) * 0.35;
    if (!o.done && G.state === 'play' && dz > 0) { o.done = true; G.boost = 1.6; sfx('whoosh'); sfx('gateGood'); banner('⚡ SPEED BOOST!', '', 0.7); vib(30); G.shake = 0.15; }
  } else if (o.t === 'powder') {
    if (o.b.visible) { o.b.rotation.y += dt * 1.5; o.b.position.y = 0.75 + Math.sin(G.t * 3) * 0.12; o.glow.material.opacity = 0.5 + Math.sin(G.t * 8) * 0.3; }
    if (!o.done && G.state === 'play' && Math.abs(o.z - G.z - herdDepth() * 0.3) < herdDepth() * 0.5 + 0.8 && Math.abs(o.x - G.x) < herdHalf() + 0.7) {
      o.done = true; o.b.visible = false; G.bombPow = Math.min(4, G.bombPow + 1); boom(_p.set(o.x, 1, o.z), 1.2); G.shake = 0.2;
      banner('💣 BIGGER BOMBS!', 'Bomb power x' + G.bombPow + ' at the fort', 1.3); sfx('gateGood'); vib(40);
    }
  } else if (o.t === 'cannons') {
    const c = o.c; c.userData.kick = Math.max(0, (c.userData.kick || 0) - dt); c.userData.brl.position.z = c.userData.kick * 0.9;
    for (const r of o.rings) { r.material.opacity = 0.45 + Math.sin(G.t * 22) * 0.35; r.scale.setScalar(1 + Math.sin(G.t * 11) * 0.06); }
    if (G.state === 'play' && dz > -40 && dz < 6 && o.fired < o.shots) {
      o.cd -= dt;
      if (o.cd <= 0) {
        o.cd = 0.85; o.fired++;
        if (o.fired === 1) popText('INCOMING!', _p.set(c.position.x, 3.5, o.z), '#ff8a8a', 26, 1);
        const tx = clamp(G.x + rnd(-herdHalf(), herdHalf()), -PATH_W / 2 + 1, PATH_W / 2 - 1), tz = G.z - G.speed * 1.05 + rnd(0, herdDepth() * 0.6);
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 28), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.set(tx, 0.1, tz); ring.frustumCulled = false; scene.add(ring); o.rings.push(ring);
        const muzzle = new THREE.Vector3(c.position.x - o.side * 2.2, 1.6, o.z);
        c.userData.kick = 0.35; puff(muzzle, 8, 0xdddddd, { size: 1.3, speed: 3, life: 0.8, grav: -0.6 }); puff(muzzle, 3, 0xffa83a, { size: 1, add: true, life: 0.2, speed: 4 }); sfx('cannon'); G.shake = Math.max(G.shake, 0.18);
        throwBomb([muzzle.x, muzzle.y, muzzle.z], [tx, 0.3, tz], 1.0, 5, () => {
          scene.remove(ring); o.rings.splice(o.rings.indexOf(ring), 1); boom(_p.set(tx, 0.5, tz), 1.5);
          let n = 0; for (const q of [...G.crew]) if (Math.hypot(q.x - tx, q.z - tz) < 1.3) { losePirate(q, 'hit', Math.sign(q.x - tx) || 1); n++; }
          if (n) popText('BOOM! -' + n, _p.set(tx, 3, tz), '#ff8a8a', 28, 0.9); else popText(pick(['MISSED!', 'HA! MISSED!', 'TOO SLOW!']), _p.set(tx, 3, tz), '#c8ffb0', 24, 0.8);
        }, 1.6);
      }
    }
  } else if (o.t === 'ramp') {
    for (const a of o.coins) { if (!a.visible) continue; a.rotation.z += dt * 4; const az = o.z + a.position.z; if (G.state === 'play' && Math.abs(az - G.z - 1) < 1.5) { a.visible = false; G.apples += 2; $('appleN').textContent = G.apples; sfxT('coin', 0.04); puff(_p.set(0, a.position.y, az), 3, 0xffe066, { star: true, size: 0.5 }); } }
    if (G.state === 'play' && !o.said && dz > -2) { o.said = true; sfx('whoa'); sfx('crewCheer', 0.3); banner('WHOOOSH!', '', 0.9); }
  } else if (o.t === 'kraken') {
    const P2 = 3.6, tt = (G.t + o.ph) % P2, s = o.side; let ang, curl = 1, sh = 0;
    if (tt < 1.7) ang = s * 0.2 + Math.sin(G.t * 2.2) * 0.12;
    else if (tt < 2.45) { const k = (tt - 1.7) / 0.75; ang = s * 0.2 - s * 0.6 * k; sh = k * 0.55; curl = 1 + k * 0.6; }
    else if (tt < 2.7) { const k = (tt - 2.45) / 0.25; ang = -s * 0.4 + s * 1.95 * k * k; sh = 0.55; curl = 1 - k; }
    else if (tt < 3.15) { ang = s * 1.55; curl = 0; sh = 0.4; }
    else { const k = (tt - 3.15) / 0.45; ang = s * 1.55 - (s * 1.55 - s * 0.2) * k; curl = k; sh = 0.4 * (1 - k); }
    o.piv.rotation.z = ang; o.segs.forEach((g2, i) => { g2.rotation.z = s * curl * (0.13 + Math.sin(G.t * 3 + i * 0.7) * 0.06); });
    o.shadow.material.opacity = Math.abs(dz) < 60 ? sh : 0;
    const down = tt >= 2.7 && tt < 3.15;
    if (down && !o.hitOn) { o.hitOn = true; if (Math.abs(dz) < 30) { G.shake = Math.max(G.shake, 0.5); sfx('bigBoom'); for (let i = 0; i < 6; i++) puff(_p.set(o.bx - s * (i + 1) * o.reach / 7, 0.4, o.z), 3, 0xd8c8a8, { size: 1.4, speed: 3, life: 0.8 }); if (dz > -20 && Math.random() < 0.6) popText(pick(['SPLAT!', 'WHAM!', 'OCTO-SLAM!']), _p.set(0, 3.5, o.z), '#e8a8ff', 28, 0.8); } }
    if (!down) o.hitOn = false;
    if (down && G.state === 'play') { const edge = o.bx - s * o.reach; for (const q of [...G.crew]) if (Math.abs(q.z - o.z) < 1.0 && (s > 0 ? q.x > edge : q.x < edge)) { losePirate(q, 'hit', -s); sfxT('bonk', 0.08); } }
    if (!o.said && G.state === 'play' && dz > -30) { o.said = true; popText('🐙 KRAKEN!', _p.set(o.bx, 4, o.z), '#e8a8ff', 30, 1.2); sfx('whoa'); }
  } else if (o.t === 'ship') {
    waterTex.offset.set(G.t * 0.02, G.t * 0.06);
    if (G.state === 'play' && !o.on && !o.over && G.z <= o.z - 1) boardShip(o);
    if (o.on && G.z <= o.z - o.len + 5) leaveShip(o);
    const S = o.ship, bob = Math.sin(G.t * 1.6) * 0.12;
    if (o.on) {
      const sz = Math.max(1, (herdDepth() + 3) / 12), sx = Math.max(1, (herdHalf() * 2 + 0.4) / 4.5); S.userData.body.scale.set(sx, 1, sz);
      S.userData.cannons.forEach(c => { c.position.z = -4.2 * sz; c.position.x = Math.sign(c.position.x) * 1.4 * sx; });
      S.position.x = damp(S.position.x, G.x, 10, dt); S.position.z = damp(S.position.z, G.z + 6 * sz - 1.6 - o.z, 10, dt); S.position.y = bob;
      S.rotation.z = (G.tx - G.x) * -0.04 + Math.sin(G.t * 1.1) * 0.03; S.rotation.x = Math.sin(G.t * 1.3) * 0.015; o.deckY = 1.45 + bob;
    } else S.position.y = bob;
    for (const c of S.userData.cannons) { c.userData.kick = Math.max(0, (c.userData.kick || 0) - dt); c.userData.brl.position.z = c.userData.kick * 0.9; }
    for (const b of o.boats) {
      const d2 = b.z - G.z; b.m.visible = b.st !== 'gone';
      if (b.alive) {
        if (d2 < 0 && d2 > -60) b.x = damp(b.x, b.side * 4.8, 0.5, dt);
        b.m.position.set(b.x, Math.sin(G.t * 1.8 + b.z) * 0.15, b.z - o.z); b.m.rotation.z = Math.sin(G.t * 1.4 + b.z) * 0.05;
        if (o.on && d2 < -7 && d2 > -36) { b.cd -= dt; if (b.cd <= 0) { b.cd = 1.8 - lv.d * 0.6; boatShot(o, b); } }
        if (o.obj.visible && d2 < 25 && d2 > -110) for (const s2 of [-0.55, 0.55]) (d2 > -30 ? lists.g : lists.gl).push(person({ x: b.x + s2, y: 0.95 + b.m.position.y, z: b.z - 0.4, tint: GUARD_COATS[0], skin: SKINS[2], hair: 0xffffff, clip: d2 > -36 && d2 < -5 ? 'shoot' : 'idle', t: (G.t + s2 + 1) % 0.5 }, { ry: PI }));
      } else if (b.st === 'sink') { b.t += dt; b.m.position.y -= dt * 1.4; b.m.rotation.x += dt * 0.5 * b.side; if (b.t > 2.2) b.st = 'gone'; }
    }
  } else if (o.t === 'jump' || o.t === 'slide') {
    if (o.bar) o.bar.rotation.x += dt * 5;
    o.sign.position.y = (o.t === 'jump' ? 2.9 : 3.2) + Math.sin(G.t * 5) * 0.15;
    if (G.state === 'play') {
      // the first time ever: slow motion and a big hint until the player swipes
      if (!o.taught && !(PF.taught || {})[o.t] && dz > -15 && dz < -2) { o.taught = true; G.teach = o; G.slow = 0.22; $('hint').innerHTML = `<span class="hand ${o.t === 'jump' ? 'up' : 'down'}">👆</span><br>SWIPE ${o.t === 'jump' ? 'UP TO JUMP' : 'DOWN TO SLIDE'}!`; $('hint').classList.remove('hidden'); }
      const safe = q => o.t === 'jump' ? inAir(q) : sliding(q);
      for (const q of [...G.crew]) if (q.pz !== undefined && q.pz > o.z && q.z <= o.z && !safe(q)) { losePirate(q, 'hit', q.x >= 0 ? 1 : -1); sfxT('bonk', 0.08); puff(_p.set(q.x, 1, o.z), 2, 0xffe8a0); }
      if (!o.rocky && G.z <= o.z) {
        o.rocky = true; const ok = o.t === 'jump' ? G.ract && G.ract.type === 'jump' && rocky.position.y > 0.5 : G.ract && G.ract.type === 'slide' && G.ract.t < SLIDE_T - 0.06;
        if (ok) { popText(pick(o.t === 'jump' ? ['NICE JUMP!', 'WHOOSH!', 'SUPER JUMP!'] : ['COOL SLIDE!', 'SWOOSH!', 'SMOOTH!']), _p.set(G.x, 4, G.z), '#bff4ff', 28, 0.9); addPower(0.05); if (!(PF.taught || {})[o.t]) { PF.taught = { ...(PF.taught || {}), [o.t]: true }; save(); } }
        else { popText('OUCH!', _p.set(G.x, 4, G.z), '#ff8a8a', 28, 0.8); sfx('oof'); rocky.play('hit', true); }
      }
    }
    if (G.teach === o && dz > 0.5) endTeach();
  } else if (o.t === 'wolves') {
    const fighting = G.guardFight && G.guardFight.o === o;
    for (const w of o.list) {
      if (w.gone) continue;
      w.t += dt;
      if (w.st === 'fly') { w.dt += dt; w.vy -= 18 * dt; w.x += w.vx * dt; w.z += w.vz * dt; w.y = Math.max(0, w.y + w.vy * dt); w.rx = (w.rx || 0) + w.spin * dt; w.rz = (w.rz || 0) + w.spin * 0.6 * dt; w.clip = 'hit'; w.t = Math.min(w.dt, 0.4); w.s = Math.max(0.01, 1 - Math.max(0, w.dt - 1.2) * 2); if (w.dt > 1.8) w.gone = true; }
      else { w.clip = fighting || dz > -20 ? 'shoot' : 'idle'; if (w.clip === 'shoot') w.t = (w.t % 0.5); }
      if (dz > -110 && dz < 20) (dz > -28 ? lists.g : lists.gl).push(person(w, { ry: PI }));   // far guards in the lighter version
    }
    if (!o.said && G.state === 'play' && dz > -24) { o.said = true; sfx('halt'); popText('HALT! LORD LALCHI\'S GUARDS!', _p.set(o.x, 3.2, o.z), '#ffb0a8', 22, 1.2); }
    if (!o.done && G.state === 'play' && dz > -(1.2 + 7)) { o.done = true; G.guardFight = { o, t: 0 }; sfx('charge'); }
    if (fighting) {   // a shoot-out: every pirate shot drops a guard, every guard shot knocks a pirate away
      const F = G.guardFight; F.t += dt;
      // big squads fall in bigger volleys (same 1:1 losses), so a shoot-out never stalls the run for long
      if (F.t > 0.15) for (let vol = Math.max(1, Math.ceil(o.list.filter(q => !q.gone && q.st === 'idle').length / 8)), v = 0; v < vol; v++) {
        F.t = 0; const w = o.list.find(q => !q.gone && q.st === 'idle');
        if (!w) { if (v > 0 || o.list.some(q => q.st === 'targeted')) return; G.guardFight = null; addPower(0.15); banner('GUARDS DEFEATED!', '', 0.9); sfx('crewCheer'); popText(pick(['SHABAASH!', 'EASY!', 'NEXT!']), _p.set(G.x, 3.6, G.z), '#ffe066', 26); return; }
        if (!G.crew.length) { G.guardFight = null; fail('Lalchi\'s guards won the shoot-out!'); return; }
        const q = pick(G.crew.slice(0, Math.min(G.crew.length, 14)));
        q.thr = 0.75; w.st = 'targeted';
        throwBomb([q.x + 0.25, 1.7, q.z - 0.3], [w.x, 0.4, w.z], 0.42, 2.4, () => { boom(_p.set(w.x, 0.6, w.z), 0.9); w.st = 'fly'; w.dt = 0; w.vx = (w.x - G.x >= 0 ? 1 : -1) * rnd(2, 5); w.vy = rnd(8, 11); w.vz = rnd(-3, 1); w.spin = rnd(6, 10) * (Math.random() < 0.5 ? -1 : 1); if (Math.random() < 0.25) popText(pick(['BOOM!', 'BYE BYE!', 'KABOOM!']), _p.set(w.x, 3, w.z), '#ffb03a', 26, 0.7); });
        const sh = G.crew[G.crew.length - 1] && pick(G.crew);
        shoot([w.x - 0.2, 1.2, w.z + 0.8], [sh.x, 1.1, sh.z], 0.1, () => { if (G.crew.includes(sh)) { losePirate(sh, 'shot', Math.sign(sh.x - w.x) || 1); sfxT('ouch', 0.15); } });
        flashAt(_p.set(w.x - 0.2, 1.2, w.z + 0.9), 0.9); sfxT('musket', 0.07); G.shake = Math.max(G.shake, 0.08);
      }
    }
  }
}

// ---------------- the new dangers' helpers, Mitthu the parrot, golden skulls, tug of war ----------------
function parrotModel(c) {
  const b = new THREE.Group(), m = flat(c), wc = c === 0xe8302a ? 0x2a8ad8 : 0xffd21a; const bd = mesh(new THREE.SphereGeometry(0.32, 10, 8), m, 0, 0, 0, b); bd.scale.set(0.8, 0.9, 1.4); mesh(new THREE.SphereGeometry(0.24, 10, 8), m, 0, 0.25, -0.38, b); mesh(new THREE.ConeGeometry(0.09, 0.22, 6), flat(0xffd21a), 0, 0.2, -0.62, b).rotation.x = -PI / 2; for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.05, 6, 4), flat(0x111111), s * 0.13, 0.3, -0.52, b); const t = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.6), flat(0x2a6ad8), 0, -0.05, 0.6, b); t.rotation.x = -0.4;
  const wl = new THREE.Group(), wr = new THREE.Group(); mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), flat(wc), -0.35, 0, 0, wl); mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), flat(wc), 0.35, 0, 0, wr); wl.position.set(-0.2, 0.1, 0); wr.position.set(0.2, 0.1, 0); b.add(wl, wr); b.userData.wl = wl; b.userData.wr = wr; b.traverse(q => { q.frustumCulled = false; }); return b;
}
let mitT = 0;
const MIT_FACE = { happy: '🦜', laugh: '🤣', scared: '😱', angry: '😤', calm: '🦜', sad: '😢' };
function mitthu(text, mood = 'happy', who) { const b = $('mitthu'); $('mitText').textContent = text; $('mitFace').textContent = who ? '🤴' : MIT_FACE[mood] || '🦜'; $('mitWho').textContent = who || 'MITTHU'; b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); mitT = 2.8; sfxT('squawk', 0.8); }
function updateSkulls() { $('skullN').innerHTML = [0, 1, 2].map(i => `<i class="${i < G.skulls ? 'on' : ''}">💀</i>`).join(''); }
function tugTap() { const T = G.tug; if (!T) return; T.v = Math.min(1, T.v + 0.05 + (hasHero('bunty') ? 0.01 : 0)); T.taps++; sfxT('pop', 0.04); vib(10); G.shake = Math.max(G.shake, 0.08); if (T.taps % 6 === 0) popText(pick(['HEAVE!', 'HO!', 'PULL!', 'JOR LAGAO!']), _p.set(rnd(-2, 2), 3, G.z - 2), '#ffe066', 24, 0.6); }
function endTug(o, won) {
  G.tug = null; $('tug').classList.add('hidden'); o.rope.visible = false; o.state = won ? 'won' : 'lost'; setCrewExpr(won ? 'laugh' : 'sad', 2);
  if (won) { const n = Math.ceil(o.list.length * 0.6); o.list.slice(0, n).forEach(q => { q.joined = true; addPirate({ x: q.x, z: q.z, tint: q.tint, kind: q.kind }); }); o.list.slice(n).forEach(q => { q.flyT = 0.01; }); reslot(); sfx('crewCheer'); sfx('hooray', 0.2); banner('💪 YOU WON!', '+' + n + ' rivals join your army!', 1.6); mitthu(pick(['Hahaha! They want to join US now!', 'Kala Daku fell on his bottom!', 'Squawk! Too strong!']), 'laugh'); addPower(0.25); }
  else { const n = Math.ceil(G.crew.length * 0.2); for (let i = 0; i < n; i++) { const q = pick(G.crew); if (q) losePirate(q, 'hit', pick([-1, 1])); } sfx('adNooo'); banner('😵 THEY PULLED HARDER!', 'Tap faster next time!', 1.6); mitthu(pick(['Arre! They pulled our pants down!', 'Squawk! We need more laddoos!', 'Next time, TAP faster!']), 'sad'); }
}
// ---------------- Rocky's super move: CANNON STORM (the meter fills from gates, coins, rescues and good moves) ----------------
function addPower(v) { if (G.storm > 0) return; G.power = Math.min(1, G.power + v * (hasHero('kaka') ? 1.5 : 1)); }
const HAZ = { wolves: 1, hay: 1, cannons: 1, kraken: 1, spinner: 1, log: 1, jump: 1, slide: 1 };
function skyBomb(x, y, z, T, hit) { throwBomb([x + rnd(-6, 6), 26, z + 10], [x, y, z], T + 0.45, 2, () => { boom(_p.set(x, y + 0.4, z), 2.1); if (hit) hit(); }, 2.1); }
function cannonStorm() {
  const F = G.finale;
  if (G.power < 1 || G.storm > 0 || !(G.state === 'play' || (G.state === 'finale' && F && !F.done && !F.win))) return;
  G.power = 0; G.storm = 3.6; flash('#ffd060'); G.shake = 0.7; vib(120); sfx('capCharge'); sfx('cannon'); sfx('crewCheer', 0.25); sfx('bigBoom', 0.4);
  banner('💥 CANNON STORM!', G.state === 'finale' ? 'Rain fire on Lalchi!' : 'Nothing can stop the army!', 1.4);
  rocky.play('throw', true);
  if (G.state === 'finale') { stormFort(); return; }
  if (G.ship) { let i = 0; for (const b of G.ship.boats) if (b.alive && b.z - G.z < 2 && b.z - G.z > -80) skyBomb(b.x, 1, b.z, 0.2 + i++ * 0.2, () => sinkBoat(G.ship, b)); return; }
  let i = 0; for (const o of objs) if (HAZ[o.t] && !o.broken && o.z < G.z + 2 && o.z > G.z - 90) { const x = o.t === 'cannons' ? o.c.position.x : o.t === 'kraken' ? o.bx : o.x || 0; skyBomb(x, 0.6, o.z, 0.3 + i++ * 0.16, () => breakHazard(o)); }
}
function breakHazard(o) {
  if (o.broken) return; o.broken = true; G.shake = Math.max(G.shake, 0.5);
  if (o.t === 'wolves') { o.done = true; if (G.guardFight && G.guardFight.o === o) G.guardFight = null; o.list.forEach(w => { if (!w.gone && w.st !== 'fly') { w.st = 'fly'; w.dt = 0; w.vx = rnd(-6, 6); w.vy = rnd(9, 13); w.vz = rnd(-5, 1); w.spin = rnd(6, 10); } }); }
  popText(pick(['KABOOM!', 'SMASHED!', 'BOOM!']), _p.set(o.x || 0, 3.5, o.z), '#ffb03a', 30, 0.9);
}
function stormFort() {
  const F = G.finale;
  if (F.boss) { const B = F.boss, dmg = B.max * 0.22; for (let i = 0; i < 10; i++) skyBomb(B.x + rnd(-2, 2), rnd(1.5, 4), B.z + rnd(-1, 1), 0.3 + i * 0.12, () => hurtBoss(dmg / 10)); return; }
  F.guards.forEach((w, i) => { if (!w.gone && w.st !== 'fly') skyBomb(w.x, 0.5, w.z, 0.3 + i * 0.03, () => { w.st = 'fly'; w.dt = 0; w.vx = rnd(-5, 5); w.vy = rnd(8, 12); w.vz = rnd(-5, -1); w.spin = rnd(6, 10); }); });
  const dmg = Math.max(4, Math.round(castle.max * 0.25));
  for (let i = 0; i < 10; i++) { const x = rnd(-7, 7), y = rnd(1.5, 7); skyBomb(x, y, castle.z + 0.8, 0.5 + i * 0.12, () => { if (F.done) return; castle.hp -= dmg / 10; castle.blast(x, y, 2); updateHP(); if (castle.hp <= 0) castleDown(); }); }
}
let powShown = -1;
function updatePowerUI() {
  const b = $('stormB'), on = (G.state === 'play' || (G.state === 'finale' && G.finale && !G.finale.done)), v = Math.round(G.power * 100);
  b.classList.toggle('hidden', !on); if (!on || v === powShown) return; powShown = v;
  b.style.setProperty('--p', v); b.classList.toggle('ready', v >= 100);
  if (v >= 100) { sfx('bell'); popText('💥 CANNON STORM READY!', _p.set(G.x, 4.6, G.z), '#ffd23f', 24, 1.2); }
}

// ---------------- swipe moves: jump and slide (each pirate copies Rocky at the spot where Rocky did it) ----------------
const JUMP_T = 0.68, JUMP_H = 1.8, SLIDE_T = 0.8;
function endTeach() { G.teach = null; G.slow = 1; $('hint').classList.add('hidden'); }
function doMove(type) {
  if (G.state === 'finale' && G.finale && G.finale.boss) { if (type === 'jump') bossJump(); return; }
  if (G.state !== 'play' || G.ship || G.air) return;
  if (G.ract && G.ract.t < G.ract.T * 0.8) return;
  G.ract = { type, t: 0, T: type === 'jump' ? JUMP_T : SLIDE_T }; G.acts.push({ type, z: G.z });
  sfx(type === 'jump' ? 'boing' : 'whoosh'); if (Math.random() < 0.3) sfxT('arr', 1);
  if (G.teach) endTeach();
}
// the pose of someone in the middle of a move; false when the move is over
function movePose(o, act, dt) {
  act.t += dt; const k = act.t / act.T;
  if (k >= 1) return false;
  if (act.type === 'jump') { o.y = 4 * (act.H || JUMP_H) * k * (1 - k); o.rx = 0; } else { o.y = 0; o.rx = 1.25 * Math.min(1, k / 0.12, (1 - k) / 0.12); }
  return true;
}
const inAir = q => q.act && q.act.type === 'jump' && q.y > 0.5;
const sliding = q => q.act && q.act.type === 'slide' && q.act.t > 0.04 && q.act.t < q.act.T - 0.06;

// ---------------- the finale: bomb Lord Lalchi's castle ----------------
// Simple rules: the castle has a strength number (shown over its gate). First Lalchi's guards in front of the gate are
// bombed, one for one. Then the army charges the gate: every pirate who gets there throws one bomb = 1 less strength.
// Strength 0 → the castle comes down and the gold is ours. Run out of pirates first → the castle holds.
const FIRE_LINE = 15;
let rockyCannon = null, boat = null, flag = null, chest = null;
const jollyTex = canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 38, 20, 0, 7); c.fill(); c.fillRect(w / 2 - 12, 50, 24, 12); c.fillStyle = '#111'; c.beginPath(); c.arc(w / 2 - 8, 36, 6, 0, 7); c.arc(w / 2 + 8, 36, 6, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2 - 34, 66); c.lineTo(w / 2 + 34, 90); c.moveTo(w / 2 + 34, 66); c.lineTo(w / 2 - 34, 90); c.stroke(); });
function makeCannon() {
  const o = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.35 });
  const brl = new THREE.Group(); brl.position.set(0, 0.75, 0); o.add(brl);
  mesh(new THREE.CylinderGeometry(0.28, 0.4, 2.0, 14), m, 0, 0, -0.5, brl).rotation.x = PI / 2;
  mesh(new THREE.TorusGeometry(0.31, 0.07, 6, 14), m, 0, 0, -1.45, brl);
  mesh(new THREE.SphereGeometry(0.36, 12, 8), m, 0, 0, 0.45, brl);
  mesh(new THREE.BoxGeometry(0.9, 0.35, 1.5), flat(0x7a4a20), 0, 0.4, 0, o);
  for (const s of [-1, 1]) for (const z of [-0.5, 0.5]) mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), flat(0x5a3418), s * 0.52, 0.32, z, o).rotation.z = PI / 2;
  brl.rotation.x = 0.18; o.userData.brl = brl; o.traverse(q => { q.frustumCulled = false; });
  return o;
}
// Rocky's ship (it grows to fit the army) and Lalchi's red-sailed gunboats
const waterTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,50,90,.16)'; c.lineWidth = 5; for (let y = 0; y < h; y += 22) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / w * PI * 4) * 5); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 6, 2); });
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(4, 18); waterTex.anisotropy = 4;
function taper(geo, z0, k) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) * Math.sign(z0) >= Math.abs(z0) - 0.01) p.setX(i, p.getX(i) * k); geo.computeVertexNormals(); return geo; }
function buildShip() {
  const root = new THREE.Group(), body = new THREE.Group();
  mesh(taper(new THREE.BoxGeometry(5, 1.6, 12, 1, 1, 2), -6, 0.22), flat(0x7a3a18), 0, 0.6, 0, body);
  mesh(taper(new THREE.BoxGeometry(5.12, 0.2, 11.4, 1, 1, 2), -5.7, 0.25), flat(0xf2c14e), 0, 1.12, 0, body);
  mesh(taper(new THREE.BoxGeometry(4.5, 0.12, 11, 1, 1, 2), -5.5, 0.25), flat(0xc08a4a), 0, 1.38, 0, body);
  mesh(new THREE.BoxGeometry(5, 1.0, 2.2), flat(0x6a3014), 0, 1.9, 5, body);
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.14, 0.42, 9), flat(0x5a3418), sx * 2.35, 1.62, 0.2, body);
  for (const [z, h] of [[-2.5, 7], [2.6, 5.5]]) { mesh(new THREE.CylinderGeometry(0.15, 0.2, h, 8), flat(0x5a3418), 0, 1.4 + h / 2, z, body); mesh(new THREE.BoxGeometry(4.6, 0.14, 0.14), flat(0x5a3418), 0, 1.4 + h * 0.82, z, body);
    mesh(new THREE.CylinderGeometry(0.26, 0.26, 4.2, 8), flat(0xf6eedc), 0, 1.4 + h * 0.82 - 0.3, z + 0.12, body).rotation.z = PI / 2; }   // sails furled: the army on deck stays in view
  mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: jollyTex, side: THREE.DoubleSide }), 0.8, 8.8, -2.5, body);
  const hull = oneMesh(body); root.add(hull); root.userData.body = hull;
  root.userData.cannons = [-1, 1].map(sx => { const c = makeCannon(); c.position.set(sx * 1.4, 1.42, -4.2); root.add(c); return c; });
  root.traverse(q => { q.frustumCulled = false; }); return root;
}
function buildBoat() {
  const b = new THREE.Group();
  mesh(taper(new THREE.BoxGeometry(2.4, 0.9, 5, 1, 1, 2), 2.5, 0.25), flat(0x4a2a14), 0, 0.45, 0, b);
  mesh(taper(new THREE.BoxGeometry(2.5, 0.16, 4.6, 1, 1, 2), 2.3, 0.28), flat(0xc8302a), 0, 0.82, 0, b);
  mesh(new THREE.CylinderGeometry(0.09, 0.11, 4, 6), flat(0x3a2a1a), 0, 2.8, -0.6, b);
  const sg = new THREE.PlaneGeometry(2.2, 1.8, 4, 1), sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin((sp.getX(i) / 2.2 + 0.5) * PI) * 0.3); sg.computeVertexNormals(); mesh(sg, flat(0xc8302a), 0, 3.1, -0.5, b).rotation.y = PI;
  mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 8), flat(0x1a1a22), 0, 1.1, 1.9, b).rotation.x = PI / 2;
  const m = oneMesh(b); m.traverse(q => { q.frustumCulled = false; }); return m;
}
function boardShip(o) {
  o.on = true; G.ship = o; G.ract = null; G.crew.forEach(q => { q.act = null; });
  banner('⛵ ALL ABOARD!', 'Tap anywhere to fire the cannons!', 1.6); sfx('ahoy'); sfx('crewCheer', 0.2); sfx('splash', 0.1);
  for (let i = 0; i < 8; i++) puff(_p.set(G.x + rnd(-3, 3), 0.4, G.z + rnd(0, 8)), 2, 0xd8f4ff, { size: 0.8, speed: 3, life: 0.6 });
  if (!(PF.taught || {}).ship) { $('hint').innerHTML = '<span class="hand tap">👆</span><br>TAP TAP TAP TO FIRE!'; $('hint').classList.add('big'); $('hint').classList.remove('hidden'); setTimeout(() => { $('hint').classList.add('hidden'); $('hint').classList.remove('big'); }, 3200); }
}
function leaveShip(o) { o.on = false; o.over = true; G.ship = null; banner('🏝️ LAND HO!', '', 1); sfx('crewCheer'); }
function boatShot(o, b) {
  const tq = pick(G.crew.slice(0, Math.min(G.crew.length, 30))); if (!tq) return;
  const tz = tq.z - G.speed * 0.85, tx = tq.x, dy = (o.deckY || 1.45) + 0.2, mz = b.z + 2.4;
  puff(_p.set(b.x, 1.4, mz), 6, 0xdddddd, { size: 1.1, speed: 2.5, life: 0.7, grav: -0.6 }); flashAt(_p.set(b.x, 1.4, mz), 1.2); sfxT('cannon', 0.2);
  if (!o.warned) { o.warned = true; popText('THEY\'RE FIRING! SINK THEM!', _p.set(G.x, 5, G.z - 4), '#ff8a8a', 24, 1.3); }
  throwBomb([b.x, 1.4, mz], [tx, dy, tz], 0.85, 3.5, () => {
    boom(_p.set(tx, dy + 0.3, tz), 1.1); let n = 0; const max = 1 + Math.round(lv.d * 2);
    for (const q of [...G.crew]) if (n < max && Math.hypot(q.x - tx, q.z - tz) < 1.3) { losePirate(q, 'hit', Math.sign(q.x - tx) || 1); n++; }
    if (n) { popText('-' + n, _p.set(tx, 3.4, tz), '#ff8a8a', 26, 0.7); sfxT('splash', 0.2); }
  }, 1.1);
}
function shipFire() {
  const o = G.ship; if (!o || G.state !== 'play' || G.fireCD > 0) return; G.fireCD = 0.18;
  let T = null; for (const b of o.boats) { const d2 = b.z - G.z; if (b.alive && d2 < -3 && d2 > -50 && (!T || d2 > T.z - G.z)) T = b; }
  sfxT('cannon', 0.05); G.shake = Math.max(G.shake, 0.12); vib(10);
  for (const c of o.ship.userData.cannons) {
    c.userData.kick = 0.3; const m = c.getWorldPosition(new THREE.Vector3()); m.y += 0.8; m.z -= 1.8; puff(m, 4, 0xdddddd, { size: 0.9, speed: 2, life: 0.5, grav: -0.5 }); flashAt(m, 1);
    const tx = T ? T.x + rnd(-0.4, 0.4) : m.x + rnd(-1.5, 1.5), tz = T ? T.z : G.z - 28, ty = T ? 1.2 : 0.2;
    throwBomb([m.x, m.y, m.z], [tx, ty, tz], T ? clamp((G.z - tz) / 45, 0.35, 0.8) : 0.6, 2, () => {
      if (T && T.alive) { boom(_p.set(tx, 1.4, tz), 1.2); T.hp -= 0.5; if (T.hp <= 0) sinkBoat(o, T); else popText(pick(['HIT!', 'BOOM!', 'POW!']), _p.set(tx, 3.4, tz), '#ffb03a', 24, 0.6); }
      else puff(_p.set(tx, 0.3, tz), 8, 0xe8f8ff, { size: 0.9, speed: 4, life: 0.7, grav: 6 });
    });
  }
}
function sinkBoat(o, b) {
  if (!b.alive) return; b.alive = false; b.st = 'sink'; b.t = 0;
  boom(_p.set(b.x, 1.4, b.z), 2.2); puff(_p.set(b.x, 0.4, b.z), 14, 0xe8f8ff, { size: 1.2, speed: 5, life: 0.9, grav: 7 }); sfx('bigSplash', 0.1); G.shake = Math.max(G.shake, 0.4); vib(40);
  const n = 2 + Math.round(lv.d * 2); for (let i = 0; i < n; i++) addPirate({ x: b.x + rnd(-1, 1), z: b.z + rnd(-1, 1) }); reslot();
  G.apples += 5; $('appleN').textContent = G.apples; addPower(0.15); sfx('crewCheer', 0.2); sfx('ahoy', 0.4);
  popText('⛵ +' + n + ' RESCUED!', _p.set(b.x, 3.6, b.z), '#c8ffb0', 28, 1.2); if (!o.sunk) { o.sunk = true; setTimeout(() => popText(pick(['SHABAASH!', 'BULLSEYE!', 'AWESOME!']), _p.set(G.x, 4.6, G.z - 2), '#ffe066', 30, 1), 300); }
  if (!(PF.taught || {}).ship) { PF.taught = { ...(PF.taught || {}), ship: true }; save(); }
}
function fortExtras() {
  if (rockyCannon) { scene.remove(rockyCannon); rockyCannon = null; }
  if (boat) { scene.remove(boat); boat = null; } if (flag) { scene.remove(flag); flag = null; } if (chest) { scene.remove(chest); chest = null; }
  if (stairs) stairs.visible = false; if (crab) crab.visible = false;
  if (bossKit) { bossKit.marks.forEach(m => { m.visible = false; }); bossKit.wave.visible = false; bossKit.target.visible = false; }
}
function formUp(F) {   // the army forms wide rows facing the castle
  const list = G.crew.filter(q => q.st === 'form' || q.st === 'run'), n = list.length, cols = Math.min(12, Math.max(1, n));
  list.forEach((q, i) => { const r = Math.floor(i / cols), k = i % cols, inRow = Math.min(cols, n - r * cols); q.fx = (k - (inRow - 1) / 2) * 0.7 + (r % 2 ? 0.2 : 0); q.fz = F.line + r * 0.85; q.st = 'form'; });
}
function startFinale() {
  setTimeout(() => mitthu(pick(['My gold! MY GOLD! Go away, you smelly pirates!', 'Guards! Throw your socks at them!', 'I will tell your mummies!', 'Ha! My fort is made of SOLID laddoo… I mean stone!']), 'angry', 'LORD LALCHI'), 600); setTimeout(() => mitthu(pick(['Squawk! TAP TAP to throw bombs!', 'Captain, his moustache is FAKE!', 'Get him! For the gold!']), 'laugh'), 3800);
  G.state = 'finale'; music(lv.boss ? 'bossfight' : 'fight'); G.guardFight = null; G.x = 0; G.tx = 0;
  const F = G.finale = { t: 0, done: false, win: false, line: castle.z + FIRE_LINE + (lv.boss ? 4 : 0), phase: 'guards', next: 0.8, boost: 0, guards: [], lal: { x: 0, dir: 1, talkT: 1.5 }, ox: 0, ws: { on: false, t: 2.4 } };
  G.crew.forEach(q => { q.act = null; q.y = 0; q.rx = 0; }); G.ract = null; rocky.rotation.x = 0;
  formUp(F);
  if (lv.boss) {   // the boss fight: Lalchi's Gold Crab climbs out of the sand in front of the fort
    F.boss = { hp: Math.round(lv.hp * 1.6), max: Math.round(lv.hp * 1.6), x: 0, z: castle.z + 8, ph: 'intro', t: 0, n: 0 };
    crab.visible = true; crab.position.set(0, -5, F.boss.z); crab.rotation.set(0, 0, 0); crab.userData.core.visible = false; crab.userData.plate.rotation.x = 0;
    banner('🦀 LALCHI\'S GOLD CRAB!', 'Dodge, jump, and bomb its glowing core!', 2.4); sfx('bigBoom'); sfx('adFire', 0.8); G.shake = 0.9; vib(150);
    setTimeout(() => G.finale && popText('MY CRAB WILL CRUSH YOU!', _p.set(0, 9, F.boss.z), '#ffd0f0', 24, 1.4), 2600);
    $('castleHP').querySelector('.lab').textContent = '🦀 LALCHI\'S GOLD CRAB'; $('castleHP').classList.remove('hidden'); updateBossHP();
    return;
  }
  $('castleHP').querySelector('.lab').textContent = '🏰 LORD LALCHI\'S GOLD FORT';
  // Lalchi's guards stand in rows in front of the gate
  const ng = lv.guards, cols = 8;
  for (let i = 0; i < ng; i++) { const r = Math.floor(i / cols), k = i % cols, inRow = Math.min(cols, ng - r * cols); F.guards.push({ x: (k - (inRow - 1) / 2) * 0.85, z: castle.z + 4.5 + r * 0.9, y: 0, t: Math.random(), clip: 'idle', tint: pick(GUARD_COATS), skin: pick(SKINS), hair: pick(HAIRS), st: 'idle' }); }
  banner('ATTACK!', ng ? 'Beat the guards, then bomb the castle!' : 'Bomb the castle down!', 2.2); sfx('capCharge'); sfx('crewCheer', 0.4); sfx('halt', 1.0);
  setTimeout(() => G.finale && popText('NOBODY TOUCHES MY GOLD!', _p.set(0, GATE_TOP + 3.2, castle.z), '#ffd0f0', 22, 1.8), 1600);
  $('hint').innerHTML = '<span class="hand tap">👆</span><br>TAP TO CHARGE FASTER!<br>🎯 TAP THE TARGETS = BIG DAMAGE!'; $('hint').classList.remove('hidden'); setTimeout(() => $('hint').classList.add('hidden'), 3500);
  $('castleHP').classList.remove('hidden'); updateHP();
}
function updateHP() { $('hpN').textContent = Math.max(0, Math.ceil(castle.hp)); $('hpFill').style.width = Math.max(0, castle.hp / castle.max * 100) + '%'; const f = $('fortN'); f.textContent = '🏰 ' + Math.max(0, Math.ceil(castle.hp)); f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); }
function tapFire() { const F = G.finale; if (!F || F.done) return false; F.boost = 0.5; return true; }
function updateFinale(dt) {
  const F = G.finale; F.t += dt; F.boost = Math.max(0, F.boost - dt);
  const fast = F.boost > 0 ? 2.2 : 1;
  // the army: forms up, fights the guards, then charges one by one and bombs the gate
  for (const q of G.crew) {
    q.t = (q.t || 0) + dt;
    if (q.st === 'form') {
      q.x = damp(q.x, q.fx + F.ox, F.boss ? 7 : 4, dt); q.z = damp(q.z, q.fz, 4, dt); q.ry = 0; q.y = 0; q.rx = 0; const far = Math.abs(q.z - q.fz) > 0.6 || Math.abs(q.x - q.fx - F.ox) > 0.8;
      if (q.thr > 0) { q.thr -= dt; q.clip = 'throw'; q.t = 0.75 - q.thr; } else q.clip = far ? 'run' : 'idle';
      if (q.act) { if (movePose(q, q.act, dt)) { q.clip = 'jump'; q.t = q.act.t; } else { q.act = null; q.y = 0; } }
    }
    else if (q.st === 'climb') {   // up the treasure stairs
      if (q.delay > 0) { q.delay -= dt; q.clip = 'victory'; continue; }
      const tz = castle.z + 2 - q.step * 1.5, dx = q.sx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const sp = Math.min(d, 9 * dt); q.x += dx / d * sp; q.z += dz / d * sp; q.clip = 'run'; q.ry = Math.atan2(-dx, -dz); }
      else { q.clip = 'victory'; q.ry = PI * 0.75; }
      const si = Math.floor((castle.z + 2.75 - q.z) / 1.5); q.y = si >= 0 ? 0.5 + Math.min(9, si) * 0.55 + stairs.position.y : 0;
    }
    else if (q.st === 'charge') {
      const dx = q.tx - q.x, dz = q.tz - q.z, d = Math.hypot(dx, dz), sp = 9 * fast;
      if (d > 0.4) { q.x += dx / d * Math.min(d, sp * dt); q.z += dz / d * Math.min(d, sp * dt); q.clip = 'run'; q.ry = Math.atan2(-dx, -dz); }
      else {   // at the castle: throw the bomb
        q.st = 'thrown'; q.clip = 'throw'; q.t = 0; q.ry = 0;
        const x = clamp(q.x + rnd(-1.5, 1.5), -6.5, 6.5), y = rnd(1.2, 6), zz = castle.z + (Math.abs(x) < 1.6 ? 1.3 : 0.6);
        throwBomb([q.x + 0.2, 1.7, q.z - 0.3], [x, y, zz], 0.45, 1.6, () => { if (F.done) return; boom(_p.set(x, y, zz + 0.3), 1 + G.bombPow * 0.25, { wall: true }); castle.hp -= 1; castle.blast(x, y, G.bombPow); updateHP(); vib(8); if (castle.hp <= 0) castleDown(); }, 1 + (G.bombPow - 1) * 0.2);
      }
    } else if (q.st === 'thrown') { if (q.t > 0.75) { q.st = 'cheer'; q.t = Math.random(); } }
    else if (q.st === 'cheer' || q.st === 'party') { q.clip = 'victory'; q.y = q.st === 'party' ? Math.max(0, Math.sin(q.t * 6 + (q.ph || 0)) * 0.35) : 0; q.ry = q.st === 'party' ? 0 : PI * 0.9; }
  }
  // the guards: fight back one for one
  for (const w of F.guards) {
    if (w.gone) continue; w.t += dt;
    if (w.st === 'fly') { w.dt += dt; w.vy -= 18 * dt; w.x += w.vx * dt; w.z += w.vz * dt; w.y = Math.max(0, w.y + w.vy * dt); w.rx = (w.rx || 0) + w.spin * dt; w.clip = 'hit'; w.t = Math.min(w.dt, 0.4); w.s = Math.max(0.01, 1 - Math.max(0, w.dt - 1.2) * 2); if (w.dt > 1.8) w.gone = true; }
    else { w.clip = F.phase === 'guards' ? 'shoot' : 'idle'; if (w.clip === 'shoot') w.t %= 0.55; }
    lists.gl.push(person(w, { ry: PI }));
  }
  F.ox = damp(F.ox, F.boss ? clamp(G.tx, -6, 6) : 0, 8, dt);
  if (F.last) { F.last.t -= dt; if (F.last.t <= 0 && !F.done) { F.done = true; F.last = null; $('hint').classList.add('hidden'); $('hint').classList.remove('big'); setTimeout(() => fail((F.boss ? 'The Gold Crab' : 'The castle') + ' still has ' + Math.ceil(F.boss ? F.boss.hp : castle.hp) + ' strength left!', true), 600); } }
  if (F.boss) { updateBoss(dt); if (!F.done && !F.last && !G.crew.length && F.t > 1) { if (canLastStand()) startLastStand(); else { F.done = true; setTimeout(() => fail('The Gold Crab still has ' + Math.ceil(F.boss.hp) + ' strength left!', true), 900); } } }
  else updateWeakSpot(dt);
  F.next -= dt * fast;
  if (!F.boss && !F.done && !F.last && F.next <= 0) {
    const ready = G.crew.filter(q => q.st === 'form');
    if (F.phase === 'guards') {
      F.next = 0.22;
      const w = F.guards.find(q => q.st === 'idle');
      if (!w) { if (!F.guards.some(q => q.st === 'targeted')) { F.phase = 'charge'; F.next = 0.6; banner('BOMB THE CASTLE!', 'Every pirate throws one bomb', 1.4); sfx('charge'); } }
      else if (ready.length) {
        const q = pick(ready.slice(0, Math.min(ready.length, 14))); q.thr = 0.75; w.st = 'targeted';
        throwBomb([q.x + 0.25, 1.7, q.z - 0.3], [w.x, 0.4, w.z], 0.5, 2.6, () => { boom(_p.set(w.x, 0.6, w.z), 0.9); w.st = 'fly'; w.dt = 0; w.vx = rnd(-4, 4); w.vy = rnd(8, 11); w.vz = rnd(-4, -1); w.spin = rnd(6, 10); });
        const sh = pick(ready); flashAt(_p.set(w.x - 0.2, 1.3, w.z + 0.8), 0.9); sfxT('musket', 0.07);
        shoot([w.x - 0.2, 1.3, w.z + 0.8], [sh.x, 1.1, sh.z], 0.18, () => { if (G.crew.includes(sh) && sh.st === 'form') { losePirate(sh, 'shot', Math.sign(sh.x) || 1); sfxT('ouch', 0.15); } });
      }
    } else if (ready.length) {   // the charge: the next pirate runs to the gate
      F.next = 0.13; const q = ready[0]; q.st = 'charge'; q.tx = rnd(-5.5, 5.5); q.tz = castle.z + 3.2 + rnd(0, 1.5); if (Math.random() < 0.1) sfxT('arr', 0.3);
    }
    if (!F.done && !ready.length && !G.crew.some(q => q.st === 'charge' || q.st === 'thrown') && !bombs.length && F.t > 1.5) { if (canLastStand()) startLastStand(); else { F.done = true; $('hint').classList.add('hidden'); setTimeout(() => fail('The castle still has ' + Math.ceil(castle.hp) + ' strength left!', true), 900); } }
  }
  // Rocky leads the attack beside the army
  if (!F.win) {
    rocky.position.x = damp(rocky.position.x, -4.2 + F.ox, F.boss ? 7 : 3, dt); rocky.position.z = damp(rocky.position.z, F.line - 1, 3, dt); rocky.position.y = 0; rocky.rotation.y = 0.25;
    if (F.rockyJump) { const o = { y: 0, rx: 0 }; if (movePose(o, F.rockyJump, dt)) { rocky.position.y = o.y; rocky.play('jump'); } else F.rockyJump = null; }
    else if (Math.abs(rocky.position.z - (F.line - 1)) > 1) rocky.play('run'); else if (rocky.clip !== 'throw' || rocky.done()) rocky.play(F.boss && F.boss.ph !== 'open' && !F.last ? 'idle' : 'throw', !F.boss || F.boss.ph === 'open');
    rocky.update(dt, 0.9);
  }
  // Lord Lalchi on top of the gate: shaking his fist, then panicking
  const A = F.lal;
  if (F.boss) { /* Lalchi rides his crab (updateBoss) */ }
  else if (!F.win) {
    const panic = castle.hp < castle.max * 0.35;
    A.x += A.dir * dt * (panic ? 2.4 : 0.7); if (Math.abs(A.x) > 1.0) { A.dir = -Math.sign(A.x); A.x = Math.sign(A.x) * 1.0; }
    lalchi.position.set(A.x, GATE_TOP, castle.z + 0.4); lalchi.rotation.y = panic ? (A.dir > 0 ? PI / 2 : -PI / 2) : PI;
    lalchi.play(panic ? 'run' : 'punch'); lalchi.update(dt, panic ? 1.6 : 1);
    A.talkT -= dt; if (A.talkT <= 0) { A.talkT = 3.2; if (panic) { sfx('adNooo'); popText(pick(['NOOO! MY GOLD!', 'MUMMY!!', 'STOP THEM!']), _p.set(A.x, GATE_TOP + 3.2, castle.z), '#ffd0f0', 24, 1); } else { sfx('adFire'); popText(pick(['GET THEM!', 'MY GOLD, MY RULES!', 'GUARDS!!']), _p.set(A.x, GATE_TOP + 3.2, castle.z), '#ffd0f0', 22, 0.9); } }
  } else lalchi.update(dt);
  // the strength number over the gate
  const [fx, fy, ok] = project(_p.set(0, GATE_TOP + 1.6, castle.z + 1)); const fe = $('fortN'); fe.style.display = ok && !F.win && !F.boss ? 'block' : 'none'; fe.style.transform = `translate(${fx}px,${fy}px) translate(-50%,-100%)`;
  if (F.win) winScene(dt);
}
function castleDown() {
  setTimeout(() => mitthu(pick(['Noooo! My precious gold!', 'This is not fair! I want my mummy!', 'Okay okay, take it! TAKE IT!']), 'sad', 'LORD LALCHI'), 900); setTimeout(() => mitthu(pick(['Yo ho ho! The gold is OURS!', 'Party on the ship tonight!', 'Squawk! Captain Rocky zindabad!']), 'laugh'), 4200);
  const F = G.finale; if (F.win) return; F.done = true; F.win = true; F.winT = F.t; F.last = null; castle.collapse(); G.slow = 0.35; setTimeout(() => { G.slow = 1; }, 1300); G.shake = 1.2;
  $('hint').classList.add('hidden'); $('hint').classList.remove('big'); $('fortN').style.display = 'none'; bullets.length = 0; bombs.length = 0;
  bossKit.marks.forEach(m => { m.visible = false; }); bossKit.wave.visible = false; bossKit.target.visible = false; if (F.ws) F.ws.on = false;
  sfx('bigBoom'); sfx('crumble', 0.3); sfx('adNooo', 0.5); sfx('fanfare', 1.6); vib(300); flash('#fff'); music('win');
  if (F.boss) {   // the crab blows apart
    const B = F.boss; for (let i = 0; i < 9; i++) setTimeout(() => boom(_p.set(B.x + rnd(-3, 3), rnd(1, 4.5), B.z + rnd(-2, 2)), 2.3), i * 110);
    setTimeout(() => { crab.visible = false; puff(_p.set(B.x, 2, B.z), 30, 0xffc21a, { star: true, add: true, speed: 9, size: 0.5, life: 1.2 }); }, 650);
    banner('LALCHI DEFEATED!', '🦀 The Gold Crab is scrap!', 2.4);
  } else banner('CASTLE CAPTURED!', '🏴‍☠️ The gold is ours!', 2.4);
  for (let i = 0; i < 10; i++) setTimeout(() => boom(_p.set(rnd(-9, 9), rnd(2, 12), castle.z + rnd(-12, 1)), 2.4), i * 150);
  for (let i = 0; i < 8; i++) setTimeout(() => puff(_p.set(rnd(-10, 10), rnd(1, 7), castle.z + rnd(-10, 2)), 14, 0xc8bca8, { size: 3, speed: 4, life: 1.8, grav: -0.5 }), i * 180);
  F.lalFly = { t: 0, x0: lalchi.position.x, y0: lalchi.position.y }; lalchi.play('hit', true);
  G.crew.forEach(q => { q.st = 'party'; q.t = Math.random(); q.ph = Math.random() * 6; });
}
const MULT = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10], STEP_COST = i => 2 + i * 2;
let stairs = null;
function buildStairs() {
  const g = new THREE.Group(), body = new THREE.Group();
  for (let i = 0; i < 10; i++) { const top = 0.5 + i * 0.55; mesh(new THREE.BoxGeometry(7, top, 1.5), flat(i % 2 ? 0xf09a10 : 0xffc21a), 0, top / 2, -i * 1.5, body); mesh(new THREE.BoxGeometry(7.1, 0.08, 0.12), flat(0xfff2b0), 0, top, -i * 1.5 + 0.7, body); }
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i += 3) mesh(new THREE.SphereGeometry(0.28, 10, 8), flat(0xfff2b0), sx * 3.55, 0.75 + i * 0.55, -i * 1.5, body);
  g.add(oneMesh(body));
  const tex = canvasTex(512, 256, (c) => { c.font = 'bold 54px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < 10; i++) { const cx = (i % 5) * 102.4 + 51, cy = Math.floor(i / 5) * 128 + 64; c.lineWidth = 8; c.strokeStyle = '#fff6e0'; c.strokeText('×' + MULT[i], cx, cy); c.fillStyle = i >= 7 ? '#d8202f' : '#3a2410'; c.fillText('×' + MULT[i], cx, cy); } });
  const geos = []; for (let i = 0; i < 10; i++) { const q = new THREE.PlaneGeometry(1.9, 0.48), uv = q.attributes.uv, u0 = (i % 5) / 5, v0 = 1 - (Math.floor(i / 5) + 1) / 2; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 5, v0 + uv.getY(k) / 2); q.translate(0, 0.5 + i * 0.55 - 0.27, -i * 1.5 + 0.77); geos.push(q); }
  g.add(new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({ map: tex, transparent: true })));
  g.visible = false; g.traverse(q => { q.frustumCulled = false; }); return g;
}
function makeChest(x, y, z) {
  chest = new THREE.Group(); chest.position.set(x, y, z); scene.add(chest);
  mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), flat(0x8a4a1a), 0, 0.35, 0, chest); mesh(new THREE.BoxGeometry(1.24, 0.12, 0.84), flat(0xf2c14e), 0, 0.68, 0, chest);
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4); chest.add(lid);
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, PI), flat(0x9a5a2a), 0, 0, 0.4, lid).rotation.z = PI / 2; chest.userData.lid = lid;
  chest.traverse(q => { q.frustumCulled = false; }); chest.scale.setScalar(1.4);
}
const coinG = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), coinM = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.7, roughness: 0.25 });
function startStairs() {
  const F = G.finale, N = G.crew.length; let reached = 0, cum = 0;
  for (let i = 0; i < 10; i++) { cum += STEP_COST(i); if (cum <= N) reached = i; else break; }
  F.st = { t: 0, reached, mult: MULT[reached], opened: false }; stairs.visible = true; stairs.position.set(0, -9, castle.z + 2); sfx('crumble'); G.shake = 0.5;
  banner('🪜 TREASURE STAIRS!', 'More pirates = higher = more gold!', 1.8);
  // the last pirates in the list climb first (the first ones are drawn in full detail and end up at the top)
  const list = [...G.crew].reverse(); let i = 0, used = 0, k = 0;
  for (const q of list) { if (used >= STEP_COST(i) && i < 9) { i++; used = 0; } const cnt = STEP_COST(i); q.st = 'climb'; q.step = i; q.sx = clamp((used - (cnt - 1) / 2) * Math.min(0.7, 6.2 / cnt), -3.1, 3.1) + (used >= cnt ? rnd(-3, 3) : 0); q.delay = 0.9 + k++ * 0.03; used++; }
  F.st.top = 0.5 + reached * 0.55; F.st.z = castle.z + 2 - reached * 1.5;
}
function updateStairs(dt) {
  const F = G.finale, S = F.st; S.t += dt;
  stairs.position.y = Math.min(0, -9 + S.t * 9);
  if (S.t > 0.9 && S.t < 1.0) G.shake = Math.max(G.shake, 0.3);
  // Rocky runs up last, to the highest step reached, where the chest waits
  if (S.t > 3.0) {
    const k = Math.min(1, (S.t - 3.0) / 1.3), z0 = F.line - 1, zt = S.z;
    rocky.position.x = damp(rocky.position.x, -1.4, 3, dt); rocky.position.z = z0 + (zt - z0) * k; const si = Math.floor((castle.z + 2.75 - rocky.position.z) / 1.5); rocky.position.y = si >= 0 ? 0.5 + Math.min(9, si) * 0.55 : 0;
    rocky.rotation.y = 0; rocky.play(k < 1 ? 'run' : 'victory'); rocky.update(dt);
    if (k >= 1 && !S.opened) {
      S.opened = true; S.doneT = F.t; makeChest(1.4, S.top, S.z); rocky.rotation.y = PI * 0.75;
      sfx('capArr'); sfx('coins', 0.2); sfx('coins', 0.6); sfx('fanfare', 0.3); vib(120); G.shake = 0.4;
      popText('×' + S.mult + ' TREASURE!', _p.set(0, S.top + 3, S.z), S.mult >= 5 ? '#ff6a8a' : '#ffe066', S.mult >= 5 ? 44 : 36, 2.2);
      if (S.reached >= 9) setTimeout(() => popText('🏆 TOP OF THE STAIRS!', _p.set(0, S.top + 4.5, S.z), '#ffe066', 30, 2), 500);
      for (let i = 0; i < 30 + S.reached * 6; i++) { const c = mesh(coinG, coinM, 1.4, S.top + 1, S.z); scene.add(c); fx.push({ s: c, v: new THREE.Vector3(rnd(-3, 3), rnd(6, 11), rnd(-1, 4)), life: 2.2, t: 0, sz: 1, g: 14, coin: true }); }
    }
  } else rocky.update(dt);
  if (chest) chest.userData.lid.rotation.x = Math.max(-1.9, chest.userData.lid.rotation.x - dt * 4);
}
function winScene(dt) {
  const F = G.finale, W2 = F.t - F.winT;
  // Lalchi is blown sky-high and disappears with a twinkle
  if (F.lalFly) {
    const K = F.lalFly; K.t += dt;
    lalchi.position.set(K.x0 + K.t * 3, K.y0 + K.t * 14 - K.t * K.t * 1.2, castle.z - K.t * 12); lalchi.rotation.x += dt * 9; lalchi.rotation.z += dt * 5;
    if (K.t > 0.3 && !K.said) { K.said = true; popText('NOOOOO... MY GOOOLD!', _p.set(lalchi.position.x, lalchi.position.y + 2, lalchi.position.z), '#ffd0f0', 24, 1.6); sfx('adNooo'); }
    if (K.t > 2.4) { puff(lalchi.position.clone(), 1, 0xffffff, { star: true, add: true, size: 3, speed: 0, life: 0.6, grav: 0 }); sfx('bell'); lalchi.visible = false; F.lalFly = null; }
  }
  // the golden treasure stairs rise from the rubble and the army climbs as high as it can: the higher, the bigger the treasure
  if (W2 > 1.5 && !F.st) startStairs();
  if (F.st) updateStairs(dt); else rocky.update(dt);
  if (Math.random() < dt * 2.5) { puff(_p.set(rnd(-10, 10), rnd(9, 15), castle.z + rnd(-6, 4)), 22, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0, 0xff4fa8], speed: 6, life: 1.4, size: 0.5, grav: 3 }); sfxT('firework', 0.4); }
  if (Math.random() < dt * 0.8) sfxT('crewCheer', 1.2);
  if (F.st && F.st.doneT && F.t - F.st.doneT > 2.4 && G.state === 'finale') { G.state = 'win'; results(); }
}

// ---------------- Lord Lalchi's GOLD CRAB: the boss fight on every 5th level ----------------
// Dodge the red circles (drag), jump the shock waves (swipe up) and when its chest opens, TAP to bomb the glowing core.
let crab = null, bossKit = null;
function buildCrab() {
  const root = new THREE.Group(), body = new THREE.Group(), G1 = 0xf0b030, G2 = 0xc88a18;
  const sh = mesh(new THREE.SphereGeometry(2.6, 20, 12), flat(G1), 0, 2.9, 0, body); sh.scale.set(1.2, 0.72, 1);
  mesh(new THREE.CylinderGeometry(3.15, 3.0, 0.35, 20), flat(G2), 0, 2.45, 0, body).scale.set(1.04, 1, 0.82);
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; mesh(new THREE.ConeGeometry(0.28, 0.9, 6), flat(G2), Math.sin(a) * 2.2, 3.85 - Math.abs(Math.sin(a)) * 0.5, Math.cos(a) * 0.6 - 0.4, body); }
  for (const sx of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.3, 6), flat(G2), sx * 0.9, 3.9, 1.5, body); mesh(new THREE.SphereGeometry(0.42, 12, 10), flat(0xffffff), sx * 0.9, 4.6, 1.55, body); mesh(new THREE.SphereGeometry(0.2, 10, 8), flat(0x101010), sx * 0.9, 4.65, 1.92, body); }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const z = -1 + k * 1.1; mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 7), flat(G2), sx * 3.6, 2.6, z, body).rotation.z = sx * 1.0; mesh(new THREE.CylinderGeometry(0.2, 0.08, 2.8, 7), flat(G1), sx * 4.6, 1.3, z, body).rotation.z = -sx * 0.25; }
  root.add(oneMesh(body));
  const claws = [-1, 1].map(sx => {
    const c = new THREE.Group(); c.position.set(sx * 3.1, 2.6, 1.6); root.add(c); const parts = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.32, 0.4, 2.2, 8), flat(G2), 0, 0, 1.0, parts).rotation.x = PI / 2;
    mesh(new THREE.BoxGeometry(1.15, 0.55, 2.0), flat(G1), 0, 0.32, 3.0, parts); mesh(new THREE.BoxGeometry(1.0, 0.4, 1.7), flat(G2), 0, -0.3, 2.9, parts);
    mesh(new THREE.ConeGeometry(0.3, 0.6, 6), flat(0xffffff), 0, 0.32, 4.2, parts).rotation.x = PI / 2;
    c.add(oneMesh(parts)); return c;
  });
  const plate = new THREE.Group(); plate.position.set(0, 1.95, 2.45); root.add(plate);
  mesh(new THREE.BoxGeometry(2.2, 1.3, 0.25), flat(0x8a6a20), 0, 0.65, 0, plate);
  const core = mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff5a1a, toneMapped: false }), 0, 2.55, 2.2, root);
  root.scale.setScalar(1.35); root.userData = { claws, plate, core }; root.visible = false; root.traverse(q => { q.frustumCulled = false; }); return root;
}
// red danger circles, the shock wave, and the castle's weak-spot target (made once, reused)
function buildBossKit() {
  const MARK_R = 1.3, markMat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const marks = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Group(); const a = new THREE.Mesh(new THREE.CircleGeometry(MARK_R, 32), markMat); a.rotation.x = -PI / 2; m.add(a); const b = new THREE.Mesh(new THREE.RingGeometry(MARK_R - 0.12, MARK_R + 0.08, 40), edgeMat); b.rotation.x = -PI / 2; b.position.y = 0.01; m.add(b); m.visible = false; scene.add(m); return m; });
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending })); wave.rotation.x = -PI / 2; wave.visible = false; scene.add(wave);
  const target = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (c, w) => { for (const [r, col] of [[60, '#ff3a2a'], [46, '#fff'], [32, '#ff3a2a'], [18, '#fff'], [8, '#ff3a2a']]) { c.fillStyle = col; c.beginPath(); c.arc(w / 2, w / 2, r, 0, 7); c.fill(); } }), transparent: true, depthWrite: false, depthTest: false })); target.visible = false; target.renderOrder = 9; scene.add(target);
  [markMat, edgeMat].forEach(m => { m.userData.flat = false; });
  return { marks, markMat, edgeMat, wave, target };
}
const coreAt = () => crab.userData.core.getWorldPosition(new THREE.Vector3());
function updateBossHP() { const B = G.finale.boss; $('hpN').textContent = Math.max(0, Math.ceil(B.hp)); $('hpFill').style.width = Math.max(0, B.hp / B.max * 100) + '%'; }
function hurtBoss(d) {
  const F = G.finale; if (!F || !F.boss || F.done) return; const B = F.boss;
  B.hp -= d; B.hurt = 0.15; updateBossHP(); vib(8);
  if (B.hp <= 0) castleDown();
}
function nextBossPhase() {
  const F = G.finale, B = F.boss, order = lv.n >= 10 ? ['slam', 'open', 'wave', 'open'] : ['slam', 'open', 'slam', 'open'];
  B.ph = order[B.n++ % order.length]; B.t = 0; B.fired = false;
  if (B.ph === 'slam') {
    const k = Math.min(5, 2 + Math.floor(lv.n / 10)), live = G.crew.filter(q => q.st === 'form'); B.spots = [];
    for (let i = 0; i < k; i++) { const q = pick(live) || { x: 0, z: F.line }; B.spots.push({ x: clamp(q.x + rnd(-0.8, 0.8), -7, 7), z: q.z + rnd(-0.6, 0.6) }); }
    B.spots.forEach((p, i) => { const m = bossKit.marks[i]; m.position.set(p.x, 0.09, p.z); m.visible = true; });
    sfx('adFire');
    if (B.taughtSlam) popText(pick(['DODGE THE CIRCLES!', 'MOVE! MOVE!', 'GOLD BAGS INCOMING!']), _p.set(0, 4, F.line), '#ff9a8a', 26, 1.1);
    if (!B.taughtSlam) { B.taughtSlam = true; $('hint').innerHTML = '<span class="hand">👆</span><br>DRAG TO DODGE THE RED CIRCLES!'; $('hint').classList.remove('hidden'); setTimeout(() => $('hint').classList.add('hidden'), 2200); }
  } else if (B.ph === 'open') {
    $('hint').innerHTML = '<span class="hand tap">👆</span><br>TAP TAP TAP! BOMB THE CORE!'; $('hint').classList.add('big'); $('hint').classList.remove('hidden'); sfx('capCharge');
  } else if (B.ph === 'wave') { banner('⬆️ JUMP THE WAVE!', 'Swipe UP when it reaches you', 1.3); sfx('adStop'); }
}
function bossJump() {
  const F = G.finale; if (!F || !F.boss || F.done) return;
  if (F.jumpT > 0) return; F.jumpT = 0.9;
  G.crew.forEach(q => { if (q.st === 'form') q.act = { type: 'jump', t: 0, T: 1.0, H: 2.2 }; });
  F.rockyJump = { type: 'jump', t: 0, T: 1.0, H: 2.2 }; sfx('boing');
}
function bossVolley() {
  const F = G.finale, B = F.boss; if (F.vcd > 0) return; F.vcd = 0.11;
  const ready = G.crew.filter(q => q.st === 'form' && !q.act), n = Math.min(5, ready.length), core = coreAt();
  const dmg = (0.5 + G.crew.length / 40) * (1 + (G.bombPow - 1) * 0.3), each = dmg / (n + 1);
  for (let i = 0; i < n; i++) { const q = ready[Math.floor(Math.random() * Math.min(ready.length, 20))]; q.thr = 0.75; throwBomb([q.x + 0.2, 1.7, q.z - 0.3], [core.x + rnd(-0.3, 0.3), core.y + rnd(-0.3, 0.3), core.z], 0.5, 2.2, () => { boom(_p.set(core.x, core.y, core.z + 0.4), 0.9, { wall: true }); hurtBoss(each); }); }
  rocky.play('throw', true); throwBomb([rocky.position.x, 1.9, rocky.position.z - 0.3], [core.x, core.y, core.z], 0.45, 2.4, () => { boom(_p.set(core.x, core.y, core.z + 0.4), 1.2, { wall: true }); hurtBoss(each); }, 1.3);
  popText('-' + Math.max(1, Math.round(dmg)), _p.set(B.x + rnd(-1.5, 1.5), 5.2, B.z + 2), '#ffe066', 30, 0.6); sfxT('pistol', 0.05);
}
function updateBoss(dt) {
  if (G.state !== 'finale') return;   // the game is over (fail screen): the crab stops
  const F = G.finale, B = F.boss, U = crab.userData; B.t += dt; F.vcd = Math.max(0, (F.vcd || 0) - dt); F.jumpT = Math.max(0, (F.jumpT || 0) - dt); B.hurt = Math.max(0, (B.hurt || 0) - dt);
  if (!F.win) {
    if (B.ph === 'intro') { crab.position.y = Math.min(0, -5 + B.t * 4); crab.rotation.x = 0; if (B.t > 2.1) nextBossPhase(); }
    else { B.x = damp(B.x, Math.sin(F.t * 0.45) * 2.6, 2, dt); crab.position.y = Math.abs(Math.sin(F.t * 3)) * 0.12; }
    crab.position.x = B.x + (B.hurt > 0 ? rnd(-0.12, 0.12) : 0); crab.position.z = B.z; crab.rotation.z = Math.sin(F.t * 3) * 0.04;
    lalchi.position.set(B.x, crab.position.y + 3.95, B.z - 0.3); lalchi.rotation.set(0, PI, 0); lalchi.play(B.ph === 'open' ? 'hit' : 'punch'); lalchi.update(dt);
    const [c0, c1] = U.claws; let lift = 0, open = 0;
    if (B.ph === 'slam') {
      const k = Math.min(1, B.t / 1.3); lift = B.t < 1.3 ? k : Math.max(-0.25, 1 - (B.t - 1.3) * 8);
      bossKit.markMat.opacity = 0.25 + Math.sin(B.t * 18) * 0.15 + k * 0.2;
      if (B.t >= 1.3 && !B.fired) {
        B.fired = true; sfx('whoosh');
        B.spots.forEach((p, i) => { const from = (i % 2 ? c1 : c0).getWorldPosition(new THREE.Vector3()); throwBomb([from.x, from.y + 2, from.z + 3], [p.x, 0.3, p.z], 0.4, 2.5, () => {
          bossKit.marks[i].visible = false; boom(_p.set(p.x, 0.5, p.z), 1.6); puff(_p.set(p.x, 0.8, p.z), 10, 0xffd23f, { star: true, add: true, speed: 6, size: 0.4 });
          let n = 0; const cap = 3 + Math.floor(lv.n / 10); for (const q of [...G.crew]) if (n < cap && q.st === 'form' && Math.hypot(q.x - p.x, q.z - p.z) < 1.35 && !inAir(q)) { losePirate(q, 'hit', Math.sign(q.x - p.x) || 1); n++; }
          popText(n ? '-' + n : pick(['MISSED!', 'DODGED!', 'HA! MISSED!']), _p.set(p.x, 3, p.z), n ? '#ff8a8a' : '#c8ffb0', 26, 0.8);
        }, 1.5); });
      }
      if (B.t > 2.4) nextBossPhase();
    } else if (B.ph === 'open') {
      open = Math.min(1, B.t / 0.4, (3.9 - B.t) / 0.4); U.core.scale.setScalar(1 + Math.sin(B.t * 14) * 0.15 + (B.hurt > 0 ? 0.3 : 0));
      if (B.t > 3.9) { $('hint').classList.add('hidden'); $('hint').classList.remove('big'); nextBossPhase(); }
    } else if (B.ph === 'wave') {
      lift = Math.min(1, B.t / 0.8); crab.rotation.x = -0.2 * lift;
      if (B.t >= 0.9 && !B.fired) { B.fired = true; B.r = 2; bossKit.wave.visible = true; G.shake = 0.6; sfx('bigBoom'); G.crew.forEach(q => { q.waved = false; }); }
      if (B.fired && bossKit.wave.visible) {
        B.r += dt * 12; bossKit.wave.scale.setScalar(B.r); bossKit.wave.position.set(B.x, 0.15, B.z); bossKit.wave.material.opacity = 0.95;
        const front = F.line - B.z; if (!B.said && B.r > front - 5) { B.said = true; popText('JUMP NOW! ⬆️', _p.set(0, 4.5, F.line), '#ffe066', 34, 0.8); }
        for (const q of [...G.crew]) if (q.st === 'form' && !q.waved && B.r >= Math.hypot(q.x - B.x, q.z - B.z)) { q.waved = true; if (!inAir(q)) losePirate(q, 'hit', Math.sign(q.x - B.x) || 1); }
        if (B.r > front + 14) { bossKit.wave.visible = false; B.said = false; nextBossPhase(); }
      }
    }
    for (const [i, c] of [c0, c1].entries()) { c.rotation.x = -0.9 * lift; c.rotation.y = (i ? -1 : 1) * Math.sin(F.t * 4) * 0.08; }
    U.plate.rotation.x = 1.4 * open; U.core.visible = open > 0.05;
  }
}

// ---------------- the castle's weak spots and the last stand ----------------
const WEAK = [[0, 3.3], [-5.6, 5.2], [5.6, 5.2], [-2.9, 5.8], [2.9, 5.8], [0, 7.6]];
function updateWeakSpot(dt) {
  const F = G.finale, S = F.ws, T = bossKit.target;
  S.t -= dt;
  if (!S.on && S.t <= 0 && !F.done) { S.on = true; S.t = 1.7; [S.x, S.y] = pick(WEAK); T.position.set(S.x, S.y, castle.z + 1.6); T.visible = true; sfx('bell'); if (!S.told) { S.told = true; popText('🎯 TAP THE TARGET!', _p.set(S.x, S.y + 2, castle.z + 2), '#ffe066', 26, 1.2); } }
  else if (S.on && (S.t <= 0 || F.done)) { S.on = false; S.t = rnd(2.2, 3.6); T.visible = false; }
  if (S.on) T.scale.setScalar(2.2 + Math.sin(F.t * 12) * 0.35);
}
function weakSpotHit() {
  const F = G.finale, S = F.ws; if (!S || !S.on) return; S.on = false; S.t = rnd(2.2, 3.6); bossKit.target.visible = false;
  const x = S.x, y = S.y, dmg = Math.max(3, Math.round(castle.max * 0.08 * (1 + (G.bombPow - 1) * 0.3)));
  rocky.play('throw', true); sfx('cannon'); G.shake = Math.max(G.shake, 0.2);
  throwBomb([rocky.position.x, 1.9, rocky.position.z - 0.3], [x, y, castle.z + 1.2], 0.55, 3, () => {
    if (F.done) return; boom(_p.set(x, y, castle.z + 1.5), 2.4, { wall: true }); castle.hp -= dmg; castle.blast(x, y, 3); updateHP(); addPower(0.08);
    popText('🎯 WEAK SPOT! -' + dmg, _p.set(x, y + 2, castle.z + 2), '#ffe066', 30, 1); sfx('crewCheer', 0.1); if (castle.hp <= 0) castleDown();
  }, 1.8);
}
function canLastStand() { const F = G.finale; if (F.lastUsed) return false; return F.boss ? F.boss.hp <= F.boss.max * 0.4 : castle.hp <= castle.max * 0.4; }
function startLastStand() {
  const F = G.finale; F.lastUsed = true; F.last = { t: 6 }; banner('⚔️ LAST STAND!', 'Rocky fights alone! TAP TAP TAP!', 1.6); sfx('capCharge'); vib(100);
  $('hint').innerHTML = '<span class="hand tap">👆</span><br>TAP TAP TAP!'; $('hint').classList.add('big'); $('hint').classList.remove('hidden');
}
function lastStandTap() {
  const F = G.finale; if (F.vcd > 0) return; F.vcd = 0.08;
  rocky.play('throw', true);
  const to = F.boss ? coreAt() : new THREE.Vector3(rnd(-6, 6), rnd(1.5, 6), castle.z + 1.2);
  throwBomb([rocky.position.x, 1.9, rocky.position.z - 0.3], [to.x, to.y, to.z], 0.45, 2.5, () => {
    if (F.done) return; boom(_p.set(to.x, to.y, to.z + 0.4), 1.2, { wall: true });
    if (F.boss) hurtBoss(F.boss.max * 0.015); else { castle.hp -= Math.max(0.5, castle.max * 0.015); castle.blast(to.x, to.y, 1); updateHP(); if (castle.hp <= 0) castleDown(); }
  });
}
function finaleTap() {
  const F = G.finale; if (!F || F.done) return; vib(6);
  if (F.last) { lastStandTap(); return; }
  if (F.boss) { if (F.boss.ph === 'open') bossVolley(); return; }
  tapFire(); if (F.ws && F.ws.on) weakSpotHit();
}

// ---------------- ads (AdMob through the app): optional rewarded ads, and a short ad every few levels ----------------
const adCbs = {};
window.onAdDone = (tag, ok) => { const f = adCbs[tag]; delete adCbs[tag]; if (PF.set.music && lv) music(G.state === 'win' ? 'win' : G.state === 'home' ? 'title' : lv.world.music); if (f) f(ok); };
const adReady = () => { try { return !!(NATIVE && NATIVE.adReady && NATIVE.adReady()); } catch (e) { return false; } };
function rewardAd(tag, cb) { if (!adReady()) { cb(false); return; } adCbs[tag] = cb; Music.stop(); NATIVE.showRewarded(tag); }
let sinceAd = 0;
function betweenLevels(next) { sinceAd++; if (NATIVE && NATIVE.showInterstitial && sinceAd >= 3 && PF.level > 4) { sinceAd = 0; adCbs.inter = () => next(); Music.stop(); NATIVE.showInterstitial(); } else next(); }
// back in the game after a rewarded ad: fresh pirates join and the run goes on
function revive(n) {
  closeModal(); for (let i = 0; i < n; i++) addPirate({ x: G.x + rnd(-2, 2), z: G.z + rnd(0, 2) });
  reslot(); sfx('crewCheer'); banner('⚓ MORE PIRATES!', '+' + n + ' to the army', 1.2);
  if (G.finale) {
    const F = G.finale; G.crew.forEach(q => { if (q.st === 'run') { q.st = 'form'; q.z = F.line + 8; } }); formUp(F);
    F.done = false; F.next = 0.5; G.state = 'finale'; $('castleHP').classList.remove('hidden'); music(lv.boss ? 'bossfight' : 'fight');
  } else { G.state = 'play'; music(lv.world.music); }
}

// ---------------- results & fail ----------------
function rollChest() {
  const left = HEROES.filter(h => !hasHero(h.id)), sure = lv.n === 1 || lv.boss || PF.wins % 3 === 0;
  if (left.length && (sure || Math.random() < 0.25)) {
    if (lv.n === 1 && left.some(h => h.id === 'chacha')) return { hero: HEROES[0] };
    const W = left.map(h => [10, 6, 3, 1][h.rar]), sum = W.reduce((a, b) => a + b, 0); let r = Math.random() * sum;
    for (let i = 0; i < left.length; i++) { r -= W[i]; if (r <= 0) return { hero: left[i] }; } return { hero: left[0] };
  }
  return { coins: Math.round(20 + lv.n * 3 + Math.random() * 20) };
}
function heroCard(h) { const [rn, rc] = RARITY[h.rar]; return `<div class="card" style="--rc:${rc}"><div class="rar">${rn}</div><div class="hico">${h.icon}</div><b>${h.name}</b><span>${h.power}</span><small>joins your army!</small></div>`; }
function results() {
  const S = (G.finale && G.finale.st) || { mult: 1, reached: 0 }, left = G.crew.length, stars = 1 + (S.reached >= 3 ? 1 : 0) + (G.skulls >= 3 ? 1 : 0);
  PF.stars = PF.stars || {}; PF.stars[lv.n] = Math.max(PF.stars[lv.n] || 0, stars);
  const coins = Math.round(G.apples * (hasHero('laddoo') ? 1.25 : 1)), bonus = left * 2, lvB = 10 + lv.n * 2, total = Math.round((coins + bonus + lvB) * S.mult);
  PF.apples += total; PF.level = Math.max(PF.level, lv.n + 1); PF.best = Math.max(PF.best, left + 1); PF.wins = (PF.wins || 0) + 1;
  const drop = rollChest(); if (drop.hero) PF.heroes.push(drop.hero.id); else PF.apples += drop.coins; save();
  $('castleHP').classList.add('hidden');
  openModal(`<h2>${lv.boss ? 'LALCHI DEFEATED!' : 'FORT CAPTURED!'}</h2><div class="stars">${[0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
    <div class="stat"><span>🪙 Gold coins${hasHero('laddoo') ? ' (+25% 💰)' : ''}</span><b>${coins}</b></div><div class="stat"><span>🏴‍☠️ Pirates left × 2</span><b>${bonus}</b></div><div class="stat"><span>🏁 Level bonus</span><b>${lvB}</b></div><div class="stat"><span>🪜 Treasure stairs</span><b>×${S.mult}</b></div>
    <p class="tip">⭐ Fort captured · ⭐ 3+ treasure steps · ⭐ all 3 golden skulls (${G.skulls}/3)</p>
    <div class="big" id="totalB">+${total} 🪙</div>
    <div id="chestArea" class="row"><button class="btn big blue chestBtn" id="chestB">🎁 OPEN THE CHEST!</button></div>
    <div id="after" class="hidden">${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE COINS</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">NEXT LEVEL ▶</button></div><div class="row"><button class="btn small" id="mapB2">🗺️ MAP</button><button class="btn small" id="homeB">HOME</button></div></div>`);
  $('mapB2').onclick = () => { click(); openMap(); };
  $('chestB').onclick = () => {
    $('chestB').disabled = true; $('chestB').classList.add('shake'); sfx('roll'); vib(60);
    setTimeout(() => {
      $('chestArea').innerHTML = drop.hero ? heroCard(drop.hero) : `<div class="card" style="--rc:#f0a010"><div class="hico">🪙</div><b>+${drop.coins} BONUS COINS</b><span>Keep playing to find crew heroes!</span></div>`;
      sfx('fanfare'); sfx('crewCheer', 0.3); if (drop.hero) sfx('hooray', 0.5); else sfx('coins'); vib(120); $('after').classList.remove('hidden'); refreshHome();
    }, 900);
  };
  if ($('dblB')) $('dblB').onclick = () => { click(); rewardAd('double', ok => { if (!ok) return; PF.apples += total; save(); $('totalB').textContent = '+' + (total * 2) + ' 🪙'; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { click(); closeModal(); betweenLevels(() => play(lv.n + 1)); };
  $('homeB').onclick = () => { click(); goHome(); };
}
function fail(msg, atCastle) {
  if (G.state !== 'play' && G.state !== 'finale') return;
  G.state = 'fail'; sfx('sad'); vib(200); Music.stop(); $('castleHP').classList.add('hidden'); $('hint').classList.add('hidden');
  setTimeout(() => {
    openModal(`<h2>OH NO!</h2><p style="font-size:50px;margin:4px">${atCastle ? '🏰' : '💂'}</p><p>${msg}</p><p class="tip">${atCastle ? 'Pick the bigger gates to bring a bigger army!' : 'Steer around the barrels and keep away from the edges.'}</p>
      ${adReady() ? `<div class="row"><button class="btn blue" id="adB">📺 WATCH AD: +${atCastle ? 15 : 10} PIRATES</button></div>` : ''}
      <div class="row"><button class="btn big green" id="retryB">TRY AGAIN</button></div><div class="row"><button class="btn small" id="homeB">HOME</button></div>`);
    if ($('adB')) $('adB').onclick = () => { click(); rewardAd('revive', ok => { if (ok) revive(atCastle ? 15 : 10); }); };
    $('retryB').onclick = () => { click(); closeModal(); play(lv.n); };
    $('homeB').onclick = () => { click(); goHome(); };
  }, 900);
}

// ---------------- screens ----------------
const click = () => sfx('pop');
function openModal(h) { $('modalBody').innerHTML = h; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
function setScreen(s) { $('home').classList.toggle('hidden', s !== 'home'); $('hud').classList.toggle('hidden', s !== 'hud'); }
function play(n = PF.level) { closeModal(); setScreen('hud'); startLevel(n, true); }
function goHome() { closeModal(); startLevel(PF.level, false); setScreen('home'); refreshHome(); music('title'); }
function refreshHome() {
  $('homeApples').textContent = PF.apples.toLocaleString(); const w = WORLDS[Math.floor((PF.level - 1) / 5) % 6];
  $('homeLevel').innerHTML = `LEVEL ${PF.level}<small>${w.name}${PF.level % 5 === 0 ? ' · 💰 Lalchi\'s big fort' : ''}</small>`;
  const g = giftState(); $('giftB').classList.toggle('dot', g.can);
}
const UPS = [{ id: 'start', icon: '🏴‍☠️', name: 'Bigger Army', desc: 'Start every level with +1 pirate', max: 20, base: 60 }, { id: 'apples', icon: '🪙', name: 'Treasure Hunter', desc: '+20% gold coins', max: 10, base: 90 }];
const upCost = u => Math.round(u.base * Math.pow(1.45, PF.up[u.id]) / 5) * 5;
function shop() {
  openModal(`<h2>PIRATE SHOP</h2><p>🪙 <b>${PF.apples}</b></p><h3>Upgrades</h3><div class="list">${UPS.map(u => { const l = PF.up[u.id], c = upCost(u), mx = l >= u.max; return `<div class="item"><div class="ico">${u.icon}</div><div class="txt"><b>${u.name} <small>${l}/${u.max}</small></b><span>${u.desc}</span></div><button class="btn small ${mx ? '' : 'green'}" data-u="${u.id}" ${mx || PF.apples < c ? 'disabled' : ''}>${mx ? 'MAX' : c + ' 🪙'}</button></div>`; }).join('')}</div>
    <h3>Crew heroes <small>(${PF.heroes.length}/${HEROES.length})</small></h3><div class="list">${HEROES.map(h => { const own = hasHero(h.id), [rn, rc] = RARITY[h.rar]; return own ? `<div class="item" style="border-color:${rc}"><div class="ico">${h.icon}</div><div class="txt"><b>${h.name} <small style="color:${rc}">${rn}</small></b><span>${h.power}</span></div><b style="color:#2f8a1a">✔</b></div>` : `<div class="item" style="opacity:.75"><div class="ico">❓</div><div class="txt"><b>??? <small style="color:${rc}">${rn}</small></b><span>Find in treasure chests after a win</span></div></div>`; }).join('')}</div>
    <h3>Army coats</h3><div class="list">${Object.entries(COATS).map(([k, h]) => { const own = PF.coats.includes(k), on = PF.coat === k; return `<div class="item"><div class="ico">${h.icon}</div><div class="txt"><b>${h.name}</b><span>${on ? 'Wearing' : own ? 'Owned' : 'The whole army wears it!'}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-h="${k}" ${on || (!own && PF.apples < h.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'WEAR' : h.price + ' 🪙'}</button></div>`; }).join('')}</div>
    <div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = UPS.find(q => q.id === b.dataset.u), c = upCost(u); if (PF.apples < c) return; PF.apples -= c; PF.up[u.id]++; save(); sfx('gateGood'); shop(); refreshHome(); });
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const k = b.dataset.h; if (!PF.coats.includes(k)) { if (PF.apples < COATS[k].price) return; PF.apples -= COATS[k].price; PF.coats.push(k); } PF.coat = k; save(); sfx('arr'); G.crew.forEach(q => { if (!q.hero) q.tint = coatCol(); }); shop(); refreshHome(); });
  $('closeB').onclick = () => { click(); closeModal(); refreshHome(); };
}
const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const GIFTS = [30, 50, 80, 100, 150, 200, 400];
function giftState() { const g = PF.gift || { streak: 0, last: null }, y = new Date(); y.setDate(y.getDate() - 1); if (g.last && g.last !== dayKey() && g.last !== dayKey(y)) g.streak = 0; return { g, can: g.last !== dayKey() }; }
function gift() {
  const { g, can } = giftState(), day = g.streak % 7;
  openModal(`<h2>DAILY TREASURE</h2><p>Come back every day for a bigger chest!</p><div class="days">${GIFTS.map((a, i) => `<div class="day ${i < day || (i === day && !can) ? 'done' : i === day ? 'today' : ''}">DAY ${i + 1}<b>${a}</b>🪙</div>`).join('')}</div>
    <div class="row"><button class="btn big green" id="claimB" ${can ? '' : 'disabled'}>${can ? 'CLAIM!' : 'COME BACK TOMORROW'}</button></div><div class="row"><button class="btn small" id="closeB">BACK</button></div>`);
  $('claimB').onclick = () => { if (!can) return; PF.apples += GIFTS[day]; PF.gift = { streak: g.streak + 1, last: dayKey() }; save(); sfx('fanfare'); sfx('crewCheer', 0.2); gift(); refreshHome(); };
  $('closeB').onclick = () => { click(); closeModal(); refreshHome(); };
}
function settings() {
  const t = k => `<button class="toggle ${PF.set[k] ? 'on' : ''}" data-s="${k}"></button>`;
  openModal(`<h2>SETTINGS</h2><div class="list"><div class="item"><div class="ico">🔊</div><div class="txt"><b>Sound</b></div>${t('sound')}</div><div class="item"><div class="ico">🎵</div><div class="txt"><b>Music</b></div>${t('music')}</div><div class="item"><div class="ico">📳</div><div class="txt"><b>Vibration</b></div>${t('vib')}</div><div class="item"><div class="ico">✨</div><div class="txt"><b>Sharp graphics</b><span>Turn off on slower phones</span></div>${t('hi')}</div></div>
    <p class="tip"><b>Rocky's Pirate Army</b><br>made by <b>BajrangVerse Studios</b><br>Characters: Quaternius (CC0)<br>Title and victory music: BajrangVerse Studios<br>Music: "Fiddles McGinty", "Bushwick Tarantella", "Celtic Impulse", "Rollin at 5", "Master of the Feast", "Cut and Run", "Hyperfun" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0<br>Castle and nature: Quaternius (CC0)<br>Free to play with optional ads (Google AdMob) · no accounts · your progress stays on your phone</p><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s; PF.set[k] = !PF.set[k]; save(); b.classList.toggle('on', PF.set[k]); click(); if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : lv.world.music); else Music.stop(); } if (k === 'hi') { QUAL = PF.set.hi ? 2 : 0; resize(); } });
  $('closeB').onclick = () => { click(); closeModal(); if (G.state === 'pause') resume(); };
}
function pause() { if (G.state !== 'play' && G.state !== 'finale') return; G.paused = G.state; G.state = 'pause'; Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { click(); closeModal(); resume(); }; $('setB2').onclick = settings; $('homeB').onclick = () => { click(); goHome(); }; }
function resume() { G.state = G.paused || 'play'; if (PF.set.music) music(G.state === 'finale' ? 'fight' : lv.world.music); }
window.onAppPause = () => { pause(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (!$('map').classList.contains('hidden')) { $('map').classList.add('hidden'); goHome(); return 'stay'; } if (!$('modal').classList.contains('hidden')) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'play' || G.state === 'finale') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };

// ---------------- input: drag to steer, swipe up/down to jump/slide, tap to fire ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => {
  Audio.resume();
  if (G.tug) tugTap(); else if (G.state === 'finale') finaleTap(); else if (G.ship) shipFire();
  drag = { x: e.clientX, y: e.clientY, tx: G.tx, swiped: false };
  if (G.state === 'play' && !G.teach) $('hint').classList.add('hidden');
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.swiped && Math.abs(dy) > 34 && Math.abs(dy) > Math.abs(dx) * 1.2) { drag.swiped = true; doMove(dy < 0 ? 'jump' : 'slide'); }
  if (G.state === 'play' || (G.state === 'finale' && G.finale && G.finale.boss)) G.tx = drag.tx + dx / Math.min(innerWidth, 500) * 14;
});
addEventListener('pointerup', () => { drag = null; });
const keys = {};
addEventListener('keydown', e => { keys[e.key] = true; if (e.key === 'ArrowUp') doMove('jump'); if (e.key === 'ArrowDown') doMove('slide'); if (e.key === ' ') { if (G.state === 'finale') finaleTap(); else if (G.ship) shipFire(); } if (e.key === 's') cannonStorm(); });
addEventListener('keyup', e => { keys[e.key] = false; });

// ---------------- the treasure map: every island, every level, the stars won ----------------
const ISLE = { beach: '🏝️', jungle: '🌴', snow: '❄️', volcano: '🌋', coral: '🐚', night: '🌙' };
function openMap() {
  closeModal(); const sc = $('mapScroll'), top = Math.max(PF.level, 1), worlds = Math.max(6, Math.ceil(top / 5) + 1), ST = PF.stars || {};
  let h = '', total = 0; for (const k in ST) total += ST[k];
  for (let w = 0; w < worlds; w++) {
    const W2 = WORLDS[w % WORLDS.length], round = Math.floor(w / WORLDS.length);
    h += `<div class="mw" style="background:linear-gradient(${W2.sky[1]}55, ${W2.sky[0]}33)"><div class="isl">${ISLE[W2.id] || '🏝️'}</div><h3>${W2.name}${round ? ' ' + 'I'.repeat(round + 1) : ''}<small>Island ${w + 1} · levels ${w * 5 + 1}–${w * 5 + 5}</small></h3>`;
    for (let i = 0; i < 5; i++) {
      const n = w * 5 + i + 1, x = [22, 50, 78, 50, 22][i] + (w % 2 ? 0 : 0), lock = n > top, boss = n % 5 === 0, st = ST[n] || 0;
      h += `<div class="mrow">${i < 4 ? [0.25, 0.5, 0.75].map(k => `<span class="mdot" style="left:calc(${x + ([50, 78, 50, 22][i] - x) * k}% - 5px);top:${42 + 92 * k}px"></span>`).join('') : ''}<button class="mnode${lock ? ' lock' : ''}${boss ? ' boss' : ''}${n === top ? ' cur' : ''}" data-n="${n}" style="left:${x}%">${lock ? '🔒' : boss ? '💰' : n}${!lock ? `<span class="st">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">⭐</i>`).join('')}</span>` : ''}</button></div>`;
    }
    h += '</div>';
  }
  sc.innerHTML = h; $('mapStars').textContent = total; $('map').classList.remove('hidden');
  sc.querySelectorAll('.mnode').forEach(b => b.onclick = () => { const n = +b.dataset.n; if (n > top) { sfx('gateBad'); return; } click(); Audio.resume(); $('map').classList.add('hidden'); play(n); });
  const cur = sc.querySelector('.mnode.cur'); if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
}
$('mapBack').onclick = () => { click(); $('map').classList.add('hidden'); goHome(); };
$('mapB').onclick = () => { click(); Audio.resume(); openMap(); };
$('playB').onclick = () => { Audio.resume(); click(); play(); };
$('shopB').onclick = () => { click(); shop(); };
$('giftB').onclick = () => { click(); gift(); };
$('setB').onclick = () => { click(); settings(); };
$('pauseB').onclick = () => { click(); pause(); };
$('stormB').onclick = e => { e.stopPropagation(); cannonStorm(); };
document.addEventListener('pointerdown', () => { Audio.resume(); if (G.state === 'home') music('title'); }, { once: true });

// ---------------- camera & loop ----------------
const camP = new THREE.Vector3(0, 12, 14), camL = new THREE.Vector3(), tmp = new THREE.Vector3(), tmpL = new THREE.Vector3();
function updateCamera(dt) {
  let p, l, k1 = 5, k2 = 6;
  if (G.state === 'home') { const a = Math.sin(G.t * 0.3) * 0.5; p = tmp.set(Math.sin(a) * 7, 3.6, G.z + 7.5); l = tmpL.set(0, 1.2, G.z + 0.5); k1 = 3; k2 = 3; }
  else if (G.finale && G.finale.st) { const S = G.finale.st; p = tmp.set(10, 4.5 + S.top, S.z + 11); l = tmpL.set(0, 1.2 + S.top * 0.6, S.z + 1.5); k1 = 2; k2 = 2.5; }
  else if (G.finale && G.finale.win && G.finale.t - G.finale.winT > 2.6) { const a = Math.sin((G.finale.t - G.finale.winT) * 0.3) * 0.9; p = tmp.set(Math.sin(a) * 12, 7.5, castle.z + 1.5 + Math.cos(a) * 12); l = tmpL.set(0, 2.5, castle.z + 1.5); k1 = 2; k2 = 3; }
  else if (G.finale && G.finale.boss && !G.finale.win) { const F = G.finale; p = tmp.set(F.ox * 0.3, 10, F.line + 12); l = tmpL.set(F.boss.x * 0.4, 3, F.boss.z + 2); k1 = 2; k2 = 2.5; }
  else if (G.finale) { p = tmp.set(0, 10.5, castle.z + 33); l = tmpL.set(0, 4, castle.z + 3); k1 = 2; k2 = 2.5; }
  else { const zoom = 1 + Math.min(0.75, G.crew.length / 150), up = G.air ? 2.5 : 0;
    if (G.ship) { const sz = Math.max(1, (herdDepth() + 3) / 12); p = tmp.set(G.x * 0.6, 11 + zoom * 2, G.z + 12 * sz + 7); l = tmpL.set(G.x * 0.8, 1.5, G.z - 4); }   // high behind the ship
    else { p = tmp.set(G.x * 0.5 + (G.air ? 4 : 0), 4.9 * zoom + up, G.z + 7.2 * zoom + herdDepth() * 0.42); l = tmpL.set(G.x * 0.7, 1.3 + up * 0.6, G.z - 7); } }
  camP.lerp(p, 1 - Math.exp(-k1 * dt)); camL.lerp(l, 1 - Math.exp(-k2 * dt));
  const fovT = (innerWidth / innerHeight < 0.6 ? 60 : 52) + (G.boost > 0 || G.storm > 0 ? 9 : 0); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); if (G.shake > 0) { G.shake -= dt; cam.position.x += rnd(-1, 1) * G.shake * 0.5; cam.position.y += rnd(-1, 1) * G.shake * 0.5; }
  cam.lookAt(bendPoint(camL, tmp));
  if (W) W.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(G.x, 0, (G.finale ? castle.z + 8 : G.z - 4))); sun.target.position.copy(sp); sun.position.copy(sp).add(tmp.set(-8, 22, 10));
}
let lastT = performance.now();
const WARP = +(new URLSearchParams(location.search).get('warp') || 1);
const FPS = { t: 0, n: 0, slow: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - lastT; let dt = Math.max(0, Math.min(0.067, raw / 1000)); lastT = now;   // the game keeps its real speed down to 15 frames a second (no slow motion)
  // too slow for this phone? render a little less sharp (never below 1.5 pixels per point)
  if ((G.state === 'play' || G.state === 'finale' || G.state === 'home') && raw < 500) {
    if (G.t > 4) { FPS.t += raw; FPS.n++; }   // the first seconds of a level (loading) don't count
    if (FPS.t > 2500) { const avg = FPS.t / FPS.n; FPS.slow = avg > 30 ? FPS.slow + 1 : 0; FPS.t = FPS.n = 0; if (FPS.slow >= 2 && QUAL > 0) { QUAL--; FPS.slow = 0; resize(); } }
  }
  if (G.state === 'load' || G.state === 'pause' || G.state === 'icon') { renderer.render(scene, cam); return; }
  if (G.state === 'play' || G.state === 'finale') { if (keys.ArrowLeft) G.tx -= 10 * dt; if (keys.ArrowRight) G.tx += 10 * dt; }
  dt *= G.slow * (G.air ? 0.55 : 1);
  const t0 = performance.now();
  for (let i = 0; i < WARP; i++) update(WARP > 1 ? 0.05 * G.slow : dt);
  updatePops(dt); updateCamera(WARP > 1 ? 0.05 : dt);
  const t1 = performance.now();
  renderer.render(scene, cam);
  PERF.upd += t1 - t0; PERF.ren += performance.now() - t1; PERF.n++; PERF.calls = renderer.info.render.calls; PERF.fx = fx.length; PERF.tris = renderer.info.render.triangles;
}
const PERF = window.__perf = { upd: 0, ren: 0, n: 0, reset() { this.upd = this.ren = this.n = 0; } };

// ---------------- boot: the studio card, then load the people ----------------
function loadBin(url) { return new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = () => (x.status === 200 || x.status === 0) && x.response ? ok(x.response) : no(new Error('load ' + x.status)); x.onerror = () => no(new Error('load')); x.send(); }); }
const t0 = performance.now(), Q = new URLSearchParams(location.search);
// the BajrangVerse tune plays with the studio logo (the app allows sound before the first tap; a browser waits for one)
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap first */ } }
Promise.all(['people.bin', 'castle.glb', 'nature.glb'].map(loadBin)).then(async ([buf, cb, nb]) => {
  P = await loadPeople(buf);
  const gl = new GLTFLoader(), sharp = o => { o.traverse(m => { if (m.isMesh && m.material.map) m.material.map.anisotropy = 2; }); return o; };   // crisp textures at a glancing angle
  setCastleModel(sharp((await gl.parseAsync(cb, '')).scene.getObjectByName('castle'))); setNature(sharp((await gl.parseAsync(nb, '')).scene.getObjectByName('nature')));
  for (const k of ['pirate', 'pirate2', 'pirate3', 'pirateF', 'pirateF2']) { crowds[k] = new Crowd(scene, P[k]); crowds[k + '_lo'] = new Crowd(scene, P[k + '_lo']); } crowdG = new Crowd(scene, P.guard); crowdGL = new Crowd(scene, P.guard_lo || P.guard); blobs = new Blobs(scene, dotTex, 600);
  for (const k in crowds) crowds[k].prewarm(24); crowdG.prewarm(24); crowdGL.prewarm(32);
  { const all = [...Object.values(crowds), crowdG, crowdGL]; all.forEach(c => c.gpuWarm(true)); for (const k in P) if (P[k].tex) renderer.initTexture(P[k].tex); renderer.compile(scene, cam); renderer.render(scene, cam); all.forEach(c => c.gpuWarm(false)); } psys(false, false); psys(false, true); psys(true, false); psys(true, true);
  crab = buildCrab(); scene.add(crab); bossKit = buildBossKit(); stairs = buildStairs(); scene.add(stairs);
  MIT = parrotModel(0x2ad83a); MIT.scale.setScalar(0.7); scene.add(MIT);
  rocky = new Actor(P.hero, { tint: 0xb3202a, skin: 0xb97a52, hair: 0x1a1210 }); rocky.scale.setScalar(1.08); scene.add(rocky);
  lalchi = new Actor(P.villain, { tint: 0x7a1a8a, skin: 0xd8a070, hair: 0x2a2a2a }); scene.add(lalchi);
  if (Q.get('level')) PF.level = +Q.get('level');
  startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  Music.warm(['title', lv.world.music, 'fight', 'win']);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  if (Q.get('play')) play();
  if (Q.get('lineup')) lineup();
  if (Q.get('icon')) iconShot();
  requestAnimationFrame(frame);
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; });

// test view: every character side by side, close up
function lineup() {
  G.state = 'icon'; $('home').classList.add('hidden'); $('studio').classList.add('gone');
  ['pirate', 'pirate2', 'pirate3', 'pirateF', 'pirateF2'].forEach((k, i) => crowds[k].draw([person({ x: -3.2 + i * 1.15 + (i > 1 ? 1.4 : 0), z: i % 2 ? -0.5 : 0, ry: PI + 0.2, clip: ['idle', 'throw', 'victory', 'idle', 'run'][i], t: 0.3 + i * 0.2, tint: COATS.mixed.cols[i], skin: SKINS[i + 1], hair: HAIRS[i] })]));
  crowdG.draw([person({ x: 3.6, z: -0.8, ry: PI - 0.4, clip: 'shoot', t: 0.1, tint: GUARD_COATS[0], skin: SKINS[1], hair: HAIRS[1] })]);
  blobs.draw([]);
  rocky.position.set(-0.3, 0, 0.5); rocky.rotation.set(0, PI, 0); rocky.play('victory'); rocky.pose('victory', 0.6);
  lalchi.position.set(2.4, 0, -0.8); lalchi.rotation.set(0, PI - 0.3, 0); lalchi.scale.setScalar(1.1); lalchi.pose('punch', 0.3);
  cam.fov = 40; cam.updateProjectionMatrix(); bendPoint(camP.set(0.3, 1.8, 7), cam.position); cam.lookAt(0.3, 1.0, 0);
}
// used to render the app icon
function iconShot() {
  G.state = 'icon'; $('home').classList.add('hidden'); $('studio').classList.add('gone');
  for (const k in crowds) crowds[k].draw([]); crowdG.draw([]); crowdGL.draw([]); blobs.draw([]); lalchi.visible = false; objs.forEach(o => { o.obj.visible = false; });
  W.group.visible = false; castle.group.visible = false; scene.fog = null;
  scene.background = canvasTex(512, 512, (c, w, h) => { const g = c.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h / 2, w * 0.75); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.35, '#ffc23a'); g.addColorStop(0.75, '#f0700f'); g.addColorStop(1, '#b8360a'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.13)'; for (let i = 0; i < 16; i++) { const a0 = i / 16 * PI * 2; c.beginPath(); c.moveTo(w / 2, h * 0.42); c.arc(w / 2, h * 0.42, w, a0, a0 + PI / 16); c.fill(); } });
  for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.3, c = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 18), new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.8, roughness: 0.25, emissive: 0xa86a00 }), Math.cos(a) * 0.95, 1.25 + Math.sin(a) * 0.75, -0.5); c.rotation.set(PI / 2 + rnd(-0.6, 0.6), rnd(-0.6, 0.6), 0); scene.add(c); }
  rocky.position.set(0, 0, 0); rocky.rotation.set(0, PI - 0.35, 0); rocky.scale.setScalar(1); rocky.pose(Q.get('pose') || 'victory', +(Q.get('pt') || 1.3)); const fill = new THREE.DirectionalLight(0xfff0e0, 2.2); fill.position.set(0.3, 1.0, 3); scene.add(fill);
  sun.position.set(2, 5, 6); sun.target.position.set(0, 1, 0); hemi.intensity = 1.8;
  cam.fov = 30; cam.aspect = 1; cam.updateProjectionMatrix(); cam.position.set(0.1, Q.get('far') ? 1.3 : 1.38, Q.get('far') ? 3.5 : 2.4); cam.lookAt(0.05, Q.get('far') ? 1.4 : 1.52, 0);
  setBend(1, 1e6);
}
window.__goto = t => { const o = objs.find(o => o.t === t && o.z < G.z); if (!o) return false; G.z = o.z + 26; reslot(); G.crew.forEach(q => { q.z = G.z + q.oz; }); return true; };
window.__lv = n => makeLevel(n).ev.map(e => e.t).join(" ");
window.__calls = () => { const r = {}; const tag = o => { let q = o; while (q.parent && q.parent !== scene) q = q.parent; return q === W.group ? 'world' : castle && q === castle.group ? 'castle' : objs.some(x => x.obj === q) ? 'events' : q.isSprite ? 'sprites' : q.type + ':' + (q.name || ''); }; scene.traverseVisible(o => { if ((o.isMesh || o.isSprite || o.isPoints) && !(o.isInstancedMesh && o.count === 0)) { const k = tag(o); r[k] = (r[k] || 0) + 1; } }); return r; };
window.__wtris = () => { const r = {}; W.group.traverseVisible(o => { if (o.isMesh) { const k = (o.material.name || (o.material.map ? 'tex' : '#' + (o.material.color ? o.material.color.getHexString() : ''))) + (o.parent && o.parent.userData.z0 !== undefined ? '' : ':' + (o.name || o.type)); const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; r[k] = (r[k] || 0) + t; } }); return Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + '=' + Math.round(v)).join(' '); };
window.__alltris = () => { const r = {}; scene.children.forEach(top => { let t = 0; top.traverseVisible(o => { if (o.isMesh || o.isPoints) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); t += n; } }); const k = top === W.group ? 'world' : castle && top === castle.group ? 'castle' : objs.some(x => x.obj === top) ? 'events' : (top.isInstancedMesh ? 'inst:' + (top.material.name || top.geometry.type) : top.type) + (top === rocky ? ':rocky' : top === lalchi ? ':lalchi' : ''); r[k] = (r[k] || 0) + Math.round(t); }); return JSON.stringify(Object.entries(r).filter(e => e[1] > 500).sort((a, b) => b[1] - a[1])); };
window.__T = THREE; window.__R = renderer; window.__S = scene; window.__C = cam; window.__setQ = q => { QUAL = q; resize(); };
window.__objs = () => objs; window.__lvl = () => lv; window.__storm = () => cannonStorm(); window.__move = t => doMove(t); window.__fire = () => (G.state === 'finale' ? finaleTap() : shipFire());
window.__G = G; window.__objs = objs; window.__tug = tugTap; window.__move = doMove; window.__lv = () => lv; window.__play = play; window.__castle = () => castle; window.__end = () => { G.z = -lv.L + 3; return lv.L; }; window.__tap = () => tapFire();
window.__tris = () => { let t = 0; scene.traverse(o => { if (o.isInstancedMesh && o.count && o.visible) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * o.count; }); return Math.round(t); };
