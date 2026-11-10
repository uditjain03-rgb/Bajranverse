// SPLASH RACER — by BajrangVerse Studios
// A speedboat race across eight water worlds: a tropical lagoon, a jungle river with waterfalls, red-canyon rapids, a
// frozen fjord, the ghats at sunset, a neon harbour at night, a stormy sea and a volcano island. Ride the real waves,
// fly off wave ramps and do tricks (swipe up = flip, swipe left/right = barrel roll), drop down waterfalls, escape
// whirlpools, dodge crocodiles, icebergs, ferries and lava rocks, grab mystery bubbles for water balloons, duck mines,
// bubble shields, rockets and octopus ink. Five funny rivals, a boss every 4th race, a podium, a boat garage.
import * as THREE from 'three';
import { setBend, bendPoint, canvasTex, flat, mesh, oneMesh } from '../common/gfx.js';
import { renderer, scene, cam, hemi, sun, rim, E, $, Q, PI, clamp, damp, rnd, pick, puff, splash, popText, banner, flash, startLoop, loadBin, setQuality, fling, clearFx, clearPops, warmRing, dotTex } from '../common/engine.js';
import { setKits, kit } from '../common/track.js';
import { buildCourse, WORLDS, HW, wave } from '../common/course.js';
import { makeBoat } from '../common/cars.js';
import { loadPeople, Actor, EXPR } from '../common/people.js';
import { drawFace } from '../common/portrait.js';
import { Audio } from '../common/audio.js';
import { Music } from '../common/music.js';
import { Engine } from '../common/sfx.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makePrefs, openModal, closeModal, modalOpen, onAdDone, adReady, rewardAd, betweenLevels, vibrate, settingsPanel, giftPanel, giftState } from '../common/ui.js';

const PF = makePrefs('splashracer_v2', { level: 1, coins: 0, boats: ['speed'], boat: 'speed', color: 0xe8302a, helmet: 0xe8402a, wins: 0, gift: null, set: { sound: true, music: true, vib: true, hi: true } });
setQuality(PF.set.hi ? 2 : 0); Audio.setMuted(!PF.set.sound);
Music.config({ title: 'bv_title', race: 'duck', race2: 'gameshow', race3: 'wallpaper', race4: 'snitch', boss: 'hyperfun', win: 'bv_win', podium: 'carefree' }, { bv_title: 0.95, bv_win: 1, duck: 0.75, gameshow: 0.72, wallpaper: 0.72, snitch: 0.75, hyperfun: 0.75, carefree: 0.75 });
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
E.onSfx = n => sfxT(n, 0.05);
const vib = ms => vibrate(PF, ms);
const _p = new THREE.Vector3(), _q = new THREE.Vector3();

// ---------------- racers, boats ----------------
const RIVALS = [
  { name: 'Captain Sonu', boat: 'speed', col: 0x2a8ad8, helmet: 0x2a8ad8, suit: 0x1a4aa8, skin: 0xc68642, fem: 0, skill: 0.9, f0: 190, lines: ['Bye bye, slowpoke!', 'Catch me if you can!', 'Splash splash!'], hurt: ['Arre! My boat!', 'Not fair!', 'I\'m all wet!'] },
  { name: 'Aunty Rocket', boat: 'catamaran', col: 0xe84a9a, helmet: 0xe84a9a, suit: 0xb02a7a, skin: 0xe0ac69, fem: 1, skill: 0.88, f0: 250, lines: ['Beta, move aside!', 'Aunty is coming!', 'My hair is waterproof!'], hurt: ['Hai Ram!', 'My hair!', 'Who threw that?!'] },
  { name: 'Turbo Tinku', boat: 'jetski', col: 0x3fcf6e, helmet: 0x3fcf6e, suit: 0x1a8a3a, skin: 0x8d5524, fem: 0, skill: 0.93, f0: 170, lines: ['Turbo time!', 'Eat my splash!', 'Hahaha!'], hurt: ['Ouch ouch!', 'Who put a croc here?!'] },
  { name: 'Dizzy Dolly', boat: 'airboat', col: 0xffc21a, helmet: 0xffc21a, suit: 0xd89a10, skin: 0xf1c27d, fem: 1, skill: 0.86, f0: 270, lines: ['Wheee!', 'Which way is the finish?', 'Hehehe!'], hurt: ['Oopsie!', 'Dizzy dizzy!'] },
  { name: 'Professor Pappu', boat: 'cigarette', col: 0xa05ad8, helmet: 0xa05ad8, suit: 0x6a3aa8, skin: 0xa86b3c, fem: 0, skill: 0.91, f0: 140, lines: ['Physics says I win!', 'Calculated!', 'Buoyancy is my friend!'], hurt: ['Not in my formula!', 'Hmm, error!'] },
];
const BOSS = { name: 'Mr. Moneybags', boat: 'cigarette', col: 0xffc21a, helmet: 0xffc21a, suit: 0x1a1a1a, skin: 0xd8a070, fem: 0, skill: 1.03, f0: 110, boss: 1, lines: ['Money makes me FAST!', 'Out of my way, peasants!', 'Ha ha ha!'], hurt: ['My golden boat!', 'I will buy this lake!'] };
const BOATS = [
  { id: 'speed', name: 'Sunny Speedboat', price: 0, sp: 1, turn: 1 }, { id: 'jetski', name: 'Zippy Jet Ski', price: 450, sp: 1.03, turn: 1.25 },
  { id: 'catamaran', name: 'Twin Wave Cat', price: 900, sp: 1.05, turn: 1.05 }, { id: 'airboat', name: 'Swamp Fan Boat', price: 1500, sp: 1.07, turn: 1.1 },
  { id: 'cigarette', name: 'Rocket Racer', price: 2600, sp: 1.11, turn: 0.95 }];
const COLORS = [0xe8302a, 0x2a8ad8, 0x3fcf6e, 0xffc21a, 0xe84a9a, 0x1a1a1a, 0xffffff, 0xa05ad8, 0xff7a1a, 0x1ad8c8];
const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

// ---------------- the races ----------------
const ORDER = ['lagoon', 'jungle', 'canyon', 'arctic', 'ghats', 'harbour', 'storm', 'volcano'];
const SPECIAL = { lagoon: ['dolphins', 'dolphins', 'ball'], jungle: ['croc', 'croc', 'logs'], canyon: ['rocks', 'rocks', 'rocks'], arctic: ['iceberg', 'iceberg', 'floe'], ghats: ['ferry', 'diyas', 'diyas'], harbour: ['ferry', 'barrels', 'ferry'], storm: ['cannon', 'rocks', 'dolphins'], volcano: ['lava', 'lava', 'rocks'] };
function makeLevel(n) {
  let s = n * 7919 + 13; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647), r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const world = ORDER[(n - 1) % ORDER.length], W = WORLDS[world], d = Math.min(1, (n - 1) / 20), boss = n % 4 === 0;
  const L = Math.round(Math.min(4600, 3000 + n * 70)), falls = [];
  for (let i = 0; i < (W.falls || 0); i++) falls.push(Math.round(-L * (i + 1) / ((W.falls || 0) + 1) + r(-60, 60)));
  const near = z => falls.some(f => Math.abs(z - f) < 45);
  const ev = []; let lastItems = 0, lastRamp = 0;
  for (let z = -110; z > -L + 120; z -= r(30, 42) - d * 6) {
    if (near(z)) continue;
    const pool = ['coins', 'coins', 'boost', 'buoys', 'ramp', ...SPECIAL[world], ...(n >= 2 ? ['whirl'] : []), ...(n >= 3 ? SPECIAL[world] : [])];
    let t = pk(pool);
    if (lastItems - z > 220) { t = 'items'; lastItems = z; }
    if (t === 'ramp') { if (lastRamp - z < 140) t = 'coins'; else lastRamp = z; }
    ev.push({ t, z, x: pk([-10, -6, -2, 2, 6, 10]), side: pk([-1, 1]), n: 2 + Math.floor(R() * 3) });
  }
  return { n, L, d, world, W, falls, boss, ev, music: boss ? 'boss' : pk(['race', 'race2', 'race3', 'race4']) };
}

// ---------------- state ----------------
const G = { state: 'load', t: 0, racers: [], me: null, lv: null, course: null, objs: [], coins: 0, nitro: 0.4, finished: [], item: null };
let P = null;
const ITEMS = { balloon: '🎈', ducks: '🦆', shield: '🫧', rocket: '🚀', ink: '🐙', wave: '🌊' };
// a racer: a boat with a driver (a real person with a face) and a foam wake behind it
function makeRacer(spec, isMe) {
  const root = new THREE.Group(); scene.add(root);
  const V = makeBoat(spec.boat, spec.col, { seat: spec.boss ? 0x1a1a1a : 0xffffff, deck: spec.boss ? 0xffd23f : spec.col, bottom: 0xf4f6f8, stripe: 0xffffff }); root.add(V.obj);
  const drv = new Actor(P[spec.fem ? 'racerF' : 'racerM'], { tint: spec.suit, skin: spec.skin, hair: spec.helmet, expr: EXPR.happy }); drv.scale.setScalar(0.92); root.add(drv); drv.play('drive');
  const SEAT = { speed: [0.62, -0.05], cigarette: [0.75, -0.08], catamaran: [0.6, 0.15], airboat: [0.1, 0.0], jetski: [0.25, -0.02] }[spec.boat] || [0.6, 0];
  drv.position.set(0, V.deckY + SEAT[1], SEAT[0]);
  const face = document.createElement('canvas'); face.width = face.height = 64;
  const R = { spec, isMe, root, V, drv, x: 0, z: 0, y: 0, vy: 0, speed: 0, air: false, nitro: 0, stun: 0, spin: 0, trick: null, trickT: 0, roll: 0, flipA: 0, lane: 0, done: false, place: 0, face, expr: 'happy', exprT: 0, talkT: rnd(3, 8), item: null, itemT: rnd(4, 9), shield: 0, wake: makeWake(isMe) };
  return R;
}
function setFace(R, e, dur = 2) { R.expr = e; R.exprT = dur; R.drv.expr = EXPR[e] ?? 0; }
function say(R, text, e) { if (!R) return; showBubble(R, text); if (e) setFace(R, e, 2.2); sfx('talk', 0, { w: pick(['hey', 'wow', 'haha', 'yay', 'wheee']), f0: R.spec.f0, fk: R.spec.fem ? 1.12 : 0.95 }); }
let bubbleT = 0;
function showBubble(R, text) { const b = $('bubble'); $('bubbleName').textContent = R.isMe ? 'YOU' : R.spec.name; $('bubbleText').textContent = text; b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); bubbleT = 2.6; G.bubbleR = R; }
// ---------------- the foam wake: a ribbon of the last positions, widening and fading ----------------
const wakeTex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() * h; c.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`; c.beginPath(); c.ellipse(x, y, 2 + Math.random() * 5, 3 + Math.random() * 8, 0, 0, 7); c.fill(); } const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
wakeTex.wrapT = THREE.RepeatWrapping;
const NW = 22;
function makeWake(big) {
  const pos = new Float32Array(NW * 2 * 3), uv = new Float32Array(NW * 2 * 2), col = new Float32Array(NW * 2 * 3), idx = [];
  for (let i = 0; i < NW - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: wakeTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
  return { m, pts: [], t: 0, w: big ? 1.1 : 0.9 };
}
function updateWake(R, dt) {
  const W = R.wake, near = Math.abs(R.z - G.me.z) < 90; W.m.visible = near && G.state !== 'podium'; if (!near) return;
  W.t += dt; if (W.t > 0.05) { W.t = 0; W.pts.unshift({ x: R.x, z: R.z + R.V.size.z * 0.45, a: R.air ? 0 : clamp(R.speed / 25, 0, 1), age: 0 }); if (W.pts.length > NW) W.pts.pop(); }
  const p = W.m.geometry.attributes.position, u = W.m.geometry.attributes.uv, c = W.m.geometry.attributes.color;
  for (let i = 0; i < NW; i++) {
    const q = W.pts[Math.min(i, W.pts.length - 1)] || { x: R.x, z: R.z, a: 0 }, k = i / (NW - 1), hw = W.w * (0.45 + k * 2.4), y = G.course.level(q.z) + 0.12;
    p.setXYZ(i * 2, q.x - hw, y, q.z); p.setXYZ(i * 2 + 1, q.x + hw, y, q.z); u.setXY(i * 2, 0, k * 7 - G.t * 0.8); u.setXY(i * 2 + 1, 1, k * 7 - G.t * 0.8);
    const f = q.a * (1 - k) * 0.55; c.setXYZ(i * 2, f, f, f); c.setXYZ(i * 2 + 1, f, f, f);
  }
  p.needsUpdate = true; u.needsUpdate = true; c.needsUpdate = true;
}
// ---------------- building a race ----------------
function clearLevel() {
  if (G.course) G.course.dispose(); G.objs.forEach(o => o.obj && scene.remove(o.obj)); G.objs = [];
  G.racers.forEach(R => { scene.remove(R.root); scene.remove(R.wake.m); }); G.racers = []; clearFx(); clearPops(); if (G.podium) { scene.remove(G.podium); G.podium = null; } if (G.gates) G.gates.forEach(g => scene.remove(g)); G.shots && G.shots.forEach(s => scene.remove(s.m)); G.shots = [];
}
function startLevel(n, playNow) {
  clearLevel();
  const lv = G.lv = makeLevel(n), W = lv.W;
  setBend(n + 11, -lv.L - 60, 1.15, 0, -40);
  G.course = buildCourse({ L: lv.L, world: lv.world, falls: lv.falls, seed: n * 31 + 5 }, scene);
  hemi.intensity = W.hemi; sun.intensity = W.light; rim.intensity = W.night ? 1.1 : 0.7; hemi.color.set(W.night ? 0x8a8aff : W.warm || W.lava ? 0xffd0b0 : 0xe4f0ff); sun.color.set(W.night ? 0xb0b8ff : W.warm || W.lava ? 0xffb080 : 0xffeccc);
  const field = [...RIVALS.slice(0, 4), lv.boss ? BOSS : RIVALS[4]];
  const meSpec = { name: 'YOU', boat: PF.boat, col: PF.color, helmet: PF.helmet, suit: 0x2a2a30, skin: 0xb97a52, fem: 0, skill: 1, f0: 150, lines: [], hurt: [] };
  field.forEach((s, i) => { const R = makeRacer(s, false); R.x = [-9, -3, 3, 9, 0][i]; R.z = -10 - (i === 4 ? 9 : 0); R.lane = R.x; G.racers.push(R); });
  G.me = makeRacer(meSpec, true); G.me.x = 0; G.me.z = 2; G.racers.push(G.me);
  // start and finish: floating arches with flags
  G.gates = [-4, -lv.L].map(z => { const g = arch(z === -4 ? 'START' : 'FINISH'); g.position.set(0, G.course.level(z), z); scene.add(g); return g; });
  for (const e of lv.ev) spawn(e);
  Object.assign(G, { t: 0, coins: 0, nitro: 0.45, finished: [], tx: 0, countT: 3.6, state: playNow ? 'count' : 'home', shownPlace: 0, item: null, rollT: 0, combo: 0, fallsSeen: 0 });
  $('lvl').textContent = (lv.boss ? '👑 ' : '') + W.name.toUpperCase(); setItem(null);
  try { G.course.cullAll(); const done = warmRing(); renderer.compile(scene, cam); renderer.render(scene, cam); done(); } catch (e) { /* not needed */ }
  updateHud(0);
  if (playNow) { music(lv.music); banner(lv.boss ? '👑 BOSS RACE!' : W.name.toUpperCase(), lv.boss ? 'Beat Mr. Moneybags!' : 'Race ' + n, 2); }
}
function arch(label) {
  const g = new THREE.Group(), c = label === 'START' ? 0x2a8ad8 : 0xff4a6a;
  for (const s of [-1, 1]) { mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.4, 12), flat(0xffffff), s * (HW + 1), 0, 0, g); mesh(new THREE.CylinderGeometry(0.45, 0.45, 9, 10), flat(c), s * (HW + 1), 4.5, 0, g); }
  const t = canvasTex(1024, 128, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#1a1a1a' : '#ffffff'; x.fillRect(i * 64, 0, 64, h); } x.fillStyle = label === 'START' ? '#2a8ad8' : '#ff4a6a'; x.fillRect(260, 10, 504, h - 20); x.fillStyle = '#fff'; x.font = 'bold 84px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, w / 2, h / 2 + 4); });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2 * HW + 3, 2.2, 0.6), [flat(c), flat(c), flat(c), flat(c), new THREE.MeshBasicMaterial({ map: t }), new THREE.MeshBasicMaterial({ map: t })]); b.position.y = 9.5; g.add(b);
  for (let i = 0; i < 9; i++) { const f = mesh(new THREE.ConeGeometry(0.5, 1.2, 3), flat(pick([0xff4a6a, 0xffd23f, 0x2a8ad8, 0x3fcf6e])), -HW + i * HW / 4, 8, 0, g); f.rotation.x = PI; }
  g.traverse(q => { q.frustumCulled = false; }); return g;
}
// ---------------- things on the water ----------------
const FLAME = new THREE.MeshBasicMaterial({ color: 0xffb21a });
const coinG = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16); coinG.rotateX(PI / 2);
const coinIM = new THREE.InstancedMesh(coinG, new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x8a5a00, roughness: 0.3 }), 160); coinIM.frustumCulled = false; coinIM.count = 0; scene.add(coinIM);
const coinAt = (x, y, z, g) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xff7ad8, emissive: 0x7a2a9a, roughness: 0.1 });
const bubIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.8, 2), bubbleMat, 40); bubIM.frustumCulled = false; bubIM.count = 0; scene.add(bubIM);
const boostTex = canvasTex(64, 128, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(80,240,255,${0.9 - i * 0.2})`; c.beginPath(); c.moveTo(w / 2, i * 40 + 4); c.lineTo(w - 4, i * 40 + 34); c.lineTo(w - 18, i * 40 + 34); c.lineTo(w / 2, i * 40 + 18); c.lineTo(18, i * 40 + 34); c.lineTo(4, i * 40 + 34); c.fill(); } });
boostTex.wrapT = THREE.RepeatWrapping;
const whirlTex = canvasTex(256, 256, (c, w) => { c.translate(w / 2, w / 2); for (let i = 0; i < 6; i++) { c.rotate(PI / 3); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 10; c.beginPath(); for (let a = 0; a < 5; a += 0.1) c.lineTo(Math.cos(a) * a * 22, Math.sin(a) * a * 22); c.stroke(); } const g = c.createRadialGradient(0, 0, 4, 0, 0, 128); g.addColorStop(0, 'rgba(0,20,40,.9)'); g.addColorStop(0.5, 'rgba(0,40,80,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-128, -128, 256, 256); });
function surf(x, z) { return G.course.surface(x, z, G.t).h; }
function spawn(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, hit: new Set() }, y0 = G.course.level(e.z);
  if (e.t === 'coins' || e.t === 'diyas') { o.items = []; for (let i = 0; i < 8; i++) o.items.push(coinAt(e.x + Math.sin(i * 0.6) * 2.5, y0 + 1, -i * 3, g)); if (e.t === 'diyas') { const dg = new THREE.Group(); for (let i = 0; i < 10; i++) { const x = rnd(-HW + 2, HW - 2), z = rnd(-25, 5); mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.15, 8), flat(0xc86a2a), x, y0 + 0.1, z, dg); mesh(new THREE.ConeGeometry(0.08, 0.25, 6), flat(0xffc21a), x, y0 + 0.3, z, dg); } g.add(oneMesh(dg)); } }
  else if (e.t === 'boost') { o.items = []; for (const dx of [-3, 3]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), new THREE.MeshBasicMaterial({ map: boostTex.clone(), transparent: true, depthWrite: false })); m.material.map.needsUpdate = true; m.rotation.x = -PI / 2; m.position.set(e.x + dx, y0 + 0.35, 0); g.add(m); o.items.push(m); } }
  else if (e.t === 'items') { o.items = []; for (let i = 0; i < 5; i++) { const b = new THREE.Object3D(); b.position.set(-12 + i * 6, y0 + 1.3, 0); g.add(b); o.items.push(b); } }
  else if (e.t === 'buoys') { o.items = []; for (let i = 0; i < 6; i++) { const b = buoy(i % 2); b.position.set((i % 2 ? 1 : -1) * 5 + e.x * 0.3, y0, -i * 7); g.add(b); o.items.push(b); } }
  else if (e.t === 'ramp') { const r = new THREE.Group(), w = 7; const top = mesh(new THREE.BoxGeometry(w, 0.3, 7), flat(0x2ab8ff, { emissive: 0x0a3a5a }), 0, 0.9, 0, r); top.rotation.x = 0.28; for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(w + 0.05, 0.06, 0.35), flat(0xffffff), 0, 0.2 + i * 0.4, 3 - i * 1.4, r).rotation.x = 0.28; for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.6, 0.6, 7.2, 10), flat(0xff6a3a), s * (w / 2 + 0.3), 0.6, 0, r).rotation.x = PI / 2 + 0.28; r.position.set(e.x, y0, 0); g.add(oneMesh(r)); o.w = w; o.items = []; for (let i = 0; i < 9; i++) o.items.push(coinAt(e.x, y0 + 5 + Math.sin(i / 8 * PI) * 5, -7 - i * 3.2, g)); const hoop = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.3, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffb21a })); hoop.position.set(e.x, y0 + 9, -20); g.add(hoop); o.hoop = hoop; }
  else if (e.t === 'whirl') { const m = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ map: whirlTex, transparent: true, depthWrite: false })); m.rotation.x = -PI / 2; m.position.set(e.x * 0.6, y0 + 0.3, 0); g.add(m); o.disc = m; o.x = e.x * 0.6; }
  else if (e.t === 'rocks') { o.items = []; for (let i = 0; i < e.n + 1; i++) { const r = mesh(new THREE.DodecahedronGeometry(rnd(1.2, 2.2), 0), flat(G.lv.world === 'canyon' ? 0xa84a2a : 0x4a4640), rnd(-HW + 3, HW - 3), y0 + 0.2, -i * 7 + rnd(-2, 2), g); r.rotation.set(rnd(0, 3), rnd(0, 3), 0); o.items.push(r); } }
  else if (e.t === 'dolphins') { o.dol = []; for (let i = 0; i < 3; i++) { const d = dolphin(); d.userData.ph = i * 0.7; g.add(d); o.dol.push(d); } o.side = e.side; o.go = false; o.ph = 0; }
  else if (e.t === 'croc') { o.items = []; for (let i = 0; i < 2; i++) { const c = croc(); c.position.set(e.x + (i ? 6 : -6) * (i ? 1 : 0.5), y0 + 0.1, -i * 8); g.add(c); o.items.push(c); } }
  else if (e.t === 'logs') { o.items = []; for (let i = 0; i < 3; i++) { const l = mesh(new THREE.CylinderGeometry(0.5, 0.55, 7, 8), flat(0x6a4a2a), rnd(-HW + 4, HW - 4), y0 + 0.2, -i * 9, g); l.rotation.z = PI / 2; l.rotation.y = rnd(-0.4, 0.4); l.userData.vx = rnd(-1.2, 1.2); o.items.push(l); } }
  else if (e.t === 'iceberg') { o.items = []; const b = new THREE.Group(); mesh(new THREE.DodecahedronGeometry(3.4, 1), flat(0xeaf6ff), 0, 1.2, 0, b).scale.set(1.3, 0.9, 1); mesh(new THREE.ConeGeometry(2, 3.5, 6), flat(0xd8ecff), 0.5, 3.5, 0, b); for (let i = 0; i < 3; i++) { const p = penguin(); p.position.set(-1 + i, 2.7, 1.5); b.add(p); } b.position.set(e.x, y0, 0); g.add(b); o.items.push(b); o.big = 3.6; }
  else if (e.t === 'floe') { o.items = []; for (let i = 0; i < 3; i++) { const f = mesh(new THREE.CylinderGeometry(rnd(1.5, 2.5), rnd(1.8, 2.8), 0.6, 7), flat(0xf4faff), rnd(-HW + 3, HW - 3), y0 + 0.1, -i * 8, g); const p = penguin(); p.position.y = 0.3; f.add(p); o.items.push(f); } }
  else if (e.t === 'ferry' || e.t === 'barrels') {
    if (e.t === 'ferry') { const f = new THREE.Group(); mesh(new THREE.BoxGeometry(14, 2, 5), flat(0xf4f4f4), 0, 0.6, 0, f); mesh(new THREE.BoxGeometry(10, 2.2, 4), flat(G.lv.world === 'ghats' ? 0xff8a1a : 0x2a6ab0), 0, 2.5, 0, f); mesh(new THREE.BoxGeometry(14.2, 0.4, 5.2), flat(0xd83a2a), 0, -0.2, 0, f); for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1), flat(0x1a2a3a), -4 + i * 2, 2.6, 2.02, f); const ff = oneMesh(f); ff.position.set(-e.side * (HW + 10), y0, 0); g.add(ff); o.f = ff; o.items = [o.f]; o.vx = e.side * 4.5; o.wide = 7.5; }
    else { o.items = []; for (let i = 0; i < 5; i++) { const b = mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 10), flat(pick([0xd83a2a, 0x2a8ad8, 0xffc21a])), rnd(-HW + 3, HW - 3), y0 + 0.3, -i * 5, g); o.items.push(b); } }
  }
  else if (e.t === 'lava') { o.zone = true; o.drops = []; o.next = 0; }
  else if (e.t === 'cannon') { const sh = new THREE.Group(); mesh(new THREE.BoxGeometry(5, 2.5, 14), flat(0x5a3a1a), 0, 1.2, 0, sh); mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 5), flat(0x3a2a1a), 0, 6, 0, sh); mesh(new THREE.BoxGeometry(0.1, 4, 6), flat(0xf0e8d0), 0, 7, 0, sh); mesh(new THREE.BoxGeometry(0.1, 1.2, 1.6), flat(0x1a1a1a), 0, 10, 0, sh); sh.position.set(e.side * (HW + 7), y0, 0); g.add(sh); o.next = 0; }
  else if (e.t === 'ball') { o.items = []; for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(1, 12, 10), flat(pick([0xff4a6a, 0xffd23f, 0x2ab8ff])), rnd(-HW + 3, HW - 3), y0 + 0.8, -i * 8, g); o.items.push(b); } o.soft = 1; }
  g.traverse(q => { q.frustumCulled = false; }); G.objs.push(o); return o;
}
function buoy(k) { const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 12), flat(k ? 0xff4a2a : 0xffd21a), 0, 0.4, 0, b); mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.25, 12), flat(0xffffff), 0, 0.6, 0, b); mesh(new THREE.ConeGeometry(0.35, 0.8, 10), flat(k ? 0xff4a2a : 0xffd21a), 0, 1.3, 0, b); return oneMesh(b); }
function dolphin() { const d = new THREE.Group(), m = flat(0x6a8aa8, { roughness: 0.4 }); const b = mesh(new THREE.SphereGeometry(0.6, 12, 8), m, 0, 0, 0, d); b.scale.set(0.8, 0.8, 2.6); mesh(new THREE.ConeGeometry(0.35, 0.8, 4), m, 0, 0.6, 0.1, d).rotation.x = -0.4; const t = mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), m, 0, 0, 1.6, d); void t; mesh(new THREE.ConeGeometry(0.22, 0.7, 6), m, 0, -0.05, -1.75, d).rotation.x = -PI / 2; const belly = mesh(new THREE.SphereGeometry(0.5, 10, 6), flat(0xe8eef4), 0, -0.2, -0.2, d); belly.scale.set(0.75, 0.6, 2.0); for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.06, 6, 4), flat(0x111111), s * 0.32, 0.1, -1.1, d); d.visible = false; return d; }
function croc() { const c = new THREE.Group(), m = flat(0x3a6a2a); mesh(new THREE.BoxGeometry(1.4, 0.5, 4), m, 0, 0, 0, c); const top = mesh(new THREE.BoxGeometry(0.9, 0.25, 1.6), m, 0, 0.3, -2.6, c); const bot = mesh(new THREE.BoxGeometry(0.9, 0.2, 1.6), flat(0x9aaa6a), 0, 0.0, -2.6, c); for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(0.18, 8, 6), flat(0xffff8a), s * 0.35, 0.55, -1.9, c); mesh(new THREE.SphereGeometry(0.08, 6, 4), flat(0x111111), s * 0.35, 0.62, -2.02, c); } for (let i = 0; i < 6; i++) mesh(new THREE.ConeGeometry(0.06, 0.15, 4), flat(0xffffff), -0.35 + i * 0.14, 0.16, -3.2, c).rotation.x = PI; mesh(new THREE.ConeGeometry(0.4, 2.2, 5), m, 0, 0, 2.8, c).rotation.x = PI / 2; c.userData.jaw = top; void bot; return c; }
function penguin() { const p = new THREE.Group(); mesh(new THREE.SphereGeometry(0.3, 8, 6), flat(0x1a1a24), 0, 0.4, 0, p).scale.y = 1.4; mesh(new THREE.SphereGeometry(0.24, 8, 6), flat(0xffffff), 0, 0.38, 0.1, p).scale.y = 1.3; mesh(new THREE.SphereGeometry(0.2, 8, 6), flat(0x1a1a24), 0, 0.85, 0, p); mesh(new THREE.ConeGeometry(0.06, 0.18, 4), flat(0xffa21a), 0, 0.83, 0.22, p).rotation.x = PI / 2; return p; }

// ---------------- the boats on the water ----------------
const GRAV = 22;
function stat(k) { const b = BOATS.find(q => q.id === PF.boat) || BOATS[0]; return b[k]; }
function updateRacer(R, dt) {
  const lv = G.lv, racing = G.state === 'race' && !R.done;
  let top = 29 * (R.isMe ? stat('sp') : R.spec.skill) * (1 + lv.d * 0.08);
  if (!R.isMe && G.me) { const gap = R.z - G.me.z; top *= gap > 30 ? 1.09 : gap < -45 ? 0.92 : 1; }
  if (R.nitro > 0) { R.nitro -= dt; top += 14; }
  if (R.stun > 0) { R.stun -= dt; top *= 0.4; }
  if (R.whirl) top *= 0.55;
  if (!racing) top = R.done ? 15 : 0;
  R.speed = damp(R.speed, top, R.nitro > 0 ? 3 : 1.2, dt);
  const pz = R.z; R.z -= R.speed * dt;
  const lim = HW - 1.8;
  if (R.isMe) { G.tx = clamp(G.tx, -lim, lim); R.x = damp(R.x, G.tx, 6.5 * stat('turn'), dt); } else { ai(R, dt); R.x = damp(R.x, R.lane, 2.6, dt); }
  R.x = clamp(R.x, -lim, lim);
  // float on the waves, or fly
  const S = G.course.surface(R.x, R.z, G.t), ground = S.h + 0.05;
  if (R.air) { R.vy -= GRAV * dt; R.y += R.vy * dt; if (R.y <= ground && R.vy < 0) land(R, ground); }
  else { if (R.y - ground > 0.6) { R.air = true; R.vy = 0; if (R.isMe) waterfall(); } else R.y = damp(R.y, ground, 14, dt); }
  if (R.spin > 0) R.spin = Math.max(0, R.spin - dt);
  // tricks in the air
  if (R.trick) { R.trickT += dt / 0.75; if (R.trickT >= 1) { R.trickT = 1; if (!R.trickDone) { R.trickDone = true; trickDone(R); } } }
  const steer = (R.isMe ? G.tx - R.x : R.lane - R.x) * 0.06;
  const pitch = R.air ? clamp(-R.vy * 0.025, -0.35, 0.3) : -S.dz * 0.6 - clamp(R.speed / 30, 0, 1) * 0.06, roll = R.air ? 0 : S.dx * 0.6 - steer * 0.8;
  const tf = R.trick ? (R.trickT * R.trickT * (3 - 2 * R.trickT)) * PI * 2 : 0;
  R.root.position.set(R.x, R.y, R.z);
  R.root.rotation.set(pitch + (R.trick === 'flip' ? tf : 0), -steer * 1.2 + (R.spin > 0 ? R.spin * 14 : 0) + (R.whirl ? G.t * 6 : 0), roll + (R.trick === 'roll' ? tf * R.rollDir : 0), 'YXZ');
  if (R.V.prop) R.V.prop.rotation.z += dt * (8 + R.speed);
  R.drv.update(dt, 1); R.drv.rotation.y = steer * 0.8;
  if (R.exprT > 0) { R.exprT -= dt; if (R.exprT <= 0) setFace(R, 'happy', 0); }
  if (R.shield > 0) { R.shield -= dt; if (!R.bub) { R.bub = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8ae8ff, transparent: true, opacity: 0.28, depthWrite: false })); R.bub.position.y = 1; R.root.add(R.bub); } R.bub.visible = R.shield > 0; R.bub.scale.setScalar(1 + Math.sin(G.t * 8) * 0.03); } else if (R.bub) R.bub.visible = false;
  // spray from the hull, flames from the nitro
  const near = Math.abs(R.z - G.me.z) < 60;
  if (near && !R.air && R.speed > 10 && Math.random() < dt * (R.isMe ? 30 : 12)) { const sd = Math.random() < 0.5 ? -1 : 1; puff(_p.set(R.x + sd * R.V.size.x * 0.55, R.y + 0.2, R.z - R.V.size.z * 0.15), 1, 0xf0fbff, { size: rnd(0.4, 0.8), speed: 1.5, life: 0.6, grav: 8, vel: _q.set(sd * 3, 2.5, 3) }); }
  if (near && R.nitro > 0 && Math.random() < dt * 40) puff(_p.set(R.x + rnd(-0.3, 0.3), R.y + 0.8, R.z + R.V.size.z * 0.5), 1, 0xff9a1a, { add: true, size: 0.7, speed: 1, life: 0.25, grav: -1, cols: [0xffe04a, 0xff7a1a, 0x4ad8ff] });
  updateWake(R, dt);
  if (racing && R.z <= -lv.L) finish(R);
  if (racing) G.lastZ = pz;
}
function ai(R, dt) {
  R.aiT = (R.aiT || 0) - dt;
  const ahead = G.objs.filter(o => o.z < R.z && o.z > R.z - 32 && hazard(o));
  const blocked = x => ahead.some(o => hazardAt(o, x)) || G.racers.some(q => q !== R && q.z < R.z && q.z > R.z - 8 && Math.abs(q.x - x) < 2.4);
  if (blocked(R.lane) || R.aiT <= 0) { const opts = [-13, -8, -4, 0, 4, 8, 13].filter(x => !blocked(x)); const want = G.objs.find(o => (o.t === 'ramp' || o.t === 'boost' || o.t === 'items') && o.z < R.z && o.z > R.z - 40); if (want && Math.random() < 0.5) R.lane = clamp(want.x, -12, 12); else if (opts.length) R.lane = opts.sort((a, b) => Math.abs(a - R.x) - Math.abs(b - R.x))[Math.random() < 0.7 ? 0 : Math.min(1, opts.length - 1)]; R.aiT = rnd(1.5, 4); }
  if (G.state === 'race' && R.nitro <= 0 && Math.random() < dt * (R.z > G.me.z ? 0.16 : 0.05)) R.nitro = 1.5;
  // rivals use their mystery items too
  R.itemT -= dt; if (R.itemT <= 0 && G.state === 'race') { R.itemT = rnd(10, 18) - G.lv.d * 4; aiItem(R); }
  R.talkT -= dt; if (R.talkT <= 0 && G.state === 'race') { R.talkT = rnd(9, 16); if (Math.abs(R.z - G.me.z) < 35) say(R, pick(R.spec.lines), 'laugh'); }
}
const hazard = o => ['rocks', 'croc', 'logs', 'iceberg', 'floe', 'ferry', 'barrels', 'buoys', 'whirl', 'ball', 'duck'].includes(o.t);
function hazardAt(o, x) {
  if (o.t === 'ferry') return Math.abs(o.f.position.x - x) < 9;
  if (o.t === 'whirl') return Math.abs(o.x - x) < 10;
  if (o.items) return o.items.some(i => i.visible !== false && Math.abs(i.position.x - x) < (o.big || 2.4));
  return Math.abs((o.x || 0) - x) < 2.5;
}
function land(R, ground) {
  R.y = ground; const vy = R.vy; R.vy = 0; R.air = false;
  splash(_p.set(R.x, ground + 0.3, R.z), R.isMe ? clamp(-vy / 8, 1, 2.4) : 1); if (Math.abs(R.z - G.me.z) < 40) sfxT(vy < -12 ? 'bigSplash' : 'splash', 0.1);
  if (R.trick && !R.trickDone) { R.trick = null; R.stun = 1.0; R.spin = 0.6; if (R.isMe) { popText('WIPEOUT! 💦', _p.set(R.x, 3, R.z), '#ffb0a0', 28, 0.9); setFace(R, 'scared', 1.5); sfx('talk', 0.1, { w: 'ohno', f0: 150 }); vib(80); } }
  R.trick = null;
  if (R.isMe) { E.shake = Math.max(E.shake, clamp(-vy / 30, 0.15, 0.6)); vib(30); if (G.combo >= 2) { popText(G.combo + 'x TRICK COMBO!', _p.set(R.x, 4, R.z), '#ffe066', 30, 1); G.coins += G.combo * 5; sfx('coins'); } G.combo = 0; }
}
function waterfall() { banner('🌊 WATERFALL!', 'Swipe to do a trick!', 1.2); E.slow = 0.55; setTimeout(() => { E.slow = 1; }, 900); sfx('whistleDown'); setFace(G.me, 'scared', 1.5); sfx('talk', 0.1, { w: 'aaah', f0: 170 }); G.fallsSeen++; }
function trick(dir) {
  const R = G.me; if (!R.air || R.y - G.course.surface(R.x, R.z, G.t).h < 1.6 || (R.trick && !R.trickDone)) return;
  R.trick = dir === 'up' ? 'flip' : 'roll'; R.rollDir = dir === 'left' ? 1 : -1; R.trickT = 0; R.trickDone = false; sfx('swoosh');
}
function trickDone(R) {
  if (!R.isMe) return; G.combo++; G.nitro = Math.min(1, G.nitro + 0.22); const name = R.trick === 'flip' ? 'BACKFLIP!' : 'BARREL ROLL!';
  popText(name + ' +NITRO', _p.set(R.x, R.y + 3, R.z), '#ffe066', 28, 0.9); setFace(R, 'laugh', 1.2); sfx('gateGood'); G.coins += 3;
  R.trick = null;   // ready for another trick if there is still air
}
function finish(R) {
  R.done = true; G.finished.push(R); R.place = G.finished.length;
  if (R.isMe) {
    G.state = 'finished'; Engine.stop(); const p = R.place; setFace(R, p <= 3 ? 'laugh' : 'sad', 9);
    sfx(p <= 3 ? 'fanfare' : 'sad'); sfx('crowd', 0.2); banner(p === 1 ? '🏆 YOU WIN!' : p <= 3 ? '🎉 ' + ord(p).toUpperCase() + ' PLACE!' : ord(p) + ' place…', p <= 3 ? 'Brilliant boating!' : 'So close! Try again!', 2.5);
    for (let i = 0; i < 6; i++) setTimeout(() => puff(_p.set(rnd(-8, 8), G.course.level(-G.lv.L) + rnd(6, 10), -G.lv.L), 18, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0], speed: 6, life: 1.2, size: 0.4 }), i * 250);
    setTimeout(podium, 2600);
  }
}
// ---------------- the player's moves and the mystery items ----------------
function useNitro() { if (G.state !== 'race' || G.nitro < 0.33 || G.me.nitro > 0) return; G.nitro -= 0.33; G.me.nitro = 1.8; sfx('nitro'); flash('#9ae8ff', 0.25); vib(40); E.shake = 0.2; popText('NITRO!', _p.set(G.me.x, 3, G.me.z - 3), '#7ae8ff', 30, 0.7); }
function hop() { const R = G.me; if (G.state !== 'race' || R.air) return; R.air = true; R.vy = 7.5; sfx('boing'); }
function setItem(k) { G.item = k; $('itemB').classList.toggle('ready', !!k); $('itemI').textContent = k ? ITEMS[k] : '❔'; $('itemB').style.opacity = k ? 1 : 0.55; }
function rollItem() { const pl = places(), my = pl.indexOf(G.me) + 1, pool = my <= 2 ? ['balloon', 'ducks', 'shield', 'ducks', 'ink'] : my <= 4 ? ['balloon', 'ducks', 'shield', 'rocket', 'ink', 'wave'] : ['rocket', 'wave', 'balloon', 'rocket', 'shield', 'ink']; return pick(pool); }
function useItem() { if (G.state !== 'race' || !G.item) return; const k = G.item; setItem(null); doItem(G.me, k); }
function aiItem(R) { doItem(R, pick(['balloon', 'ducks', 'ink', 'rocket', 'balloon', 'shield'])); }
function doItem(R, k) {
  const near = Math.abs(R.z - G.me.z) < 50;
  if (k === 'rocket') { R.nitro = 2.6; if (R.isMe) { sfx('nitro'); flash('#ffb87a', 0.3); popText('ROCKET! 🚀', _p.set(R.x, 3, R.z), '#ffb87a', 32, 0.8); E.shake = 0.3; } }
  else if (k === 'shield') { R.shield = 7; if (R.isMe) { sfx('gateGood'); popText('BUBBLE SHIELD!', _p.set(R.x, 3, R.z), '#8ae8ff', 28, 0.8); } }
  else if (k === 'ducks') { for (let i = 0; i < 3; i++) { const o = spawn({ t: 'duck', z: R.z + 5 + i * 3, x: R.x + (i - 1) * 2.2 }); const d = duckModel(); d.position.set(o.x, G.course.level(o.z) + 0.25, 0); o.obj.add(d); o.items = [d]; o.owner = R; } if (near) sfx('pop'); if (R.isMe) popText('DUCK MINES! 🦆', _p.set(R.x, 3, R.z), '#ffe066', 26, 0.8); }
  else if (k === 'balloon') { const tgt = G.racers.filter(q => q !== R && !q.done && q.z < R.z && q.z > R.z - 90).sort((a, b) => b.z - a.z)[0] || (R.isMe ? null : (G.me.z < R.z + 40 && G.me.z > R.z - 90 ? G.me : null)); if (tgt) throwBalloon(R, tgt); else if (R.isMe) popText('Nobody to hit!', _p.set(R.x, 3, R.z), '#fff', 22, 0.7); }
  else if (k === 'ink') { const tg = G.racers.filter(q => q !== R && !q.done && q.z < R.z); if (R.isMe) { for (const q of tg) hitRacer(q, 'ink'); popText('OCTOPUS INK! 🐙', _p.set(R.x, 3, R.z), '#c08aff', 28, 0.9); sfx('splash'); } else if (G.me.z < R.z && Math.random() < 0.7) hitRacer(G.me, 'ink'); }
  else if (k === 'wave') { G.shots.push({ k: 'wave', x: R.x, z: R.z - 4, by: R, life: 3.5, m: waveModel(R.z) }); if (R.isMe) { sfx('bigSplash'); popText('MEGA WAVE! 🌊', _p.set(R.x, 3, R.z), '#7ae8ff', 30, 0.9); } }
}
const duckGeo = (() => { const g = new THREE.Group(); mesh(new THREE.SphereGeometry(0.55, 10, 8), flat(0xffd21a), 0, 0, 0, g).scale.set(1, 0.8, 1.3); mesh(new THREE.SphereGeometry(0.35, 10, 8), flat(0xffd21a), 0, 0.55, -0.45, g); mesh(new THREE.ConeGeometry(0.14, 0.3, 6), flat(0xff7a1a), 0, 0.5, -0.85, g).rotation.x = -PI / 2; for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.06, 6, 4), flat(0x111111), s * 0.17, 0.65, -0.72, g); return oneMesh(g); })();
function duckModel() { return duckGeo.clone(); }
function waveModel(z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 2 * HW, 16, 1, true, 0, PI), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })); m.rotation.z = PI / 2; m.position.set(0, G.course.level(z), z); m.frustumCulled = false; scene.add(m); return m; }
function throwBalloon(R, tgt) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), flat(pick([0xff4a6a, 0x2ab8ff, 0x3fcf6e]))); m.position.set(R.x, R.y + 2, R.z); scene.add(m); m.frustumCulled = false;
  G.shots.push({ k: 'balloon', m, from: m.position.clone(), tgt, t: 0, dur: clamp((R.z - tgt.z) / 45, 0.6, 1.6), by: R }); sfx('swoosh'); if (R.isMe) popText('WATER BALLOON! 🎈', _p.set(R.x, 3, R.z), '#ffb0d0', 26, 0.8);
}
function updateShots(dt) {
  for (const s of G.shots) {
    if (s.k === 'balloon') { s.t += dt / s.dur; const k = Math.min(1, s.t), T = s.tgt; s.m.position.set(s.from.x + (T.x - s.from.x) * k, s.from.y + (T.y + 1 - s.from.y) * k + Math.sin(k * PI) * 7, s.from.z + (T.z - s.from.z) * k); if (s.t >= 1) { s.dead = true; scene.remove(s.m); hitRacer(T, 'balloon'); splash(_p.set(T.x, T.y + 1.5, T.z), 1.4); } }
    if (s.k === 'wave') { s.life -= dt; s.z -= 38 * dt; s.m.position.set(0, G.course.level(s.z) + Math.sin(G.t * 6) * 0.2, s.z); s.m.scale.y = 1; for (const q of G.racers) if (q !== s.by && Math.abs(q.z - s.z) < 2.5 && !s.hit?.has(q)) { (s.hit = s.hit || new Set()).add(q); hitRacer(q, 'wave'); } if (s.life <= 0) { s.dead = true; scene.remove(s.m); } }
  }
  G.shots = G.shots.filter(s => !s.dead);
}
function hitRacer(R, how) {
  if (R.shield > 0) { R.shield = 0; if (Math.abs(R.z - G.me.z) < 40) { sfx('pop'); popText('BLOCKED!', _p.set(R.x, 3, R.z), '#8ae8ff', 24, 0.7); } return; }
  R.stun = how === 'ink' ? 1.6 : 1.1; R.spin = how === 'ink' ? 0 : 0.7; R.speed *= 0.6;
  if (R.isMe) {
    E.shake = 0.4; vib(90); setFace(R, how === 'ink' ? 'angry' : 'scared', 1.6); sfx('talk', 0.1, { w: 'ohno', f0: 150 });
    if (how === 'balloon') overlay('splashO', 1.6), popText('SPLASHED! 💦', _p.set(R.x, 3, R.z), '#8ae8ff', 30, 0.9); if (how === 'ink') overlay('inkO', 2.6), popText('INKED! 🐙', _p.set(R.x, 3, R.z), '#c08aff', 30, 0.9);
  } else if (Math.abs(R.z - G.me.z) < 50) { sfxT('splash', 0.1); if (Math.random() < 0.7) say(R, pick(R.spec.hurt), 'angry'); popText(how === 'ink' ? 'INKED!' : 'SPLASH!', _p.set(R.x, 3, R.z), '#fff', 22, 0.7); }
}
function overlay(id, dur) { const o = $(id); o.classList.remove('show'); void o.offsetWidth; o.classList.add('show'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('show'), dur * 1000); }
// ---------------- collisions and pickups ----------------
function interact(R, dt) {
  R.whirl = false;
  for (const o of G.objs) {
    const dz = R.z - o.z; if (dz > 10 || dz < -42) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp' || o.t === 'diyas')) for (const c of o.items) { if (!c.visible) continue; const cz = o.z + c.position.z; if (Math.abs(cz - R.z) < 1.8 && Math.abs(c.position.x - R.x) < 1.8 && Math.abs(c.position.y - R.y - 0.8) < 2) { c.visible = false; if (R.isMe) { G.coins++; sfxT('coin', 0.03); G.nitro = Math.min(1, G.nitro + 0.02); } } }
    if (o.hoop && R.isMe && !o.hoopHit && Math.abs(dz + 20) < 1.5 && Math.abs(R.x - o.x) < 3 && Math.abs(R.y - (G.course.level(o.z) + 9)) < 3.2) { o.hoopHit = true; G.coins += 15; G.nitro = Math.min(1, G.nitro + 0.3); sfx('gateGood'); popText('THROUGH THE HOOP! +15', _p.set(R.x, R.y + 3, R.z), '#ffb21a', 30, 1); flash('#ffe08a', 0.25); }
    if (o.t === 'boost' && !o.hit.has(R) && Math.abs(dz) < 3 && Math.abs(R.x - o.x) < 5) { o.hit.add(R); R.nitro = Math.max(R.nitro, 1.3); if (R.isMe) { sfx('nitro'); popText('BOOST!', _p.set(R.x, 3, R.z), '#7ae8ff', 28, 0.7); flash('#9ae8ff', 0.2); } }
    if (o.t === 'items') for (const b of o.items) { if (b.visible && Math.abs(o.z - R.z) < 1.8 && Math.abs(b.position.x - R.x) < 2) { b.visible = false; if (R.isMe) { if (!G.item) { setItem(rollItem()); sfx('kaching'); popText(ITEMS[G.item] + ' GOT IT!', _p.set(R.x, 3, R.z), '#ff9ad8', 26, 0.8); showHint('Tap ' + ITEMS[G.item] + ' to use it!'); } } else R.itemT = Math.min(R.itemT, rnd(0.5, 3)); puff(_p.set(b.position.x, b.position.y, o.z), 8, 0xff7ad8, { star: true, add: true, speed: 3 }); } }
    if (o.t === 'ramp' && !R.air && dz <= 0.6 && dz > -0.9 && Math.abs(R.x - o.x) < o.w / 2) { R.air = true; R.vy = 11 + R.speed * 0.12; if (R.isMe) { sfx('whoosh'); banner('🚀 BIG AIR!', 'Swipe UP / LEFT / RIGHT for tricks!', 1.1); E.slow = 0.6; setTimeout(() => { E.slow = 1; }, 700); setFace(R, 'laugh', 2); } else if (Math.random() < 0.5) { R.trick = Math.random() < 0.5 ? 'flip' : 'roll'; R.rollDir = 1; R.trickT = 0; R.trickDone = false; } }
    if (o.t === 'whirl' && Math.abs(dz) < 9 && Math.abs(R.x - o.x) < 9 && !R.air) { R.whirl = true; R.x = damp(R.x, o.x, 0.8, dt); if (R.isMe) { R.speed *= 1 - dt * 0.6; if (!o.warned) { o.warned = true; popText('WHIRLPOOL! Use NITRO!', _p.set(R.x, 3, R.z), '#8ae8ff', 26, 1); sfx('whoosh'); setFace(R, 'scared', 1.5); } if (R.nitro > 0) R.x += (R.x >= o.x ? 1 : -1) * 6 * dt; } }
    if (R.air && R.y - G.course.level(o.z) > 1.4) continue;
    if (R.shield > 0 && hazard(o) && o.t !== 'whirl' && Math.abs(dz) < 2) { if (o.items) for (const c of o.items) if (c.visible !== false && Math.abs(c.position.x - R.x) < 2.6 && Math.abs(o.z + (c.position.z || 0) - R.z) < 2.5) { R.shield = 0; c.visible = o.t === 'iceberg' || o.t === 'ferry' ? c.visible : false; if (R.isMe) popText('BLOCKED!', _p.set(R.x, 3, R.z), '#8ae8ff', 24, 0.7); } continue; }
    if (Math.abs(dz) < 3 && !o.hit.has(R)) {
      let hitIt = false;
      if (o.t === 'ferry') { if (Math.abs(o.f.position.x - R.x) < o.wide && Math.abs(dz) < 3) hitIt = true; }
      else if (['rocks', 'croc', 'logs', 'iceberg', 'floe', 'barrels', 'buoys', 'ball', 'duck'].includes(o.t) && o.items) for (const c of o.items) { const r = o.big || (o.t === 'logs' ? 3.6 : o.t === 'floe' ? 2.6 : 1.9); if (c.visible !== false && Math.abs(c.position.x - R.x) < r && Math.abs(o.z + c.position.z - R.z) < 2) { if (o.t === 'duck' && o.owner === R) continue; hitIt = true; if (['buoys', 'barrels', 'ball', 'duck'].includes(o.t)) { c.visible = false; const f = c.clone(); f.position.set(c.position.x, c.position.y, o.z + c.position.z); fling(f, new THREE.Vector3(rnd(-4, 4), rnd(7, 11), -R.speed * 0.5), 1.4, 18, 10); } } }
      if (hitIt) { o.hit.add(R); bump(R, o.t); }
    }
  }
}
function bump(R, what) {
  R.stun = what === 'ball' || what === 'buoys' ? 0.4 : 0.9; R.speed *= what === 'ball' ? 0.8 : 0.45; const near = Math.abs(R.z - G.me.z) < 45;
  if (near) { sfxT(what === 'croc' ? 'bonk' : what === 'rocks' || what === 'iceberg' ? 'crash' : 'thud', 0.15); splash(_p.set(R.x, R.y + 0.5, R.z - 1), 1); }
  if (R.isMe) { E.shake = 0.5; vib(90); setFace(R, 'scared', 1.5); popText(what === 'croc' ? 'CHOMP! 🐊' : what === 'duck' ? 'QUACK! 🦆' : what === 'iceberg' ? 'BRRR! 🧊' : what === 'ferry' ? 'HONK HONK! 🛳️' : pick(['BONK!', 'OUCH!', 'WHOOPS!']), _p.set(R.x, 3, R.z), '#ff8a8a', 30, 0.8); sfx('talk', 0.1, { w: 'ohno', f0: 150 }); }
  else if (near && Math.random() < 0.6) say(R, pick(R.spec.hurt), 'angry');
}
function racerBumps() {
  const L = G.racers;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dz = a.z - b.z, dx = a.x - b.x;
    if (Math.abs(dz) < 4 && Math.abs(dx) < 2.2 && !a.air && !b.air) {
      const push = (2.2 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1); a.x += push; b.x -= push; if (a.isMe) G.tx += push; if (b.isMe) G.tx -= push; if (!a.isMe) a.lane = a.x; if (!b.isMe) b.lane = b.x;
      if ((a.isMe || b.isMe) && (G.bumpT || 0) <= 0) { G.bumpT = 0.6; sfx('thud'); vib(25); const o = a.isMe ? b : a; if (Math.random() < 0.5) say(o, pick(['Hey! Watch it!', 'Bumper boats?!', 'Rude!', 'Hehe, bonk!']), 'angry'); splash(_p.set((a.x + b.x) / 2, a.y + 0.5, (a.z + b.z) / 2), 0.8); }
    }
  }
}
// ---------------- the world each frame ----------------
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1), _bs = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
function updateObjs(dt) {
  let nC = 0, nB = 0; const me = G.me;
  for (const o of G.objs) {
    const dz = o.z - me.z; o.obj.visible = dz < 40 && dz > -240; if (!o.obj.visible) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp' || o.t === 'diyas')) for (const c of o.items) if (c.visible && nC < 160) { _cq.setFromAxisAngle(_Y, G.t * 4 + c.position.x); coinIM.setMatrixAt(nC++, _cm.compose(_cp.set(c.position.x, c.position.y + Math.sin(G.t * 3 + c.position.z) * 0.15, o.z + c.position.z), _cq, _cs)); }
    if (o.t === 'boost') for (const m of o.items) m.material.map.offset.y = -G.t * 1.5;
    if (o.t === 'items') o.items.forEach((b, i) => { b.position.y = G.course.level(o.z) + 1.3 + Math.sin(G.t * 3 + i) * 0.25; if (b.visible && nB < 40) { _cq.setFromAxisAngle(_Y, G.t * 2 + i); _bs.setScalar(1 + Math.sin(G.t * 6 + i) * 0.08); bubIM.setMatrixAt(nB++, _cm.compose(_cp.set(b.position.x, b.position.y, o.z), _cq, _bs)); } });
    if (o.t === 'whirl') o.disc.rotation.z += dt * 2.5;
    if (o.hoop) o.hoop.rotation.y = Math.sin(G.t * 2) * 0.3;
    // things that float bob on the waves
    if (o.items && ['buoys', 'barrels', 'logs', 'floe', 'ball', 'croc', 'duck'].includes(o.t)) for (const b of o.items) { const S = G.course.surface(b.position.x, o.z + b.position.z, G.t); b.position.y = S.h + (o.t === 'ball' ? 0.8 : o.t === 'duck' ? 0.25 : 0.05); if (o.t !== 'croc' && o.t !== 'duck') b.rotation.z = S.dx * 0.8 + (o.t === 'logs' ? PI / 2 : 0); if (o.t === 'logs') { b.position.x += b.userData.vx * dt; if (Math.abs(b.position.x) > HW - 3) b.userData.vx *= -1; } if (o.t === 'croc') { b.userData.jaw.rotation.x = -Math.max(0, Math.sin(G.t * 4 + b.position.x)) * 0.6; b.position.x += Math.sin(G.t * 0.7 + o.z) * dt * 1.5; } }
    if (o.t === 'ferry') { o.f.position.x += o.vx * dt * (G.state === 'race' ? 1 : 0.3); if (Math.abs(o.f.position.x) > HW + 14) o.vx *= -1; o.f.position.y = G.course.surface(o.f.position.x, o.z, G.t).h; if (dz > -60 && dz < -20 && !o.honked) { o.honked = true; sfx('horn', 0, 3); } }
    if (o.t === 'dolphins') { if (dz > -70) o.go = true; if (o.go) { o.ph += dt; o.dol.forEach((d, i) => { const t = (o.ph * 0.55 + d.userData.ph) % 2.2, k = t / 1.6; d.visible = k < 1; if (k < 1) { const x = -o.side * 16 + o.side * 32 * ((o.ph * 0.12 + i * 0.15) % 1), y = G.course.level(o.z) + Math.sin(k * PI) * 4.5 - 0.6; d.position.set(x, y, -i * 2); d.rotation.set(-Math.cos(k * PI) * 0.9, o.side > 0 ? -PI / 2 : PI / 2, 0, 'YXZ'); if (k > 0.97 && Math.abs(dz) < 60) splash(_p.set(x, G.course.level(o.z), o.z - i * 2), 0.6); } }); } }
    if (o.t === 'lava' && Math.abs(dz) < 70 && G.state === 'race') { o.next -= dt; if (o.next <= 0) { o.next = rnd(0.6, 1.2); const x = clamp(me.x + rnd(-8, 8), -HW + 2, HW - 2), z = me.z - rnd(25, 45); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xff5a1a })); m.position.set(x, G.course.level(z) + 30, z); m.frustumCulled = false; scene.add(m); const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 20), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.7, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.set(x, G.course.level(z) + 0.4, z); ring.frustumCulled = false; scene.add(ring); o.drops.push({ m, ring, x, z, vy: -8 }); } }
    if (o.drops) for (const d of o.drops) { d.vy -= 20 * dt; d.m.position.y += d.vy * dt; d.m.rotation.x += dt * 4; if (d.m.position.y <= G.course.level(d.z)) { d.dead = true; scene.remove(d.m); scene.remove(d.ring); splash(_p.set(d.x, G.course.level(d.z), d.z), 1.3); puff(_p.set(d.x, G.course.level(d.z) + 1, d.z), 8, 0xdddddd, { size: 1.6, speed: 2, life: 1.2, grav: -2 }); if (Math.abs(d.z - me.z) < 30) sfxT('splash', 0.2); for (const R of G.racers) if (Math.abs(R.x - d.x) < 2.6 && Math.abs(R.z - d.z) < 3) bump(R, 'lava'); } }
    if (o.drops) o.drops = o.drops.filter(d => !d.dead);
    if (o.t === 'cannon' && Math.abs(dz) < 80 && G.state === 'race') { o.next -= dt; if (o.next <= 0) { o.next = rnd(1.6, 2.6); const x = clamp(me.x + rnd(-6, 6), -HW + 2, HW - 2), z = me.z - rnd(30, 45); sfx('cannon'); puff(_p.set(o.side * (HW + 7), G.course.level(o.z) + 3, o.z), 10, 0x888888, { size: 1.4, speed: 3, life: 0.8 }); const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), flat(0x1a1a1a)); m.position.set(o.side * (HW + 7), G.course.level(z) + 4, o.z); m.frustumCulled = false; scene.add(m); (o.drops = o.drops || []).push({ m, ring: new THREE.Object3D(), x, z, vy: 9, ball: { from: m.position.clone(), t: 0 } }); } }
    if (o.t === 'cannon' && o.drops) for (const d of o.drops) if (d.ball) { d.ball.t += dt / 1.3; const k = d.ball.t; d.m.position.set(d.ball.from.x + (d.x - d.ball.from.x) * k, d.ball.from.y + Math.sin(k * PI) * 12 - k * (d.ball.from.y - G.course.level(d.z)), d.ball.from.z + (d.z - d.ball.from.z) * k); if (k >= 1) { d.m.position.y = G.course.level(d.z) - 1; d.vy = -1; } }
  }
  coinIM.count = nC; coinIM.instanceMatrix.needsUpdate = true; bubIM.count = nB; bubIM.instanceMatrix.needsUpdate = true;
}
function places() { return [...G.racers].sort((a, b) => (a.done && b.done) ? a.place - b.place : a.done ? -1 : b.done ? 1 : a.z - b.z); }
let hintT = 0;
function showHint(t) { const h = $('hint'); h.textContent = t; h.className = ''; hintT = 2.2; }
function update(dt) {
  G.t += dt; if (window.__bot) window.__bot(dt);
  G.course.update(dt, G.t); G.course.cull(G.me.z);
  G.bumpT = (G.bumpT || 0) - dt;
  if (G.state === 'count') { G.countT -= dt; const k = Math.ceil(G.countT - 0.6); if (k !== G.lastK) { G.lastK = k; if (k >= 1 && k <= 3) { banner(String(k), '', 0.7); sfx('beep'); } else if (k <= 0) { banner('GO!', '', 0.8); sfx('go'); G.state = 'race'; Engine.start(); vib(40); say(pick(G.racers.filter(r => !r.isMe)), 'Let\'s gooo!', 'laugh'); } } }
  if (G.state !== 'podium') for (const R of G.racers) { updateRacer(R, dt); if (G.state === 'race' || G.state === 'finished') interact(R, dt); }
  if (G.state !== 'podium') racerBumps(); updateObjs(dt); updateShots(dt);
  if (G.state === 'race') Engine.set(G.me.speed / 32, true, PF.set.sound ? 0.07 : 0);
  const pl = places(), my = pl.indexOf(G.me) + 1;
  if (G.state === 'race' && my !== G.shownPlace) { if (G.shownPlace && my < G.shownPlace) { const passed = pl[my]; if (passed && !passed.isMe && Math.random() < 0.7) say(passed, pick(passed.spec.hurt.concat(['Noooo!', 'Come back here!'])), 'angry'); popText(ord(my).toUpperCase() + '!', _p.set(G.me.x, 3.5, G.me.z - 2), '#ffe066', 34, 0.9); sfx('swoosh'); setFace(G.me, 'laugh', 1.2); } G.shownPlace = my; }
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.add('hidden'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hidden'); }
  updateHud(dt, pl, my);
  if (G.state === 'podium') updatePodium(dt);
  // weather of the world: storm lightning, harbour fireworks, volcano smoke
  const w = G.lv.world;
  if (w === 'storm' && Math.random() < dt * 0.12 && G.state === 'race') { flash('#e8f0ff', 0.55); setTimeout(() => sfx('boom'), 300); }
  if (w === 'harbour' && Math.random() < dt * 0.8) { puff(_p.set(rnd(-40, 40), G.course.level(G.me.z) + rnd(30, 50), G.me.z - rnd(60, 140)), 26, 0xffffff, { star: true, add: true, cols: [0xff4fa8, 0x4fe8ff, 0xffe04f, 0x8aff4f], speed: 9, life: 1.4, size: 0.9, grav: 3 }); if (Math.random() < 0.3) sfxT('firework', 0.5); }
  if (w === 'storm' && Math.random() < dt * 30) puff(_p.set(G.me.x + rnd(-20, 20), G.me.y + rnd(8, 14), G.me.z - rnd(0, 30)), 1, 0xc8d8f0, { size: 0.12, speed: 0, life: 0.6, grav: 30 });
}
// ---------------- HUD ----------------
let hudN = 0;
function updateHud(dt, pl, my) {
  $('coinN').textContent = G.coins;
  $('nitroB').style.setProperty('--p', Math.round(G.nitro * 100)); $('nitroB').classList.toggle('ready', G.nitro >= 0.33); $('nitroN').textContent = Math.floor(G.nitro / 0.33 + 0.001);
  if (!pl) return;
  $('placeN').innerHTML = `${my}<small>${my === 1 ? 'st' : my === 2 ? 'nd' : my === 3 ? 'rd' : 'th'}</small>`;
  if ((hudN++ & 3) === 0) { const L = G.lv.L; G.racers.forEach((R, i) => { const el = $('dot' + i); if (!el) return; el.style.left = clamp(-R.z / L, 0, 1) * 100 + '%'; el.style.top = R.isMe ? '-4px' : (i % 2 ? '10px' : '-14px'); el.style.zIndex = R.isMe ? 9 : 1; }); const pf = $('progFill'); if (pf) pf.style.width = clamp(-G.me.z / G.lv.L, 0, 1) * 100 + '%'; }
  if ((hudN & 7) === 0) G.racers.forEach(R => drawFace(R.face, { skin: R.spec.skin, style: 'helmet', helmet: R.spec.helmet }, R.expr, G.t, G.bubbleR === R && bubbleT > 0));
  if (G.bubbleR) $('bubbleFace').getContext('2d').drawImage(G.bubbleR.face, 0, 0, 64, 64, 0, 0, 64, 64);
}
function buildStrip() { const s = $('strip'); s.innerHTML = '<div id="stripLine"><div id="progFill"></div></div>'; G.racers.forEach((R, i) => { const d = document.createElement('div'); d.className = 'dot' + (R.isMe ? ' me' : ''); d.id = 'dot' + i; d.appendChild(R.face); s.appendChild(d); }); }
// ---------------- the podium (a floating pontoon with three steps) ----------------
let camP, camL;
function podium() {
  for (const R of places()) if (!R.done) { R.done = true; G.finished.push(R); R.place = G.finished.length; }
  G.state = 'podium'; G.podT = 0; music('podium'); $('hud').classList.add('hidden');
  const z = -G.lv.L - 30, y = G.course.level(z), g = G.podium = new THREE.Group(); g.position.set(0, y, z); scene.add(g);
  mesh(new THREE.BoxGeometry(14, 0.6, 7), flat(0xf4f4f4), 0, 0.3, 0, g); for (let i = 0; i < 8; i++) mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10), flat(i % 2 ? 0xff4a6a : 0x2a8ad8), -6.3 + i * 1.8, 0.1, 3.4, g).rotation.x = PI / 2;
  const H = [2.0, 1.45, 1.05], X = [0, -2.25, 2.25], C = [0xffc21a, 0xc8d0dc, 0xd8884a];
  for (let i = 0; i < 3; i++) { mesh(new THREE.BoxGeometry(2.2, H[i], 2.2), flat(C[i]), X[i], 0.6 + H[i] / 2, i ? -0.6 : 0, g); const t = canvasTex(64, 64, (c) => { c.font = 'bold 54px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#0a3a6a'; c.fillText(String(i + 1), 32, 36); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(X[i], 0.6 + H[i] / 2, (i ? -0.6 : 0) + 1.12); g.add(m); }
  G.finished.forEach((R, i) => {
    R.root.position.set(i < 3 ? X[i] : [-4.6, 4.6, 5.8][i - 3], y + (i < 3 ? 0.6 + H[i] : 0.6), z - (i < 3 ? (i ? 0.6 : 0) : 2.2)); R.root.rotation.set(0, PI, 0); R.root.scale.setScalar(i < 3 ? 1.3 : 1.1);
    R.V.obj.visible = false; R.drv.position.set(0, 0, 0); R.drv.rotation.set(0, 0, 0); R.wake.m.visible = false; if (R.bub) R.bub.visible = false;
    R.drv.play(i < 3 ? 'cheer' : pick(['no', 'idle'])); setFace(R, i === 0 ? 'laugh' : i < 3 ? 'happy' : pick(['sad', 'angry']), 99);
  });
  G.podZ = z; G.podY = y; camP.set(0, y + 4, z + 9.5); camL.set(0, y + 2.5, z);
}
function updatePodium(dt) {
  G.podT += dt; for (const R of G.racers) R.drv.update(dt);
  if (Math.random() < dt * 3) puff(_p.set(rnd(-6, 6), G.podY + rnd(6, 10), G.podZ + rnd(-2, 2)), 14, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0, 0xff4fa8], speed: 5, life: 1.3, size: 0.4 });
  if (G.podT > 4.5 && !G.resultsShown) { G.resultsShown = true; results(); }
}
// ---------------- results, garage ----------------
function results() {
  const p = G.me.place, win = p <= 3, prize = [0, 180, 110, 70, 35, 25, 15][p] || 15, total = prize + G.coins + G.lv.n * 4;
  PF.coins += total; if (win) { PF.level = Math.max(PF.level, G.lv.n + 1); PF.wins++; } PF.save();
  const stars = p === 1 ? 3 : p <= 3 ? 2 : 1, unlock = win ? nextUnlock() : null, nextW = WORLDS[ORDER[G.lv.n % ORDER.length]];
  openModal(`<h2>${p === 1 ? '🏆 WINNER!' : win ? ord(p).toUpperCase() + ' PLACE!' : 'TRY AGAIN!'}</h2><div class="stars">${[0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
    <div class="stat"><span>🏁 Place prize (${ord(p)})</span><b>${prize}</b></div><div class="stat"><span>🪙 Coins + tricks</span><b>${G.coins}</b></div><div class="stat"><span>🎯 Race bonus</span><b>${G.lv.n * 4}</b></div>
    <div class="big" id="totalB">+${total} 🪙</div>${win ? `<p class="tip">Next: <b>${nextW.name}</b></p>` : '<p class="tip">Finish in the top 3 to unlock the next race!</p>'}
    ${unlock ? `<div class="card" style="--rc:#1ad8c8"><div class="rar">NEW IN THE BOATYARD</div><div class="hico">🚤</div><b>${unlock.name}</b><span>can be bought now!</span></div>` : ''}
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE COINS</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">${win ? 'NEXT RACE ▶' : 'RACE AGAIN ↻'}</button></div><div class="row"><button class="btn small" id="garB">🛥️ BOATYARD</button><button class="btn small" id="homeB">HOME</button></div>`);
  if ($('dblB')) $('dblB').onclick = () => { sfx('pop'); rewardAd('double', ok => { if (!ok) return; PF.coins += total; PF.save(); $('totalB').textContent = '+' + total * 2 + ' 🪙'; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { sfx('pop'); closeModal(); betweenLevels(PF.level, () => play(win ? G.lv.n + 1 : G.lv.n)); };
  $('garB').onclick = () => { sfx('pop'); garage(() => goHome()); };
  $('homeB').onclick = () => { sfx('pop'); goHome(); };
}
function nextUnlock() { const n = G.lv.n; if (n % 2) return null; return BOATS[Math.min(BOATS.length - 1, n / 2)] || null; }
function garage(back) {
  const item = BOATS.map(v => { const own = PF.boats.includes(v.id), on = PF.boat === v.id; return `<div class="item"><div class="ico">${v.id === 'jetski' ? '🛵' : v.id === 'airboat' ? '🌀' : '🚤'}</div><div class="txt"><b>${v.name}</b><span>Speed ${'★'.repeat(Math.round((v.sp - 0.95) * 40))} · Turning ${'★'.repeat(Math.round(v.turn * 3))}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-b="${v.id}" ${on || (!own && PF.coins < v.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'USE' : v.price + ' 🪙'}</button></div>`; }).join('');
  openModal(`<h2>BOATYARD</h2><p>🪙 <b>${PF.coins}</b></p><div class="list">${item}</div>
    <h3>Boat colour</h3><div class="row wrap">${COLORS.map(h => `<button class="swatch ${PF.color === h ? 'on' : ''}" data-c="${h}" style="background:#${h.toString(16).padStart(6, '0')}"></button>`).join('')}</div>
    <h3>Helmet colour</h3><div class="row wrap">${COLORS.map(h => `<button class="swatch ${PF.helmet === h ? 'on' : ''}" data-h="${h}" style="background:#${h.toString(16).padStart(6, '0')}"></button>`).join('')}</div><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const v = BOATS.find(q => q.id === b.dataset.b); if (!PF.boats.includes(v.id)) { if (PF.coins < v.price) return; PF.coins -= v.price; PF.boats.push(v.id); sfx('kaching'); } else sfx('pop'); PF.boat = v.id; PF.save(); refreshShow(); garage(back); });
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { PF.color = +b.dataset.c; PF.save(); sfx('pop'); refreshShow(); garage(back); });
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { PF.helmet = +b.dataset.h; PF.save(); sfx('pop'); refreshShow(); garage(back); });
  $('closeB').onclick = () => { sfx('pop'); closeModal(); back(); };
}
function refreshShow() { if (G.state === 'home') startLevel(PF.level, false); }
// ---------------- screens ----------------
function setScreen(s) { $('home').classList.toggle('hidden', s !== 'home'); $('hud').classList.toggle('hidden', s !== 'hud'); }
function play(n = PF.level) { closeModal(); setScreen('hud'); G.resultsShown = false; startLevel(n, true); buildStrip(); showHint('Drag to steer · swipe UP to jump'); }
function goHome() { closeModal(); Engine.stop(); startLevel(PF.level, false); setScreen('home'); refreshHome(); music('title'); }
function refreshHome() { const W = WORLDS[ORDER[(PF.level - 1) % ORDER.length]]; $('homeCoins').textContent = PF.coins.toLocaleString(); $('homeLevel').innerHTML = `RACE ${PF.level}<small>${PF.level % 4 === 0 ? '👑 Boss race · ' : ''}${W.name}</small>`; $('giftB').classList.toggle('dot', giftState(PF).can); }
function pause() { if (G.state !== 'race' && G.state !== 'count') return; G.paused = G.state; G.state = 'pause'; Engine.stop(); Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { sfx('pop'); closeModal(); resume(); }; $('setB2').onclick = () => settings(); $('homeB').onclick = () => { sfx('pop'); goHome(); }; }
function resume() { G.state = G.paused || 'race'; if (G.state === 'race') Engine.start(); music(G.lv.music); }
function settings() { settingsPanel(PF, 'Splash Racer', 'Characters, nature: Quaternius (CC0) · Buoys: Kenney (CC0) · Boats: BajrangVerse Studios<br>Title and victory music: BajrangVerse Studios<br>Music: "Fluffing a Duck", "Happy Happy Game Show", "Wallpaper", "Sneaky Snitch", "Carefree", "Hyperfun" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0', k => { if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : G.lv.music); else Music.stop(); } if (k === 'hi') setQuality(PF.set.hi ? 2 : 0); }, () => { if (G.state === 'pause') resume(); }); }
onAdDone(() => { if (PF.set.music && G.lv) music(G.state === 'home' ? 'title' : G.state === 'podium' ? 'podium' : G.lv.music); });
window.onAppPause = () => { pause(); Engine.stop(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (modalOpen()) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'race' || G.state === 'count') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };
// ---------------- input: drag to steer, swipe up to jump; in the air swipe up / left / right for tricks ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); drag = { x: e.clientX, y: e.clientY, tx: G.tx, sw: false, t: performance.now() }; });
addEventListener('pointermove', e => {
  if (!drag || G.state !== 'race') return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.sw && G.me.air && (Math.abs(dx) > 40 || dy < -36) && performance.now() - drag.t < 350) { drag.sw = true; trick(dy < -36 && Math.abs(dy) > Math.abs(dx) ? 'up' : dx < 0 ? 'left' : 'right'); return; }
  if (!drag.sw && dy < -38 && Math.abs(dy) > Math.abs(dx) * 1.3) { drag.sw = true; if (G.me.air) trick('up'); else hop(); }
  if (!drag.sw || !G.me.air) G.tx = drag.tx + dx / Math.min(innerWidth, 500) * 26;
});
addEventListener('pointerup', () => { drag = null; });
addEventListener('keydown', e => { if (e.key === 'ArrowUp') { if (G.me.air) trick('up'); else hop(); } if (e.key === 'q') trick('left'); if (e.key === 'e') trick('right'); if (e.key === ' ' || e.key === 'n') useNitro(); if (e.key === 'i') useItem(); if (e.key === 'ArrowLeft') G.tx -= 4; if (e.key === 'ArrowRight') G.tx += 4; });
$('nitroB').addEventListener('pointerdown', e => { e.stopPropagation(); useNitro(); });
$('itemB').addEventListener('pointerdown', e => { e.stopPropagation(); useItem(); });
$('playB').onclick = () => { Audio.resume(); sfx('pop'); play(); };
$('garageB').onclick = () => { sfx('pop'); garage(refreshHome); };
$('giftB').onclick = () => { sfx('pop'); giftPanel(PF, '🪙', refreshHome); };
$('setB').onclick = () => { sfx('pop'); settings(); };
$('pauseB').onclick = () => { sfx('pop'); pause(); };
document.addEventListener('pointerdown', () => { Audio.resume(); if (G.state === 'home') music('title'); }, { once: true });
// ---------------- camera ----------------
camP = new THREE.Vector3(0, 6, 12); camL = new THREE.Vector3(); const tp = new THREE.Vector3(), tl = new THREE.Vector3();
function camera(dt) {
  const R = G.me; let k1 = 5, k2 = 7;
  if (G.state === 'home') { const a = Math.sin(G.t * 0.25) * 0.7; tp.set(R.x + Math.sin(a) * 7, R.y + 2.6, R.z - 2 + Math.cos(a) * 7); tl.set(R.x, R.y + 1, R.z); k1 = 2; }
  else if (G.state === 'podium') { const a = Math.sin(G.podT * 0.3) * 0.5; tp.set(Math.sin(a) * 9.5, G.podY + 4, G.podZ + Math.cos(a) * 9.5); tl.set(0, G.podY + 2.5, G.podZ); k1 = 2; k2 = 3; }
  else { const lvl = G.course.level(R.z), fall = R.air && R.y - lvl > 3 ? Math.min(4, (R.y - lvl) * 0.3) : 0; tp.set(R.x * 0.7, Math.max(R.y, lvl) * 0.6 + lvl * 0.4 + 4.6 + fall, R.z + 10 + fall); tl.set(R.x * 0.85, R.y * 0.7 + lvl * 0.3 + 1.2, R.z - 10); }
  camP.lerp(tp, 1 - Math.exp(-k1 * dt)); camL.lerp(tl, 1 - Math.exp(-k2 * dt));
  if (G.state === 'race' || G.state === 'count' || G.state === 'finished') { camP.z = tp.z; camL.z = tl.z; }   // never fall behind the boat
  const fovT = E.fovBase + (R && R.nitro > 0 ? 12 : 0) + (R ? Math.min(7, R.speed * 0.13) : 0); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); cam.lookAt(bendPoint(camL, _q));
  G.course.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(R.x, R.y, R.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(_q.set(-8, 22, 10));
}
// ---------------- boot ----------------
const t0 = performance.now();
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap */ } }
Promise.all(['people.bin', 'kit.glb', 'nature.glb'].map(loadBin)).then(async ([pb, kb, nb]) => {
  P = await loadPeople(pb);
  const gl = new GLTFLoader(), K = (await gl.parseAsync(kb, '')).scene, N = (await gl.parseAsync(nb, '')).scene.getObjectByName('nature');
  setKits(K, N);
  if (Q.get('level')) PF.level = +Q.get('level');
  startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  Music.warm(['title', 'race', 'win']);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  startLoop({ update, camera, active: () => G.state === 'race', frozen: () => G.state === 'load' || G.state === 'pause' });
  if (Q.get('play')) play();
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; console.error(e); });
window.__G = G; window.__play = play; window.__hop = hop; window.__nitro = useNitro; window.__trick = trick; window.__item = useItem; window.__places = () => places().map(r => r.spec.name + ':' + Math.round(r.z));
