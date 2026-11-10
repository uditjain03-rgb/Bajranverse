// SPLASH RACER — by BajrangVerse Studios
// A kart race with a twist: the road ends in a river, the karts fly off the ramp and splash down as SPEEDBOATS, then
// race up the far ramp and turn back into karts. Drag to steer, tap NITRO for a boost, swipe UP to hop (and to flip
// in the air off the big ramps for more nitro). Six funny racers, cows on the road, buoys in the river, a podium.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { setBend, bendPoint, canvasTex, flat, mesh, oneMesh } from '../common/gfx.js';
import { renderer, scene, cam, hemi, sun, E, $, Q, PI, clamp, damp, rnd, pick, puff, splash, boom, popText, banner, flash, startLoop, loadBin, setQuality, fling, clearFx, clearPops, warmRing, flashAt, dotTex } from '../common/engine.js';
import { buildTrack, setKits, kit, WATER_Y } from '../common/track.js';
import { makeVehicle, driveWheels, CAR_S, BOAT_S } from '../common/vehicles.js';
import { loadPeople, Actor, Blobs, EXPR } from '../common/people.js';
import { drawFace } from '../common/portrait.js';
import { Audio } from '../common/audio.js';
import { Music } from '../common/music.js';
import { Engine } from '../common/sfx.js';
import { makePrefs, openModal, closeModal, modalOpen, onAdDone, adReady, rewardAd, betweenLevels, vibrate, settingsPanel, giftPanel, giftState } from '../common/ui.js';

const PF = makePrefs('splashracer_v1', { level: 1, coins: 0, karts: ['kart-oobi'], boats: ['boat-speed-a'], kart: 'kart-oobi', boat: 'boat-speed-a', helmet: 0xe8402a, wins: 0, gift: null, set: { sound: true, music: true, vib: true, hi: true } });
setQuality(PF.set.hi ? 2 : 0); Audio.setMuted(!PF.set.sound);
Music.config({ title: 'bv_title', race: 'funkorama', race2: 'fuzzball', race3: 'monkeys', boss: 'hyperfun', win: 'bv_win', podium: 'merry_go' }, { bv_title: 0.95, bv_win: 1, funkorama: 0.75, fuzzball: 0.75, monkeys: 0.7, hyperfun: 0.75, merry_go: 0.75 });
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
E.onSfx = n => sfxT(n, 0.05);
const vib = ms => vibrate(PF, ms);

// ---------------- the racers ----------------
const RIVALS = [
  { name: 'Speedy Sonu', kart: 'kart-oodi', boat: 'boat-speed-b', helmet: 0x2a8ad8, suit: 0x1a4aa8, skin: 0xc68642, fem: 0, skill: 0.9, f0: 190, lines: ['Bye bye, slowpoke!', 'Catch me if you can!', 'Zoooom!'], hurt: ['Arre! My kart!', 'Not fair!'] },
  { name: 'Aunty Rocket', kart: 'kart-ooli', boat: 'boat-speed-c', helmet: 0xe84a9a, suit: 0xb02a7a, skin: 0xe0ac69, fem: 1, skill: 0.88, f0: 250, lines: ['Beta, move aside!', 'Aunty is coming!', 'Too slow, beta!'], hurt: ['Hai Ram!', 'My hair!'] },
  { name: 'Turbo Tinku', kart: 'kart-oopi', boat: 'boat-speed-d', helmet: 0x3fcf6e, suit: 0x1a8a3a, skin: 0x8d5524, fem: 0, skill: 0.93, f0: 170, lines: ['Turbo time!', 'Eat my splash!', 'Hahaha!'], hurt: ['Ouch ouch!', 'Who parked a cow here?!'] },
  { name: 'Dizzy Dolly', kart: 'kart-oozi', boat: 'boat-speed-f', helmet: 0xffc21a, suit: 0xd89a10, skin: 0xf1c27d, fem: 1, skill: 0.86, f0: 270, lines: ['Wheee!', 'Which way is the finish?', 'Hehehe!'], hurt: ['Oopsie!', 'Dizzy dizzy!'] },
  { name: 'Professor Pappu', kart: 'race', boat: 'boat-speed-g', helmet: 0xa05ad8, suit: 0x6a3aa8, skin: 0xa86b3c, fem: 0, skill: 0.91, f0: 140, lines: ['Physics says I win!', 'Calculated!', 'E equals MC zoom!'], hurt: ['Not in my formula!', 'Hmm, error!'] },
];
const BOSS = { name: 'Mr. Moneybags', kart: 'race-future', boat: 'boat-fan', helmet: 0xffc21a, suit: 0x1a1a1a, skin: 0xd8a070, fem: 0, skill: 1.02, f0: 110, lines: ['Money makes me FAST!', 'Out of my way, peasants!', 'Ha ha ha!'], hurt: ['My golden kart!', 'I will buy this race!'] };
const KARTS = [
  { id: 'kart-oobi', name: 'Bubble Kart', price: 0, sp: 1, nit: 1 }, { id: 'kart-oodi', name: 'Blue Bolt', price: 400, sp: 1.03, nit: 1 }, { id: 'kart-ooli', name: 'Pink Panther', price: 800, sp: 1.04, nit: 1.1 },
  { id: 'kart-oopi', name: 'Green Gecko', price: 1300, sp: 1.06, nit: 1.1 }, { id: 'race', name: 'Racer X', price: 2200, sp: 1.09, nit: 1.15 }, { id: 'race-future', name: 'Future Flash', price: 3500, sp: 1.12, nit: 1.25 }];
const BOATS = [
  { id: 'boat-speed-a', name: 'Sunny Splash', price: 0, sp: 1 }, { id: 'boat-speed-b', name: 'Orange Wave', price: 350, sp: 1.03 }, { id: 'boat-speed-j', name: 'Mint Missile', price: 700, sp: 1.05 },
  { id: 'boat-speed-e', name: 'Blue Whale', price: 1200, sp: 1.07 }, { id: 'boat-fan', name: 'Fan Boat', price: 2600, sp: 1.11 }];
const HELMETS = [0xe8402a, 0x2a8ad8, 0x3fcf6e, 0xffc21a, 0xe84a9a, 0x1a1a1a, 0xffffff, 0xa05ad8];
const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

// ---------------- the level ----------------
const THEMES = ['beach', 'jungle', 'town', 'mountain', 'sunset', 'city', 'night'];
const RW = 14, HALF = RW / 2 - 1.0, RIVER = 11;
function makeLevel(n) {
  let seed = n * 7919 + 13; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const L = Math.round(Math.min(2400, 1300 + n * 45)), boss = n % 5 === 0, d = Math.min(1, (n - 1) / 20);
  const theme = THEMES[Math.floor((n - 1) / 2) % THEMES.length];
  const nw = Math.min(3, 1 + (n >= 3) + (n >= 8)), water = [];
  for (let i = 0; i < nw; i++) { const c = -L * (i + 1) / (nw + 1), len = r(150, 220) + d * 40; water.push({ z0: Math.round(c + len / 2), z1: Math.round(c - len / 2) }); }
  const wet = z => water.some(w => z < w.z0 + 14 && z > w.z1 - 14), inWater = z => water.some(w => z < w.z0 - 25 && z > w.z1 + 25);
  const ev = []; let ramps = 0;
  for (let z = -90; z > -L + 60; z -= r(30, 48) - d * 6) {
    if (inWater(z)) { const p = pk(['buoys', 'buoys', 'crates', 'gate', 'fishing', 'wramp', 'coins']); ev.push({ t: p, z, x: pk([-6, -3, 0, 3, 6]), side: pk([-1, 1]) }); continue; }
    if (wet(z)) continue;
    const p = pk(['coins', 'coins', 'nitro', 'cows', 'cones', 'mud', ...(n >= 2 ? ['truck'] : []), ...(n >= 3 ? ['fruit', 'cows'] : []), ...(n >= 4 ? ['oil'] : []), ...(ramps < 2 + d * 2 ? ['ramp'] : [])]);
    if (p === 'ramp') ramps++;
    ev.push({ t: p, z, x: pk([-4, -2, 0, 2, 4]), side: pk([-1, 1]), n: 3 + Math.floor(R() * 3) });
  }
  return { n, L, boss, d, theme, water, ev, music: boss ? 'boss' : pk(['race', 'race2', 'race3']) };
}

// ---------------- state ----------------
const G = { state: 'load', t: 0, racers: [], me: null, lv: null, track: null, objs: [], coins: 0, nitro: 0.4, finished: [], podium: null, countT: 0 };
let P = null, COW = null, blobs = null;
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
// a racer: a kart and a boat (one shown at a time) with the same human driver
function makeRacer(spec, isMe) {
  const root = new THREE.Group(); scene.add(root);
  const kartV = makeVehicle(spec.kart, spec.kart.startsWith('kart') ? CAR_S * 1.05 : CAR_S * 0.95), boatV = makeVehicle(spec.boat, BOAT_S); root.add(kartV.obj, boatV.obj); boatV.obj.visible = false;
  const drv = new Actor(P[spec.fem ? 'racerF' : 'racerM'], { tint: spec.suit, skin: spec.skin, hair: spec.helmet, expr: EXPR.happy }); drv.scale.setScalar(0.9); root.add(drv); drv.play('drive');
  const face = document.createElement('canvas'); face.width = face.height = 64;
  const R = { spec, isMe, root, kartV, boatV, drv, x: 0, z: 0, y: 0, vy: 0, speed: 0, air: false, boat: false, nitro: 0, stun: 0, spin: 0, flip: 0, lane: 0, done: false, place: 0, face, expr: 'happy', exprT: 0, talkT: rnd(3, 8), finishT: 0, lastPlace: 6 };
  seat(R); return R;
}
function seat(R) { const k = R.boat; R.drv.position.set(0, k ? 0.42 : (R.spec.kart.startsWith('kart') ? 0.12 : 0.02), k ? 0.55 : 0.12); }
function setFace(R, e, dur = 2) { R.expr = e; R.exprT = dur; R.drv.expr = EXPR[e === 'sleep' ? 'calm' : e] ?? 0; }
function say(R, text, e, col = '#fff') { if (!R) return; showBubble(R, text); if (e) setFace(R, e, 2.2); const f0 = R.spec.f0; sfx('talk', 0, { w: pick(['hey', 'wow', 'haha', 'yay', 'wheee']), f0, fk: R.spec.fem ? 1.12 : 0.95 }); }
let bubbleT = 0;
function showBubble(R, text) { const b = $('bubble'); $('bubbleName').textContent = R.isMe ? 'YOU' : R.spec.name; $('bubbleText').textContent = text; b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); bubbleT = 2.6; G.bubbleR = R; }
// ---------------- building a race ----------------
function clearLevel() {
  if (G.track) G.track.dispose(); G.objs.forEach(o => o.obj && scene.remove(o.obj)); G.objs = [];
  G.racers.forEach(R => scene.remove(R.root)); G.racers = []; clearFx(); clearPops(); if (G.podium) { scene.remove(G.podium); G.podium = null; } if (G.gates) G.gates.forEach(g => scene.remove(g));
}
function startLevel(n, playNow) {
  clearLevel();
  const lv = G.lv = makeLevel(n);
  setBend(n, -lv.L - 40, 0.8, 0.25, -30);
  G.track = buildTrack({ L: lv.L, RW, lanes: 4, theme: lv.theme, water: lv.water }, scene);
  hemi.intensity = G.track.theme.night ? 1.1 : 2.5; sun.intensity = G.track.theme.night ? 1.0 : 2.9;
  // the racers on the grid (you start at the back: overtaking is the fun)
  const field = [...RIVALS.slice(0, 4), lv.boss ? BOSS : RIVALS[4]];
  const meSpec = { name: 'YOU', kart: PF.kart, boat: PF.boat, helmet: PF.helmet, suit: 0x2a2a30, skin: 0xb97a52, fem: 0, skill: 1, f0: 150, lines: [], hurt: [] };
  field.forEach((s, i) => { const R = makeRacer(s, false); R.x = (i % 2 ? 3 : -3); R.z = -4 - Math.floor(i / 2) * 6 - 6; R.lane = R.x; G.racers.push(R); });
  G.me = makeRacer(meSpec, true); G.me.x = 0; G.me.z = 2; G.racers.push(G.me);
  // start and finish gates
  G.gates = [-2, -lv.L].map((z, i) => { const g = kit('gate-finish', 2.6); g.position.set(0, 0, z); g.rotation.y = PI; scene.add(g); g.traverse(q => { q.frustumCulled = false; }); return g; });
  for (const e of lv.ev) spawn(e);
  Object.assign(G, { t: 0, coins: 0, nitro: 0.45, finished: [], tx: 0, countT: 3.6, state: playNow ? 'count' : 'home', shownPlace: 0, flipCombo: 0 });
  $('lvl').textContent = (lv.boss ? '👑 ' : '') + 'RACE ' + n;
  // send everything to the graphics chip now, not in the middle of the race
  try { G.track.cullAll(); const done = warmRing(); renderer.compile(scene, cam); renderer.render(scene, cam); done(); } catch (e) { /* not needed */ }
  updateHud(0);
  if (playNow) { music(lv.music); banner(lv.boss ? '👑 BOSS RACE!' : 'RACE ' + n, lv.boss ? 'Beat Mr. Moneybags!' : G.track.theme.night ? 'Night race!' : 'Get ready…', 2); }
}
// ---------------- things on the track ----------------
const coinG = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16); coinG.rotateX(PI / 2);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x8a5a00, roughness: 0.3 });
// every coin on the track is drawn by one instanced mesh (the coins themselves are just positions)
const coinIM = new THREE.InstancedMesh(coinG, coinMat, 160); coinIM.frustumCulled = false; coinIM.count = 0; scene.add(coinIM);
const coinAt = (x, y, z, g) => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.isCoin = true; g.add(o); return o; };
const nitroMat = new THREE.MeshStandardMaterial({ color: 0x2ad8ff, emissive: 0x0a5a8a, roughness: 0.3 });
function spawn(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, hit: new Set() };
  const water = G.track.wetAt(e.z), y0 = water ? WATER_Y + 0.4 : 0;
  if (e.t === 'coins') { o.items = []; const x0 = e.x; for (let i = 0; i < 6; i++) { o.items.push(coinAt(x0 + Math.sin(i * 0.7) * 1.5, y0 + 1, -i * 3, g)); } }
  else if (e.t === 'nitro') { o.items = []; for (let i = 0; i < 2; i++) { const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12), nitroMat, 0, 0, 0, b); mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8), flat(0xdddddd), 0, 0.6, 0, b); b.position.set(e.x + (i ? 3 : -3) * (e.x > 0 ? -1 : 1), 1, 0); g.add(b); o.items.push(b); } }
  else if (e.t === 'cows') { o.cows = []; const n = Math.min(3, e.n - 1); for (let i = 0; i < n; i++) { const c = makeCow(); c.obj.position.set(-e.side * (RW / 2 + 3 + i * 2.2), 0, i * 1.5); c.obj.rotation.y = e.side > 0 ? PI / 2 : -PI / 2; g.add(c.obj); o.cows.push(c); } o.go = false; }
  else if (e.t === 'cones') { o.items = []; for (let i = 0; i < 5; i++) { const c = kit('cone', 2.2); c.position.set(e.x + (i - 2) * 1.2, 0, -i * 0.6); g.add(c); o.items.push(c); } }
  else if (e.t === 'mud' || e.t === 'oil') { const m = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18), new THREE.MeshStandardMaterial({ color: e.t === 'mud' ? 0x6a4a2a : 0x1a1a24, roughness: e.t === 'mud' ? 1 : 0.05, transparent: true, opacity: 0.92 })); m.rotation.x = -PI / 2; m.scale.set(1.3, 1, 0.8); m.position.set(e.x, 0.04, 0); g.add(m); }
  else if (e.t === 'truck') { const v = makeVehicle(pick(['tractor', 'truck', 'garbage-truck', 'delivery']), CAR_S); v.obj.position.set(e.x, 0, 0); g.add(v.obj); o.v = v; o.vx = e.x; o.sp = rnd(9, 12); }
  else if (e.t === 'fruit') { const c = new THREE.Group(); mesh(new THREE.BoxGeometry(2, 0.8, 1.2), flat(0x9a6a3a), 0, 0.9, 0, c); for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), flat(0x3a2a1a), s * 0.9, 0.4, 0, c).rotation.z = PI / 2; for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.2, 8, 6), flat(pick([0xff4a2a, 0xffc21a, 0x7ad83a, 0xff9a1a])), rnd(-0.8, 0.8), 1.45, rnd(-0.45, 0.45), c); c.position.set(e.x, 0, 0); g.add(oneMesh(c)); o.cart = g.children[g.children.length - 1]; }
  else if (e.t === 'ramp') { const w = 6, r = new THREE.Group(); const rp = mesh(new THREE.BoxGeometry(w, 0.3, 7), flat(0xff8a3a), 0, 0.9, 0, r); rp.rotation.x = 0.28; for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(w + 0.05, 0.05, 0.3), flat(0xffffff), 0, 0.2 + i * 0.38, 3 - i * 1.4, r).rotation.x = 0.28; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 2, 7), flat(0x7a4a20), s * w / 2, 0.8, 0, r).rotation.x = 0.28; r.position.set(e.x, 0, 0); g.add(oneMesh(r)); o.w = w; o.items = []; for (let i = 0; i < 8; i++) { o.items.push(coinAt(e.x, 4 + Math.sin(i / 7 * PI) * 4, -6 - i * 3, g)); } }
  else if (e.t === 'buoys') { o.items = []; for (let i = 0; i < 5; i++) { const b = kit(i % 2 ? 'buoy' : 'buoy-flag', 1.6); b.position.set((i % 2 ? 1 : -1) * 3.5 + rnd(-1, 1), WATER_Y, -i * 6); g.add(b); o.items.push(b); } }
  else if (e.t === 'crates') { o.items = []; for (let i = 0; i < 4; i++) { const b = kit('box', 2.4); b.position.set(e.x + rnd(-5, 5), WATER_Y + 0.1, -i * 4); g.add(b); o.items.push(b); } }
  else if (e.t === 'fishing') { const b = kit(pick(['boat-fishing-small', 'boat-row-small', 'boat-tug-a']), 1.6); b.position.set(e.x, WATER_Y, 0); b.rotation.y = rnd(-0.4, 0.4); g.add(b); o.items = [b]; o.wide = 2.2; }
  else if (e.t === 'gate') { const b = kit('gate', 2.2); b.position.set(e.x, WATER_Y, 0); b.rotation.y = PI; g.add(b); }
  else if (e.t === 'wramp') { const b = kit('ramp-wide', 1.8); b.position.set(e.x, WATER_Y, 0); b.rotation.y = PI; g.add(b); o.w = 7; o.items = []; for (let i = 0; i < 6; i++) { o.items.push(coinAt(e.x, WATER_Y + 3 + Math.sin(i / 5 * PI) * 3, -5 - i * 3, g)); } }
  g.traverse(q => { q.frustumCulled = false; }); G.objs.push(o);
}
// the real size of a skinned animal (its bones place the vertices): scale it to a given height
function animalScale(root, h) { root.updateMatrixWorld(true); const b = new THREE.Box3(); root.traverse(q => { if (q.isSkinnedMesh) { q.computeBoundingBox(); b.union(q.boundingBox.clone().applyMatrix4(q.matrixWorld)); } }); return h / Math.max(0.001, b.max.y - b.min.y); }
function makeCow() { const o = cloneSkinned(COW.scene); o.scale.setScalar(COW.s); const mx = new THREE.AnimationMixer(o), walk = COW.anims.find(a => /Walk/i.test(a.name)) || COW.anims[0]; if (walk) mx.clipAction(walk).play(); o.traverse(q => { q.frustumCulled = false; }); return { obj: o, mx }; }
// ---------------- driving ----------------
const GRAV = 22;
function surfaceY(z) { return G.track.wetAt(z) ? WATER_Y + 0.12 : 0; }
function updateRacer(R, dt) {
  const lv = G.lv, wet = !!G.track.wetAt(R.z);
  // the race is on for this racer?
  const racing = G.state === 'race' && !R.done;
  // target speed: player from stats; rivals by skill, a little rubber band keeps the race close
  const st = R.isMe ? (wet ? (BOATS.find(b => b.id === PF.boat) || BOATS[0]).sp : (KARTS.find(k => k.id === PF.kart) || KARTS[0]).sp) : R.spec.skill;
  let top = 27 * st * (1 + lv.d * 0.08);
  if (!R.isMe && G.me) { const gap = R.z - G.me.z; top *= gap > 25 ? 1.08 : gap < -40 ? 0.93 : 1; }
  if (R.nitro > 0) { R.nitro -= dt; top += 13 * (R.isMe ? (KARTS.find(k => k.id === PF.kart) || KARTS[0]).nit : 1); }
  if (R.stun > 0) { R.stun -= dt; top *= 0.45; }
  if (R.mud > 0) { R.mud -= dt; top *= 0.55; }
  if (!racing) top = R.done ? 14 : 0;
  R.speed = damp(R.speed, top, R.nitro > 0 ? 3 : 1.4, dt);
  const pz = R.z; R.z -= R.speed * dt;
  // steering
  const lim = wet ? RIVER : HALF;
  if (R.isMe) { G.tx = clamp(G.tx, -lim, lim); R.x = damp(R.x, G.tx, 9, dt); }
  else { ai(R, dt, lim); R.x = damp(R.x, R.lane, 3, dt); }
  R.x = clamp(R.x, -lim, lim);
  // jumping, landing, water
  const ground = surfaceY(R.z);
  if (R.air) { R.vy -= GRAV * dt; R.y += R.vy * dt; if (R.y <= ground && R.vy < 0) land(R, ground); }
  else { R.y = ground + (wet ? Math.sin(G.t * 5 + R.x) * 0.07 : 0); }
  // into the river and out of it: off the ramp, transform in the air
  for (const w of lv.water) {
    if (pz > w.z0 && R.z <= w.z0) { R.air = true; R.vy = 7.5; transform(R, true); }
    if (pz > w.z1 && R.z <= w.z1) { R.air = true; R.vy = 9; transform(R, false); }
  }
  // spin-out (oil), flips
  if (R.spin > 0) R.spin = Math.max(0, R.spin - dt);
  if (R.flip > 0) R.flip = Math.max(0, R.flip - dt * 1.7);
  // pose the racer
  const steer = (R.isMe ? G.tx - R.x : R.lane - R.x) * 0.08;
  R.root.position.set(R.x, R.y, R.z); R.root.rotation.set(R.air ? -0.12 + (1 - R.flip) * 0 + (R.flip > 0 ? (1 - R.flip) * PI * 2 : 0) : (wet ? Math.sin(G.t * 3 + R.x) * 0.03 : 0), -steer * 0.9 + (R.spin > 0 ? R.spin * 12 : 0), wet ? -steer * 0.6 : 0);
  if (!R.boat) driveWheels(R.kartV, pz - R.z, steer * 3);
  R.drv.update(dt, 1); R.drv.rotation.y = steer * 0.6;
  if (R.exprT > 0) { R.exprT -= dt; if (R.exprT <= 0) setFace(R, 'happy', 0); }
  // spray and dust
  const near = Math.abs(R.z - G.me.z) < 60;
  if (near && R.speed > 8 && Math.random() < dt * (wet ? 24 : 8)) { if (wet && !R.air) { puff(_p.set(R.x + rnd(-1, 1), R.y + 0.3, R.z + 2), 1, 0xe8f8ff, { size: 0.6, speed: 2, life: 0.6, grav: 6 }); } else if (!R.air && R.isMe) puff(_p.set(R.x + rnd(-0.6, 0.6), 0.15, R.z + 1.6), 1, G.track.theme.props === 'beach' ? 0xf0dca0 : 0xd8d0c0, { size: 0.3, speed: 0.4, life: 0.35, grav: 0 }); }
  if (near && R.nitro > 0 && Math.random() < dt * 40) puff(_p.set(R.x + rnd(-0.3, 0.3), R.y + 0.6, R.z + 1.5), 1, 0xff9a1a, { add: true, size: 0.6, speed: 1, life: 0.25, grav: -1, cols: [0xffe04a, 0xff7a1a, 0x4ad8ff] });
  // the finish line
  if (racing && R.z <= -lv.L) finish(R);
}
function ai(R, dt, lim) {
  // look ahead for trouble in my lane, move to a free one; now and then change lanes for fun
  R.aiT = (R.aiT || 0) - dt;
  const ahead = G.objs.filter(o => o.z < R.z && o.z > R.z - 30 && isHazard(o));
  const blocked = x => ahead.some(o => hazardAt(o, x)) || G.racers.some(q => q !== R && q.z < R.z && q.z > R.z - 7 && Math.abs(q.x - x) < 1.6);
  if (blocked(R.lane) || R.aiT <= 0) { const opts = [-lim + 1, -lim / 2, 0, lim / 2, lim - 1].filter(x => !blocked(x)); if (opts.length) R.lane = opts.sort((a, b) => Math.abs(a - R.x) - Math.abs(b - R.x))[Math.random() < 0.7 ? 0 : Math.min(1, opts.length - 1)]; R.aiT = rnd(2, 5); }
  if (G.state === 'race' && R.nitro <= 0 && Math.random() < dt * (R.z > G.me.z ? 0.18 : 0.05)) { R.nitro = 1.6; }
  R.talkT -= dt; if (R.talkT <= 0 && G.state === 'race') { R.talkT = rnd(9, 16); if (Math.abs(R.z - G.me.z) < 30) say(R, pick(R.spec.lines), 'laugh'); }
}
const isHazard = o => ['cows', 'cones', 'oil', 'mud', 'truck', 'fruit', 'buoys', 'crates', 'fishing'].includes(o.t);
function hazardAt(o, x) {
  if (o.t === 'cows') return o.go && o.cows.some(c => Math.abs(c.obj.position.x - x) < 1.8);
  if (o.t === 'truck') return Math.abs(o.v.obj.position.x - x) < 1.9;
  if (o.items) return o.items.some(i => i.visible !== false && Math.abs(i.position.x - x) < 1.6);
  return Math.abs((o.x || 0) - x) < 2.2;
}
function land(R, ground) {
  R.y = ground; R.vy = 0; R.air = false; const wet = !!G.track.wetAt(R.z);
  if (wet) { splash(_p.set(R.x, ground + 0.3, R.z), R.isMe ? 1.6 : 1); if (Math.abs(R.z - G.me.z) < 40) sfxT('splash', 0.1); } else { puff(_p.set(R.x, 0.3, R.z), 6, 0xd8d0c0, { size: 0.8, speed: 2, life: 0.5 }); if (R.isMe) sfx('thud'); }
  if (R.isMe) { E.shake = Math.max(E.shake, 0.3); vib(30); if (R.flip > 0) { R.flip = 0; popText('OOPS! WOBBLE!', _p.set(R.x, 3, R.z), '#ffb0a0', 24, 0.8); R.stun = 0.4; } }
}
function transform(R, toBoat) {
  R.boat = toBoat; R.kartV.obj.visible = !toBoat; R.boatV.obj.visible = toBoat; seat(R);
  if (Math.abs(R.z - G.me.z) < 50) { puff(_p.set(R.x, R.y + 1, R.z), 14, 0xffffff, { star: true, add: true, speed: 5, size: 0.35, cols: [0xffe066, 0x7ad8ff, 0xffffff] }); }
  if (R.isMe) { sfx('transform'); banner(toBoat ? '🌊 SPLASH MODE!' : '🏁 ROAD MODE!', '', 0.9); if (toBoat) { sfx('bigSplash', 0.5); setFace(R, 'laugh', 1.5); sfx('talk', 0.1, { w: 'wheee', f0: 170 }); } }
}
function finish(R) {
  R.done = true; G.finished.push(R); R.place = G.finished.length;
  if (R.isMe) {
    G.state = 'finished'; Engine.stop(); const p = R.place; setFace(R, p <= 3 ? 'laugh' : 'sad', 9);
    sfx(p <= 3 ? 'fanfare' : 'sad'); sfx('crowd', 0.2); banner(p === 1 ? '🏆 YOU WIN!' : p <= 3 ? '🎉 ' + ord(p).toUpperCase() + ' PLACE!' : ord(p) + ' place…', p <= 3 ? 'Brilliant driving!' : 'So close! Try again!', 2.5);
    for (let i = 0; i < 6; i++) setTimeout(() => puff(_p.set(rnd(-6, 6), rnd(5, 9), -G.lv.L), 18, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0], speed: 6, life: 1.2, size: 0.4 }), i * 250);
    setTimeout(podium, 2600);
  }
}
// ---------------- the player's moves ----------------
function useNitro() {
  if (G.state !== 'race' || G.nitro < 0.33 || G.me.nitro > 0) return;
  G.nitro -= 0.33; G.me.nitro = 1.8; sfx('nitro'); flash('#9ae8ff', 0.25); vib(40); E.shake = 0.2; popText('NITRO!', _p.set(G.me.x, 3, G.me.z - 3), '#7ae8ff', 30, 0.7);
}
function hop() {
  const R = G.me; if (G.state !== 'race') return;
  if (R.air) { if (R.flip <= 0 && R.vy > -3) { R.flip = 1; G.flipCombo++; sfx('swoosh'); popText(G.flipCombo > 1 ? 'DOUBLE FLIP!' : 'FLIP! +NITRO', _p.set(R.x, R.y + 3, R.z), '#ffe066', 28, 0.9); G.nitro = Math.min(1, G.nitro + 0.25); setFace(R, 'laugh', 1.2); } return; }
  R.air = true; R.vy = 7; sfx('boing'); G.flipCombo = 0;
}
// ---------------- collisions and pickups ----------------
function interact(R, dt) {
  for (const o of G.objs) {
    const dz = R.z - o.z; if (dz > 8 || dz < -36) continue;
    if (o.t === 'coins' || o.t === 'ramp' || o.t === 'wramp') { if (o.items) for (const c of o.items) { if (!c.visible) continue; const cz = o.z + c.position.z; if (Math.abs(cz - R.z) < 1.4 && Math.abs(c.position.x - R.x) < 1.5 && Math.abs(c.position.y - R.y - 0.8) < 1.8) { c.visible = false; if (R.isMe) { G.coins++; sfxT('coin', 0.03); G.nitro = Math.min(1, G.nitro + 0.02); puff(_p.set(c.position.x, c.position.y, cz), 2, 0xffe066, { star: true, size: 0.4 }); } } } }
    if (o.t === 'nitro') for (const b of o.items) { if (!b.visible) continue; if (Math.abs(o.z - R.z) < 1.6 && Math.abs(b.position.x - R.x) < 1.5) { b.visible = false; if (R.isMe) { G.nitro = Math.min(1, G.nitro + 0.34); sfx('kaching'); popText('+NITRO', _p.set(R.x, 2.5, R.z), '#7ae8ff', 26, 0.7); } else R.nitro = 1.4; } }
    if (o.t === 'ramp' || o.t === 'wramp') { if (!R.air && dz <= 0.4 && dz > -0.6 && Math.abs(R.x - o.x) < o.w / 2) { R.air = true; R.vy = o.t === 'ramp' ? 13 : 11; if (R.isMe) { sfx('whoosh'); banner('🚀 BIG AIR!', 'Swipe UP to FLIP!', 1); E.slow = 0.6; setTimeout(() => { E.slow = 1; }, 700); setFace(R, 'laugh', 2); } } }
    if (o.t === 'gate' && R.isMe && !o.hit.has(R) && Math.abs(dz) < 1 && Math.abs(R.x - o.x) < 3) { o.hit.add(R); G.nitro = Math.min(1, G.nitro + 0.3); sfx('gateGood'); popText('BONUS GATE! +NITRO', _p.set(R.x, 3, R.z), '#7ae8ff', 26, 0.9); }
    if (R.air && R.y > 1.2) continue;
    // obstacles
    if (Math.abs(dz) < 1.6 && !o.hit.has(R)) {
      let hitIt = false;
      if (o.t === 'cows' && o.go) for (const c of o.cows) { if (Math.abs(c.obj.position.x - R.x) < 1.7) { hitIt = true; c.bonk = 1; } }
      else if ((o.t === 'cones' || o.t === 'buoys' || o.t === 'crates') && o.items) for (const c of o.items) { if (c.visible !== false && Math.abs(c.position.x - R.x) < 1.3 && Math.abs(o.z + c.position.z - R.z) < 1.5) { hitIt = true; c.visible = false; const f = c.clone(); f.position.set(c.position.x, c.position.y, o.z + c.position.z); fling(f, new THREE.Vector3(rnd(-4, 4), rnd(6, 9), -R.speed * 0.6), 1.4, 18, 10); } }
      else if (o.t === 'fishing' && Math.abs(o.x - R.x) < 2.6) hitIt = true;
      else if (o.t === 'truck' && Math.abs(o.v.obj.position.x - R.x) < 1.9 && Math.abs(o.z - R.z) < 3) hitIt = true;
      else if (o.t === 'fruit' && Math.abs(o.x - R.x) < 1.6) { hitIt = true; if (o.cart) o.cart.visible = false; for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), flat(pick([0xff4a2a, 0xffc21a, 0x7ad83a, 0xff9a1a]))); f.position.set(o.x, 1.4, o.z); fling(f, new THREE.Vector3(rnd(-5, 5), rnd(5, 10), rnd(-8, 2)), 1.5, 16, 6); } if (R.isMe) popText('FRUIT SALAD!', _p.set(R.x, 3, R.z), '#ffb03a', 28, 0.9); }
      else if ((o.t === 'mud' || o.t === 'oil') && Math.abs(o.x - R.x) < 2.6) { o.hit.add(R); if (o.t === 'mud') { R.mud = 1.0; if (R.isMe) { sfx('splash'); popText('MUDDY!', _p.set(R.x, 3, R.z), '#c8a070', 26, 0.8); setFace(R, 'sad', 1.2); } puff(_p.set(R.x, 0.5, R.z), 8, 0x6a4a2a, { size: 0.7, speed: 3, life: 0.6, grav: 8 }); } else { R.spin = 0.55; R.speed *= 0.6; if (R.isMe) { sfx('skid'); popText('SLIPPERY!', _p.set(R.x, 3, R.z), '#d0d0ff', 26, 0.8); setFace(R, 'scared', 1.4); vib(60); } } continue; }
      if (hitIt) { o.hit.add(R); bump(R, o.t); }
    }
  }
}
function bump(R, what) {
  R.stun = 0.7; R.speed *= 0.5; const near = Math.abs(R.z - G.me.z) < 40;
  if (near) { sfxT(what === 'cows' ? 'moo' : what === 'buoys' || what === 'fishing' ? 'thud' : 'crash', 0.15); puff(_p.set(R.x, 1, R.z - 1), 6, 0xffffff, { star: true, size: 0.35, speed: 4, cols: [0xffe066, 0xffffff] }); }
  if (R.isMe) { E.shake = 0.5; vib(90); setFace(R, 'scared', 1.5); popText(what === 'cows' ? 'MOOOO!' : pick(['BONK!', 'OUCH!', 'WHOOPS!']), _p.set(R.x, 3, R.z), '#ff8a8a', 30, 0.8); sfx('talk', 0.1, { w: 'ohno', f0: 150 }); }
  else if (near && Math.random() < 0.6) say(R, pick(R.spec.hurt), 'angry');
}
function racerBumps() {
  const L = G.racers;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dz = a.z - b.z, dx = a.x - b.x;
    if (Math.abs(dz) < 2.4 && Math.abs(dx) < 1.5 && !a.air && !b.air) {
      const push = (1.5 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1); a.x += push; b.x -= push; if (a.isMe) G.tx += push; if (b.isMe) G.tx -= push; if (!a.isMe) a.lane = a.x; if (!b.isMe) b.lane = b.x;
      if ((a.isMe || b.isMe) && (G.bumpT || 0) <= 0) { G.bumpT = 0.6; sfx('thud'); vib(25); const o = a.isMe ? b : a; if (Math.random() < 0.5) say(o, pick(['Hey! Watch it!', 'Bumper cars?!', 'Rude!', 'Hehe, bonk!']), 'angry'); puff(_p.set((a.x + b.x) / 2, 1, (a.z + b.z) / 2), 4, 0xffffff, { star: true, size: 0.3 }); }
    }
  }
}
// ---------------- the world each frame ----------------
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
let nC = 0;
function updateObjs(dt) {
  nC = 0;
  for (const o of G.objs) {
    const dz = o.z - G.me.z; o.obj.visible = dz < 30 && dz > -230;
    if (!o.obj.visible) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp' || o.t === 'wramp')) for (const c of o.items) if (c.visible && nC < 160) { _cq.setFromAxisAngle(_Y, G.t * 4 + c.position.x); coinIM.setMatrixAt(nC++, _cm.compose(_cp.set(c.position.x, c.position.y, o.z + c.position.z), _cq, _cs)); }
    if (o.t === 'nitro') for (const b of o.items) { b.rotation.y += dt * 3; b.position.y = 1 + Math.sin(G.t * 4) * 0.2; }
    if (o.t === 'cows') {   // they wander out when you come close… and stop in the middle of the road
      if (!o.go && dz > -70) { o.go = true; if (dz > -60) sfxT('moo', 1.5); }
      o.cows.forEach((c, i) => { const tx = o.x + (i - 1) * 2.2; if (o.go && !c.bonk) { const p = c.obj.position; p.x = damp(p.x, tx, 0.9, dt); c.mx.update(Math.abs(p.x - tx) > 0.3 ? dt : dt * 0.2); } if (c.bonk) { c.bonk = Math.max(0, c.bonk - dt); c.obj.position.y = Math.sin(c.bonk * PI) * 1.5; c.obj.rotation.z = Math.sin(c.bonk * 20) * 0.3; c.mx.update(dt); } });
    }
    if (o.t === 'truck') { o.z -= o.sp * dt * (G.state === 'race' ? 1 : 0); o.obj.position.z = o.z; driveWheels(o.v, o.sp * dt, 0); }
    if (o.t === 'buoys' || o.t === 'crates' || o.t === 'fishing') for (const b of o.items || []) { b.position.y = WATER_Y + Math.sin(G.t * 2 + b.position.x) * 0.12; b.rotation.z = Math.sin(G.t * 1.5 + b.position.z) * 0.08; }
  }
  coinIM.count = nC; coinIM.instanceMatrix.needsUpdate = true;
}
function places() { return [...G.racers].sort((a, b) => (a.done && b.done) ? a.place - b.place : a.done ? -1 : b.done ? 1 : a.z - b.z); }
function update(dt) {
  G.t += dt; if (window.__bot) window.__bot(dt);
  G.track.update(dt, G.t); G.track.cull(G.me.z);
  G.bumpT = (G.bumpT || 0) - dt;
  if (G.state === 'count') { G.countT -= dt; const k = Math.ceil(G.countT - 0.6); if (k !== G.lastK) { G.lastK = k; if (k >= 1 && k <= 3) { banner(String(k), '', 0.7); sfx('beep'); } else if (k <= 0) { banner('GO!', '', 0.8); sfx('go'); G.state = 'race'; Engine.start(); vib(40); say(pick(G.racers.filter(r => !r.isMe)), 'Let\'s gooo!', 'laugh'); } } }
  if (G.state !== 'podium') for (const R of G.racers) { updateRacer(R, dt); if (G.state === 'race' || G.state === 'finished') interact(R, dt); }
  racerBumps(); updateObjs(dt);
  if (G.state === 'race') Engine.set(G.me.speed / 30, G.me.boat, PF.set.sound ? 0.07 : 0);
  // overtakes: the player's place in the race, and reactions
  const pl = places(), my = pl.indexOf(G.me) + 1;
  if (G.state === 'race' && my !== G.shownPlace) { if (G.shownPlace && my < G.shownPlace) { const passed = pl[my]; if (passed && !passed.isMe && Math.random() < 0.7) say(passed, pick(passed.spec.hurt.concat(['Noooo!', 'Come back here!'])), 'angry'); popText(ord(my).toUpperCase() + '!', _p.set(G.me.x, 3.5, G.me.z - 2), '#ffe066', 34, 0.9); sfx('swoosh'); setFace(G.me, 'laugh', 1.2); } G.shownPlace = my; }
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.add('hidden'); }
  updateHud(dt, pl, my);
  blobs.draw([G.racers.filter(r => Math.abs(r.z - G.me.z) < 80 && !G.track.wetAt(r.z)).map(r => ({ x: r.x, z: r.z, y: r.y, s: 2.2 }))], 1);
  if (G.state === 'podium') updatePodium(dt);
}
// ---------------- HUD ----------------
let hudN = 0;
function updateHud(dt, pl, my) {
  $('coinN').textContent = G.coins;
  $('nitroB').style.setProperty('--p', Math.round(G.nitro * 100)); $('nitroB').classList.toggle('ready', G.nitro >= 0.33); $('nitroN').textContent = Math.floor(G.nitro / 0.33 + 0.001);
  if (!pl) return;
  $('placeN').innerHTML = `${my}<small>${my === 1 ? 'st' : my === 2 ? 'nd' : my === 3 ? 'rd' : 'th'}</small>`;
  // the race strip: every racer's face at his distance
  if ((hudN++ & 3) === 0) { const L = G.lv.L; G.racers.forEach((R, i) => { const el = $('dot' + i); if (!el) return; el.style.left = clamp(-R.z / L, 0, 1) * 100 + '%'; el.style.zIndex = R.isMe ? 9 : 1; }); }
  // faces (live expressions)
  if ((hudN & 7) === 0) G.racers.forEach(R => drawFace(R.face, { skin: R.spec.skin, style: 'helmet', helmet: R.spec.helmet }, R.expr, G.t, G.bubbleR === R && bubbleT > 0));
  if (G.bubbleR) $('bubbleFace').getContext('2d').drawImage(G.bubbleR.face, 0, 0, 64, 64, 0, 0, 64, 64);
}
function buildStrip() { const s = $('strip'); s.innerHTML = '<div id="stripLine"></div>'; G.racers.forEach((R, i) => { const d = document.createElement('div'); d.className = 'dot' + (R.isMe ? ' me' : ''); d.id = 'dot' + i; d.appendChild(R.face); s.appendChild(d); }); }
// ---------------- the podium ----------------
function podium() {
  // everyone else finishes now
  for (const R of places()) if (!R.done) { R.done = true; G.finished.push(R); R.place = G.finished.length; }
  G.state = 'podium'; G.podT = 0; music('podium'); $('hud').classList.add('hidden');
  const g = G.podium = new THREE.Group(), z = -G.lv.L - 30; g.position.z = z; scene.add(g);
  const H = [2.0, 1.45, 1.05], X = [0, -2.25, 2.25], C = [0xffc21a, 0xc8d0dc, 0xd8884a];
  for (let i = 0; i < 3; i++) { mesh(new THREE.BoxGeometry(2.2, H[i], 2.2), flat(C[i]), X[i], H[i] / 2, i ? -0.6 : 0, g); }
  for (let i = 0; i < 3; i++) { const t = canvasTex(64, 64, (c, w, h) => { c.font = 'bold 54px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#5a3410'; c.fillText(String(i + 1), 32, 36); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(X[i], H[i] / 2, (i ? -0.6 : 0) + 1.12); g.add(m); }
  G.finished.forEach((R, i) => {
    R.root.position.set(i < 3 ? X[i] : [-3.9, 3.9, 5.4][i - 3], i < 3 ? H[i] : 0, z - (i < 3 ? (i ? 0.6 : 0) : 3)); R.root.rotation.set(0, PI, 0); R.root.scale.setScalar(i < 3 ? 1.3 : 1.1);
    R.kartV.obj.visible = false; R.boatV.obj.visible = false; R.drv.position.set(0, 0, 0); R.drv.rotation.set(0, 0, 0);
    R.drv.play(i < 3 ? 'cheer' : pick(['no', 'idle'])); setFace(R, i === 0 ? 'laugh' : i < 3 ? 'happy' : pick(['sad', 'angry']), 99);
  });
  G.podZ = z; camP.set(0, 4, z + 9.5); camL.set(0, 2.5, z);
}
function updatePodium(dt) {
  G.podT += dt; for (const R of G.racers) R.drv.update(dt);
  if (Math.random() < dt * 3) puff(_p.set(rnd(-6, 6), rnd(6, 10), G.podZ + rnd(-2, 2)), 14, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0, 0xff4fa8], speed: 5, life: 1.3, size: 0.4 });
  if (G.podT > 4.5 && !G.resultsShown) { G.resultsShown = true; results(); }
}
// ---------------- results, garage ----------------
function results() {
  const p = G.me.place, win = p <= 3, prize = [0, 150, 90, 60, 30, 20, 10][p] || 10, total = prize + G.coins + G.lv.n * 3;
  PF.coins += total; if (win) { PF.level = Math.max(PF.level, G.lv.n + 1); PF.wins++; } PF.save();
  const stars = p === 1 ? 3 : p <= 3 ? 2 : 1, unlock = win ? nextUnlock() : null;
  openModal(`<h2>${p === 1 ? '🏆 WINNER!' : win ? ord(p).toUpperCase() + ' PLACE!' : 'TRY AGAIN!'}</h2><div class="stars">${[0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
    <div class="stat"><span>🏁 Place prize (${ord(p)})</span><b>${prize}</b></div><div class="stat"><span>🪙 Coins collected</span><b>${G.coins}</b></div><div class="stat"><span>🎯 Race bonus</span><b>${G.lv.n * 3}</b></div>
    <div class="big" id="totalB">+${total} 🪙</div>${win ? '' : '<p class="tip">Finish in the top 3 to unlock the next race!</p>'}
    ${unlock ? `<div class="card" style="--rc:#2f8cf0"><div class="rar">NEW IN THE GARAGE</div><div class="hico">${unlock.boat ? '🚤' : '🏎️'}</div><b>${unlock.name}</b><span>can be bought now!</span></div>` : ''}
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE COINS</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">${win ? 'NEXT RACE ▶' : 'RACE AGAIN ↻'}</button></div><div class="row"><button class="btn small" id="garB">🔧 GARAGE</button><button class="btn small" id="homeB">HOME</button></div>`);
  if ($('dblB')) $('dblB').onclick = () => { sfx('pop'); rewardAd('double', ok => { if (!ok) return; PF.coins += total; PF.save(); $('totalB').textContent = '+' + total * 2 + ' 🪙'; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { sfx('pop'); closeModal(); betweenLevels(PF.level, () => play(win ? G.lv.n + 1 : G.lv.n)); };
  $('garB').onclick = () => { sfx('pop'); garage(() => goHome()); };
  $('homeB').onclick = () => { sfx('pop'); goHome(); };
}
function nextUnlock() { const n = G.lv.n; if (n % 2) return null; const all = [...KARTS.slice(1).map(k => ({ ...k })), ...BOATS.slice(1).map(b => ({ ...b, boat: 1 }))].sort((a, b) => a.price - b.price); return all[Math.min(all.length - 1, Math.floor(n / 2) - 1)] || null; }
function garage(back) {
  const item = (k, list, cur, owned, boat) => list.map(v => { const own = owned.includes(v.id), on = cur === v.id; return `<div class="item"><div class="ico">${boat ? '🚤' : '🏎️'}</div><div class="txt"><b>${v.name}</b><span>Speed ${'★'.repeat(Math.round((v.sp - 0.95) * 50))}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-${k}="${v.id}" ${on || (!own && PF.coins < v.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'USE' : v.price + ' 🪙'}</button></div>`; }).join('');
  openModal(`<h2>GARAGE</h2><p>🪙 <b>${PF.coins}</b></p><h3>Karts (on the road)</h3><div class="list">${item('k', KARTS, PF.kart, PF.karts)}</div><h3>Boats (in the river)</h3><div class="list">${item('b', BOATS, PF.boat, PF.boats, 1)}</div>
    <h3>Helmet colour</h3><div class="row">${HELMETS.map(h => `<button class="swatch ${PF.helmet === h ? 'on' : ''}" data-h="${h}" style="background:#${h.toString(16).padStart(6, '0')}"></button>`).join('')}</div><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  const buy = (list, owned, key, id) => { const v = list.find(q => q.id === id); if (!owned.includes(id)) { if (PF.coins < v.price) return; PF.coins -= v.price; owned.push(id); sfx('kaching'); } else sfx('pop'); PF[key] = id; PF.save(); garage(back); };
  document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => buy(KARTS, PF.karts, 'kart', b.dataset.k));
  document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => buy(BOATS, PF.boats, 'boat', b.dataset.b));
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { PF.helmet = +b.dataset.h; PF.save(); sfx('pop'); garage(back); });
  $('closeB').onclick = () => { sfx('pop'); closeModal(); back(); };
}
// ---------------- screens ----------------
function setScreen(s) { $('home').classList.toggle('hidden', s !== 'home'); $('hud').classList.toggle('hidden', s !== 'hud'); }
function play(n = PF.level) { closeModal(); setScreen('hud'); G.resultsShown = false; startLevel(n, true); buildStrip(); }
function goHome() { closeModal(); Engine.stop(); startLevel(PF.level, false); setScreen('home'); refreshHome(); music('title'); }
function refreshHome() { $('homeCoins').textContent = PF.coins.toLocaleString(); $('homeLevel').innerHTML = `RACE ${PF.level}<small>${PF.level % 5 === 0 ? '👑 Boss race!' : 'Road + river!'}</small>`; $('giftB').classList.toggle('dot', giftState(PF).can); }
function pause() { if (G.state !== 'race' && G.state !== 'count') return; G.paused = G.state; G.state = 'pause'; Engine.stop(); Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { sfx('pop'); closeModal(); resume(); }; $('setB2').onclick = () => settings(); $('homeB').onclick = () => { sfx('pop'); goHome(); }; }
function resume() { G.state = G.paused || 'race'; if (G.state === 'race') Engine.start(); music(G.lv.music); }
function settings() { settingsPanel(PF, 'Splash Racer', 'Characters, nature: Quaternius (CC0) · Cars, boats, city: Kenney (CC0)<br>Title and victory music: BajrangVerse Studios<br>Music: "Funkorama", "Fuzzball Parade", "Monkeys Spinning Monkeys", "Merry Go", "Hyperfun" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0', k => { if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : G.lv.music); else Music.stop(); } if (k === 'hi') setQuality(PF.set.hi ? 2 : 0); }, () => { if (G.state === 'pause') resume(); }); }
onAdDone(() => { if (PF.set.music && G.lv) music(G.state === 'home' ? 'title' : G.state === 'podium' ? 'podium' : G.lv.music); });
window.onAppPause = () => { pause(); Engine.stop(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (modalOpen()) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'race' || G.state === 'count') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };
// ---------------- input ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); drag = { x: e.clientX, y: e.clientY, tx: G.tx, sw: false }; });
addEventListener('pointermove', e => { if (!drag || G.state !== 'race') return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.sw && dy < -34 && Math.abs(dy) > Math.abs(dx) * 1.2) { drag.sw = true; hop(); } G.tx = drag.tx + dx / Math.min(innerWidth, 500) * 20; });
addEventListener('pointerup', () => { drag = null; });
const keys = {}; addEventListener('keydown', e => { keys[e.key] = true; if (e.key === 'ArrowUp') hop(); if (e.key === ' ' || e.key === 'n') useNitro(); }); addEventListener('keyup', e => { keys[e.key] = false; });
$('nitroB').addEventListener('pointerdown', e => { e.stopPropagation(); useNitro(); });
$('playB').onclick = () => { Audio.resume(); sfx('pop'); play(); };
$('garageB').onclick = () => { sfx('pop'); garage(refreshHome); };
$('giftB').onclick = () => { sfx('pop'); giftPanel(PF, '🪙', refreshHome); };
$('setB').onclick = () => { sfx('pop'); settings(); };
$('pauseB').onclick = () => { sfx('pop'); pause(); };
document.addEventListener('pointerdown', () => { Audio.resume(); if (G.state === 'home') music('title'); }, { once: true });
// ---------------- camera ----------------
const camP = new THREE.Vector3(0, 6, 12), camL = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3();
function camera(dt) {
  const R = G.me; let k1 = 5, k2 = 7;
  if (G.state === 'home') { const a = Math.sin(G.t * 0.25) * 0.6; tp.set(Math.sin(a) * 6, 2.2, R.z + Math.cos(a) * 6); tl.set(0, 1.2, R.z); k1 = 2; }
  else if (G.state === 'podium') { const a = Math.sin(G.podT * 0.3) * 0.5; tp.set(Math.sin(a) * 9.5, 4, G.podZ + Math.cos(a) * 9.5); tl.set(0, 2.5, G.podZ); k1 = 2; k2 = 3; }
  else { const air = R.air ? Math.min(2.5, R.y * 0.4) : 0; tp.set(R.x * 0.7, R.y * 0.5 + 3.8 + air, R.z + 8.5); tl.set(R.x * 0.85, R.y * 0.6 + 1.2, R.z - 9); }
  camP.lerp(tp, 1 - Math.exp(-k1 * dt)); camL.lerp(tl, 1 - Math.exp(-k2 * dt));
  const fovT = E.fovBase + (R && R.nitro > 0 ? 12 : 0) + (R ? Math.min(6, R.speed * 0.12) : 0); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); cam.lookAt(bendPoint(camL, _q));
  G.track.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(R.x, 0, R.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(_q.set(-8, 22, 10));
}
// ---------------- boot ----------------
const t0 = performance.now();
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap */ } }
Promise.all(['people.bin', 'kit.glb', 'nature.glb', 'cow.glb'].map(loadBin)).then(async ([pb, kb, nb, cb]) => {
  P = await loadPeople(pb);
  const gl = new GLTFLoader(), K = (await gl.parseAsync(kb, '')).scene, N = (await gl.parseAsync(nb, '')).scene.getObjectByName('nature');
  setKits(K, N);
  const cow = await gl.parseAsync(cb, ''); COW = { scene: cow.scene, anims: cow.animations, s: animalScale(cow.scene, 1.6) };
  blobs = new Blobs(scene, dotTex, 40);
  if (Q.get('level')) PF.level = +Q.get('level');
  startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  Music.warm(['title', 'race', 'win']);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  startLoop({ update, camera, active: () => G.state === 'race', frozen: () => G.state === 'load' || G.state === 'pause' });
  if (Q.get('play')) play();
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; });
window.__G = G; window.__play = play; window.__hop = hop; window.__nitro = useNitro; window.__places = () => places().map(r => r.spec.name + ':' + Math.round(r.z));
