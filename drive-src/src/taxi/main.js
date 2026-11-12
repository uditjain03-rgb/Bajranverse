// MAD TAXI MASTI — by BajrangVerse Studios
// A crazy taxi driver doing crazy JOBS in eight Indian places: throw laddoos to wedding guests on Shaadi Street, chase
// the samosa thief through the old bazaar, fly off ramps on the mountain ghat, zoom past speed cameras on Marine Drive
// for selfies, splash grumpy uncles in the monsoon, catch sixers falling outside the stadium, bowl over pins in Cyber
// City, and colour everybody at the Holi festival. Or the MAD RACE: three crazy rivals, fuel and petrol pumps.
// The taxi drives itself at 60 km/h: hold GAS to go faster, BRAKE to slow down, drag to steer, HORN, TURBO, THROW.
// Real Indian traffic (autos, e-rickshaws, tempos, scooters, cycles, bullock carts, vendors' carts, buses, trucks)
// flies when you hit it, cows flip, people bounce: it is a cartoon. Smash too much and the police come.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { setBend, bendPoint, canvasTex, flat, mesh, oneMesh } from '../common/gfx.js';
import { renderer, scene, cam, hemi, sun, rim, E, $, Q, PI, clamp, damp, rnd, pick, puff, popText, banner, flash, startLoop, loadBin, setQuality, fling, clearFx, clearPops, warmRing, dotTex } from '../common/engine.js';
import { setKits, kit } from '../common/track.js';
import { buildStreet, warmMeshes, STAGES, cart, ferris, marigoldArch, billboard, fanStand, glow, bulb, mergeBulbs } from '../common/street.js';
import { makeCar, spinWheels } from '../common/cars.js';
import { loadPeople, Actor, Crowd, Blobs, EXPR } from '../common/people.js';
import { drawFace } from '../common/portrait.js';
import { Audio } from '../common/audio.js';
import { Music } from '../common/music.js';
import { Engine } from '../common/sfx.js';
import { makePrefs, openModal, closeModal, modalOpen, onAdDone, adReady, rewardAd, betweenLevels, vibrate, settingsPanel, giftPanel, giftState } from '../common/ui.js';

const PF = makePrefs('madtaxi_v2', { level: 1, coins: 0, cars: ['kaalipeeli'], car: 'kaalipeeli', horns: [0], horn: 0, rides: 0, stars: 0, gift: null, set: { sound: true, music: true, vib: true, hi: true },
  v3: 0, v4: 0, cust: {}, own: ['p0', 'p1', 'r0', 'r1', 's0', 'd0', 'o0', 'o1', 't0'], eng: {}, may: {}, adT: 0 });
// v2 players who bought a taxi get the new Super Taxi free (their old cabs are replaced by the four new cars)
if (!PF.v3) { PF.v3 = 1; if (PF.cars.some(c => c !== 'kaalipeeli' && !['super', 'muscle', 'monster'].includes(c))) PF.cars = ['kaalipeeli', 'super']; PF.cars = PF.cars.filter(c => ['kaalipeeli', 'super', 'muscle', 'monster'].includes(c)); if (!PF.cars.includes(PF.car)) PF.car = 'kaalipeeli'; PF.save(); }
// v4: the Super Taxi is now 'supercar'; horns are named; new style items are owned by everyone in their free versions
if (!PF.v4) { PF.v4 = 1; PF.cars = PF.cars.map(c => c === 'super' ? 'supercar' : c); if (PF.car === 'super') PF.car = 'supercar'; if (PF.cust.super) { PF.cust.supercar = PF.cust.super; delete PF.cust.super; } if (PF.eng.super) { PF.eng.supercar = PF.eng.super; delete PF.eng.super; }
  PF.horn = 'own'; PF.horns = ['own']; for (const k of ['r1', 's0', 'd0', 'o0', 'o1', 't0']) if (!PF.own.includes(k)) PF.own.push(k); delete PF.mode; PF.save(); }
setQuality(PF.set.hi ? 2 : 0); Audio.setMuted(!PF.set.sound);
Music.config({ title: 'bv_title', drive: 'riley', drive2: 'polka', drive3: 'monkeys', chase: 'fuzzball', win: 'bv_win', happy: 'merry_go' }, { bv_title: 0.95, bv_win: 1, riley: 0.7, polka: 0.7, monkeys: 0.7, fuzzball: 0.75, merry_go: 0.75 });
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
E.onSfx = n => sfxT(n, 0.05);
const vib = ms => vibrate(PF, ms);
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
// a police siren and a crowd "wah!" (made from oscillators, no sound files)
{ const H = Audio.H; Audio.extend({ siren(t) { for (let i = 0; i < 2; i++) { const o = H.osc('square', 700, t + i * 0.6, 0.6, 0.05); o.frequency.linearRampToValueAtTime(1050, t + i * 0.6 + 0.3); o.frequency.linearRampToValueAtTime(700, t + i * 0.6 + 0.6); } }, smash(t) { H.noise(t, 0.35, 0.6, 'bandpass', 1800, 600, 1.2); for (let i = 0; i < 6; i++) H.noise(t + Math.random() * 0.2, 0.06, 0.3, 'highpass', 2500 + Math.random() * 2000); const o = H.osc('sine', 160, t, 0.2, 0.4); o.frequency.exponentialRampToValueAtTime(60, t + 0.18); },
  // crash comedy: breaking glass, crunching metal, a big KABOOM, a cartoon slide whistle, a splat, metal scraping
  glass(t) { H.noise(t, 0.08, 0.5, 'highpass', 3000); for (let i = 0; i < 9; i++) { const tt = t + 0.02 + Math.random() * 0.35, f = 2800 + Math.random() * 3800; H.osc('sine', f, tt, 0.09 + Math.random() * 0.1, 0.07); H.noise(tt, 0.04, 0.12, 'bandpass', f, f, 8); } },
  crunch(t) { H.noise(t, 0.4, 0.7, 'lowpass', 1800, 300, 1); for (let i = 0; i < 4; i++) { const o = H.osc('square', 90 + Math.random() * 120, t + i * 0.05, 0.12, 0.12); o.frequency.exponentialRampToValueAtTime(40, t + i * 0.05 + 0.1); } H.osc('triangle', 620, t, 0.5, 0.08); H.osc('triangle', 931, t, 0.4, 0.06); },
  kaboom(t) { const o = H.osc('sine', 110, t, 0.6, 0.9); o.frequency.exponentialRampToValueAtTime(30, t + 0.55); H.noise(t, 0.6, 0.8, 'lowpass', 2600, 150, 0.8); H.noise(t, 0.3, 0.5, 'bandpass', 1500, 500, 1.2); H.osc('triangle', 700, t + 0.02, 0.35, 0.07); },
  wheee(t) { const o = H.osc('sine', 500, t, 0.7, 0.16); o.frequency.exponentialRampToValueAtTime(1900, t + 0.6); const v = H.osc('sine', 506, t, 0.7, 0.06); v.frequency.exponentialRampToValueAtTime(1920, t + 0.6); },
  splat(t) { H.noise(t, 0.22, 0.6, 'lowpass', 900, 120, 2); const o = H.osc('sine', 300, t, 0.16, 0.3); o.frequency.exponentialRampToValueAtTime(70, t + 0.15); },
  scrape(t) { H.noise(t, 0.45, 0.25, 'bandpass', 3800, 2400, 6); H.noise(t, 0.45, 0.12, 'highpass', 5000); },
  shutter(t) { H.noise(t, 0.05, 0.6, 'highpass', 3000); H.noise(t + 0.07, 0.04, 0.4, 'highpass', 2500); H.osc('square', 1800, t, 0.03, 0.08); },
  clatter(t) { for (let i = 0; i < 7; i++) { const tt = t + Math.random() * 0.25; H.osc('triangle', 600 + Math.random() * 500, tt, 0.07, 0.18); H.noise(tt, 0.04, 0.25, 'bandpass', 1500, 800, 3); } },
  whistleDown(t) { const o = H.osc('sine', 2200, t, 0.9, 0.12); o.frequency.exponentialRampToValueAtTime(500, t + 0.85); },
  glug(t) { for (let i = 0; i < 3; i++) { const o = H.osc('sine', 180 + i * 40, t + i * 0.09, 0.08, 0.25); o.frequency.exponentialRampToValueAtTime(420, t + i * 0.09 + 0.07); } },
  sputter(t) { for (let i = 0; i < 6; i++) { H.noise(t + i * 0.16 + Math.random() * 0.05, 0.07, 0.5 - i * 0.06, 'lowpass', 900, 200, 1); const o = H.osc('square', 70 - i * 6, t + i * 0.16, 0.08, 0.2); o.frequency.exponentialRampToValueAtTime(35, t + i * 0.16 + 0.07); } },
  backfire(t) { H.noise(t, 0.09, 0.6, 'lowpass', 1400, 200, 1); const o = H.osc('sine', 90, t, 0.1, 0.5); o.frequency.exponentialRampToValueAtTime(40, t + 0.09); } }); }
// some shared sounds are too soft on a phone speaker: play them through a louder bus
{ const H = Audio.H, BOOST = { whoosh: 6, woof: 3, coin: 2.5, gateBad: 2.5, skid: 2.5, moo: 2.5, siren: 2.5, nitro: 2.5, scrape: 2, gateGood: 1.8, crowd: 1.8 }, nodes = {};
  for (const [n, k] of Object.entries(BOOST)) { const f = Audio.get(n); if (!f) continue; Audio.extend({ [n](t, a) { const ctx = H.ctx, bus = H.bus; if (!nodes[k]) { nodes[k] = ctx.createGain(); nodes[k].gain.value = k; nodes[k].connect(bus); } H.bus = nodes[k]; try { f(t, a); } finally { H.bus = bus; } } }); } }
// cartoon voices: a scream, an "oof", a "wheee"
const scream = (f0 = rnd(280, 420)) => sfx('talk', 0, { w: pick(['aaah', 'nooo', 'mama', 'whoa']), f0, c: [1.2, 1.6, 0.9], vib: 0.18, vol: 0.4 });

// ---------------- taxis and horns ----------------
// Prices are in game coins (🪙, earned by driving). Cars and coin packs can also be bought for real money through
// Google Play in the app (see store() below and BILLING in ADS_AND_EARNING_GUIDE.md).
const CARS = [
  { id: 'kaalipeeli', type: 'padmini', livery: 'kaalipeeli', ico: '🚕', name: 'Kaali-Peeli Classic', price: 0, sp: 1, acc: 1, soft: 1, grip: 1, crash: 1, col: 0xffd21a, rim: 'chrome', horn: 'taxi', about: 'The good old Mumbai taxi' },
  { id: 'auto', type: 'auto', ico: '🛺', name: 'Auto Rickshaw', price: 6000, sp: 0.86, acc: 1.3, soft: 0.9, grip: 1.35, crash: 0.8, col: 0x2a9a3a, rim: 'black', horn: 'auto', about: 'Tiny and nippy. Squeezes through anything' },
  { id: 'creta', type: 'creta', ico: '🚙', name: 'City Cruiser SUV', price: 18000, sp: 1.06, acc: 1.12, soft: 0.7, grip: 1.1, crash: 1.25, col: 0xf4f4f4, rim: 'alloy', horn: 'modern', about: 'Smooth, comfy, made for Indian roads' },
  { id: 'tractor', type: 'tractor', ico: '🚜', name: 'Kisan Tractor + Trolley', price: 25000, sp: 0.8, acc: 0.85, soft: 0.5, grip: 0.9, crash: 2.2, col: 0xc8202a, rim: 'offroad', horn: 'tractor', about: 'Slow. Unstoppable. Hay everywhere!' },
  { id: 'thar', type: 'thar', ico: '🛻', name: 'Jungle King 4x4', price: 32000, sp: 1.04, acc: 1.2, soft: 0.55, grip: 1.0, crash: 1.6, col: 0x3a5a2a, rim: 'offroad', horn: 'jeep', about: 'Hard-top 4x4. Bumps? What bumps?' },
  { id: 'muscle', type: 'muscle', ico: '🚗', name: 'Muscle Masti V8', price: 45000, sp: 1.1, acc: 1.45, soft: 0.8, grip: 1.05, crash: 1.4, col: 0xd81a2a, rim: 'alloy', horn: 'cuca', about: 'Huge V8. Launches cars higher' },
  { id: 'supercar', type: 'supercar', ico: '🏎️', name: 'Super Taxi GT', price: 70000, sp: 1.16, acc: 1.35, soft: 0.85, grip: 1.3, crash: 1.1, col: 0x7ad81a, rim: 'sport', horn: 'sport', about: 'The fastest thing on the road' },
  { id: 'monster', type: 'monster', ico: '🦖', name: 'Monster Bully 4x4', price: 100000, sp: 1.05, acc: 1.15, soft: 0.35, grip: 0.95, crash: 2.0, col: 0x2a6ad8, rim: 'offroad', horn: 'air', about: 'Giant tyres. Drives OVER trouble' }];
const PAINTS = [{ c: null, n: 'Factory', p: 0 }, { c: 0xffd21a, n: 'Taxi Yellow', p: 0 }, { c: 0xf4f4f4, n: 'Pearl White', p: 800 }, { c: 0x1a1a1e, n: 'Midnight Black', p: 1000 }, { c: 0xd81a2a, n: 'Racing Red', p: 1000 }, { c: 0x2a6ad8, n: 'Royal Blue', p: 1200 }, { c: 0xff7a1a, n: 'Sunset Orange', p: 1500 },
  { c: 0x2ad8c8, n: 'Aqua Mint', p: 1800 }, { c: 0x8a2ad8, n: 'Purple Rain', p: 1800 }, { c: 0x7ad81a, n: 'Neon Lime', p: 2500 }, { c: 0xff3ab0, n: 'Hot Pink', p: 2500 }, { c: 0x4a4e54, n: 'Matte Grey', p: 3500 }, { c: 0x3a5a2a, n: 'Army Green', p: 3000 }, { c: 0xffc21a, n: '24K Gold', p: 8000 }];
const RIMS = [{ k: null, n: 'Factory', p: 0 }, { k: 'steel', n: 'Steel', p: 0 }, { k: 'alloy', n: 'Alloy 5-spoke', p: 1500 }, { k: 'chrome', n: 'Chrome Disc', p: 3000 }, { k: 'offroad', n: 'Off-Road Tyres', p: 3500 }, { k: 'sport', n: 'Sport Red-Line', p: 4500 }, { k: 'black', n: 'Stealth Black', p: 2500 }, { k: 'gold', n: 'Gold Rims', p: 8000 }];
const ENG = [{ n: 'Stock', sp: 0, acc: 0, p: 0, ico: '⚙️' }, { n: 'Sport', sp: 0.07, acc: 0.15, p: 4000, ico: '🔧' }, { n: 'Turbo', sp: 0.14, acc: 0.3, p: 10000, ico: '🌀' }, { n: 'Rocket', sp: 0.23, acc: 0.5, p: 22000, ico: '🚀' }];
const EXTRAS = [{ k: 'w', n: 'Racing Spoiler', ico: '🪽', p: 3000, d: 'Looks fast. Is fast.' }, { k: 'n', n: 'Neon Underglow', ico: '💡', p: 4500, d: 'Tap COLOUR to change the glow' }, { k: 'f', n: 'Nitro Flames', ico: '🔥', p: 6000, d: 'Fire from the exhaust, +30% turbo time' }, { k: 'b', n: 'Steel Bull-Bar', ico: '🛡️', p: 7000, d: 'Smash harder, lose no speed' }];
const STRIPES = [{ c: null, n: 'No stripes', p: 0 }, { c: 0xffffff, n: 'White', p: 2000 }, { c: 0x111114, n: 'Black', p: 2000 }, { c: 0xe8202a, n: 'Red', p: 2500 }, { c: 0x2a6ad8, n: 'Blue', p: 2500 }, { c: 0xffc21a, n: 'Gold', p: 4000 }];
const DECALS = [{ k: null, n: 'No decal', p: 0, ico: '⬜' }, { k: 'flames', n: 'Hot Flames', p: 3000, ico: '🔥' }, { k: 'checker', n: 'Race Checker', p: 2500, ico: '🏁' }, { k: 'tiger', n: 'Tiger Stripes', p: 3000, ico: '🐯' }, { k: 'bolt', n: 'Lightning Bolt', p: 2500, ico: '⚡' }, { k: 'num', n: 'Lucky Number 7', p: 2000, ico: '7️⃣' }];
const ROOFS = [{ k: 'sign', n: 'Taxi Sign', p: 0, ico: '🚕' }, { k: 'none', n: 'Nothing on top', p: 0, ico: '⬜' }, { k: 'rack', n: 'Roof Rack + Luggage', p: 2500, ico: '🧳' }, { k: 'lightbar', n: 'LED Light Bar', p: 3500, ico: '💡' }];
const TINTS = [{ c: null, n: 'Normal glass', p: 0 }, { c: 0x030406, n: 'Dark Limo', p: 1500 }, { c: 0x1a3a7a, n: 'Blue Mirror', p: 2500 }, { c: 0x6a5010, n: 'Gold Mirror', p: 4000 }];
const NEONS = [0xff2ad8, 0x2ae8ff, 0x7aff2a, 0xffe02a, 0xff3a2a];
// horns: every vehicle has its own; funny horns can be bought and used on any of them
const HORNS = [{ k: 'own', n: 'The car\'s own horn', p: 0, ico: '📯' }, { k: 'tiny', n: 'Tiny Toot', p: 1500, ico: '🐭' }, { k: 'party', n: 'Party Tune', p: 3000, ico: '🎉' }, { k: 'goat', n: 'Goat Horn', p: 3500, ico: '🐐' }, { k: 'cuca', n: 'La Cucaracha', p: 4000, ico: '🌮' }, { k: 'air', n: 'Truck Air Horn', p: 5000, ico: '🚛' }, { k: 'train', n: 'Train Horn', p: 6000, ico: '🚂' }];
let TRIAL = null;   // an add-on tried for one ride after watching an ad
function cust(id = PF.car) { const C = { p: 0, r: 0, w: 0, n: 0, f: 0, b: 0, s: 0, d: 0, o: 0, t: 0, ...(PF.cust[id] || {}) }; if (TRIAL && TRIAL.car === id) C[TRIAL.k] = TRIAL.v; return C; }
const engLv = (id = PF.car) => PF.eng[id] || 0;
const carSpec = () => { const C = CARS.find(c => c.id === PF.car) || CARS[0], E2 = ENG[engLv(C.id)]; return { ...C, sp: C.sp * (1 + E2.sp), acc: C.acc * (1 + E2.acc) }; };
const hornKind = () => PF.horn === 'own' || !HORNS.some(h => h.k === PF.horn) ? carSpec().horn : PF.horn;
function buildCarModel(id, U) {   // the player's car with its paint, wheels and add-ons
  const C = CARS.find(c => c.id === id) || CARS[0], paint = PAINTS[U.p] || PAINTS[0], rims = (RIMS[U.r] || RIMS[0]).k || C.rim;
  const V = makeCar(C.type, paint.c ?? C.col, { livery: paint.c == null ? C.livery : undefined, spin: true, rims, wing: !!U.w, neon: U.n ? NEONS[(U.n - 1) % NEONS.length] : 0,
    stripe: (STRIPES[U.s] || STRIPES[0]).c ?? undefined, decal: (DECALS[U.d] || DECALS[0]).k ?? undefined, roofItem: (ROOFS[U.o] || ROOFS[0]).k, tint: (TINTS[U.t] || TINTS[0]).c ?? undefined });
  if (U.b) { const b = new THREE.Group(), z = -V.size.z / 2 - 0.12, w = Math.min(2.2, V.size.x); mesh(new THREE.BoxGeometry(w * 0.85, 0.08, 0.08), flat(0xb8bec6), 0, 0.45, z, b); mesh(new THREE.BoxGeometry(w * 0.75, 0.08, 0.08), flat(0xb8bec6), 0, 0.75, z, b); for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), flat(0xb8bec6), sx * w * 0.3, 0.6, z, b); V.obj.add(oneMesh(b)); }
  // exhaust flames (shown on TURBO; bigger with the Nitro Flames add-on). The tractor's stack points up.
  const fl = [];
  for (const e of V.exhaust || [[0.4, 0.3, V.size.z / 2 + 0.1]]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.9, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); f.geometry.rotateX(PI / 2); f.geometry.translate(0, 0, 0.45); f.position.set(e[0], e[1], e[2]); if (e[3]) f.rotation.x = -PI / 2; f.visible = false; const c = f.clone(); c.material = f.material.clone(); c.material.color.set(0x7ad8ff); c.scale.set(0.55, 0.55, 0.6); f.add(c); V.obj.add(f); fl.push(f); }
  V.flames = fl; return V;
}
// ---------------- horns (they sound for as long as the button is held) ----------------
const HORNSND = {
  taxi: { f: [430, 540], w: 'square', v: 0.16, lp: 2400 }, modern: { f: [500, 625], w: 'sawtooth', v: 0.14, lp: 3200 }, jeep: { f: [390, 495], w: 'square', v: 0.18, lp: 2000 },
  sport: { f: [660, 830], w: 'sawtooth', v: 0.12, lp: 4200 }, air: { f: [185, 233, 277], w: 'sawtooth', v: 0.17, lp: 1600 }, tractor: { f: [235, 296], w: 'square', v: 0.2, lp: 1200, wob: 7 },
  auto: { f: [980, 1240], w: 'square', v: 0.09, lp: 5000 }, train: { f: [311, 370, 466], w: 'sawtooth', v: 0.15, lp: 2200 }, tiny: { f: [1400, 1760], w: 'square', v: 0.08, lp: 6000 },
  party: { tune: [523, 659, 784, 659, 1047], d: 0.12, w: 'square', v: 0.13 }, cuca: { tune: [392, 392, 392, 523, 659, 0, 392, 392, 392, 523, 659], d: 0.11, w: 'square', v: 0.13 }, goat: { goat: 1 } };
function hornVoice(kind, t, dur, vol = 1) {   // returns a function that ends the horn
  const S = HORNSND[kind] || HORNSND.taxi, H = Audio.H, ctx = H.ctx; if (!ctx) return () => {};
  if (S.goat) { Audio.sfx('talk', t - ctx.currentTime, { w: 'aaah', f0: 430, c: [1, 1.1, 0.95], vib: 0.35, vol: 0.55 * vol }); return () => {}; }
  if (S.tune) { S.tune.forEach((f, i) => { if (!f) return; const a = t + i * S.d, o = ctx.createOscillator(), gg = ctx.createGain(); o.type = S.w; o.frequency.value = f; gg.gain.setValueAtTime(0.0001, a); gg.gain.exponentialRampToValueAtTime(S.v * vol, a + 0.012); gg.gain.setValueAtTime(S.v * vol, a + S.d * 0.8); gg.gain.exponentialRampToValueAtTime(0.0001, a + S.d * 0.98); o.connect(gg); gg.connect(H.bus); o.start(a); o.stop(a + S.d); }); return () => {}; }
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = S.lp; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(S.v * vol, t + 0.025); lp.connect(g); g.connect(H.bus);
  const os = S.f.map(f => { const o = ctx.createOscillator(); o.type = S.w; o.frequency.setValueAtTime(f, t); if (S.wob) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = S.wob; lg.gain.value = f * 0.02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 4); } o.connect(lp); o.start(t); return o; });
  let done = false; const stop = (at = ctx.currentTime) => { if (done) return; done = true; const e = Math.max(at, t + 0.15); g.gain.setValueAtTime(S.v * vol, e); g.gain.exponentialRampToValueAtTime(0.0001, e + 0.08); os.forEach(o => o.stop(e + 0.1)); };
  if (dur) stop(t + dur); else setTimeout(() => stop(), 3000);   // a held horn stops after 3 s anyway
  return stop;
}
// traffic horns use the same voices (short honks)
{ const KMAP = ['taxi', 'party', 'tiny', 'air']; Audio.extend({ horn(t, k = 0) { hornVoice(typeof k === 'string' ? k : KMAP[k] || 'taxi', t, 0.32, 0.7); } }); }
let hornStop = null;
function hornDown() {
  if (!PF.set.sound) return; Audio.resume(); const ctx = Audio.H.ctx; if (!ctx || ctx.state !== 'running') return;
  if (hornStop) hornStop(); const k = hornKind(); hornStop = hornVoice(k, ctx.currentTime + 0.005, HORNSND[k] && (HORNSND[k].tune || HORNSND[k].goat) ? 1 : 0);
}
function hornUp() { if (hornStop) { hornStop(); hornStop = null; } }

// ---------------- the JOBS: every place has a crazy job, given by a funny client over the radio ----------------
// (no passengers in the taxi any more: the client is a face and a voice in the speech bubble)
const PASS = [
  { id: 'groom', job: 'laddoo', name: 'Dulha Raju', look: { skin: 0xb97a52, hair: 0x1a1210, style: 'turban', hat: 0xd83a2a, tache: 1 }, f0: 150, fk: 0.95,
    intro: 'Bhaiya! My guests are HUNGRY! Throw laddoos to everyone waving!', happy: ['Wah! Bullseye!', 'Guest fed! Next!', 'You are the laddoo king!', 'Shaadi mubarak!'], miss: ['Arre, that went in the drain!', 'Aim, bhaiya, AIM!', 'Missed! Mummy is watching!'],
    hurt: ['My sherwani!', 'Careful!'], cow: ['Cow ji, have a laddoo too!'], win: 'Every guest is happy! Best wedding EVER!', lose: 'Hungry guests… they are eating the decorations!', reviews: ['10/10 laddoo sniper. Invited to every wedding!', 'Great aim. Some laddoos hit the band.', 'Half the guests are still hungry.', 'The guests ate the flowers. Zero stars.'] },
  { id: 'granny', job: 'thief', name: 'Dadi Ji', look: { skin: 0xd8a070, hair: 0xd8d8d8, style: 'buns', glasses: 1, bindi: 1 }, f0: 250, fk: 1.12,
    intro: 'Beta! That rascal in the green auto stole my SAMOSAS! BUMP him 5 times!', happy: ['Shabash! Hit him again!', 'That\'s for my samosas!', 'Jeete raho beta!', 'Again! AGAIN!'], miss: ['He is getting away!', 'Faster beta! Press the GAS!'],
    hurt: ['Hai Ram!', 'Arre baba!'], cow: ['Gau mata, move please!'], win: 'Samosas saved! Come, eat with me!', lose: 'My samosas… gone forever!', reviews: ['Caught him in no time! Best grandson ever!', 'Good bumping, beta!', 'Caught him… just in time.', 'He got away. I am calling your mother.'] },
  { id: 'uncle', job: 'fly', name: 'Adventure Sharma', look: { skin: 0xc68642, hair: 0x2a2018, style: 'short', tache: 1 }, f0: 110, fk: 0.86,
    intro: 'I retired today! I want to FLY! Hit every ramp on the ghat road!', happy: ['WHEEEE!', 'I am a bird!', 'Higher! HIGHER!', 'Best retirement ever!'], miss: ['You missed a ramp! Boring!', 'Hit the ramps, beta!'],
    hurt: ['My back!', 'Oof!'], cow: ['Jump over the cow!'], win: 'I touched the clouds! Thank you!', lose: 'Not enough flying. I will take the bus.', reviews: ['I FLEW! Ten stars!', 'Nice jumps, nice views.', 'Some jumps. Mostly road.', 'This was a normal taxi ride. Sad.'] },
  { id: 'influencer', job: 'selfie', name: 'Insta Pinky', look: { skin: 0xe0ac69, hair: 0x3a2010, style: 'long' }, f0: 280, fk: 1.15,
    intro: 'Hiii! Zoom past the SPEED CAMERAS faster than the sign! Speed selfies go viral!', happy: ['OMG! 1 million likes!', 'So viral!', 'That selfie is FIRE!'], miss: ['Too slow! Blurry selfie!', 'Use the GAS! And TURBO!'],
    hurt: ['My phone!', 'My hair!'], cow: ['A cow! Selfie time!'], win: 'You are famous now! Tagging you!', lose: 'Zero views. Unfollow!', reviews: ['10 MILLION views! Legend!', 'Pretty viral!', 'Some views. Kinda mid.', 'Zero views. My career is over.'] },
  { id: 'detective', job: 'splash', name: 'Masti Mausi', look: { skin: 0xc68642, hair: 0x1a1210, style: 'buns', glasses: 1, hat: 0x1c1c20, hatTop: 1 }, f0: 230, fk: 1.08,
    intro: 'Those grumpy uncles laughed at my umbrella! Drive through the PUDDLES next to them! SPLASH!', happy: ['Hahaha! Soaked!', 'Look at his face!', 'Splash him again!'], miss: ['He is still dry!', 'Drive THROUGH the puddle!'],
    hurt: ['Careful!', 'My glasses!'], cow: ['Even the cow is wet!'], win: 'Every grumpy uncle is soaked! Revenge!', lose: 'They are still laughing at me…', reviews: ['Revenge is wet and sweet!', 'Very splashy!', 'A few dry uncles left.', 'Everybody is dry. Fail.'] },
  { id: 'fan', job: 'catch', name: 'Cricket Bunty', look: { skin: 0xa86b3c, hair: 0x1a1210, style: 'cap', hat: 0x2a5ad8 }, f0: 170, fk: 0.98,
    intro: 'SIXERS are flying out of the stadium! Drive under the balls and CATCH them!', happy: ['HOWZAT! OUT!', 'What a catch!', 'Man of the match!'], miss: ['Dropped it! Butter fingers!', 'Get under the ball!'],
    hurt: ['Howzaaat?!', 'Run out!'], cow: ['Cow on the pitch!'], win: 'We won the match! Free tickets for you!', lose: 'Too many dropped catches…', reviews: ['Best fielder in India!', 'Good hands!', 'Some catches, some drops.', 'Butter fingers. Duck.'] },
  { id: 'boss', job: 'bowling', name: 'Boss Khanna', look: { skin: 0xd8a070, hair: 0x1a1210, style: 'short', beard: 1 }, f0: 120, fk: 0.9,
    intro: 'Our office bowling day! Knock down the PINS on the road with the taxi. Strikes please!', happy: ['STRIKE! Promotion!', 'Excellent bowling!', 'Pins down! Bonus!'], miss: ['Missed the pins!', 'Aim for the head pin!'],
    hurt: ['My coffee!', 'My suit!'], cow: ['A COW?! Bowl around it!'], win: 'We won the office trophy! Here, a bonus!', lose: 'Unacceptable bowling!', reviews: ['Executive strikes! Hired!', 'Solid bowling.', 'Acceptable. Barely.', 'Gutter ball taxi.'] },
  { id: 'kid', job: 'holi', name: 'Little Chintu', look: { skin: 0xe0ac69, hair: 0x2a1a10, style: 'cap', hat: 0xe8402a }, f0: 330, fk: 1.25,
    intro: 'HOLI HAI! Throw colour balloons at EVERYBODY! People, cars, everything!', happy: ['HOLI HAI!', 'Hehehe! Pink!', 'Again! AGAIN!', 'Bura na mano, Holi hai!'], miss: ['Missed! Throw again!', 'Aim at the people!'],
    hurt: ['Whee!', 'Bumpy!'], cow: ['Colour the cow!'], win: 'The whole city is colourful! Best Holi!', lose: 'Not enough colours… boring Holi!', reviews: ['Best Holi of my life!', 'So colourful!', 'A bit colourful.', 'Where are the colours?'] },
];
const JOBS = {
  laddoo: { title: 'LADDOO TOSS', ico: '🎁', unit: 'guests fed', need: lp => 10 + lp * 2, throw: 'laddoo', tip: 'Tap 🎁 THROW when you pass a waving guest' },
  thief: { title: 'SAMOSA THIEF', ico: '💥', unit: 'bumps', need: () => 5, tip: 'Hold GAS, catch the green auto and BUMP it' },
  fly: { title: 'FLYING TAXI', ico: '🚀', unit: 'jumps', need: lp => 12 + lp * 2, tip: 'Drive over the ramps · swipe UP in the air to spin' },
  selfie: { title: 'SPEED SELFIES', ico: '📸', unit: 'speed selfies', need: lp => 6 + lp, tip: 'Pass each 📸 camera FASTER than its sign (GAS + TURBO)' },
  splash: { title: 'SPLASH ATTACK', ico: '💦', unit: 'uncles soaked', need: lp => 7 + lp, tip: 'Drive through the puddle next to each ☂️ uncle' },
  catch: { title: 'CATCH IT!', ico: '🏏', unit: 'catches', need: lp => 7 + lp, tip: 'Drive under the falling ball (the red circle)' },
  bowling: { title: 'TRAFFIC BOWLING', ico: '🎳', unit: 'pins', need: lp => 40 + lp * 10, tip: 'Drive through the 🎳 pins · all 10 = STRIKE' },
  holi: { title: 'HOLI HAI!', ico: '🎈', unit: 'colour hits', need: lp => 18 + lp * 3, throw: 'balloon', tip: 'Tap 🎈 THROW at people and cars' },
};
const RW = 14, HALF = RW / 2 - 1.2, LANES = [-5.25, -1.75, 1.75, 5.25];   // India drives on the LEFT: our lanes are x < 0
const STAGE_OF = { groom: 'shaadi', granny: 'bazaar', uncle: 'ghat', influencer: 'marine', detective: 'monsoon', fan: 'stadium', boss: 'cyber', kid: 'holi' };
const SMASH = { bazaar: ['fruit', 'pots', 'boxes', 'veg'], shaadi: ['flowers', 'chairs', 'mithai', 'speakers'], ghat: ['hay', 'crates', 'cans'], marine: ['coco', 'umbrella', 'boxes'], monsoon: ['boxes', 'umbrella', 'drums'], stadium: ['chairs', 'cutout', 'boxes'], cyber: ['boxes', 'cones', 'barrier'], holi: ['colour', 'colour', 'pots', 'balloons'] };
// real Indian traffic, different in every place
const TRAFFIC = {
  bazaar: ['auto', 'erick', 'erick', 'handcart', 'handcart', 'cycle', 'cycle', 'scooter', 'scooter', 'tempo', 'bullcart', 'hatch', 'padmini', 'sedan'],
  shaadi: ['sedan', 'suv', 'creta', 'hatch', 'auto', 'scooter', 'erick', 'handcart', 'padmini', 'muscle', 'cycle'],
  ghat: ['truck', 'truck', 'bus', 'tractor', 'bullcart', 'thar', 'suv', 'gypsy', 'tempo', 'scooter'],
  marine: ['sedan', 'creta', 'sports', 'supercar', 'hatch', 'scooter', 'scooter', 'bus', 'auto', 'muscle', 'cycle'],
  monsoon: ['bus', 'auto', 'erick', 'hatch', 'sedan', 'truck', 'scooter', 'cycle', 'tempo', 'padmini'],
  stadium: ['bus', 'auto', 'scooter', 'scooter', 'hatch', 'suv', 'creta', 'erick', 'cycle', 'handcart'],
  cyber: ['sedan', 'suv', 'sports', 'supercar', 'creta', 'thar', 'hatch', 'bus', 'scooter', 'muscle'],
  holi: ['auto', 'erick', 'scooter', 'cycle', 'handcart', 'bullcart', 'hatch', 'tempo', 'tractor', 'padmini'] };
const SLOWV = { cycle: [4.5, 6], handcart: [1.8, 2.5], bullcart: [3, 4], erick: [6.5, 8.5], tractor: [6.5, 8.5] };   // these keep to the side lane
const TCOL = { auto: [0x2a9a3a, 0x1a1a1a], erick: [0x2aa84a, 0x2a6ad8, 0xf4f4f4], tempo: [0x2a6ab0, 0xffc21a, 0x2aa84a], scooter: [0xe8202a, 0x2a8ad8, 0xf4f4f4, 0xffc21a, 0x1a1a1a], cycle: [0x1a1a1a, 0xe8202a, 0x2a6ad8], bullcart: [0x8a5a2a], handcart: [0x2a8a3a, 0x2a6ab0, 0xe8202a], tractor: [0xc8202a, 0x2a6ab0, 0x2aa84a], bus: [0xc8202a, 0x2a6ab0], truck: [0xff7a1a, 0x2a8ae8, 0xe8202a, 0x2aa84a] };
const PAINT = [0xf4f4f4, 0xf4f4f4, 0xc0c4c8, 0x8a8e94, 0x1a1a1e, 0xb8202a, 0x1a4a9a, 0x6a1a2a, 0x2a6a4a, 0xd8c8a0, 0xff7a1a, 0x2ad8c8];
function makeLevel(n, race) {
  let seed = n * 4241 + (race ? 99 : 7); const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const P = PASS[(n - 1) % PASS.length], stage = STAGE_OF[P.id], d = Math.min(1, (n - 1) / 24), loop = Math.floor((n - 1) / PASS.length);
  const job = race ? 'race' : P.job, J = JOBS[job], L = race ? 3600 : 2700 + loop * 300;
  const ev = [], our = [LANES[0], LANES[1]]; let lastRamp = 0, lastPow = 0, lastMega = -200, lastJay = 0, lastFuel = -60, lastPump = -250;
  for (let z = -110; z > -L + 120; z -= race ? r(22, 32) : r(30, 42) - d * 6) {
    const pool = ['coins', 'smash', 'smash', 'smash', 'breaker', 'pothole', 'cows', 'turbo', 'cones', 'dog'];
    if (stage === 'monsoon') pool.push('puddle'); if (stage === 'shaadi') pool.push('baraat'); if (stage === 'holi') pool.push('colour', 'colour'); if (stage === 'stadium') pool.push('fans'); if (stage === 'marine') pool.push('seawave'); if (stage === 'ghat') pool.push('cows');
    if (job === 'selfie') pool.push('turbo', 'turbo');
    let t = pk(pool);
    if (race && lastPump - z > 820) { t = 'pump'; lastPump = z; }
    else if (race && lastFuel - z > 160) { t = 'fuel'; lastFuel = z; }
    else if (lastMega - z > (job === 'fly' ? 330 : 600)) { t = 'mega'; lastMega = z; lastRamp = z; }
    else if (lastRamp - z > (job === 'fly' ? 105 : race ? 200 : 260)) { t = 'ramp'; lastRamp = z; }
    else if (lastJay - z > 230) { t = 'jay'; lastJay = z; }
    else if (lastPow - z > 300) { t = 'power'; lastPow = z; }
    ev.push({ t, z, x: t === 'mega' ? -3.5 : t === 'pump' ? LANES[0] : ['cows', 'cones', 'pothole', 'puddle', 'ramp'].includes(t) ? pk(our) : t === 'smash' ? pk([-6.2, 6.2, ...LANES]) : pk(LANES), n: 1 + Math.floor(R() * 2), kind: pk(SMASH[stage]), pow: pk(['magnet', 'mega', 'shield']) });
  }
  // the job's own targets
  const need = J ? J.need(loop) : 0, put2 = (t, every, f) => { for (let z = -150, i = 0; z > -L + 150; z -= every * r(0.85, 1.15), i++) ev.push({ t, z: Math.round(z), ...f(i) }); };
  if (job === 'laddoo' || job === 'holi') put2('guest', job === 'holi' ? 62 : 92, i => ({ side: i % 2 ? 1 : -1, x: (i % 2 ? 1 : -1) * (RW / 2 + 1.4) }));
  if (job === 'selfie') put2('cam', 240, () => ({ lim: Math.min(120, pk([80, 85, 90, 95, 100]) + loop * 5), x: -RW / 2 - 0.7 }));
  if (job === 'splash') put2('puddleman', 120, i => ({ side: i % 3 === 2 ? 1 : -1, x: i % 3 === 2 ? LANES[3] : LANES[0] }));
  if (job === 'bowling') put2('pins', 105, () => ({ x: pk([LANES[0], LANES[1], LANES[1]]) }));
  const traffic = Math.round(7 + d * 5 + loop + (race ? 3 : 0)), oncoming = Math.round(6 + d * 4 + loop);
  return { n, L, d, P, m: job, job, J, need, race: !!race, stage, S: STAGES[stage], ev, traffic, oncoming, music: race ? pick(['chase', 'drive3']) : job === 'thief' ? 'chase' : pk(['drive', 'drive2', 'drive3']) };
}
// ---------------- state ----------------
const G = { state: 'load', t: 0, lv: null, track: null, objs: [], cars: [], coins: 0, turbo: 0.34, me: null, combo: 0, comboT: 0, wanted: 0, police: null, power: null, powerT: 0 };
let PEOPLE = null, COW = null, PUG = null, HORSE = null, blobs = null, crowdM = null, crowdF = null;
// ---------------- the player's taxi ----------------
function makeMe() {
  const V = buildCarModel(PF.car, cust()); scene.add(V.obj);
  return { V, gas: false, x: LANES[1], z: 0, y: 0, vy: 0, speed: 0, air: false, turbo: 0, stun: 0, steer: 0, brake: false, crashT: 0, spinA: 0, len: V.size.z, wide: V.size.x };
}

// ---------------- the client (or a rival) talks in the speech bubble ----------------
const cabFrame = $('cabFrame'), CAB = { bv: 0 };
let faceT = 0, cabFxT = 0, bubbleT = 0;
const PASSR = () => G.lv.P;
const MISSIONS = new Proxy({}, { get: () => ({}) });   // (old ride hooks: none any more)
function setExpr(e, dur = 2) { if (!G.M) return; G.M.expr = e; faceT = dur; }
function baseExpr() { return 'happy'; }
function react(e) { setExpr(e, 1.6); }
function cabFx() { }
function mood() { }
function updateCab() { }
function renderCab() { }
function placeCabFrame() { }
function say(text, e, quiet, who, look) {
  if (!G.lv) return; const P = G.lv.P, b = $('bubble'); G.bLook = look || P.look; $('bubbleName').textContent = who || P.name; $('bubbleText').textContent = text;
  b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); bubbleT = 2.8; if (e) setExpr(e, 2.2);
  if (!quiet) sfx('talk', 0, { w: pick(['hey', 'wow', 'haha', 'hurry', 'faster', 'nice', 'yes']), f0: look ? 150 : P.f0, fk: look ? 0.95 : P.fk });
}
const faceCv = document.createElement('canvas'); faceCv.width = faceCv.height = 64;
// a floating name tag over things (targets, the thief, rivals, pumps)
const tagCache = {};
function makeTag(text, bg = '#ff4fa8', fg = '#fff', w = 3) {
  const k = text + bg + fg, t = tagCache[k] || (tagCache[k] = canvasTex(256, 80, (c, W, H) => { c.fillStyle = bg; c.strokeStyle = '#3a0a4a'; c.lineWidth = 8; c.beginPath(); c.roundRect(6, 6, W - 12, H - 12, 22); c.fill(); c.stroke(); c.fillStyle = fg; c.font = 'bold 40px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 2); }));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(w, w * 80 / 256, 1); sp.renderOrder = 6; return sp;
}
// ---------------- building a ride ----------------
function clearLevel() {
  if (G.track) G.track.dispose(); G.objs.forEach(o => o.obj && scene.remove(o.obj)); G.objs = [];
  G.cars.forEach(c => scene.remove(c.V.obj)); G.cars = []; if (G.me) scene.remove(G.me.V.obj); if (G.thief) { scene.remove(G.thief.V.obj); G.thief = null; } if (G.police) { scene.remove(G.police.V.obj); G.police = null; }
  (G.rivals || []).forEach(r => scene.remove(r.V.obj)); G.rivals = []; (G.shots || []).forEach(q => scene.remove(q.m)); G.shots = []; (G.balls || []).forEach(b => { scene.remove(b.m); scene.remove(b.ring); }); G.balls = [];
  if (G.dest) { scene.remove(G.dest); G.dest = null; } if (G.walker) { scene.remove(G.walker); G.walker = null; } (G.debris || []).forEach(d => scene.remove(d)); G.debris = []; clearFx(); clearPops();
}
function startLevel(n, playNow, mayhem) {
  clearLevel();
  const lv = G.lv = makeLevel(n, mayhem), P = lv.P, S = lv.S;
  setBend(n + 3, -lv.L - 300, S.hills ? 1.3 : 0.9, S.hills ? 0.9 : 0.15, -40);
  G.track = buildStreet({ L: lv.L + 260, RW, stage: lv.stage, seed: n * 17 + 3 }, scene);
  hemi.intensity = S.hemi; sun.intensity = S.light; rim.intensity = S.night ? 1.2 : 0.7; hemi.color.set(S.night ? 0x9a8aff : S.warm ? 0xffd8b8 : S.rain ? 0xc8d4e0 : 0xe4f0ff); sun.color.set(S.night ? 0xffc8a0 : S.warm ? 0xffb080 : 0xffeccc);
  G.me = makeMe(); G.me.x = LANES[0]; G.me.z = 0;
  for (const e of lv.ev) spawn(e);
  for (let i = 0; i < lv.traffic; i++) addCar(1, -40 - i * (210 / lv.traffic) - rnd(0, 15));
  for (let i = 0; i < lv.oncoming; i++) addCar(-1, -30 - i * (250 / lv.oncoming) - rnd(0, 20));
  buildDest();
  G.walker = null; G.shots = []; G.balls = []; G.rivals = []; G.ballT = 4;
  G.M = { mood: 100, expr: 'happy', done: false, have: 0, need: lv.need, fuel: 100, lowT: 0, out: false };
  if (lv.job === 'thief') spawnThief(); if (lv.race) spawnRivals();
  $('hud').classList.toggle('mayhem', !!mayhem); $('hud').classList.toggle('throwjob', !!(lv.J && lv.J.throw)); $('throwB').querySelector('span').textContent = lv.J && lv.J.throw === 'balloon' ? '🎈' : '🎁';
  $('moodName').textContent = mayhem ? '⛽ FUEL' : '🎯 ' + lv.J.title;
  G.pristine = n + (mayhem ? 'm' : ''); Object.assign(G, { t: 0, coins: 0, turbo: 0.34, tx: G.me.x, introT: 0, state: 'home', arriveT: 0, missedN: 0, result: null, combo: 0, comboT: 0, best: 0, wanted: 0, power: null, powerT: 0, fines: 0, smashed: 0, escapes: 0, launched: 0, lastLaunch: -9, honks: 0 }); if (mayhem) makeGoals(); else { $('tasks').innerHTML = '<div class="tip">' + lv.J.tip + '</div>'; }
  $('lvl').textContent = (mayhem ? '🏁 ' : lv.J.ico + ' ') + S.name.toUpperCase(); $('cabFx').textContent = ''; setPower(null); updateWanted();
  // shaders: ready before a ride starts; for the home screen they are prepared in the background (no frozen start)
  try { G.track.cullAll(); const done = warmRing(); if (playNow || !renderer.compileAsync) { renderer.compile(scene, cam); renderer.render(scene, cam); done(); } else renderer.compileAsync(scene, cam).catch(() => {}).finally(done); } catch (e) { /* not needed */ }
  if (playNow) beginRide();
}
function beginRide() { G.pristine = 0; G.state = 'intro'; G.introT = 0; G.cardShown = false; G.cd = 0; music(G.lv.music); }
// ---------------- the destination: a green stop zone, the place itself, people waiting ----------------
const FINISHT = canvasTex(256, 64, (c, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); } }); FINISHT.wrapS = THREE.RepeatWrapping; FINISHT.repeat.set(3, 1);
const FINISHB = canvasTex(512, 64, (c, w, h) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); } c.fillStyle = 'rgba(232,32,42,.92)'; c.fillRect(150, 6, 212, 52); c.fillStyle = '#fff'; c.font = 'bold 40px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏁 FINISH', w / 2, h / 2 + 2); });
function buildDest() {
  const P = G.lv.P, g = G.dest = new THREE.Group(), z = -G.lv.L, st = G.lv.stage; g.position.z = z; scene.add(g);
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(RW, 3), new THREE.MeshBasicMaterial({ map: FINISHT })); zone.rotation.x = -PI / 2; zone.position.set(0, 0.06, 0); g.add(zone); G.zone = null;
  { const arch = new THREE.Group(); for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, 7, 0.5), flat(0x1a1a1a), sx * (RW / 2 + 0.6), 3.5, 0, arch); const b = new THREE.Mesh(new THREE.PlaneGeometry(RW + 1.6, 1.6), new THREE.MeshBasicMaterial({ map: FINISHB, side: THREE.DoubleSide })); b.position.set(0, 6.6, 0); arch.add(b); g.add(arch); }
  const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ff4fa8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a0a4a'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#fff'; c.font = 'bold 52px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(G.lv.race ? '🏁 MAD RACE' : G.lv.J.ico + ' ' + G.lv.J.title, w / 2, h / 2 + 4); });
  const sg = new THREE.Group(); const sm = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: sign })); sm.position.set(0, 6.2, 0); sm.rotation.y = 0; sg.add(sm);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.4, 8), flat(0x6a4a2a), s * 3.8, 3.2, 0, sg);
  sg.position.set(-RW / 2 - 1.6, 0, 6); g.add(sg);
  // the place itself
  if (st === 'shaadi') { const a = oneMesh(marigoldArch()); a.position.set(0, 0, -16); g.add(a); const hall = new THREE.Group(); mesh(new THREE.BoxGeometry(12, 9, 26), flat(0xfff0d8), 0, 4.5, 0, hall); for (let i = 0; i < 60; i++) { const b = bulb(pick([0xffe04a, 0xff4a8a, 0x4ae8ff]), 0.16); b.position.set(6.05, rnd(1, 9), rnd(-13, 13)); hall.add(b); } mergeBulbs(hall); hall.position.set(-RW / 2 - 12, 0, 0); g.add(hall); if (HORSE) { const h = makeAnimal(HORSE); h.obj.position.set(-RW / 2 - 2.5, 0.25, -6); h.obj.rotation.y = PI / 2; g.add(h.obj); G.horse = h; mesh(new THREE.BoxGeometry(0.9, 0.12, 1.3), flat(0xd8202a), -RW / 2 - 2.5, 1.55, -6, g); } }
  if (st === 'stadium') { const s = new THREE.Group(); mesh(new THREE.CylinderGeometry(42, 36, 18, 28, 1, true), flat(0x2a5ad8, { side: THREE.DoubleSide }), 0, 9, 0, s); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), glow(0xffffff)); const a = i / 4 * PI * 2 + 0.4; l.position.set(Math.cos(a) * 40, 30, Math.sin(a) * 40); s.add(l); mesh(new THREE.BoxGeometry(0.6, 30, 0.6), flat(0xb8bcc4), Math.cos(a) * 40, 15, Math.sin(a) * 40, s); } s.position.set(-RW / 2 - 52, 0, -20); g.add(s); for (let i = 0; i < 3; i++) { const f = oneMesh(fanStand()); f.position.set(-RW / 2 - 8 - i * 0.1, 0, -30 + i * 18); g.add(f); } }
  if (st === 'holi') { const f = oneMesh(ferris()); f.position.set(-RW / 2 - 18, 0, -10); g.add(f); G.ferris = f; }
  if (st === 'cyber') { const t = mesh(new THREE.BoxGeometry(22, 90, 22), new THREE.MeshPhysicalMaterial({ color: 0x3a6a9a, roughness: 0.1 }), -RW / 2 - 18, 45, -10, g); void t; }
  G.arrow = null;
  G.party = []; const n = st === 'shaadi' || st === 'stadium' ? 12 : 6;
  for (let i = 0; i < n; i++) G.party.push({ x: -RW / 2 - 2 - rnd(0, 3.5), z: z + rnd(-9, 9), f: i % 2, ry: PI / 2 + rnd(-0.5, 0.5), t: rnd(0, 3), tint: pick(st === 'stadium' ? [0x2a5ad8, 0xff8a1a] : [0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524, 0xd8a070]), hair: pick([0x1a1210, 0x3a2010, 0x2a2018]) });
  g.traverse(q => { q.frustumCulled = false; });
}
// ---------------- traffic (real Indian traffic) ----------------
function addCar(dir, z) {
  const type = pick(TRAFFIC[G.lv.stage]), col = TCOL[type] ? pick(TCOL[type]) : pick(PAINT), slow = !!SLOWV[type];
  const V = makeCar(type, col, { top: type === 'auto' ? 0xffd21a : undefined }); if (dir < 0) V.obj.rotation.y = PI; scene.add(V.obj);
  if (type === 'bullcart' && COW) { V.bulls = V.bulls || [[-0.45, -3.1], [0.45, -3.1]]; V.cows = V.bulls.map(([x, bz]) => { const a = makeAnimal(COW); a.obj.scale.multiplyScalar(0.85); a.obj.position.set(x, 0, bz + 0.7); a.obj.rotation.y = PI; animalWalk(a, true); V.obj.add(a.obj); return a; }); }
  const lanes = slow ? [dir > 0 ? LANES[0] : LANES[3]] : dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  const sp = slow ? rnd(...SLOWV[type]) : dir > 0 ? (['auto', 'tempo'].includes(type) ? rnd(8, 11) : type === 'truck' || type === 'bus' ? rnd(8, 12) : type === 'scooter' ? rnd(10, 14) : rnd(11, 16)) : rnd(12, 18);
  const c = { V, type, dir, slow, x: pick(lanes), z, sp, cur: 0, honkT: 0, hitT: 0, len: V.size.z, wide: V.size.x, fly: 0 };
  c.lane = c.x; c.cur = c.sp; G.cars.push(c); return c;
}
function laneBlocked(x, z0, z1, self) {
  for (const c of G.cars) if (c !== self && Math.abs(c.x - x) < 1.6 && c.z < z0 && c.z > z1) return true;
  for (const o of G.objs) if ((o.t === 'cows' && !o.gone) || o.t === 'cones' || (o.t === 'baraat' && o.cross)) { if (o.z < z0 && o.z > z1 && (o.t === 'baraat' || Math.abs(o.x - x) < 2)) return true; }
  return false;
}
function updateTraffic(dt) {
  const me = G.me;
  for (const c of G.cars) {
    if (c.fly > 0) {
      c.fly -= dt; c.vy -= 22 * dt; c.y = (c.y || 0) + c.vy * dt; c.x += c.vx * dt; c.z += (c.vz || 0) * dt; const o = c.V.obj; o.position.set(c.x, Math.max(0, c.y), c.z); o.rotation.z += (c.rz || 0) * dt; o.rotation.x += (c.rx || 0) * dt; o.visible = true;
      if (c.y <= 0 && c.vy < 0) { c.y = 0; c.bounces = (c.bounces || 0) + 1; if (Math.abs(c.z - me.z) < 60) { sfxT('thud', 0.1); if (c.bounces === 1) sfxT('crunch', 0.2); puff(_p.set(c.x, 0.3, c.z), 6, 0xd8d0c0, { size: 0.9, speed: 2, life: 0.6 }); } c.vy = -c.vy * 0.35; c.vx *= 0.5; c.vz = (c.vz || 0) * 0.5; c.rz = (c.rz || 0) * 0.4; c.rx = (c.rx || 0) * 0.4; if (c.vy < 2.5 || c.bounces > 2) c.fly = 0; }
      if (c.fly <= 0) { o.rotation.set(0, c.dir < 0 ? PI : 0, 0); c.y = 0; c.vz = 0; c.rx = 0; c.lane = c.x = clamp(c.x, -HALF, HALF); c.lane = c.dir > 0 ? (c.x < -3.5 ? LANES[0] : LANES[1]) : (c.x > 3.5 ? LANES[3] : LANES[2]); c.cur = 0; }
      continue;
    }
    if (c.dir > 0) {
      let want = c.sp; const front = c.z - c.len / 2;
      const ahead = [...G.cars.filter(q => q !== c && q.dir > 0 && Math.abs(q.x - c.x) < 1.6 && q.z < c.z), ...(Math.abs(me.x - c.x) < 1.8 && me.z < c.z ? [me] : [])].sort((a, b) => b.z - a.z)[0];
      if (ahead) { const gap = front - (ahead.z + (ahead.len || 4) / 2); if (gap < 14) want = Math.min(want, (ahead.cur ?? ahead.speed) * (gap < 6 ? 0.5 : 0.95)); if (gap < 3) want = 0; if (ahead === me && gap < 10 && me.speed < 3) { c.honkT -= dt; if (c.honkT <= 0) { c.honkT = rnd(1.5, 3); if (Math.abs(c.z - me.z) < 30) { sfxT('horn', 0.6, 0, c.type === 'truck' || c.type === 'bus' ? 3 : 2); popText('PEEP PEEP!', _p.set(c.x, 3, c.z), '#fff', 20, 0.6); } } } }
      if (c.slow) { if (laneBlocked(c.x, front, front - 6, c)) want = 0; } else if (laneBlocked(c.x, front, front - 16, c)) { const other = c.x === LANES[0] ? LANES[1] : LANES[0]; if (!laneBlocked(other, c.z + 6, front - 16, c) && !(Math.abs(me.x - other) < 2 && Math.abs(me.z - c.z) < 8)) c.lane = other; else want = Math.min(want, 1); }
      c.cur = damp(c.cur, want, 2, dt); c.z -= c.cur * dt; c.x = damp(c.x, c.lane, 1.8, dt);
      if (c.z > me.z + 30) respawn(c, me.z - rnd(170, 240)); else if (c.z < me.z - 280) respawn(c, me.z + 20 + rnd(0, 6), true);
    } else {
      let want = c.sp;
      const ahead = G.cars.filter(q => q !== c && q.dir < 0 && Math.abs(q.x - c.x) < 1.6 && q.z > c.z).sort((a, b) => a.z - b.z)[0];
      if (ahead && ahead.z - c.z < 12) want = Math.min(want, ahead.cur);
      if (Math.abs(me.x - c.x) < 2 && me.z > c.z && me.z - c.z < 35) { want = Math.min(want, 4); c.honkT -= dt; if (c.honkT <= 0) { c.honkT = 1.4; sfxT('horn', 0.4, 0, 3); popText('POM POM!', _p.set(c.x, 3.4, c.z), '#ffb0a0', 22, 0.6); } }
      c.cur = damp(c.cur, want, 2.5, dt); c.z += c.cur * dt;
      if (c.z > me.z + 30) respawn(c, me.z - rnd(200, 260));
    }
    c.hitT = Math.max(0, c.hitT - dt);
    c.V.obj.position.set(c.x, 0, c.z); c.V.obj.rotation.y = (c.dir < 0 ? PI : 0) + (c.lane - c.x) * 0.05 * c.dir;
    c.V.obj.visible = c.z < me.z + 40 && c.z > me.z - 240; if (c.V.cows && c.V.obj.visible) c.V.cows.forEach(a => a.mx.update(dt * 0.9));
  }
}
function respawn(c, z, behind) {
  const lanes = c.slow ? [c.dir > 0 ? LANES[0] : LANES[3]] : c.dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  for (let k = 0; k < 6; k++) { const x = pick(lanes); if (!G.cars.some(q => q !== c && Math.abs(q.x - x) < 1.6 && Math.abs(q.z - z) < 16) && !(behind && Math.abs(G.me.x - x) < 2)) { c.x = c.lane = x; c.z = z; c.cur = c.sp; return; } z -= 16; }
  c.z = z;
}
// ---------------- the detective's thief ----------------
function spawnThief() {
  const V = makeCar('auto', 0x2a9a3a, { spin: false, top: 0x1a1a1a }); scene.add(V.obj);
  const d = new Actor(PEOPLE.pedM, { tint: 0x1a1a1a, skin: 0xa86b3c, hair: 0x1a1a1a, expr: EXPR.laugh }); d.play('idle'); d.scale.setScalar(0.85); d.position.set(0.4, 0.4, 0.1); V.obj.add(d);
  const tag = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#e8202a'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 30, 18); c.fill(); c.beginPath(); c.moveTo(w / 2 - 18, h - 27); c.lineTo(w / 2 + 18, h - 27); c.lineTo(w / 2, h - 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 46px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🦹 THIEF', w / 2, 37); });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.12), new THREE.MeshBasicMaterial({ map: tag, transparent: true, depthTest: false })); tm.renderOrder = 5; tm.position.set(0, V.size.y + 1.6, 0); V.obj.add(tm);
  G.thief = { V, d, tm, x: LANES[1], z: -55, lane: LANES[1], cur: 18, len: V.size.z, wide: V.size.x, laneT: 2, dropT: 6, caught: false, sp: 21.5 + G.lv.d * 4 };
}
function updateThief(dt) {
  const T = G.thief; if (!T) return;
  if (T.caught) { T.cur = damp(T.cur, 0, 2, dt); T.z -= T.cur * dt; T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = damp(T.V.obj.rotation.y, 0.6, 3, dt); return; }
  const me = G.me, gap = me.z - T.z; let want = G.state === 'drive' ? T.sp + (gap > 70 ? -6 : gap < 12 ? 5 : 0) : 0;
  T.laneT -= dt; const front = T.z - 2;
  if (laneBlocked(T.lane, front + 1, front - 22, T) || T.laneT <= 0) { const opts = [LANES[0], LANES[1]].filter(x => !laneBlocked(x, front + 4, front - 22, T)); if (opts.length) T.lane = pick(opts); else want *= 0.5; T.laneT = rnd(2, 4.5); }
  T.cur = damp(T.cur, want, 1.5, dt); T.z -= T.cur * dt; T.x = damp(T.x, T.lane, 2.2, dt);
  T.dropT -= dt; if (T.dropT <= 0 && G.state === 'drive' && gap > 8 && gap < 60) { T.dropT = rnd(4, 7); spawn({ t: 'smash', z: T.z + 4, x: T.x, kind: 'boxes' }); sfx('thud'); popText('HEHEHE!', _p.set(T.x, 3, T.z), '#ffb0a0', 22, 0.7); }
  if (T.spin > 0) T.spin = Math.max(0, T.spin - dt * 1.5);
  if (G.state === 'drive' && T.z < -G.lv.L + 30) fail('The thief got away with the samosas!');
  T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = (T.lane - T.x) * 0.06 + (T.spin || 0) * PI * 2; T.d.update(dt); T.tm.position.y = T.V.size.y + 1.6 + Math.sin(G.t * 6) * 0.2; T.tm.scale.setScalar(clamp(gap / 22, 1.2, 4));
}
function caught() {
  const T = G.thief; T.caught = true; sfx('fanfare'); flash('#ff4040', 0.3); banner('🚨 CAUGHT!', 'The samosas are safe!', 2); T.d.expr = EXPR.scared; say(PASSR().win, 'laugh');
  for (let i = 0; i < 3; i++) setTimeout(() => sfx('siren'), i * 400);
  setTimeout(() => arrive(true), 1600);
}
// ---------------- MAD RACE: three crazy rivals ----------------
const RIVALS = [
  { name: 'Bunty Bullet', type: 'muscle', col: 0xff7a1a, look: { skin: 0xa86b3c, hair: 0x1a1210, style: 'short', tache: 1 } },
  { name: 'Pinky Pistol', type: 'supercar', col: 0xff3ab0, look: { skin: 0xe0ac69, hair: 0x3a2010, style: 'long' } },
  { name: 'Tau Tornado', type: 'thar', col: 0x3a5a2a, look: { skin: 0xc68642, hair: 0xd8d8d8, style: 'turban', hat: 0xffc21a, tache: 1 } },
  { name: 'Rocky Rocket', type: 'creta', col: 0x2a6ad8, look: { skin: 0xd8a070, hair: 0x1a1210, style: 'cap', hat: 0xe8202a } }];
function spawnRivals() {
  const pool = [...RIVALS].sort(() => Math.random() - 0.5).slice(0, 3), grid = [[LANES[1], 0], [LANES[0], -9], [LANES[1], -9]];
  G.rivals = pool.map((D, i) => { const V = makeCar(D.type, D.col, { spin: true, roofItem: 'none', stripe: 0xffffff }); scene.add(V.obj); const tag = makeTag('🏁 ' + D.name.split(' ')[0].toUpperCase(), '#3a0a4a', '#ffe04a', 2.6); tag.position.y = V.size.y + 1.2; V.obj.add(tag);
    return { ...D, V, x: grid[i][0], lane: grid[i][0], z: grid[i][1], cur: 0, sp: (25.5 + i * 0.9 + rnd(0, 1.2)) * (1 + G.lv.d * 0.06), len: V.size.z, wide: V.size.x, fly: 0, done: false, laneT: 1, talkT: rnd(6, 10), ahead: true }; });
  G.finished = [];
}
function updateRivals(dt) {
  const me = G.me, L = G.lv.L;
  for (const c of G.rivals) {
    const o = c.V.obj;
    if (c.fly > 0) { c.fly -= dt; c.vy -= 22 * dt; c.y = (c.y || 0) + c.vy * dt; c.x += c.vx * dt; c.z += (c.vz || 0) * dt; o.position.set(c.x, Math.max(0, c.y), c.z); o.rotation.z += c.rz * dt; o.rotation.x += (c.rx || 0) * dt; if (c.y <= 0 && c.vy < 0) { c.y = 0; c.vy = -c.vy * 0.3; if (c.vy < 2.5) { c.fly = 0; o.rotation.set(0, 0, 0); c.x = clamp(c.x, -HALF, HALF); c.lane = c.x < -3.5 ? LANES[0] : LANES[1]; c.cur = 3; sfxT('thud', 0.1); } } continue; }
    let want = G.state === 'drive' || G.state === 'arrive' ? c.sp : 0;
    if (c.done) want = 6; else { const gap = c.z - me.z; if (gap < -90) want *= 0.88; else if (gap > 60) want *= 1.14; }   // keeps the race close
    const front = c.z - c.len / 2;
    c.laneT -= dt;
    if (laneBlocked(c.lane, front, front - 22, c) || G.cars.some(q => q.dir < 0 && Math.abs(q.x - c.lane) < 1.6 && q.z < c.z && q.z > c.z - 45 && c.lane > 0)) {
      const opts = LANES.filter(x => !laneBlocked(x, c.z + 5, front - 24, c) && !G.cars.some(q => q.dir < 0 && Math.abs(q.x - x) < 1.6 && q.z < c.z + 5 && q.z > c.z - 50));
      if (opts.length && c.laneT <= 0) { c.lane = opts.sort((a, b) => Math.abs(a - c.x) - Math.abs(b - c.x))[0]; c.laneT = 0.8; } else want = Math.min(want, 4);
    } else if (c.lane > 0 && c.laneT <= 0 && !laneBlocked(LANES[1], c.z + 5, front - 24, c)) { c.lane = LANES[1]; c.laneT = 1; }
    c.cur = damp(c.cur, want, 1.3, dt); c.z -= c.cur * dt; c.x = damp(c.x, c.lane, 2.4, dt);
    o.position.set(c.x, 0, c.z); o.rotation.set(0, (c.lane - c.x) * 0.08, 0); spinWheels(c.V, c.cur * dt, 0);
    if (!c.done && c.z < -L) { c.done = true; G.finished.push(c); }
    // trash talk when passing the player (or being passed)
    const ah = c.z < me.z; if (ah !== c.ahead && Math.abs(c.z - me.z) < 10 && G.state === 'drive') { c.talkT -= 99; if (ah) say(pick(['Eat my dust! 😜', 'Bye bye, taxi wala!', 'Too slow, uncle!']), 'laugh', false, c.name, c.look); else say(pick(['Arre! Come back here!', 'Lucky! Wait till the next turn!', 'NOOO!']), 'angry', false, c.name, c.look); } c.ahead = ah;
    // hitting a rival sends them flying
    const dz = c.z - me.z, dx = Math.abs(c.x - me.x);
    if (G.state === 'drive' && !me.air && Math.abs(dz) < (c.len + me.len) / 2 && dx < (c.wide + me.wide) / 2 && me.crashT <= 0) {
      if (dz < 0 && me.speed > c.cur + 3 || G.power === 'shield') { launchCar(c, me, false, me.speed - c.cur); popText('WHAM! ' + c.name.split(' ')[0] + ' FLIES!', _p.set(c.x, 4.5, c.z), '#ffe04a', 26, 1); setTimeout(() => say(pick(['MY CAR!!', 'Foul! FOUL!', 'I will get you!']), 'angry', false, c.name, c.look), 300); }
      else { const sx = me.x >= c.x ? 1 : -1; me.x += sx * 0.6; G.tx = me.x + sx * 0.4; c.x -= sx * 0.5; me.crashT = 0.5; sfx('scrape'); popText('SKRRRT!', _p.set(me.x, 3, me.z), '#ffd0a0', 22, 0.6); }
    }
  }
}
const racePos = () => 1 + G.rivals.filter(c => c.done || c.z < G.me.z).length;
// ---------------- the police (smash too much and they come!) ----------------
function updateWanted() { const n = Math.floor(G.wanted + 0.001); $('wanted').innerHTML = n || G.police ? '🚨 ' + [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') : ''; $('wanted').classList.toggle('hot', !!G.police); }
function addWanted(k, why) {
  if (G.lv.m === 'chase') return;   // the detective IS the police
  const before = Math.floor(G.wanted); G.wanted = Math.min(3, G.wanted + k); if (Math.floor(G.wanted) > before) { updateWanted(); if (G.wanted >= 3 && !G.police) callPolice(); else popText('★ WANTED ' + Math.floor(G.wanted) + '/3', _p.set(G.me.x, 4, G.me.z), '#ff6a6a', 22, 0.8); } void why;
}
function callPolice() {
  const V = makeCar('gypsy', 0xf4f6f8, { livery: 'police', spin: false }); scene.add(V.obj);
  const cop = new Actor(PEOPLE.pedM, { tint: 0xc8a050, skin: 0xa86b3c, hair: 0x1a1a1a, expr: EXPR.angry }); cop.play('idle'); cop.scale.setScalar(0.85); cop.position.set(0.4, 0.55, 0.2); V.obj.add(cop);
  G.police = { V, cop, x: LANES[1], z: G.me.z + 70, cur: G.me.speed, T: 0, far: 0, len: V.size.z };
  banner('🚨 POLICE!', 'Smashed too much — ESCAPE them!', 1.8); sfx('siren'); music('chase'); updateWanted(); say(pick(['Arre! POLICE!', 'Bhago! Run!', 'Oh no, the police!']), 'scared');
}
function updatePolice(dt) {
  const C = G.police; if (!C) return; const me = G.me;
  C.T += dt; const gap = C.z - me.z; let want = me.speed + (gap > 40 ? 9 : gap > 10 ? 5 : 3);
  if (C.leaving) want = 6; C.cur = damp(C.cur, Math.min(want, 40), 1.6, dt); C.z -= C.cur * dt; if (!C.leaving) C.z = Math.max(C.z, me.z + (me.len + C.len) / 2 + 0.1); C.x = damp(C.x, C.leaving ? LANES[0] : me.x, 1.4, dt);
  C.V.obj.position.set(C.x, 0, C.z); C.V.obj.rotation.y = (me.x - C.x) * 0.04;
  const L = C.V.model.children[1]; if (L) L.visible = Math.sin(G.t * 14) > 0;
  if (Math.random() < dt * 0.6 && !C.leaving) sfxT('siren', 1.3);
  if (C.leaving) { if (gap > 120) { scene.remove(C.V.obj); G.police = null; updateWanted(); music(G.lv.music); } return; }
  if (gap < (me.len + C.len) / 2 + 1.2 && Math.abs(C.x - me.x) < 2.4 && G.state === 'drive') {   // caught: a fine
    const fine = 40 + G.lv.n * 5; G.fines += fine; G.wanted = 0; C.leaving = true; me.speed *= 0.3; E.shake = 0.4; vib(100); sfx('crash'); banner('🚓 CAUGHT!', 'Fine: 🪙' + fine, 1.6); popText('CHALLAN 🪙' + fine, _p.set(me.x, 4, me.z), '#ff6a6a', 30, 1.2); mood(-10); say(pick(['Arre bhaiya, police ka challan!', 'We got caught!', 'Shame shame!']), 'angry'); updateWanted();
  } else if (gap > 110 || C.T > 26) { C.leaving = true; G.wanted = 0; G.escapes++; task('cop'); const b = 60 + G.lv.n * 4; G.coins += b; addCombo(3, 'ESCAPED!'); banner('😎 ESCAPED!', '+' + b + ' coins', 1.4); sfx('fanfare'); say(pick(['Hahaha! We lost them!', 'Bye bye police!', 'What a driver!']), 'laugh'); updateWanted(); }
}
// ---------------- MAD RACE crash goals: a new one as soon as one is done ----------------
const GOALS = [
  { k: 'launch', ico: '🚗', t: n => `Launch ${n} cars flying`, n: [2, 4, 7, 10] }, { k: 'cow', ico: '🐄', t: n => `Flip ${n} cow${n > 1 ? 's' : ''}`, n: [1, 2, 4] },
  { k: 'bounce', ico: '🤸', t: n => `Bounce ${n} people (they're OK!)`, n: [2, 4, 6] }, { k: 'smash', ico: '💥', t: n => `Smash ${n} stalls`, n: [3, 6, 10] },
  { k: 'air', ico: '🚀', t: n => `Fly off ${n} ramp${n > 1 ? 's' : ''}`, n: [1, 2, 4] }, { k: 'combo', ico: '🔥', t: n => `Reach MASTI x${n}`, n: [6, 12, 20], max: 1 },
  { k: 'head', ico: '💢', t: n => `${n} head-on launch${n > 1 ? 'es' : ''}`, n: [1, 2, 3] }, { k: 'bus', ico: '🚌', t: n => `Launch ${n} bus${n > 1 ? 'es' : ''} or truck${n > 1 ? 's' : ''}`, n: [1, 2, 3] },
  { k: 'double', ico: '⚡', t: () => 'Launch 2 cars within 2 seconds', n: [1, 2, 3] }, { k: 'spin', ico: '🌀', t: n => `Land ${n} 360° spin${n > 1 ? 's' : ''} (swipe UP in the air)`, n: [1, 2] },
  { k: 'cop', ico: '🚓', t: () => 'Get chased by the police… and ESCAPE', n: [1] }, { k: 'near', ico: '😱', t: n => `${n} near misses`, n: [3, 6] }];
function newGoal() {
  const busy = G.goals.map(g => g.k), pool = GOALS.filter(g => !busy.includes(g.k)), D = pick(pool), tier = Math.min(D.n.length - 1, Math.floor(G.goalN / 3));
  return { ...D, need: D.n[tier], have: 0, pay: 80 + G.goalN * 30, done: false, flash: 0 };
}
function makeGoals() { G.goals = []; G.goalN = 0; G.goalPay = 0; G.goalsDone = 0; for (let i = 0; i < 3; i++) G.goals.push(newGoal()); drawGoals(); }
function updateGoals(dt) { let ch = false; G.goals = G.goals.map(g => { if (g.done) { g.flash -= dt; if (g.flash <= 0) { ch = true; return newGoal(); } } return g; }); if (ch) drawGoals(); }
function drawGoals() { const el = $('tasks'); if (el) el.innerHTML = '<div class="th">💥 CRASH GOALS</div>' + G.goals.map(T => `<div class="${T.done ? 'ok' : ''}">${T.done ? '✅' : T.ico} ${T.t(T.need)} <b>${T.done ? '+' + T.pay : T.have + '/' + T.need}</b></div>`).join(''); }
// everything crazy the player does is counted here: MAD RACE crash goals, or the FLYING TAXI job
function task(k, v = 1, max) {
  if (G.state !== 'drive' || !G.lv) return;
  if (G.lv.race) { for (const T of G.goals) if (T.k === k && !T.done) { T.have = max || T.max ? Math.max(T.have, v) : T.have + v; if (T.have >= T.need) { T.done = true; T.have = T.need; T.flash = 1.4; G.goalN++; G.goalsDone++; G.goalPay += T.pay; G.coins += T.pay; sfx('kaching'); banner('✅ GOAL!', T.t(T.need) + '  +' + T.pay + ' 🪙', 1.2); } drawGoals(); } return; }
  if (G.lv.job === 'fly' && k === 'air') jobAdd(1, '🚀 JUMP ' + (G.M.have + 1) + '!');
  if (G.lv.job === 'fly' && k === 'spin') jobAdd(1, '🌀 SPIN BONUS!');
}
// ---------------- the job: counting, throwing, falling balls ----------------
function jobAdd(n = 1, label) {
  const M = G.M; if (!M || M.done || G.lv.race) return; M.have += n; G.coins += 5 * n; sfx('kaching');
  if (label) popText(label, _p.set(G.me.x, 4, G.me.z - 4), '#7aff9a', 30, 0.9);
  if (M.have >= M.need && !M.passed && G.lv.job !== 'thief') { M.passed = true; banner('✅ JOB DONE!', 'Keep going to the 🏁 for ⭐⭐⭐', 1.6); sfx('fanfare', 0.15); }
  else if (Math.random() < 0.45 && G.lv.job !== 'thief') say(pick(PASSR().happy), 'laugh');
}
const jobStars = () => { const M = G.M; if (G.lv.job === 'thief') { const left = (G.me.z + G.lv.L) / G.lv.L; return left > 0.45 ? 3 : left > 0.2 ? 2 : 1; } return M.have >= M.need * 1.8 ? 3 : M.have >= M.need * 1.35 ? 2 : M.have >= M.need ? 1 : 0; };
const laddooGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5), ballGeo = new THREE.SphereGeometry(0.32, 12, 10);
const HOLIC = [0xff2a8a, 0x2ae8ff, 0xffe02a, 0x6aff2a, 0xa02aff, 0xff7a1a];
function throwIt() {
  const J = G.lv && G.lv.J; if (G.state !== 'drive' || !J || !J.throw || G.t - (G.lastThrow || -9) < 0.28) return; G.lastThrow = G.t;
  const R = G.me; let best = null, bd = 1e9;
  for (const o of G.objs) if (o.t === 'guest' && !o.served) { const dz = R.z - o.z; if (dz > 2 && dz < 40 && dz < bd) { bd = dz; best = { o, x: o.x, z: o.z, y: 1.4 }; } }
  if (J.throw === 'balloon') {
    for (const c of G.cars) if (c.fly <= 0 && !c.holi) { const dz = R.z - c.z; if (dz > 3 && dz < 34 && dz < bd) { bd = dz; best = { c, x: c.x, z: c.z, y: c.V.size.y * 0.85 }; } }
    for (const o of G.objs) if (o.t === 'jay' && o.go) for (const p of o.people) if (!p.holi && !p.fly) { const dz = R.z - (o.z - p.dz); if (dz > 3 && dz < 34 && dz < bd) { bd = dz; best = { p, x: p.x, z: o.z - p.dz, y: 1.2 }; } }
  }
  const col = J.throw === 'balloon' ? pick(HOLIC) : 0xffb01a, m = new THREE.Mesh(J.throw === 'laddoo' ? laddooGeo : ballGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.15 }));
  if (J.throw === 'laddoo') { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.37, 0.1), flat(0xe8202a)); m.add(rib); }
  m.frustumCulled = false; scene.add(m);
  G.shots.push({ m, x0: R.x, y0: 1.9, z0: R.z - 1, tgt: best || { x: R.x + rnd(-5, 5), z: R.z - 22, y: 0, miss: true }, t: 0, T: best ? clamp(bd / 45, 0.32, 0.7) : 0.55, col });
  sfx('whoosh'); vib(10); $('throwB').classList.remove('ready'); void $('throwB').offsetWidth; $('throwB').classList.add('ready');
}
function updateShots(dt) {
  for (const S of [...G.shots]) {
    S.t += dt; const k = Math.min(1, S.t / S.T), T = S.tgt, tx = T.c ? T.c.x : T.x, tz = T.c ? T.c.z : T.z;
    S.m.position.set(S.x0 + (tx - S.x0) * k, S.y0 + (T.y - S.y0) * k + Math.sin(k * PI) * 3, S.z0 + (tz - S.z0) * k); S.m.rotation.x += dt * 9; S.m.rotation.y += dt * 6;
    if (k < 1) continue; scene.remove(S.m); G.shots.splice(G.shots.indexOf(S), 1);
    const at = _p.set(tx, T.y + 0.5, tz), holi = G.lv.J.throw === 'balloon';
    if (holi) { puff(at, 22, 0xffffff, { cols: [S.col, pick(HOLIC)], size: 1.2, speed: 4, life: 1, grav: 2, grow: 1.6 }); sfx('splat'); }
    if (T.o && !T.o.served) { T.o.served = true; T.o.ht = 0; if (holi) T.o.tint = S.col; T.o.tag.material.map = T.o.tag2.material.map; jobAdd(1, holi ? pick(['HOLI HAI! 🎨', 'SPLAT! 🎨', 'RANG BARSE!']) : pick(['WAH! 😋', 'LADDOO! 😋', 'YUMMY!'])); sfx(holi ? 'crowd' : 'gateGood', 0.05); if (!holi) puff(at, 10, 0xffd23f, { star: true, add: true, speed: 4 }); }
    else if (T.c && T.c.fly <= 0) { T.c.holi = true; const sp = new THREE.Mesh(new THREE.CircleGeometry(T.c.V.size.x * 0.45, 16), new THREE.MeshBasicMaterial({ map: dotTex, color: S.col, transparent: true, depthWrite: false })); sp.rotation.x = -PI / 2; sp.position.y = T.c.V.size.y + 0.05; T.c.V.obj.add(sp); jobAdd(1, pick(['CAR SPLAT! 🎨', 'PINK CAR!', 'HOLI HAI!'])); setTimeout(() => sfxT('horn', 0.4, 0, 0), 250); popText(pick(['ARRE!', 'MY CAR!', 'Bura na mano!']), _p.set(tx, 3.6, tz), '#fff', 18, 0.9); }
    else if (T.p) { T.p.holi = S.col; T.p.tint = S.col; jobAdd(1, 'HOLI HAI! 🎨'); scream(); }
    else { puff(at.set(tx, 0.3, tz), 8, S.col, { size: 0.7, speed: 3, life: 0.6 }); popText('MISS! 🙈', at.set(tx, 2.5, tz), '#ffd0a0', 22, 0.7); if (Math.random() < 0.5) say(pick(PASSR().miss), 'sad'); }
  }
}
// CATCH IT!: sixers fall from the sky; drive under the red circle
const ringGeo = new THREE.RingGeometry(1.3, 1.75, 28), ballM = new THREE.MeshStandardMaterial({ color: 0xc81a1a, roughness: 0.35 });
function updateBalls(dt) {
  const R = G.me;
  if (G.lv.job === 'catch' && G.state === 'drive' && !G.M.done && R.z > -G.lv.L + 250) { G.ballT -= dt; if (G.ballT <= 0) { G.ballT = rnd(3.4, 5); const T = 3.2, z = R.z - Math.max(14, R.speed * T), x = pick(LANES); const m = new THREE.Mesh(ballGeo, ballM); m.scale.setScalar(1.4); m.frustumCulled = false; scene.add(m); const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.8, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.set(x, 0.08, z); ring.frustumCulled = false; scene.add(ring); const tag = makeTag('🏏 CATCH!', '#e8202a', '#fff', 2.4); tag.position.set(0, 0, 3); ring.add(tag); G.balls.push({ m, ring, x, z, t: 0, T }); sfx('whistleDown'); showHint('🏏 A SIXER! Get under the red circle!'); } }
  for (const b of [...G.balls]) {
    b.t += dt; const k = b.t / b.T, y = Math.max(0, 34 * (1 - k * k)); b.m.position.set(b.x, y + 0.4, b.z); b.ring.material.opacity = 0.5 + Math.sin(G.t * 10) * 0.3; b.ring.scale.setScalar(1 + (1 - Math.min(1, k)) * 0.6);
    const inZone = Math.abs(R.x - b.x) < 1.9 && Math.abs(R.z - b.z) < 3.4;
    if (y < 2.6 && inZone && !b.done) { b.done = 1; jobAdd(1, pick(['HOWZAT! OUT! 🏏', 'WHAT A CATCH!', 'CAUGHT IT!'])); sfx('crowd'); sfx('gateGood', 0.05); puff(_p.set(b.x, 2, b.z), 18, 0xffffff, { star: true, add: true, cols: [0xffd23f, 0x2a5ad8, 0xff8a1a], speed: 5 }); }
    if (b.done || k >= 1.05) { if (!b.done) { popText('DROPPED! 🙈', _p.set(b.x, 2.5, b.z), '#ffb0a0', 24, 0.8); sfx('thud'); say(pick(PASSR().miss), 'sad'); } scene.remove(b.m); scene.remove(b.ring); G.balls.splice(G.balls.indexOf(b), 1); }
  }
}
// ---------------- MASTI combos ----------------
function addCombo(k, label) {
  G.combo += k; G.comboT = 3.2; G.best = Math.max(G.best, G.combo); task('combo', G.combo, true); const el = $('combo'); el.innerHTML = `MASTI <b>x${G.combo}</b>${label ? `<small>${label}</small>` : ''}`; el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function updateCombo(dt) { if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { const c = Math.round(G.combo ** 1.4); if (G.combo >= 2) { G.coins += c; popText('COMBO +' + c + ' 🪙', _p.set(G.me.x, 4, G.me.z - 3), '#ffe066', 30, 1); sfx('coins'); } G.combo = 0; $('combo').classList.add('hidden'); } } }
// ---------------- power-ups ----------------
const POWERS = { magnet: { icon: '🧲', name: 'MAGNET', t: 9 }, mega: { icon: '📢', name: 'MEGA HORN', t: 0 }, shield: { icon: '🛡️', name: 'BUMPER SHIELD', t: 10 } };
function setPower(k) { G.power = k; G.powerT = k ? POWERS[k].t : 0; $('powerP').classList.toggle('hidden', !k || k === 'mega'); if (k) $('powerP').textContent = POWERS[k].icon + ' ' + POWERS[k].name; }
function gotPower(k) {
  sfx('kaching'); popText(POWERS[k].icon + ' ' + POWERS[k].name + '!', _p.set(G.me.x, 3.5, G.me.z), '#7affe8', 28, 1); addCombo(1);
  if (k === 'mega') { megaHorn(); return; }
  setPower(k);
}
function megaHorn() {   // every car ahead jumps out of the way, cows run, people cheer
  sfx('horn', 0, 3); sfx('horn', 0.15, 1); flash('#ffe0ff', 0.35); E.shake = 0.5; banner('📢 MEGA HORN!', 'Everybody MOVE!', 1.2); vib(80);
  for (const c of G.cars) if (c.z < G.me.z && c.z > G.me.z - 70 && c.fly <= 0) { c.fly = 3; c.vz = 0; c.rx = 0; c.vy = rnd(6, 9); c.vx = (c.x < 0 ? -1 : 1) * rnd(3, 6) * (c.dir > 0 ? 1 : 1); c.rz = rnd(-3, 3); addCombo(1); }
  for (const o of G.objs) if (o.t === 'cows' && !o.gone && o.z < G.me.z && o.z > G.me.z - 70) { o.gone = true; o.cows.forEach(c => animalWalk(c, true)); }
  say(pick(['WAAAH! What a horn!', 'My ears!', 'Hahaha! Look at them fly!']), 'laugh');
}
// ---------------- things on the road ----------------
const coinG = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16); coinG.rotateX(PI / 2);
const coinIM = new THREE.InstancedMesh(coinG, new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x8a5a00, roughness: 0.3 }), 160); coinIM.frustumCulled = false; coinIM.count = 0; scene.add(coinIM);
const coinAt = (x, y, z, g) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const turboMat = new THREE.MeshStandardMaterial({ color: 0x2ad8ff, emissive: 0x0a5a8a, roughness: 0.3 });
const stripeTex = canvasTex(128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#1a1a1a' : '#ffd23f'; c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 8, h); c.lineTo(i * 16 - 8, h); c.fill(); } });
stripeTex.wrapS = THREE.RepeatWrapping; stripeTex.repeat.set(4, 1);
const runTex = k => canvasTex(128, 128, (c, w) => { c.fillStyle = k === 6 ? '#ff7a1a' : '#2a8ad8'; c.beginPath(); c.arc(w / 2, w / 2, 60, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 84px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k), w / 2, w / 2 + 6); });
const RUNT = { 4: runTex(4), 6: runTex(6) };
const iconTex = {}; const powTex = k => iconTex[k] || (iconTex[k] = canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, 62); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#7affe8'); c.fillStyle = g; c.beginPath(); c.arc(w / 2, w / 2, 60, 0, 7); c.fill(); c.font = '72px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(POWERS[k].icon, w / 2, w / 2 + 6); }));
// the things you can smash (one merged mesh each) and the colours of their flying pieces
const SMASHC = { fruit: [0xff4a2a, 0xffc21a, 0x7ad83a, 0xff9a1a], veg: [0x3fcf3e, 0xe8302a, 0x8a3ab0], coco: [0x5a8a2a, 0x8a6a3a], pots: [0xc86a3a, 0xa8502a], boxes: [0xc89a5a, 0xa87a3a], chairs: [0xe8202a, 0x2a8ae8, 0xffffff], flowers: [0xff8a1a, 0xffd21a, 0xff4a8a], mithai: [0xff8a1a, 0xffe08a, 0xffffff], speakers: [0x1a1a1a, 0x3a3a3a], hay: [0xe8c86a, 0xd8b050], crates: [0x8a6a3a, 0x6a4a2a], cans: [0xd8dde4, 0xb8bcc4], umbrella: [0xff4a6a, 0x2ab8ff, 0xffd23f], drums: [0x2a6ab0, 0xe8202a], cutout: [0x2a5ad8, 0xff8a1a, 0xf4f4f4], cones: [0xff6a1a, 0xffffff], barrier: [0xffd21a, 0x1a1a1a], colour: [0xff2a8a, 0x2ae8ff, 0xffe02a, 0x6aff2a, 0xa02aff], balloons: [0xff4a6a, 0x2ab8ff, 0xffd23f, 0x3fcf6e] };
const smashCache = {};
function smashModel(kind) {
  if (smashCache[kind]) return smashCache[kind].clone();
  const o = new THREE.Group(), C = SMASHC[kind];
  if (kind === 'fruit' || kind === 'veg' || kind === 'coco') { const c = cart(kind); c.position.y = 0; o.add(c); }
  else if (kind === 'pots') for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.4, 10, 8), flat(pick(C)), (i % 3 - 1) * 0.8, 0.4 + Math.floor(i / 3) * 0.65, 0, o).scale.y = 0.85;
  else if (kind === 'boxes' || kind === 'crates' || kind === 'mithai') for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), flat(kind === 'mithai' ? pick([0xff8a1a, 0xffd21a, 0xff4a8a]) : pick(C)), (i % 3 - 1) * 0.95, 0.35 + Math.floor(i / 3) * 0.7, 0, o);
  else if (kind === 'chairs') for (let i = 0; i < 4; i++) { const c = new THREE.Group(), m = flat(pick(C)); mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), m, 0, 0.5, 0, c); mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), m, 0, 0.8, 0.28, c); for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), m, x, 0.25, z, c); c.position.set((i % 2) * 0.8 - 0.4, Math.floor(i / 2) * 0.55, 0); c.rotation.y = rnd(-0.5, 0.5); o.add(c); }
  else if (kind === 'flowers') for (let i = 0; i < 4; i++) { mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 8), flat(0xa8502a), (i - 1.5) * 0.75, 0.25, 0, o); for (let j = 0; j < 5; j++) mesh(new THREE.SphereGeometry(0.15, 6, 4), flat(pick(C)), (i - 1.5) * 0.75 + rnd(-0.2, 0.2), 0.6 + rnd(0, 0.3), rnd(-0.2, 0.2), o); }
  else if (kind === 'speakers') for (let i = 0; i < 3; i++) { mesh(new THREE.BoxGeometry(0.8, 1.4, 0.7), flat(0x1a1a1a), (i - 1) * 0.9, 0.7 + (i === 1 ? 1.4 : 0), 0, o); mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), flat(0x5a5a5a), (i - 1) * 0.9, 0.9 + (i === 1 ? 1.4 : 0), -0.36, o).rotation.x = PI / 2; }
  else if (kind === 'hay') { mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12), flat(0xe8c86a), -0.6, 0.8, 0, o).rotation.z = PI / 2; mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12), flat(0xd8b050), 0.7, 0.8, 0, o).rotation.z = PI / 2; }
  else if (kind === 'cans') for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 10), flat(0xd8dde4, { metalness: 0.4 }), (i - 2) * 0.6, 0.4, 0, o);
  else if (kind === 'umbrella') { mesh(new THREE.BoxGeometry(1.4, 0.8, 0.8), flat(0x8a6a3a), 0, 0.4, 0, o); mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), flat(0xdddddd), 0, 1.1, 0, o); mesh(new THREE.ConeGeometry(1.4, 0.5, 8), flat(pick(C)), 0, 2.2, 0, o); }
  else if (kind === 'drums') for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12), flat(pick(C)), (i - 1) * 1.0, 0.55, 0, o);
  else if (kind === 'cutout') { mesh(new THREE.BoxGeometry(1.2, 2.2, 0.08), flat(0x2a5ad8), 0, 1.3, 0, o); mesh(new THREE.SphereGeometry(0.4, 10, 8), flat(0xc68642), 0, 2.7, 0, o); mesh(new THREE.BoxGeometry(0.06, 0.6, 0.6), flat(0x8a6a3a), 0, 0.3, 0.3, o); }
  else if (kind === 'cones') for (let i = 0; i < 4; i++) { mesh(new THREE.ConeGeometry(0.3, 0.8, 10), flat(0xff6a1a), (i - 1.5) * 0.8, 0.4, 0, o); mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10), flat(0xffffff), (i - 1.5) * 0.8, 0.45, 0, o); }
  else if (kind === 'barrier') { mesh(new THREE.BoxGeometry(3, 0.4, 0.15), flat(0xffd21a), 0, 0.9, 0, o); for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.3, 0.42, 0.16), flat(0x1a1a1a), -1.2 + i * 0.8, 0.9, 0, o); for (const x of [-1.3, 1.3]) mesh(new THREE.BoxGeometry(0.1, 1, 0.5), flat(0x5a5a5a), x, 0.5, 0, o); }
  else if (kind === 'colour') { const c = cart('fruit'); o.add(c); for (let i = 0; i < 6; i++) mesh(new THREE.ConeGeometry(0.35, 0.5, 8), flat(pick(C)), (i % 3 - 1) * 0.5, 1.2, Math.floor(i / 3) * 0.6 - 0.3, o); }
  else if (kind === 'balloons') for (let i = 0; i < 6; i++) { mesh(new THREE.SphereGeometry(0.4, 10, 8), flat(pick(C)), rnd(-0.6, 0.6), 2 + rnd(0, 0.8), rnd(-0.3, 0.3), o); mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.8, 3), flat(0xffffff), 0, 1, 0, o); }
  const m = oneMesh(o); smashCache[kind] = m; return m.clone();
}
const limitTex = k => canvasTex(128, 128, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, w / 2, 60, 0, 7); c.fill(); c.lineWidth = 14; c.strokeStyle = '#e8202a'; c.stroke(); c.fillStyle = '#111'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k), w / 2, w / 2 + 3); });
const PINGEO = (() => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, y = t * 1.1; pts.push(new THREE.Vector2(0.06 + 0.16 * Math.sin(Math.min(1, t * 1.25) * PI) * (t < 0.62 ? 1 : 0.55) + (t > 0.75 ? 0.05 * Math.sin((t - 0.75) * 4 * PI) : 0), y)); } return new THREE.LatheGeometry(pts, 14); })();
const PINMAT = new THREE.MeshStandardMaterial({ map: canvasTex(32, 64, (c, w, h) => { c.fillStyle = '#fafafa'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8202a'; c.fillRect(0, h * 0.18, w, 5); c.fillRect(0, h * 0.27, w, 5); }), roughness: 0.3 });
function spawn(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, hit: new Set() };
  if (e.t === 'coins') { o.items = []; for (let i = 0; i < 6; i++) o.items.push(coinAt(e.x, 1, -i * 3, g)); }
  else if (e.t === 'turbo') { o.items = []; const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12), turboMat, 0, 0, 0, b); mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8), flat(0xdddddd), 0, 0.6, 0, b); b.position.set(e.x, 1, 0); g.add(b); o.items.push(b); }
  else if (e.t === 'power') { const d = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ map: powTex(e.pow), transparent: true, side: THREE.DoubleSide })); d.position.set(e.x, 1.6, 0); g.add(d); o.items = [d]; }
  else if (e.t === 'smash') { const m = smashModel(e.kind); m.position.set(e.x, Math.abs(e.x) > RW / 2 ? 0.25 : 0, 0); m.rotation.y = rnd(-0.3, 0.3); g.add(m); o.items = [m]; o.x = e.x; }
  else if (e.t === 'breaker') { const m = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.16, 1.1), new THREE.MeshStandardMaterial({ map: stripeTex })); m.position.y = 0.06; g.add(m); const s = kit('road-sign-warning', 3); s.position.set(-RW / 2 - 0.6, 0, 12); s.rotation.y = PI; g.add(s); }
  else if (e.t === 'pothole' || e.t === 'puddle') { const big = e.t === 'puddle'; const m = new THREE.Mesh(new THREE.CircleGeometry(big ? 2.2 : 1.25, 16), new THREE.MeshPhysicalMaterial({ color: big ? 0x4a5a6a : 0x2a2620, roughness: big ? 0.05 : 1 })); m.rotation.x = -PI / 2; m.scale.set(1, big ? 1.6 : 0.7, 1); m.position.set(e.x, 0.045, 0); g.add(m); if (!big) { const rim = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 14), flat(0x5a5248)); rim.rotation.x = -PI / 2; rim.scale.set(1, 0.7, 1); rim.position.set(e.x, 0.05, 0); g.add(rim); } }
  else if (e.t === 'cows') { o.cows = []; for (let i = 0; i < Math.min(2, e.n); i++) { const c = makeAnimal(COW); c.obj.position.set(e.x + (i ? 1.4 : -0.3), 0, i * 2.2); c.obj.rotation.y = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? PI : 0); c.side = e.x < 0 ? -1 : 1; g.add(c.obj); o.cows.push(c); } o.gone = false; o.chewT = 0; }
  else if (e.t === 'dog') { const d = makeAnimal(PUG); d.obj.position.set(-RW / 2 - 2, 0, 0); d.obj.rotation.y = PI / 2; g.add(d.obj); o.dog = d; o.go = false; }
  else if (e.t === 'cones') { o.items = []; for (let i = 0; i < 4; i++) { const c = kit('construction-cone', 2.2); c.position.set(e.x + (i - 1.5) * 0.8, 0, -i * 1.2); g.add(c); o.items.push(c); } const b = kit('construction-barrier', 2.4); b.position.set(e.x, 0, -6); g.add(b); o.items.push(b); }
  else if (e.t === 'ramp') { const w = 4, r = new THREE.Group(); const rp = mesh(new THREE.BoxGeometry(w, 0.3, 6), flat(0xff8a3a), 0, 0.75, 0, r); rp.rotation.x = 0.26; for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(w + 0.05, 0.05, 0.3), flat(0xffffff), 0, 0.2 + i * 0.38, 2.5 - i * 1.4, r).rotation.x = 0.26; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 1.7, 6), flat(0x7a4a20), s * w / 2, 0.7, 0, r).rotation.x = 0.26; r.position.set(e.x, 0, 0); g.add(oneMesh(r)); o.w = w; o.items = []; for (let i = 0; i < 8; i++) o.items.push(coinAt(e.x, 3.5 + Math.sin(i / 7 * PI) * 3.5, -6 - i * 3, g)); }
  else if (e.t === 'mega') { const w = 7, r = new THREE.Group(), ang = 0.36; const rp = mesh(new THREE.BoxGeometry(w, 0.35, 11), flat(0xff4fa8), 0, 1.95, 0, r); rp.rotation.x = ang; for (let i = 0; i < 7; i++) mesh(new THREE.BoxGeometry(w + 0.05, 0.06, 0.45), flat(i % 2 ? 0xffe04a : 0xffffff), 0, 0.25 + i * 0.6, 4.6 - i * 1.55, r).rotation.x = ang; for (const sx of [-1, 1]) { mesh(new THREE.BoxGeometry(0.3, 4, 11), flat(0x3a0a4a), sx * w / 2, 1.6, 0, r).rotation.x = ang; mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), flat(0xdddddd), sx * (w / 2 + 0.3), 5.2, -4.8, r); mesh(new THREE.BoxGeometry(0.05, 0.8, 1.2), flat(sx < 0 ? 0xff3a3a : 0x2ae8ff), sx * (w / 2 + 0.3), 6.2, -4.3, r); }
    r.position.set(e.x, 0, 0); g.add(oneMesh(r)); const s = billboard('MEGA JUMP!', '#ff4fa8', '#3a0a4a'); s.scale.setScalar(0.55); s.position.set(-RW / 2 - 3, 0, 18); s.rotation.y = PI / 2; g.add(s); o.w = w; o.items = []; for (let i = 0; i < 14; i++) o.items.push(coinAt(e.x + Math.sin(i * 0.7) * 1.5, 6 + Math.sin(i / 13 * PI) * 7, -8 - i * 3.2, g)); }
  else if (e.t === 'fuel') { const b = new THREE.Group(); mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), flat(0xe8202a), 0, 0, 0, b); mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), flat(0x1a1a1a), 0.15, 0.45, 0, b); mesh(new THREE.BoxGeometry(0.3, 0.06, 0.08), flat(0x1a1a1a), -0.08, 0.38, 0, b); const c = oneMesh(b); c.position.set(e.x, 1.1, 0); g.add(c); const halo = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ map: dotTex, color: 0xffd23f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(e.x, 1.1, -0.2); g.add(halo); o.items = [c, halo]; }
  else if (e.t === 'pump') {   // a petrol pump on our side of the road: drive into the bay SLOWLY to fill up
    const st = new THREE.Group(), cz = 0; mesh(new THREE.BoxGeometry(6.2, 0.35, 16), flat(0xf4f4f4), -RW / 2 - 0.6, 5.2, cz, st); mesh(new THREE.BoxGeometry(6.3, 0.5, 16.1), flat(0xe8202a), -RW / 2 - 0.6, 4.85, cz, st);
    for (const z of [-6.5, 6.5]) for (const x of [-RW / 2 - 3.2, -RW / 2 + 1.8]) mesh(new THREE.BoxGeometry(0.35, 5, 0.35), flat(0xf4f4f4), x, 2.5, cz + z, st);
    for (const z of [-3, 3]) { mesh(new THREE.BoxGeometry(0.7, 1.7, 0.5), flat(0xe8202a), -RW / 2 - 1.6, 0.85, cz + z, st); mesh(new THREE.BoxGeometry(0.55, 0.4, 0.52), flat(0x1a1a1a), -RW / 2 - 1.6, 1.3, cz + z, st); mesh(new THREE.BoxGeometry(0.4, 0.25, 0.53), flat(0x7affb0), -RW / 2 - 1.6, 1.32, cz + z, st); }
    g.add(oneMesh(st)); const sg = billboard('⛽ MASTI PETROL', '#e8202a', '#1a1a1a'); sg.scale.setScalar(0.55); sg.position.set(-RW / 2 - 5, 0, cz + 10); sg.rotation.y = PI / 2; g.add(sg);
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 15), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false })); zone.rotation.x = -PI / 2; zone.position.set(LANES[0], 0.07, cz); g.add(zone); o.zone = zone; o.x = LANES[0]; }
  else if (e.t === 'guest') {   // a waving guest (or a Holi reveller) on the pavement
    o.tint = pick([0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0, 0x8a5ad8]); o.f = Math.random() < 0.5 ? 1 : 0; o.skin = pick([0xc68642, 0xe0ac69, 0x8d5524]); o.tt = rnd(0, 3);
    const holi = G.lv.job === 'holi'; o.tag = makeTag(holi ? '🎈 THROW!' : '🎁 GUEST', holi ? '#a02aff' : '#ff4fa8', '#fff', 2.4); o.tag2 = makeTag(holi ? '🎨 HOLI!' : '😋 FED', '#3fcf6e', '#fff', 2.4); o.tag.position.set(e.x, 3.2, 0); g.add(o.tag); o.served = false; }
  else if (e.t === 'cam') {   // a speed camera with its limit
    const c = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), flat(0x8a9098), e.x, 2.5, 0, c); mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), flat(0x8a9098), e.x + 0.75, 4.9, 0, c); mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), flat(0xf4f4f4), e.x + 1.4, 4.7, 0, c); mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), flat(0x1a1a1a), e.x + 1.4, 4.7, 0.4, c).rotation.x = PI / 2;
    g.add(oneMesh(c)); const sg = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ map: limitTex(e.lim), side: THREE.DoubleSide })); sg.position.set(e.x, 3.4, 0.08); g.add(sg); o.tag = makeTag('📸 ' + e.lim + '+ km/h', '#2a8ad8', '#fff', 2.6); o.tag.position.set(e.x + 2.4, 6.2, 0); g.add(o.tag); o.lim = e.lim; o.done = false; }
  else if (e.t === 'puddleman') {   // a big puddle and a grumpy uncle with an umbrella right next to it
    const pd = new THREE.Mesh(new THREE.CircleGeometry(2.3, 18), new THREE.MeshPhysicalMaterial({ color: 0x4a6a8a, roughness: 0.05 })); pd.rotation.x = -PI / 2; pd.scale.set(1, 1.8, 1); pd.position.set(e.x, 0.045, 0); g.add(pd);
    o.px = e.side * (RW / 2 + 1.1); const u = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), flat(0x1a1a1a), 0, 1.6, 0, u); const cn = mesh(new THREE.ConeGeometry(0.75, 0.35, 10, 1, true), flat(pick([0x1a1a1a, 0x2a4ab0, 0x8a1a2a]), { side: THREE.DoubleSide }), 0, 2.2, 0, u); void cn; u.position.set(o.px + e.side * 0.25, 0.25, 0); g.add(u); o.umb = u;
    o.tag = makeTag('☂️ SPLASH ME', '#2a8ad8', '#fff', 2.6); o.tag.position.set(o.px, 3.6, 0); g.add(o.tag); o.tint = pick([0xf4f4f4, 0x8a8e94, 0x2a4ab0]); o.soaked = 0; o.tt = rnd(0, 3); }
  else if (e.t === 'pins') {   // ten bowling pins, the head pin nearest to us
    o.pins = []; let k = 0; for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) { const pm = new THREE.Mesh(PINGEO, PINMAT); pm.position.set(e.x + (i - row / 2) * 0.7, 0, -row * 0.62); g.add(pm); o.pins.push(pm); k++; }
    o.tag = makeTag('🎳 STRIKE?', '#3a0a4a', '#ffe04a', 2.4); o.tag.position.set(e.x, 3, -1); g.add(o.tag); o.done = false; }
  else if (e.t === 'jay') { o.people = []; const k = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < k; i++) o.people.push({ x: -RW / 2 - 1 - i * 1.3, dz: rnd(-1.5, 1.5), f: i % 2, t: rnd(0, 3), sp: rnd(1.6, 2.3), tint: pick([0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0x8a5ad8]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524]), hair: pick([0x1a1210, 0x3a2010, 0xd8d8d8]) }); o.go = false; }
  else if (e.t === 'runs') { o.k = Math.random() < 0.4 ? 6 : 4; const s = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ map: RUNT[o.k], transparent: true, side: THREE.DoubleSide })); s.position.set(e.x, 1.8, 0); g.add(s); o.items = [s]; }
  else if (e.t === 'balloon' || e.t === 'heart') { o.items = []; for (let i = 0; i < 3; i++) { const b = new THREE.Group(); if (e.t === 'balloon') { mesh(new THREE.SphereGeometry(0.5, 14, 10), flat(pick([0xff4f6a, 0x3fcf6e, 0x2f8cf0, 0xffd23f, 0xe84aff])), 0, 0, 0, b).scale.y = 1.2; } else { const hm = flat(0xff3a7a); mesh(new THREE.SphereGeometry(0.3, 10, 8), hm, -0.2, 0.1, 0, b); mesh(new THREE.SphereGeometry(0.3, 10, 8), hm, 0.2, 0.1, 0, b); const c = mesh(new THREE.ConeGeometry(0.42, 0.6, 12), hm, 0, -0.25, 0, b); c.rotation.x = PI; } const bb = oneMesh(b); bb.position.set(e.x + (i - 1) * (e.t === 'heart' ? 0 : 0.9), 2, -i * (e.t === 'heart' ? 5 : 0.6)); g.add(bb); o.items.push(bb); } }
  else if (e.t === 'baraat') { o.people = []; for (let i = 0; i < 9; i++) o.people.push({ x: -RW / 2 - 2 - (i % 3) * 1.4, dz: Math.floor(i / 3) * 1.6, f: i % 2, t: rnd(0, 3), tint: pick([0xff8a1a, 0xffd21a, 0xd83a2a, 0xff4a8a, 0xffffff]) }); o.cross = false; }
  else if (e.t === 'fans') { o.people = []; for (let i = 0; i < 8; i++) o.people.push({ x: -RW / 2 - 2 - (i % 4) * 1.2, dz: Math.floor(i / 4) * 1.5, f: i % 2, t: rnd(0, 3), tint: pick([0x2a5ad8, 0xff8a1a]) }); o.cross = false; }
  else if (e.t === 'colour') { const m = smashModel('colour'); m.position.set(e.x, 0, 0); g.add(m); o.items = [m]; o.t = 'smash'; o.kind = 'colour'; }
  else if (e.t === 'seawave') { o.x = RW / 2 + 2; }
  else if (e.t === 'stop') { const z = new THREE.Mesh(new THREE.PlaneGeometry(4, 14), new THREE.MeshBasicMaterial({ color: 0xff4fa8, transparent: true, opacity: 0.4, depthWrite: false })); z.rotation.x = -PI / 2; z.position.set(LANES[0], 0.07, 0); g.add(z); o.zone = z; const st = cart(G.lv.P.id === 'boss' ? 'coco' : 'fruit'); st.position.set(-RW / 2 - 1.6, 0.25, 0); g.add(st); const s = billboard(STOPS[G.lv.P.id][0].toUpperCase(), '#ff4fa8', '#8a2ab8'); s.scale.setScalar(0.6); s.position.set(-RW / 2 - 3.5, 0, 2); s.rotation.y = PI / 2; g.add(s); o.state = 'wait'; }
  g.traverse(q => { q.frustumCulled = false; }); G.objs.push(o); return o;
}
function animalScale(root, h) { root.updateMatrixWorld(true); const b = new THREE.Box3(); root.traverse(q => { if (q.isSkinnedMesh) { q.computeBoundingBox(); b.union(q.boundingBox.clone().applyMatrix4(q.matrixWorld)); } }); return h / Math.max(0.001, b.max.y - b.min.y); }
function makeAnimal(A) { const o = cloneSkinned(A.scene); o.scale.setScalar(A.s); const mx = new THREE.AnimationMixer(o), walk = A.anims.find(a => /Walk/i.test(a.name)) || A.anims[0], idle = A.anims.find(a => /Idle|Eat/i.test(a.name)) || walk; const act = { walk: walk && mx.clipAction(walk), idle: idle && mx.clipAction(idle) }; if (act.idle) act.idle.play(); o.traverse(q => { q.frustumCulled = false; }); return { obj: o, mx, act, walking: false }; }
function animalWalk(c, on) { if (c.walking === on) return; c.walking = on; const a = on ? c.act.walk : c.act.idle, b = on ? c.act.idle : c.act.walk; if (a && b && a !== b) { a.reset().play(); a.crossFadeFrom(b, 0.3, false); } }
function smash(o, R) {
  const m = o.items[0]; if (!m.visible) return; m.visible = false; o.hit.add(R); G.smashed++;
  const C = SMASHC[o.kind] || [0xffffff], x = o.x, z = o.z;
  for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(i % 2 ? new THREE.BoxGeometry(0.3, 0.3, 0.3) : new THREE.SphereGeometry(0.2, 6, 4), flat(pick(C))); f.position.set(x + rnd(-0.6, 0.6), rnd(0.5, 1.5), z); fling(f, new THREE.Vector3(rnd(-6, 6) + (x - R.x) * 2, rnd(6, 12), -R.speed * rnd(0.3, 0.8)), 1.6, 18, 12); }
  if (o.kind === 'colour') { for (let i = 0; i < 3; i++) puff(_p.set(x, 1.5, z - 1), 18, 0xffffff, { cols: C, size: 2.2, speed: 4, life: 1.4, grav: -0.5, grow: 2 }); flash(pick(['#ff7ad8', '#7ae8ff', '#ffe07a']), 0.5); }
  else puff(_p.set(x, 1, z), 8, 0xffffff, { star: true, size: 0.4, speed: 4, cols: [0xffe066, 0xffffff] });
  sfx('smash'); if (['pots', 'cans', 'speakers', 'barrier', 'drums'].includes(o.kind)) sfx('crunch'); if (['mithai', 'fruit', 'veg', 'coco'].includes(o.kind)) sfx('splat'); E.shake = Math.max(E.shake, 0.25); vib(40); R.speed *= cust().b ? 0.995 : 0.97; G.coins += 3; task('smash');
  popText(pick(['SMASH!', 'BADAAM!', 'DHISHOOM!', 'KABOOM!', 'OOPS!']), _p.set(x, 3, z), pick(['#ffe066', '#ff9ad8', '#7affe8']), 30, 0.8);
  addCombo(1, o.kind === 'colour' ? 'HOLI HAI!' : ''); addWanted(o.kind === 'colour' || o.kind === 'balloons' ? 0.1 : 0.25, 'smash');
  const P = G.lv.P, pm = G.lv.m; if (pm === 'likes' || pm === 'fun' || pm === 'mayhem') { mood(5); react('laugh'); if (Math.random() < 0.5) say(pick(['Hahaha! Again!', 'SO viral!', 'Dhishoom!']), 'laugh'); } else if (pm === 'eggs' || pm === 'call') { mood(-2); if (Math.random() < 0.5) say(pick(['Arre, that poor man\'s stall!', 'What are you DOING?!']), 'angry'); } else if (Math.random() < 0.3) say(pick(['Hahaha!', 'Oho! Careful!', 'Who will pay for that?!']), 'laugh');
  bumpPassenger(0.15, 'smash');
}
// ---------------- driving ----------------
const GRAV = 22, CRUISE = 60 / 3.6;   // the taxi drives itself at 60 km/h; GAS goes faster, BRAKE slows down and stops
function updateMe(dt) {
  const R = G.me, cs = carSpec(), driving = G.state === 'drive';
  let top = 26 * cs.sp * (1 + G.lv.d * 0.06);
  if (R.turbo > 0) { R.turbo -= dt; top += 13 * Math.min(1.25, cs.sp); }
  if (R.stun > 0) { R.stun -= dt; top *= 0.4; }
  if (!driving) top = 0;
  const brake = driving && R.brake, gas = driving && R.gas && !(G.M && G.M.out);
  if (brake) R.speed = Math.max(0, R.speed - 22 * dt);
  else if (gas || R.turbo > 0) R.speed = damp(R.speed, top, R.turbo > 0 ? 2.6 : R.speed < top ? 1.0 * cs.acc : 2.2, dt);
  else { const cruise = driving && !(G.M && G.M.out) ? CRUISE : 0; R.speed = R.speed < cruise ? damp(R.speed, cruise, 0.9 * cs.acc, dt) : Math.max(cruise, R.speed - (2.2 + R.speed * 0.05) * dt); }   // it drives itself at 60 km/h
  if (G.state === 'arrive' || G.state === 'fail') R.speed = Math.max(0, R.speed - 14 * dt);
  const pz = R.z; R.z -= R.speed * dt;
  const px = R.x; G.tx = clamp(G.tx, -HALF, HALF); R.x = damp(R.x, G.tx, R.speed > 2 ? 7 * cs.grip : 2, dt); R.x = clamp(R.x, -HALF, HALF);
  R.steer = R.speed > 1 ? (R.x - px) / dt / Math.max(8, R.speed) : 0;
  if (R.air) { R.vy -= GRAV * dt; R.y += R.vy * dt; if (R.spinA > 0) R.spinA = Math.min(PI * 2, R.spinA + dt * 9); if (R.y <= 0 && R.vy < 0) land(R); }
  else { R.y = Math.max(0, R.y - dt * 4); }
  R.bumpY = damp(R.bumpY || 0, 0, 8, dt);
  R.V.obj.position.set(R.x, R.y + R.bumpY, R.z); R.V.obj.rotation.set(R.air ? -0.1 : -(R.bumpY || 0) * 0.3 + (brake ? 0.025 : 0), -R.steer * 0.35 + R.spinA, R.steer * 0.05, 'YXZ');
  spinWheels(R.V, pz - R.z, R.steer * 0.8);
  if (brake && R.speed > 8 && Math.random() < dt * 20) puff(_p.set(R.x + rnd(-0.8, 0.8), 0.2, R.z + 1.6), 1, 0xd8d8d8, { size: 0.5, speed: 0.6, life: 0.5, grav: -1 });
  { const big = cust().f, on = R.turbo > 0 || (big && R.speed > 20 && Math.random() < 0.02); R.V.flames.forEach(f => { f.visible = !!on; const k = (big ? 1.6 : 1) * (0.8 + Math.random() * 0.4) * (R.turbo > 0 ? 1 : 0.6); f.scale.set(k * 0.9, k * 0.9, k * 1.6); }); if (big && R.turbo <= 0 && R.speed > 20 && Math.random() < dt * 0.6) { sfx('backfire'); puff(_p.set(R.x, 0.5, R.z + R.len / 2 + 0.4), 3, 0xff9a2a, { add: true, size: 0.5, speed: 1.5, life: 0.2, cols: [0xffe04a, 0xff7a1a] }); } }
  if (R.turbo > 0 && Math.random() < dt * 40) puff(_p.set(R.x + rnd(-0.3, 0.3), 0.55, R.z + R.len / 2 + 0.2), 1, 0xff9a1a, { add: true, size: 0.6, speed: 1, life: 0.25, grav: -1, cols: [0xffe04a, 0xff7a1a, 0x4ad8ff] });
  if (G.lv.S.rain && R.speed > 6 && Math.random() < dt * 14) puff(_p.set(R.x + rnd(-1, 1), 0.2, R.z + R.len / 2), 1, 0xd8e4f0, { size: 0.45, speed: 1.5, life: 0.4, grav: 6 });
  if (brake && R.speed > 14) sfxT('skid', 0.6);
  if (G.power === 'shield') { if (!R.bub) { R.bub = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7affe8, transparent: true, opacity: 0.22, depthWrite: false })); R.bub.scale.set(0.8, 0.6, 1.3); R.bub.position.y = 1; R.V.obj.add(R.bub); } R.bub.visible = true; } else if (R.bub) R.bub.visible = false;
  if (driving) { const M = G.M; if (!M.lastSwerve && Math.abs(R.steer) > 0.9 && R.speed > 18) { M.lastSwerve = 1; if (G.lv.m === 'eggs' || G.lv.m === 'call') { mood(-4); say(pick(['Arre, careful!', 'Zig-zag?!', 'Straight, beta, straight!']), 'scared'); } else if (G.lv.m === 'fun' || G.lv.m === 'likes') { mood(3); react('laugh'); } } if (Math.abs(R.steer) < 0.3) M.lastSwerve = 0; }
}
function land(R) {
  R.y = 0; R.vy = 0; R.air = false; puff(_p.set(R.x, 0.3, R.z), 6, 0xd8d0c0, { size: 0.8, speed: 2, life: 0.5 }); sfx('thud'); E.shake = 0.3; vib(30);
  if (R.spinA > 0) { const ok = R.spinA >= PI * 2 - 0.01; R.spinA = 0; if (ok) { task('spin'); addCombo(2, '360° SPIN!'); G.coins += 10; popText('360° SPIN! +10', _p.set(R.x, 3.5, R.z), '#ffe066', 30, 1); sfx('gateGood'); } }
  bumpPassenger(0.9 * carSpec().soft, 'land');
}
function stunt() { const R = G.me; if (!R.air || R.spinA > 0 || R.y < 1.2) return; R.spinA = 0.01; sfx('swoosh'); }
function bumpPassenger(k, why) {
  CAB.bv += 2.4 * Math.min(1.4, k + 0.2); cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  const M = G.M, H = MISSIONS[G.lv.m]; if (!M || M.done) return;
  if (G.power === 'shield' && why !== 'land' && why !== 'breaker' && why !== 'pothole') return;
  if (H.bump) H.bump(k, M, why);
  if (k > 0.3 && G.lv.m !== 'sleep' && G.lv.m !== 'fun') { setExpr('scared', 1.4); if (Math.random() < 0.5) say(pick(PASSR().hurt), 'scared'); }
}
// ---------------- what the player does ----------------
function useTurbo() {
  const R = G.me; if (G.state !== 'drive' || G.turbo < 0.33 || R.turbo > 0) return;
  G.turbo -= 0.33; R.turbo = cust().f ? 2.35 : 1.8; task('turbo'); sfx('nitro'); flash('#9ae8ff', 0.25); vib(40); E.shake = 0.2; popText('TURBO!', _p.set(R.x, 3, R.z - 3), '#7ae8ff', 30, 0.7);
  const H = MISSIONS[G.lv.m]; if (H.turbo) H.turbo(G.M);
}
function honk() {
  if (G.state !== 'drive' && G.state !== 'intro') return; hornDown(); vib(15); if (G.state === 'drive') { G.honks++; task('honk'); }
  $('hornB').classList.remove('ready'); void $('hornB').offsetWidth; $('hornB').classList.add('ready'); setTimeout(() => $('hornB').classList.remove('ready'), 250);
  if (G.state !== 'drive') return;
  const R = G.me;
  for (const o of G.objs) { if (o.t === 'cows' && !o.gone && o.z < R.z && o.z > R.z - 50) { o.gone = true; o.goT = 0; sfxT('moo', 0.5); popText('MOOO! OKAY OKAY!', _p.set(o.x, 3, o.z), '#fff', 22, 0.9); o.cows.forEach(c => animalWalk(c, true)); } if ((o.t === 'baraat' || o.t === 'fans') && o.cross && o.z < R.z && o.z > R.z - 40) { o.hurry = true; popText(o.t === 'baraat' ? 'Arre, the baraat!' : 'Make way for the fans!', _p.set(0, 3.5, o.z), '#ffe066', 22, 0.9); } }
  const H = MISSIONS[G.lv.m]; if (H.honk) H.honk(G.M);
}

// ---------------- collisions and pickups ----------------
function interact(dt) {
  const R = G.me, M = G.M, H = MISSIONS[G.lv.m], mag = G.power === 'magnet';
  for (const o of G.objs) {
    const dz = R.z - o.z; if (dz > 12 || dz < -45) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp' || o.t === 'mega')) for (const c of o.items) { if (!c.visible) continue; const cz = o.z + c.position.z; if (mag && Math.abs(cz - R.z) < 12 && Math.abs(c.position.x - R.x) < 9) { c.position.x = damp(c.position.x, R.x, 6, dt); c.position.z = damp(c.position.z, R.z - o.z, 6, dt); c.position.y = damp(c.position.y, R.y + 1, 6, dt); } if (Math.abs(cz - R.z) < 1.6 && Math.abs(c.position.x - R.x) < 1.6 && Math.abs(c.position.y - R.y - 0.8) < 1.8) { c.visible = false; G.coins++; sfxT('coin', 0.03); G.turbo = Math.min(1, G.turbo + 0.02); task('coin'); } }
    if (o.t === 'turbo') for (const b of o.items) { if (b.visible && Math.abs(o.z - R.z) < 1.8 && Math.abs(b.position.x - R.x) < 1.7) { b.visible = false; G.turbo = Math.min(1, G.turbo + 0.34); sfx('kaching'); popText('+TURBO', _p.set(R.x, 2.5, R.z), '#7ae8ff', 26, 0.7); } }
    if (o.t === 'cam' && !o.done && dz < 0) { o.done = true; const v = Math.round(R.speed * 3.6); if (v >= o.lim) { flash('#ffffff', 0.5); sfx('shutter'); jobAdd(1, '📸 CLICK! ' + v + ' km/h'); } else { sfx('gateBad'); popText('TOO SLOW! ' + v + '/' + o.lim, _p.set(R.x, 3.5, R.z), '#ffb0a0', 26, 0.9); say(pick(PASSR().miss), 'sad'); } o.tag.visible = false; }
    if (o.t === 'puddleman' && !o.soaked && Math.abs(dz) < 2.8 && Math.abs(R.x - o.x) < 2.6 && !R.air) { o.soaked = 1; o.ht = 0; for (let i = 0; i < 4; i++) puff(_p.set(R.x + (i - 1.5) * 1.2, 0.5, R.z), 16, 0xc8dcf0, { size: 1, speed: 7, life: 1, grav: 12, vel: _q.set(Math.sign(o.px) * 5, 6, 0) }); sfx('bigSplash'); scream(rnd(120, 180)); const f = o.umb.clone(); f.position.set(o.umb.position.x, 0.25, o.z); fling(f, new THREE.Vector3(Math.sign(o.px) * 4, 10, -2), 1.6, 18, 8); o.umb.visible = false; o.tag.visible = false; popText(pick(['AAARGH! MY SUIT!', 'MY NEW SHOES!', 'YOU RASCAL!']), _p.set(o.px, 3.4, o.z), '#fff', 20, 1); jobAdd(1, pick(['SPLAAASH! 💦', 'SOAKED! 💦', 'MAKE IT RAIN!'])); }
    if (o.t === 'pins' && !o.done && dz < 0.8 && dz > -3.5 && !R.air) { let k = 0; for (const pm of o.pins) if (pm.visible && Math.abs(pm.position.x - R.x) < R.wide / 2 + 0.55) { pm.visible = false; k++; const f = pm.clone(); f.position.set(pm.position.x, 0, o.z + pm.position.z); fling(f, new THREE.Vector3(rnd(-6, 6) + (pm.position.x - R.x) * 3, rnd(6, 11), -R.speed * rnd(0.6, 1)), 1.6, 18, 16); }
      if (k) { sfx('clatter'); if (dz < -3) o.done = true; o.k = (o.k || 0) + k; if (o.k >= 10 && !o.strike) { o.strike = 1; banner('🎳 STRIKE!', '+5 bonus pins', 1); jobAdd(k + 5, 'STRIKE! 🎳'); } else jobAdd(k, k + ' PINS!'); o.tag.visible = false; R.speed *= 0.99; } }
    if (o.t === 'fuel' && o.items[0].visible && Math.abs(dz) < 1.8 && Math.abs(o.x - R.x) < 1.8) { o.items[0].visible = o.items[1].visible = false; G.M.fuel = Math.min(100, G.M.fuel + 18); G.M.out = false; sfx('glug'); popText('+⛽ FUEL', _p.set(R.x, 3, R.z), '#ffd23f', 28, 0.8); puff(_p.set(R.x, 1.5, R.z), 8, 0xffd23f, { star: true, add: true, speed: 3 }); }
    if (o.t === 'pump' && Math.abs(dz) < 7.5 && R.x < -3.2) {
      if (R.speed < 9) { if (G.M.fuel < 100) { G.M.fuel = Math.min(100, G.M.fuel + 45 * dt); G.M.out = false; sfxT('glug', 0.35); showHint('⛽ FILLING… ' + Math.round(G.M.fuel) + '%'); if (G.M.fuel >= 100 && !o.full) { o.full = true; sfx('kaching'); G.coins += 10; banner('⛽ FULL TANK!', 'Now go crash something!', 1.2); } } }
      else if (G.M.fuel < 95 && !o.told) { o.told = true; showHint('🐢 SLOW DOWN in the yellow bay to fill up!'); }
    }
    if (o.t === 'power' && o.items[0].visible && Math.abs(dz) < 1.8 && Math.abs(o.x - R.x) < 1.9) { o.items[0].visible = false; gotPower(o.pow); }
    if (o.t === 'runs' && o.items[0].visible && Math.abs(dz) < 1.6 && Math.abs(o.x - R.x) < 1.8) { o.items[0].visible = false; sfx('gateGood'); popText(o.k === 6 ? 'SIXER! +6' : 'FOUR! +4', _p.set(R.x, 3, R.z), o.k === 6 ? '#ffb03a' : '#7ac8ff', 32, 1); H.runs && H.runs(M, o.k); addCombo(1); puff(_p.set(o.x, 2, o.z), 12, 0xffffff, { star: true, add: true, cols: [0xffd23f, 0xff7a1a, 0x2a8ad8], speed: 4 }); }
    if ((o.t === 'balloon' || o.t === 'heart') && o.items) for (const b of o.items) { const bz = o.z + b.position.z; if (b.visible && Math.abs(bz - R.z) < 1.6 && Math.abs(b.position.x - R.x) < 1.6) { b.visible = false; sfx(o.t === 'balloon' ? 'pop' : 'gateGood'); puff(_p.set(b.position.x, 2, bz), 8, o.t === 'balloon' ? 0xffd23f : 0xff3a7a, { star: true, add: true, speed: 3 }); if (o.t === 'balloon' && H.balloon) H.balloon(M); if (o.t === 'heart' && H.heart) H.heart(M); } }
    if ((o.t === 'ramp' || o.t === 'mega') && !R.air && dz <= (o.t === 'mega' ? 1.5 : 0.5) && dz > -0.8 && Math.abs(R.x - o.x) < o.w / 2) { const mg = o.t === 'mega'; R.air = true; R.vy = mg ? 15 + R.speed * 0.12 : 9 + R.speed * 0.13; sfx('whoosh'); if (mg) { sfx('wheee'); sfx('crowd', 0.2); } banner(mg ? '🚀 MEGA JUMP!' : '🚀 JUMP!', 'Swipe UP to SPIN!', mg ? 1.4 : 0.9); E.slow = mg ? 0.45 : 0.65; setTimeout(() => { E.slow = 1; }, mg ? 1300 : 650); addCombo(mg ? 3 : 1, mg ? 'MEGA AIR!' : 'BIG AIR'); task('air'); if (mg) G.coins += 15; if (H.air) H.air(M); else if (G.lv.m !== 'sleep') say(pick(['AAAAH!', 'We are FLYING!', 'Wheee!', 'Bhaiya, this is a TAXI not a plane!']), 'scared'); }
    if (o.t === 'stop' && o.state === 'wait') {
      if (Math.abs(dz) < 7 && R.x < -2.5 && R.speed < 3) { o.state = 'done'; mood(22); G.coins += 40; addCombo(2, 'GOOD STOP'); sfx('kaching'); popText('+🪙40 TIP · 😍', _p.set(R.x, 3.5, R.z), '#ff9ad8', 30, 1.1); say(pick(['Wah! Thank you!', 'Perfect stop!', 'You are the best driver!']), 'laugh'); o.zone.visible = false; }
      else if (dz > -60 && dz < -20 && !o.told) { o.told = true; say(STOPS[G.lv.P.id][1], 'happy'); showHint('🛑 STOP in the PINK zone for a tip!'); }
      else if (R.z < o.z - 9) { o.state = 'missed'; mood(-8); say(pick(['Arre! You passed it!', 'Never mind…', 'Hmph.']), 'sad'); o.zone.visible = false; }
    }
    if (R.air && R.y > 1) continue;
    if (o.t === 'breaker' && !o.hit.has(R) && dz < 0.6 && dz > -0.8) { o.hit.add(R); const k = clamp((R.speed - 10) / 10, 0, 1.4) * carSpec().soft; if (k > 0.05) { R.bumpY = 0.25 + k * 0.4; E.shake = 0.2 + k * 0.3; sfx('thud'); vib(40); popText(k > 0.6 ? 'BUMP!! 😵' : 'BUMP!', _p.set(R.x, 3, R.z), '#ffd0a0', 28, 0.8); bumpPassenger(k, 'breaker'); } else { popText('SMOOTH! 👌', _p.set(R.x, 3, R.z), '#a0ffb0', 24, 0.8); if (H.smooth) H.smooth(M); } }
    if (o.t === 'pothole' && !o.hit.has(R) && Math.abs(dz) < 1 && Math.abs(R.x - o.x) < 1.4) { o.hit.add(R); const k = clamp(R.speed / 22, 0.15, 1.2) * carSpec().soft; R.bumpY = 0.2 + k * 0.3; E.shake = 0.3; sfx('thud'); vib(50); popText('POTHOLE! 🕳️', _p.set(R.x, 3, R.z), '#ffd0a0', 26, 0.8); bumpPassenger(k, 'pothole'); }
    if (o.t === 'puddle' && !o.hit.has(R) && Math.abs(dz) < 2.5 && Math.abs(R.x - o.x) < 2.4) { o.hit.add(R); for (let i = 0; i < 3; i++) puff(_p.set(R.x + (i - 1) * 1.4, 0.5, R.z), 14, 0xc8dcf0, { size: 0.9, speed: 6, life: 0.9, grav: 12 }); task('splash'); sfx('bigSplash'); popText('SPLAAASH! 💦', _p.set(R.x, 3, R.z), '#8ae8ff', 30, 0.9); addCombo(1, 'SPLASH'); R.speed *= 0.85; if (Math.random() < 0.5) say(pick(['Hahaha! Everyone is wet!', 'My shoes!', 'Splash!']), 'laugh'); }
    if (o.t === 'smash' && !o.hit.has(R) && Math.abs(dz) < 2 && Math.abs(R.x - o.x) < 1.9) smash(o, R);
    if (o.t === 'jay' && o.go) for (const p of o.people) if (!p.fly && !(p.down > 0) && Math.abs(p.x - R.x) < 1.4 && Math.abs(o.z - p.dz - R.z) < 1.8 && R.speed > 4) { p.fly = { vx: (p.x < R.x ? -1 : 1) * rnd(2, 5), vz: -R.speed * 0.7, vy: 9 + R.speed * 0.18, y: 0.3, ry: 0, spin: rnd(8, 14) }; R.speed *= 0.97; G.coins += 3; sfx('boing'); scream(); E.shake = 0.25; vib(40); popText(pick(['BOING! 🤸', 'YEEET!', 'SORRY UNCLE!', 'WHEEE!']), _p.set(p.x, 3.4, R.z), '#ffe066', 28, 0.9); addCombo(1, 'BOUNCE!'); task('bounce'); addWanted(0.25, 'people'); crashReact('people'); }
    if ((o.t === 'baraat' || o.t === 'fans') && o.cross && !o.scared && dz < 3 && dz > -2 && R.speed > 6) { o.scared = true; o.people.forEach(p => { p.jump = 1; }); R.speed *= 0.92; mood(-3); addWanted(0.3); task('bounce', 3); sfx('boing'); scream(); addCombo(2, 'BARAAT BOUNCE!'); popText(o.t === 'baraat' ? 'ARRE! THE BARAAT!' : 'WATCH OUT!', _p.set(R.x, 3.5, R.z), '#ff9a9a', 26, 0.9); sfx('talk', 0, { w: 'aaah', f0: 220 }); say(pick(['Careful!! People!', 'Bhaiya, BRAKE!']), 'scared'); }
    if (o.t === 'seawave' && !o.done && dz < 22) { o.done = true; for (let i = 0; i < 4; i++) setTimeout(() => puff(_p.set(rnd(3, 9), 2, o.z - i * 2), 22, 0xe8f8ff, { size: 1.2, speed: 6, life: 1.1, grav: 10, vel: _q.set(-6, 6, 0) }), i * 90); sfx('bigSplash'); if (R.x > 0) { R.speed *= 0.7; popText('WAVE SPLASH! 🌊', _p.set(R.x, 3, R.z), '#8ae8ff', 30, 1); say('Aaah! The sea is on the road!', 'scared'); } else { addCombo(1, 'DODGED THE WAVE'); popText('WHOOSH! 🌊', _p.set(5, 4, o.z), '#8ae8ff', 26, 0.9); } }
    if (Math.abs(dz) < 2 && !o.hit.has(R)) {
      let hitIt = false;
      if (o.t === 'cows') for (const c of o.cows) { if (!c.fv && Math.abs(c.obj.position.x - R.x) < 1.8 && Math.abs(o.z + c.obj.position.z - R.z) < 2) { hitIt = true; c.fv = { vx: (c.obj.position.x < R.x ? -1 : 1) * rnd(4, 7), vy: rnd(9, 12) * (cust().b ? 1.2 : 1), sp: rnd(7, 11) * pick([-1, 1]), vz: -R.speed * 0.5 }; } }
      else if (o.t === 'cones' && o.items) for (const c of o.items) { if (c.visible !== false && Math.abs(c.position.x - R.x) < 1.4 && Math.abs(o.z + c.position.z - R.z) < 1.6) { hitIt = true; c.visible = false; const f = c.clone(); f.position.set(c.position.x, c.position.y, o.z + c.position.z); fling(f, new THREE.Vector3(rnd(-5, 5), rnd(8, 12), -R.speed * 0.9), 1.6, 18, 14); } }
      if (hitIt) { o.hit.add(R); if (o.t === 'cows') { o.gone = true; o.goT = 0; R.speed *= G.power === 'shield' || cust().b ? 0.97 : 0.88; sfx('moo'); sfx('boing'); E.shake = 0.35; vib(60); popText(pick(['MOOO-FLIP! 🐄', 'HOLY COW! 🐄', 'COW-ABUNGA!']), _p.set(R.x, 3.5, R.z), '#fff', 30, 1); addCombo(2, 'COW FLIP!'); task('cow'); G.coins += 4; addWanted(0.3, 'cow'); crashReact('cow'); } else { R.speed *= 0.96; sfx('clang'); sfx('boing', 0.05); popText(pick(['CONE-ZILLA!', 'STRIKE! 🎳', 'BOINK!']), _p.set(R.x, 3, R.z), '#ffb03a', 26, 0.8); addCombo(1, 'CONES!'); G.coins += 2; } }
    }
  }
  R.crashT = Math.max(0, R.crashT - dt);
  for (const c of G.cars) {
    if (c.fly > 0) continue;
    const dz = c.z - R.z, dx = Math.abs(c.x - R.x), lenZ = (c.len + R.len) / 2, wx = (c.wide + R.wide) / 2;
    const ox = wx - dx, oz = lenZ - Math.abs(dz);
    if (ox > 0 && oz > 0 && !R.air) {
      const sx = R.x >= c.x ? 1 : -1, head = c.dir < 0, rel = head ? R.speed + c.cur : R.speed - c.cur, side = ox < oz * 0.5;
      if (G.power === 'shield' || (!side && dz < 0 && rel > 4)) { launchCar(c, R, head, rel); continue; }
      if (side) { R.x += sx * ox; G.tx = R.x + sx * 0.6; c.x -= sx * 0.25; } else if (dz < 0) { R.z = c.z + lenZ; R.speed = Math.min(R.speed, c.cur); } else { R.z = c.z - lenZ; }
      if (R.crashT <= 0) { R.crashT = 0.6; c.hitT = 1; task('hit'); sfx(side ? 'scrape' : 'bonk'); E.shake = 0.15; for (let i = 0; i < 2; i++) puff(_p.set((R.x + c.x) / 2, 0.8, R.z), 6, 0xffe06a, { add: true, star: true, size: 0.25, speed: 5, life: 0.35, cols: [0xffe06a, 0xff9a2a] }); popText(side ? pick(['SCRAPE!', 'SKRRRT!']) : 'TAP!', _p.set(R.x, 3, R.z), '#ffd0a0', 22, 0.6); bumpPassenger(0.15, 'tap'); }
    }
    if (!c.nm && Math.abs(dz) < 1 && dx >= wx && dx < wx + 1.0 && R.speed > 14) { c.nm = true; G.turbo = Math.min(1, G.turbo + 0.12); sfx('swoosh'); popText(c.dir < 0 ? 'CLOSE CALL! 😱' : 'NEAR MISS!', _p.set(R.x, 3, R.z), '#ffe066', 26, 0.8); addCombo(c.dir < 0 ? 2 : 1); task('near'); const H2 = MISSIONS[G.lv.m]; if (H2.near) H2.near(G.M); }
    if (Math.abs(dz) > 8) c.nm = false;
  }
  if (G.thief && !G.thief.caught) { const T = G.thief, dz = T.z - R.z; if (Math.abs(dz) < (T.len + R.len) / 2 && Math.abs(T.x - R.x) < 1.9 && R.crashT <= 0) { R.crashT = 0.9; R.speed *= 0.85; T.cur *= 0.5; T.spin = 1; sfx('crunch'); sfx('boing', 0.05); E.shake = 0.45; vib(80); puff(_p.set(T.x, 1, T.z), 12, 0xffffff, { star: true, add: true, cols: [0xffe066, 0xff8a2a], speed: 5 }); jobAdd(1, 'BAM! ' + (G.M.have + 1) + '/' + G.M.need); if (G.M.have >= G.M.need) caught(); else say(pick(PASSR().happy), 'laugh'); } }
}
// a car we hit goes flying (we keep most of our speed: it is a cartoon!)
function launchCar(c, R, head, rel) {
  const cs = carSpec(), hard = (cs.crash || 1) * (cust().b ? 1.35 : 1) * (G.power === 'shield' ? 1.2 : 1), sx = c.x < R.x ? -1 : c.x > R.x ? 1 : pick([-1, 1]);
  if (G.t - G.lastLaunch < 2) task('double'); G.lastLaunch = G.t; if (head) task('head'); if (c.type === 'bus' || c.type === 'truck') task('bus');
  c.fly = 4; c.vy = 7 + Math.min(9, Math.abs(rel) * 0.35) * hard; c.vx = sx * rnd(3, 6); c.vz = -R.speed * 1.12 - 5; c.rz = -sx * rnd(4, 8); c.rx = rnd(-3, 3); c.y = 0.1; c.cur = 0; c.bounces = 0;
  const keep = G.power === 'shield' ? 1 : head ? 0.78 : 0.88; R.speed *= Math.min(0.99, keep + (hard - 1) * 0.12); R.crashT = 0.4;
  E.shake = head ? 0.65 : 0.45; vib(head ? 120 : 70); G.launched++; G.coins += head ? 8 : 5; task('launch');
  sfx('kaboom'); sfx('crunch', 0.03); sfx('glass', 0.08); setTimeout(() => scream(rnd(170, 300)), 150); if (Math.random() < 0.5) setTimeout(() => sfx('wheee'), 250);
  for (let i = 0; i < 3; i++) puff(_p.set(c.x, 1, c.z), 10, 0xffffff, { star: true, add: true, size: 0.45, speed: 6, cols: [0xffe066, 0xff8a2a, 0xffffff] });
  const glass = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.15), flat(pick([0xb8e0ff, 0xe8f4ff]))); f.position.set(c.x + rnd(-0.6, 0.6), 1.2, c.z); fling(f, new THREE.Vector3(rnd(-5, 5), rnd(5, 9), -R.speed * rnd(0.4, 0.9)), 1.2, 18, 14); glass.push(f); }
  popText(pick(head ? ['HEAD-ON KABOOM!', 'DHISHOOM!!', 'MEGA CRASH!'] : ['KABOOM!', 'YEET! 🚗💨', 'BYE BYE!', 'FLYING CAR!', 'DHISHOOM!']), _p.set(c.x, 3.6, c.z), pick(['#ffe066', '#ff8ad8', '#7affe8']), 34, 1);
  setTimeout(() => popText(pick(['ARRE BHAI!', 'MY NEW CAR!', 'OYE!!', 'MUMMYYY!', 'Insurance!!']), _p.set(c.x, 4.5, c.z), '#fff', 20, 1), 300);
  addCombo(head ? 3 : 2, head ? 'HEAD-ON LAUNCH!' : 'CAR LAUNCHED!'); addWanted(head ? 0.4 : 0.3, 'crash');
  crashReact(head ? 'head' : 'car');
}
// what the passenger says and does about a crash
function crashReact(what) {
  const M = G.M, H = MISSIONS[G.lv.m]; CAB.bv += 3; cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  if (!M || M.done || G.t - (M.crashAt || -9) < 1.2) return; M.crashAt = G.t; if (H.crash) H.crash(M);
  if (G.lv.m === 'mayhem' || G.lv.m === 'fun' || G.lv.m === 'likes') say(pick(['HAHAHA!', 'KABOOM! Again!', 'Did you SEE that?!', 'Best taxi EVER!', 'He flew like a bird!']), 'laugh');
  else if (G.lv.m !== 'sleep') say(what === 'cow' && PASSR().cow.length ? pick(PASSR().cow) : pick(PASSR().hurt), 'scared');
}
function crash(what, src) {
  const R = G.me; R.stun = 0.6; E.shake = what === 'head' ? 0.7 : 0.45; vib(what === 'head' ? 140 : 90);
  sfx(what === 'cow' ? 'moo' : 'crash'); puff(_p.set(R.x, 1, R.z - 2), 8, 0xffffff, { star: true, size: 0.4, speed: 4, cols: [0xffe066, 0xffffff] });
  popText(what === 'cow' ? 'MOOOO! 🐄' : what === 'head' ? 'HEAD-ON! 💥' : pick(['BONK!', 'CRASH!', 'OOPS!']), _p.set(R.x, 3, R.z), '#ff8a8a', 30, 0.8);
  if (src && src.V && Math.abs(src.z - R.z) < 30) { setTimeout(() => sfxT('horn', 0.3, 0, 3), 200); popText(pick(['ARRE BHAI!', 'OYE! Look!', 'Who gave you a licence?!']), _p.set(src.x, 3.6, src.z), '#fff', 20, 1); }
  addWanted(what === 'cow' ? 0.6 : 0.5, 'crash'); G.combo = 0; G.comboT = 0; $('combo').classList.add('hidden');
  const M = G.M, H = MISSIONS[G.lv.m]; CAB.bv += 3; cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  if (M && !M.done && G.t - (M.crashAt || -9) > 1.5) { M.crashAt = G.t; if (H.crash) H.crash(M); if (G.lv.m !== 'sleep') say(what === 'cow' && PASSR().cow.length ? pick(PASSR().cow) : pick(PASSR().hurt), 'scared'); }
}
// ---------------- the world each frame ----------------
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
function updateObjs(dt) {
  let nC = 0; const me = G.me;
  for (const o of G.objs) {
    const dz = o.z - me.z; o.obj.visible = dz < 30 && dz > -230; if (!o.obj.visible) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp' || o.t === 'mega')) for (const c of o.items) if (c.visible && nC < 160) { _cq.setFromAxisAngle(_Y, G.t * 4 + c.position.x); coinIM.setMatrixAt(nC++, _cm.compose(_cp.set(c.position.x, c.position.y, o.z + c.position.z), _cq, _cs)); }
    if (o.t === 'turbo') for (const b of o.items) { b.rotation.y += dt * 3; b.position.y = 1 + Math.sin(G.t * 4) * 0.2; }
    if (o.t === 'fuel' && o.items[0].visible) { o.items[0].rotation.y += dt * 2.5; o.items[0].position.y = 1.1 + Math.sin(G.t * 3) * 0.15; o.items[1].lookAt(cam.position.x, 1.1, cam.position.z - o.z); }
    if (o.t === 'pump') o.zone.material.opacity = 0.25 + Math.sin(G.t * 5) * 0.12;
    if (o.t === 'power') { o.items[0].rotation.y += dt * 2.5; o.items[0].position.y = 1.6 + Math.sin(G.t * 3) * 0.25; }
    if (o.t === 'runs') o.items[0].rotation.y = Math.sin(G.t * 2) * 0.4;
    if (o.t === 'stop' && o.zone.visible) o.zone.material.opacity = 0.3 + Math.sin(G.t * 6) * 0.15;
    if (o.t === 'balloon' || o.t === 'heart') o.items.forEach((b, i) => { b.position.y = 2 + Math.sin(G.t * 2 + i) * 0.3; if (o.t === 'heart') b.rotation.y += dt * 2; });
    if (o.t === 'cows') {
      if (dz > -50 && dz < 0) { o.chewT -= dt; if (o.chewT <= 0 && !o.gone) { o.chewT = 3; if (dz > -40) sfxT('moo', 1.5); if (G.state === 'drive' && dz > -45) showHint('📯 HONK to move the cows!'); } }
      o.cows.forEach(c => { if (c.fv) { const p = c.obj.position, f = c.fv; p.x += f.vx * dt; p.z += f.vz * dt; p.y += f.vy * dt; f.vy -= 22 * dt; c.obj.rotation.z += f.sp * dt; if (p.y <= 0 && f.vy < 0) { p.y = 0; c.obj.rotation.z = 0; c.fv = null; if (Math.abs(o.z + p.z - me.z) < 50) { sfxT('thud', 0.1); sfxT('moo', 0.4); puff(_p.set(p.x, 0.3, o.z + p.z), 6, 0xd8d0c0, { size: 0.9, speed: 2, life: 0.6 }); popText('I\'m OK! 🐄', _p.set(p.x, 3, o.z + p.z), '#fff', 18, 0.9); } } c.mx.update(dt); return; } if (o.gone) { c.obj.position.x = damp(c.obj.position.x, c.side * (RW / 2 + 3), 0.55, dt); c.obj.rotation.y = damp(c.obj.rotation.y, c.side < 0 ? -PI / 2 : PI / 2, 3, dt); } if (c.bonk) { c.bonk = Math.max(0, c.bonk - dt); c.obj.position.y = Math.sin(c.bonk * PI) * 1.2; } c.mx.update(dt); });
      o.x = o.cows.reduce((s, c) => s + c.obj.position.x, 0) / o.cows.length;
    }
    if (o.t === 'dog') { if (!o.go && dz > -26) { o.go = true; sfxT('woof', 0.5); animalWalk(o.dog, true); } if (o.go) { const p = o.dog.obj.position; p.x += dt * 5; if (p.x > RW / 2 + 3) p.x = 99; } o.dog.mx.update(dt * 2); o.x = o.dog.obj.position.x; }
    if (o.t === 'jay') {
      if (!o.go && dz > -45) { o.go = true; if (G.state === 'drive') { showHint('🚶 People crossing! Dodge them… or not 😅'); sfxT('talk', 1, 0, { w: 'hey', f0: 200 }); } }
      for (const p of o.people) { if (p.fly) { const f = p.fly; p.x += f.vx * dt; p.dz -= f.vz * dt; f.y += f.vy * dt; f.vy -= 20 * dt; f.ry += f.spin * dt; if (f.y <= 0 && f.vy < 0) { f.y = 0; p.fly = null; p.down = 1.4; if (Math.abs(o.z - p.dz - me.z) < 50) { sfx('splat'); sfxT('oof', 0.2); } } } else if (p.down > 0) { p.down -= dt; if (p.down <= 0 && Math.abs(o.z - p.dz - me.z) < 60) popText(pick(['I\'M OK! 👍', 'Arre yaar!', 'My chappal!', 'Again? Hehe']), _p.set(p.x, 2.6, o.z - p.dz), '#fff', 18, 0.9); } else if (o.go) p.x += dt * p.sp; }
    }
    if (o.t === 'baraat' || o.t === 'fans') { if (!o.cross && dz > -55) { o.cross = true; o.ct = 0; if (o.t === 'baraat') { sfx('horn', 0, 1); popText('🥁 BARAAT! Band baaja! 🎺', _p.set(0, 4, o.z), '#ffe066', 24, 1.2); } else { sfx('crowd'); popText('🏏 FANS CROSSING!', _p.set(0, 4, o.z), '#7ac8ff', 24, 1.2); } showHint('🛑 BRAKE or HONK — people crossing!'); } if (o.cross) { o.ct += dt * (o.hurry ? 2.2 : 1); o.people.forEach(p => { if (p.jump) { p.jump = Math.max(0, p.jump - dt * 1.1); p.x += dt * 7; } else p.x += dt * (o.hurry ? 4 : 1.9); }); if (o.people.every(p => p.x > RW / 2 + 2)) { o.cross = false; o.t = o.t + 'Done'; } } }
  }
  coinIM.count = nC; coinIM.instanceMatrix.needsUpdate = true;
  for (const o of G.objs) if (o.t === 'dog' && o.go && !o.hit.has(me) && Math.abs(o.z - me.z) < 1.8 && Math.abs(o.x - me.x) < 1.4) { o.hit.add(me); me.speed *= 0.95; sfx('woof'); sfx('boing', 0.05); popText('WOOF! 🐶 *boing*', _p.set(me.x, 3, me.z), '#fff', 26, 0.8); bumpPassenger(0.2, 'dog'); }
  if (G.horse) G.horse.mx.update(dt); if (G.ferris) G.ferris.rotation.x += dt * 0.15;
}
const PEDS = [];
function updatePeople(dt) {
  const me = G.me, side = RW / 2 + 1.6, S = G.lv.S;
  if (!PEDS.length) for (let i = 0; i < 20; i++) PEDS.push({ f: i % 2, x: (i % 4 < 2 ? -1 : 1) * (side + rnd(-0.9, 0.9)), z: rnd(-150, 20), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(1, 1.6), t: rnd(0, 5), tint: pick([0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0, 0x8a5ad8]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524, 0xd8a070]), hair: pick([0x1a1210, 0x3a2010, 0x2a2018, 0x5a4030]), wave: Math.random() < 0.25 });
  const lm = [], lf = [];
  if (!S.hills) for (const p of PEDS) {
    if (S.sea && p.x > 0) p.x = side + 0.6;
    p.t += dt; p.z += p.dir * p.sp * dt;
    if (p.z > me.z + 25) { p.z = me.z - rnd(110, 150); } else if (p.z < me.z - 160) p.z = me.z + rnd(0, 20);
    const near = p.wave && p.z < me.z && p.z > me.z - 18;
    (p.f ? lf : lm).push({ x: p.x, z: p.z, y: 0.25, ry: near ? (p.x < 0 ? PI / 2 : -PI / 2) : p.dir > 0 ? 0 : PI, clip: near || G.lv.stage === 'stadium' && p.wave ? 'wave' : 'walk', t: p.t, s: 1, tint: G.lv.stage === 'stadium' ? (p.f ? 0x2a5ad8 : 0xff8a1a) : p.tint, skin: p.skin, hair: p.hair, expr: near ? EXPR.laugh : 0 });
  }
  for (const o of G.objs) if ((o.t === 'baraat' || o.t === 'fans') && o.cross && o.obj.visible) for (const p of o.people) { p.t += dt; (p.f ? lf : lm).push({ x: p.x, z: o.z - p.dz, y: p.jump ? Math.sin(p.jump * PI) * 3 : 0, ry: p.jump ? PI / 2 + p.jump * 12 : PI / 2, clip: p.jump ? 'hit' : o.t === 'baraat' ? 'cheer' : 'run', t: p.t, s: 1, tint: p.tint, skin: 0xc68642, hair: 0x1a1210, expr: p.jump ? EXPR.scared : EXPR.laugh }); }
  for (const o of G.objs) if ((o.t === 'guest' || o.t === 'puddleman') && o.obj.visible) { o.tt += dt; const gx = o.t === 'guest' ? o.x : o.px, done = o.served || o.soaked; (o.f ? lf : lm).push({ x: gx, z: o.z, y: 0.25, ry: gx < 0 ? PI / 2 : -PI / 2, clip: done ? (o.t === 'guest' ? 'cheer' : 'hit') : o.t === 'guest' ? 'wave' : 'idle', t: o.tt, s: 1, tint: o.tint, skin: o.skin || 0xc68642, hair: 0x1a1210, expr: o.t === 'puddleman' ? (done ? EXPR.angry : EXPR.laugh) : done ? EXPR.laugh : EXPR.happy }); }
  for (const o of G.objs) if (o.t === 'jay' && o.obj.visible) for (const p of o.people) { p.t += dt; if (p.x > RW / 2 + 3) continue; (p.f ? lf : lm).push({ x: p.x, z: o.z - p.dz, y: p.fly ? p.fly.y : 0, holi: p.holi, ry: p.fly ? p.fly.ry : p.down > 0 ? PI / 2 : PI / 2, clip: p.fly ? 'hit' : p.down > 0.6 ? 'hit' : o.go ? 'run' : 'idle', t: p.t, s: 1, tint: p.tint, skin: p.skin, hair: p.hair, expr: p.fly ? EXPR.scared : p.down > 0 ? EXPR.sad : EXPR.happy }); }
  const atDest = G.lv && Math.abs(me.z + G.lv.L) < 120;
  if (atDest) for (const q of G.party) { q.t += dt; (q.f ? lf : lm).push({ x: q.x, z: q.z, y: 0.25, ry: q.ry, clip: (G.state === 'arrive' && G.result && G.result.ok) || G.lv.stage === 'shaadi' || G.lv.stage === 'stadium' ? 'cheer' : 'idle', t: q.t, s: 1, tint: q.tint, skin: q.skin, hair: q.hair, expr: G.state === 'arrive' && G.result && !G.result.ok ? EXPR.sad : EXPR.laugh }); }
  crowdM.draw(lm); crowdF.draw(lf);
  blobs.draw([[...lm, ...lf].map(q => ({ x: q.x, z: q.z, s: 0.9 })), G.cars.filter(c => c.V.obj.visible).map(c => ({ x: c.x, z: c.z, s: Math.max(3, c.len * 0.75) })), [{ x: me.x, z: me.z, y: me.y, s: 3.2 }]], 1);
}
let hintT = 0;
function showHint(t) { if (hintT > 0) return; const h = $('hint'); h.textContent = t; h.className = ''; hintT = 2.5; }
function update(dt) {
  G.t += dt; if (window.__bot) window.__bot(dt);
  G.track.update(dt, G.t); G.track.cull(G.me.z);
  if (G.state === 'intro') intro(dt);
  updateMe(dt); updateTraffic(dt); updateThief(dt); updatePolice(dt); updateObjs(dt); updatePeople(dt);
  updateShots(dt); updateBalls(dt); if (G.lv.race) updateRivals(dt);
  if (G.state === 'drive') { interact(dt); if (G.lv.race) raceTick(dt); checkArrive(dt); Engine.set(G.me.speed / 30, !!G.me.gas, PF.set.sound ? 0.07 : 0); G.wanted = Math.max(0, G.wanted - dt * 0.025); if ((G.t * 2 | 0) % 4 === 0) updateWanted(); }
  updateCombo(dt); if (G.powerT > 0) { G.powerT -= dt; if (G.powerT <= 0) setPower(null); }
  if (faceT > 0) { faceT -= dt; if (faceT <= 0) setExpr(baseExpr(), 0); }
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.add('hidden'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hidden'); }
  if (cabFxT > 0) { cabFxT -= dt; if (cabFxT <= 0) $('cabFx').style.opacity = 0; }
  if (G.state === 'arrive' && G.lv.race) G.me.gas = false;
  if (G.arrow) { G.arrow.position.y = 4 + Math.sin(G.t * 4) * 0.4; G.arrow.rotation.y += dt * 2; G.zone.material.opacity = 0.3 + Math.sin(G.t * 5) * 0.12; }
  // the weather and the life of each place
  const S = G.lv.S, me = G.me;
  if (S.rain && Math.random() < dt * 60) puff(_p.set(me.x + rnd(-14, 14), rnd(6, 12), me.z - rnd(-4, 40)), 1, 0xc8d8f0, { size: 0.1, speed: 0, life: 0.5, grav: 40 });
  if (S.rain && Math.random() < dt * 0.08 && G.state === 'drive') { flash('#e8f0ff', 0.45); setTimeout(() => sfx('boom'), 400); }
  if (S.holi && Math.random() < dt * 1.2) puff(_p.set(pick([-1, 1]) * rnd(8, 12), rnd(1, 3), me.z - rnd(20, 80)), 10, 0xffffff, { cols: SMASHC.colour, size: 1.6, speed: 2, life: 1.6, grav: -0.3, grow: 2 });
  if (S.night && Math.random() < dt * 0.7) { puff(_p.set(rnd(-30, 30), rnd(25, 40), me.z - rnd(60, 140)), 24, 0xffffff, { star: true, add: true, cols: [0xff4fa8, 0x4fe8ff, 0xffe04f, 0x8aff4f], speed: 8, life: 1.3, size: 0.8, grav: 3 }); if (Math.random() < 0.3) sfxT('firework', 0.6); }
  if (S.fans && Math.random() < dt * 0.15 && G.state === 'drive') sfxT('crowd', 3);
  updateHud(dt); if (G.state === 'drive' && G.lv.race) updateGoals(dt);
  if (G.state === 'arrive') { G.arriveT += dt; if (G.arriveT > 3.6 && !G.resultsShown) { G.resultsShown = true; results(); } }
}

// ---------------- the start of a ride: the passenger walks to the taxi and gets in ----------------
function intro(dt) {   // a 3-2-1 on the start line; the client (or the race) says hello
  G.introT += dt; const t = G.introT, J = G.lv.J;
  if (!G.cardShown) { G.cardShown = true; if (G.lv.race) banner('🏁 MAD RACE!', 'Beat 3 crazy rivals to the finish · watch your ⛽', 2.2); else { banner(J.ico + ' ' + J.title, J.tip, 2.4); setTimeout(() => G.state === 'intro' && say(G.lv.P.intro, 'happy'), 300); } }
  const c = 3 - Math.floor((t - 1.4) / 0.6); if (t > 1.4 && c >= 1 && G.cd !== c) { G.cd = c; banner(String(c), '', 0.5); sfx('beep'); }
  if (t > 3.2) { G.cd = 0; startDrive(); }
}
function startDrive() { G.state = 'drive'; Engine.start(); banner('GO!', 'GAS ▶ faster · BRAKE ◀ slower', 0.9); sfx('go'); vib(30); }
function walkerMove() { }
function walkerMoveOld(dt) { const w = G.walker; if (w.clip === 'walk') { w.position.x = damp(w.position.x, G.me.x - 1.2, 2.2, dt); w.position.z = damp(w.position.z, G.me.z, 2.2, dt); w.position.y = damp(w.position.y, 0, 4, dt); w.rotation.y = Math.atan2(G.me.x - 1.2 - w.position.x, G.me.z - w.position.z) || PI / 2; } }
// ---------------- the end of a ride ----------------
function raceTick(dt) { const M = G.M, R = G.me; M.fuel = Math.max(0, M.fuel - dt * (1.0 + (R.gas ? 0.7 : 0) + (R.turbo > 0 ? 2.5 : 0)));
  if (M.fuel < 22 && M.fuel > 0) { M.lowT -= dt; if (M.lowT <= 0) { M.lowT = 1.5; sfx('beep'); showHint('⛽ LOW FUEL! Grab red cans or stop at a PETROL PUMP!'); } }
  if (M.fuel <= 0 && !M.out) { M.out = true; M.outT = 0; sfx('sputter'); banner('⛽ OUT OF FUEL!', 'Rolling…', 1.2); } if (M.out) { M.outT += dt; if (M.fuel > 0) M.out = false; else if (R.speed < 0.6 || M.outT > 5) arrive(false, 'Out of fuel!'); } }
function checkArrive() {
  const R = G.me, L = G.lv.L, d = R.z + L;
  if (d < 0) { if (G.lv.race) arrive(true); else if (G.lv.job === 'thief') fail('The thief got away with the samosas!'); else arrive(G.M.have >= G.M.need, 'Not enough ' + G.lv.J.unit + ': ' + G.M.have + ' / ' + G.M.need); }
}
function arrive(ok, why = '') {
  if (G.state !== 'drive') return; const M = G.M; M.done = true; G.state = 'arrive'; G.arriveT = 0; Engine.stop(); $('hint').classList.add('hidden'); gasOn(false); brakeOn(false); hornUp();
  G.result = { ok, why, pos: G.lv.race ? (ok ? racePos() : 4) : 0 };
  const conf = () => { for (let i = 0; i < 5; i++) setTimeout(() => puff(_p.set(G.me.x + rnd(-4, 2), rnd(4, 7), G.me.z + rnd(-3, 3)), 16, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0], speed: 5, life: 1.2, size: 0.4 }), i * 300); };
  if (G.lv.race) { const p = G.result.pos; if (ok) { sfx(p === 1 ? 'fanfare' : 'gateGood'); music('win'); banner(['', '🥇 YOU WIN!', '🥈 2ND PLACE!', '🥉 3RD PLACE!', '4TH PLACE…'][p], 'Score: ' + G.coins, 2.4); if (p <= 3) conf(); } else { sfx('sad'); banner('⛽ OUT OF FUEL!', 'Did not finish', 2.2); } return; }
  if (ok) { sfx('fanfare'); sfx('crowd', 0.3); music('win'); banner('🎉 JOB DONE!', '⭐'.repeat(jobStars()) + '  ' + M.have + ' ' + G.lv.J.unit, 2.4); say(G.lv.P.win, 'laugh'); conf(); }
  else { sfx('sad'); banner('😤 JOB FAILED', why, 2.6); say(G.lv.P.lose, 'angry'); vib(120); }
}
function fail(why) { arrive(false, why); }
// ---------------- HUD ----------------
let hudN = 0;
const MOODE = ['😡', '😠', '😟', '🙂', '😀', '🤩'];
function nextPump() { const z = G.me.z, P = G.objs.filter(o => o.t === 'pump' && o.z < z + 5).sort((a, b) => b.z - a.z)[0]; return P ? Math.max(0, Math.round(z - P.z)) + ' m' : '—'; }
function updateHud() {
  if (!G.M || $('hud').classList.contains('hidden')) return; const M = G.M, R = G.me;
  $('coinN').textContent = G.coins; $('kmh').textContent = Math.round(R.speed * 3.6);
  $('turboB').style.setProperty('--p', Math.round(G.turbo * 100)); $('turboB').classList.toggle('ready', G.turbo >= 0.33); $('turboN').textContent = Math.floor(G.turbo / 0.33 + 0.001);
  if ((hudN++ & 3) === 0) {
    const toGo = Math.max(0, Math.round(R.z + G.lv.L));
    if (G.lv.race) { $('moodFill').style.width = M.fuel + '%'; $('moodE').textContent = M.fuel < 22 ? '⚠️' : '⛽'; $('moodBox').classList.toggle('low', M.fuel < 22); $('goal').textContent = '🏁 POSITION ' + racePos() + ' / 4'; $('goal').classList.toggle('warn', racePos() > 1); }
    else { const J = G.lv.J, st = jobStars(); $('moodFill').style.width = Math.min(100, M.have / M.need * 100) + '%'; $('moodE').textContent = M.have >= M.need ? '⭐'.repeat(Math.max(1, st)) : J.ico; $('moodBox').classList.remove('low'); $('goal').textContent = J.ico + ' ' + M.have + ' / ' + M.need + ' ' + J.unit + (M.passed ? ' ✅' : ''); $('goal').classList.toggle('warn', !M.passed && toGo < 500); }
    $('dist').textContent = G.police && !G.police.leaving ? '🚨 POLICE ' + Math.max(0, Math.round(G.police.z - R.z)) + ' m behind — ESCAPE!' : G.lv.race ? '🏁 ' + toGo + ' m to go · ⛽ ' + Math.round(M.fuel) + '% · pump in ' + nextPump() : G.lv.job === 'thief' && G.thief ? '🦹 Thief ' + Math.max(0, Math.round(R.z - G.thief.z)) + ' m ahead · 🏁 ' + toGo + ' m' : '🏁 ' + toGo + ' m to the finish';
  }
  if ((hudN & 7) === 0 && bubbleT > 0) { drawFace(faceCv, G.bLook || G.lv.P.look, M.expr || 'happy', G.t, true); $('bubbleFace').getContext('2d').drawImage(faceCv, 0, 0); }
}

// ---------------- results, garage ----------------
function stars() { const m = G.M.mood; return m > 80 ? 5 : m > 60 ? 4 : m > 40 ? 3 : m > 20 ? 2 : 1; }
function raceResults() {
  const k = G.lv.stage, p = G.result.pos, prize = [0, 800, 450, 250, 120][p] || 0, total = Math.max(0, prize + G.coins - G.fines), best = PF.may[k] || 9, nb = p < best;
  if (nb) PF.may[k] = p; PF.coins += total; PF.save(); TRIAL = null;
  openModal(`<h2>${['', '🥇 YOU WIN!', '🥈 2ND PLACE', '🥉 3RD PLACE', '🏁 4TH PLACE'][p] || '⛽ DID NOT FINISH'}</h2><p class="tip">🏁 MAD RACE · ${G.lv.S.name}${nb && p < 9 ? ' · <b>NEW BEST!</b>' : ''}</p>
    <div class="stat"><span>🏆 Prize</span><b>${prize}</b></div><div class="stat"><span>💥 Crash score</span><b>${G.coins}</b></div><div class="stat"><span>🚗 Cars launched</span><b>${G.launched}</b></div><div class="stat"><span>✅ Crash goals</span><b>${G.goalsDone}</b></div><div class="stat"><span>🔥 Best MASTI combo</span><b>x${G.best}</b></div>
    ${G.fines ? `<div class="stat"><span>🚓 Police challan</span><b>-${G.fines}</b></div>` : ''}<div class="big" id="totalB">+${total} 🪙</div>
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE 🪙</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">RACE AGAIN ↻</button></div><div class="row"><button class="btn small" id="stB">🗺️ STAGES</button><button class="btn small" id="garB">🔧 GARAGE</button><button class="btn small" id="homeB">HOME</button></div>`);
  wireResults(total, () => play(G.lv.n, true));
}
function wireResults(total, again) {
  if ($('dblB')) $('dblB').onclick = () => { sfx('pop'); rewardAd('double', r => { if (!r) return; PF.coins += total; PF.save(); $('totalB').textContent = '+' + total * 2 + ' 🪙'; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { sfx('pop'); again(); };
  $('stB').onclick = () => { sfx('pop'); goHome(); stages(); };
  $('garB').onclick = () => { sfx('pop'); goHome(); garage('cars'); };
  $('homeB').onclick = () => { sfx('pop'); goHome(); };
}
function results() {
  if (G.lv.race) { raceResults(); return; }
  const P = G.lv.P, J = G.lv.J, M = G.M, ok = G.result.ok, st = ok ? jobStars() : 0, pay = ok ? 120 + G.lv.n * 10 + st * 60 : 20, total = Math.max(0, pay + G.coins - G.fines);
  PF.coins += total; if (ok) { PF.level = Math.max(PF.level, G.lv.n + 1); PF.rides++; PF.stars += st; PF.jobStars = PF.jobStars || {}; PF.jobStars[G.lv.n] = Math.max(PF.jobStars[G.lv.n] || 0, st); } PF.save(); TRIAL = null;
  const nextP = PASS[G.lv.n % PASS.length], nextJ = JOBS[nextP.job];
  openModal(`<h2>${ok ? (st >= 3 ? '🤩 SUPERSTAR!' : '🎉 JOB DONE!') : '😤 JOB FAILED'}</h2>${ok ? `<div class="stars">${[0, 1, 2].map(i => `<i class="${i < st ? 'on' : ''}">⭐</i>`).join('')}</div>` : `<p class="tip">${G.result.why}</p>`}
    <div class="review"><div class="who"><canvas id="revFace" width="64" height="64"></canvas><b>${P.name}</b></div>“${ok ? P.reviews[3 - st] : P.lose}”</div>
    <div class="stat"><span>${J.ico} ${J.title}</span><b>${M.have} / ${M.need}</b></div><div class="stat"><span>💼 Job pay</span><b>${pay}</b></div><div class="stat"><span>🪙 Coins, smashes & stunts</span><b>${G.coins}</b></div><div class="stat"><span>🚗 Cars launched</span><b>${G.launched}</b></div>
    ${G.fines ? `<div class="stat"><span>🚓 Police challan</span><b>-${G.fines}</b></div>` : ''}<div class="big" id="totalB">+${total} 🪙</div>${ok ? `<p class="tip">Next job: <b>${nextJ.ico} ${nextJ.title}</b> · ${STAGES[STAGE_OF[nextP.id]].name}</p>` : ''}
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE 🪙</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">${ok ? 'NEXT JOB ▶' : 'TRY AGAIN ↻'}</button></div><div class="row"><button class="btn small" id="stB">🗺️ STAGES</button><button class="btn small" id="garB">🔧 GARAGE</button><button class="btn small" id="homeB">HOME</button></div>`);
  drawFace($('revFace'), P.look, ok ? (st >= 2 ? 'laugh' : 'calm') : 'angry', 0, false);
  wireResults(total, () => play(ok ? G.lv.n + 1 : G.lv.n));
}
function nextUnlock() { if (G.lv.n % 2) return null; const c = CARS.find(v => !PF.cars.includes(v.id)); return c && PF.coins < c.price ? c : null; }
let gTab = 'cars', gCar = null;
const hex = c => '#' + (c >>> 0).toString(16).padStart(6, '0');
const bar = (v, lo, hi) => `<i class="bar"><u style="width:${Math.round(clamp((v - lo) / (hi - lo), 0.08, 1) * 100)}%"></u></i>`;
const coins = n => n.toLocaleString('en-IN') + ' 🪙';
function showCar(id) { if (!G.me) return; const x = G.me.x, z = G.me.z; scene.remove(G.me.V.obj); const keep = PF.car; PF.car = id; G.me = makeMe(); PF.car = keep; G.me.x = x; G.me.z = z; G.me.V.obj.position.set(x, 0, z); }
const LISTS = { p: PAINTS, r: RIMS, s: STRIPES, d: DECALS, o: ROOFS, t: TINTS };
const itemPrice = k => k[0] === 'x' ? EXTRAS.find(q => q.k === k[1]).p : LISTS[k[0]][+k.slice(1)].p;
const owns = k => PF.own.includes(k) || itemPrice(k) === 0;
function garage(tab) {
  if (tab) gTab = tab; if (G.state !== 'home') return; gCar = gCar || PF.car; G.garage = true; $('home').classList.add('hidden'); if (G.walker) G.walker.visible = false;
  const id = gCar, C = CARS.find(c => c.id === id), owned = PF.cars.includes(id), U = cust(id), canAd = adReady(), store = storeReady();
  const btn = (key, on) => on ? '<button class="btn small" disabled>✔ ON</button>' : owns(key) ? `<button class="btn small blue" data-use="${key}">USE</button>` : `<button class="btn small green" data-buy="${key}" ${PF.coins < itemPrice(key) ? 'disabled' : ''}>${coins(itemPrice(key))}</button>${canAd ? `<button class="btn small try" data-try="${key}">📺 TRY</button>` : ''}`;
  const row = (ico, name, sub, b, sel) => `<div class="item ${sel ? 'sel' : ''}"><div class="ico">${ico}</div><div class="txt"><b>${name}</b><span>${sub}</span></div><div class="bt">${b}</div></div>`;
  const sw = (key, c, name, on) => `<div class="sw ${on ? 'on' : ''}" data-${owns(key) ? 'use' : 'buy'}="${key}" style="--c:${hex(c)}"><i></i><b>${name}</b><span>${on ? '✔ ON' : owns(key) ? 'USE' : coins(itemPrice(key))}</span>${!owns(key) && canAd ? `<em data-try="${key}">📺</em>` : ''}</div>`;
  const tabs = [['cars', '🚗 CARS'], ['paint', '🎨 PAINT'], ['rims', '🛞 WHEELS'], ['style', '✨ STYLE'], ['extra', '🔥 EXTRAS'], ['eng', '⚙️ ENGINE'], ['horn', '📯 HORN']];
  let body = '';
  if (gTab === 'cars') body = CARS.map(v => { const own = PF.cars.includes(v.id), on = PF.car === v.id, iap = store && v.price ? storePrice('car_' + v.id) : '';
    return `<div class="item ${v.id === id ? 'sel' : ''}" data-pick="${v.id}"><div class="ico">${v.ico}</div><div class="txt"><b>${v.name}</b><span>${v.about}</span><span class="st">SPEED ${bar(v.sp, 0.75, 1.2)} ACCEL ${bar(v.acc, 0.8, 1.5)}<br>GRIP ${bar(v.grip, 0.8, 1.4)} CRASH ${bar(v.crash, 0.7, 2.2)}</span></div><div class="bt">${on ? '<button class="btn small" disabled>✔ ON</button>' : own ? `<button class="btn small blue" data-car="${v.id}">USE</button>` : `<button class="btn small green" data-buyc="${v.id}" ${PF.coins < v.price ? 'disabled' : ''}>${coins(v.price)}</button>${iap ? `<button class="btn small gold" data-iap="car_${v.id}">${iap}</button>` : ''}`}</div></div>`; }).join('');
  else if (!owned) body = `<p class="tip">🔒 Get the <b>${C.name}</b> first (CARS tab) to customise it.</p>`;
  else if (gTab === 'paint') body = '<div class="swatches">' + PAINTS.map((q, i) => sw('p' + i, q.c ?? C.col, q.n, U.p === i)).join('') + '</div>';
  else if (gTab === 'rims') body = RIMS.map((q, i) => row('🛞', q.n, i ? '' : 'Comes with this car', btn('r' + i, U.r === i))).join('');
  else if (gTab === 'style') body = '<h4>🏁 Racing stripes</h4><div class="swatches">' + STRIPES.map((q, i) => sw('s' + i, q.c ?? 0xdddddd, q.n, U.s === i)).join('') + '</div>'
    + '<h4>🔥 Side decals</h4>' + DECALS.map((q, i) => row(q.ico, q.n, '', btn('d' + i, U.d === i))).join('')
    + '<h4>🧳 On the roof</h4>' + ROOFS.map((q, i) => row(q.ico, q.n, '', btn('o' + i, U.o === i))).join('')
    + '<h4>🕶️ Window tint</h4><div class="swatches">' + TINTS.map((q, i) => sw('t' + i, q.c ?? 0x6a8aa8, q.n, U.t === i)).join('') + '</div>';
  else if (gTab === 'extra') body = EXTRAS.map(q => { const own = owns('x' + q.k), on = !!U[q.k]; return row(q.ico, q.n, q.d, own ? `<button class="btn small ${on ? '' : 'blue'}" data-tog="${q.k}">${on ? (q.k === 'n' ? 'COLOUR' : 'OFF') : 'ON'}</button>${on && q.k === 'n' ? '<button class="btn small" data-tog="n0">OFF</button>' : ''}` : `<button class="btn small green" data-buy="x${q.k}" ${PF.coins < q.p ? 'disabled' : ''}>${coins(q.p)}</button>${canAd ? `<button class="btn small try" data-try="x${q.k}">📺 TRY</button>` : ''}`); }).join('');
  else if (gTab === 'eng') body = ENG.map((q, i) => { const have = engLv(id), own = i <= have; return row(q.ico, q.n + ' engine', i ? `+${Math.round(q.sp * 100)}% top speed · +${Math.round(q.acc * 100)}% acceleration` : 'Factory engine', own ? `<button class="btn small" disabled>${i === have ? '✔ ON' : '✔'}</button>` : i === have + 1 ? `<button class="btn small green" data-eng="${i}" ${PF.coins < q.p ? 'disabled' : ''}>${coins(q.p)}</button>` : '<button class="btn small" disabled>🔒</button>'); }).join('') + '<p class="tip">Engines are fitted to <b>this car</b>. Control your speed with the GAS and BRAKE pedals while driving.</p>';
  else if (gTab === 'horn') body = HORNS.map(h => { const own = PF.horns.includes(h.k), on = PF.horn === h.k; return row(`<span data-listen="${h.k}">${h.ico}</span>`, h.n, `<a data-listen="${h.k}">▶ listen</a>${h.k === 'own' ? ' · ' + C.name : ''}`, on ? '<button class="btn small" disabled>✔ ON</button>' : own ? `<button class="btn small blue" data-horn="${h.k}">USE</button>` : `<button class="btn small green" data-horn="${h.k}" ${PF.coins < h.p ? 'disabled' : ''}>${coins(h.p)}</button>`); }).join('');
  const adOk = canAd && Date.now() > (PF.adT || 0);
  openModal(`<div class="gtop"><b>${C.ico} ${C.name}</b><span class="pill out">${coins(PF.coins)}</span></div><div class="grow">${adOk ? '<button class="btn small blue" id="adCoins">📺 FREE 500 🪙</button>' : ''}<button class="btn small gold" id="shopB2">🛒 GET COINS</button></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === gTab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><div class="gbody">${body}</div><div class="row"><button class="btn green" id="closeB">DONE ✔</button></div>`);
  $('modal').classList.add('sheet');
  const redo = () => { showCar(gCar); garage(); };
  const setC = (key, val) => { const c = PF.cust[id] = { ...(PF.cust[id] || {}) }; c[key] = val; PF.save(); };
  const apply = k => { if (k[0] === 'x') setC(k[1], 1); else setC(k[0], +k.slice(1)); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { sfx('pop'); garage(b.dataset.tab); });
  document.querySelectorAll('[data-pick]').forEach(b => b.onclick = e => { if (e.target.closest('button')) return; sfx('pop'); gCar = b.dataset.pick; redo(); });
  document.querySelectorAll('[data-car]').forEach(b => b.onclick = () => { sfx('pop'); PF.car = gCar = b.dataset.car; PF.save(); redo(); });
  document.querySelectorAll('[data-buyc]').forEach(b => b.onclick = () => { const v = CARS.find(q => q.id === b.dataset.buyc); if (PF.coins < v.price) return; PF.coins -= v.price; PF.cars.push(v.id); PF.car = gCar = v.id; PF.save(); sfx('kaching'); sfx('fanfare', 0.1); redo(); });
  document.querySelectorAll('[data-iap]').forEach(b => b.onclick = () => { sfx('pop'); storeBuy(b.dataset.iap); });
  document.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { sfx('pop'); apply(b.dataset.use); redo(); });
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = e => { if (e.target.dataset.try) return; const k = b.dataset.buy, pr = itemPrice(k); if (PF.coins < pr) { sfx('gateBad'); return; } PF.coins -= pr; PF.own.push(k); apply(k); PF.save(); sfx('kaching'); redo(); });
  document.querySelectorAll('[data-try]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.try; sfx('pop'); rewardAd('try', ok => { if (!ok) return; TRIAL = { car: id, k: k[0] === 'x' ? k[1] : k[0], v: k[0] === 'x' ? 1 : +k.slice(1) }; banner('📺 TRY IT!', 'Free for your next ride', 1.4); redo(); }); });
  document.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { sfx('pop'); const k = b.dataset.tog; if (k === 'n0') setC('n', 0); else if (k === 'n') setC('n', U.n ? U.n % NEONS.length + 1 : 1); else setC(k, U[k] ? 0 : 1); redo(); });
  document.querySelectorAll('[data-eng]').forEach(b => b.onclick = () => { const i = +b.dataset.eng; if (PF.coins < ENG[i].p) return; PF.coins -= ENG[i].p; PF.eng[id] = i; PF.save(); sfx('kaching'); sfx('nitro', 0.1); garage(); });
  document.querySelectorAll('[data-horn]').forEach(b => b.onclick = () => { const h = HORNS.find(q => q.k === b.dataset.horn); if (!PF.horns.includes(h.k)) { if (PF.coins < h.p) return; PF.coins -= h.p; PF.horns.push(h.k); sfx('kaching'); } PF.horn = h.k; PF.save(); listenHorn(h.k); garage(); });
  document.querySelectorAll('[data-listen]').forEach(b => b.onclick = () => listenHorn(b.dataset.listen));
  if ($('adCoins')) $('adCoins').onclick = () => { sfx('pop'); rewardAd('coins', ok => { if (!ok) return; PF.coins += 500; PF.adT = Date.now() + 3 * 60e3; PF.save(); sfx('fanfare'); garage(); }); };
  $('shopB2').onclick = () => { sfx('pop'); shop(() => garage()); };
  $('closeB').onclick = () => { sfx('pop'); closeGarage(); };
}
function listenHorn(k) { Audio.resume(); const ctx = Audio.H.ctx; if (!ctx || !PF.set.sound) return; const kind = k === 'own' ? (CARS.find(c => c.id === gCar) || carSpec()).horn : k; hornVoice(kind, ctx.currentTime + 0.02, 0.8); }
// ---------------- the shop: coin packs (and cars) for real money, through Google Play ----------------
const PACKS = [{ id: 'coins_25k', n: 25000, ico: '💰', name: 'Bag of coins' }, { id: 'coins_80k', n: 80000, ico: '💰💰', name: 'Big bag of coins' }, { id: 'coins_200k', n: 200000, ico: '🏦', name: 'Coin bank' }, { id: 'vip_allcars', n: 0, ico: '👑', name: 'VIP: ALL 7 cars, forever' }];
const NAT = window.GameNative;
function storeReady() { try { return !!(NAT && NAT.billingReady && NAT.billingReady()); } catch (e) { return false; } }
function storePrice(id) { try { return JSON.parse(NAT.prices() || '{}')[id] || ''; } catch (e) { return ''; } }
function storeBuy(id) { try { NAT.buy(id); } catch (e) { /* not in the app */ } }
function syncStore() {   // what the player bought (also restores cars after a reinstall)
  if (!NAT || !NAT.owned) return;
  try {
    const own = JSON.parse(NAT.owned() || '[]'); let got = [];
    for (const p of own) { const ids = p === 'vip_allcars' ? CARS.map(c => c.id) : [p.replace(/^car_/, '')]; for (const id of ids) if (CARS.some(c => c.id === id) && !PF.cars.includes(id)) { PF.cars.push(id); got.push(id); } }
    const n = NAT.takeCoins ? +NAT.takeCoins() : 0; if (n > 0) { PF.coins += n; sfx('kaching'); banner('🪙 +' + n.toLocaleString('en-IN'), 'Thank you for supporting us!', 1.8); }
    if (got.length) { sfx('fanfare'); banner('🎉 NEW IN YOUR GARAGE', got.map(id => CARS.find(c => c.id === id).name).join(', '), 2); }
    if (n > 0 || got.length) { PF.save(); if (G.garage) garage(); else if (G.state === 'home') refreshHome(); }
  } catch (e) { /* ignore */ }
}
window.onStore = () => syncStore();
function shop(back) {
  const ok = storeReady(), canAd = adReady() && Date.now() > (PF.adT || 0);
  const rows = PACKS.map(q => { const pr = ok ? storePrice(q.id) : ''; return `<div class="item"><div class="ico">${q.ico}</div><div class="txt"><b>${q.n ? coins(q.n) : q.name}</b><span>${q.n ? q.name : 'Every car unlocked, including future ones'}</span></div><div class="bt">${pr ? `<button class="btn small gold" data-iap="${q.id}">${pr}</button>` : '<button class="btn small" disabled>—</button>'}</div></div>`; }).join('');
  openModal(`<h2>🛒 SHOP</h2><p>You have <b>${coins(PF.coins)}</b></p>${canAd ? '<div class="row"><button class="btn blue" id="adC">📺 Watch an ad: FREE 500 🪙</button></div>' : ''}<div class="list">${rows}</div>${ok ? '<p class="tip">Payments are handled safely by Google Play.</p>' : '<p class="tip">Coin packs can be bought in the Google Play version of the game. You can always earn coins by driving, daily gifts and the MAD RACE!</p>'}<div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-iap]').forEach(b => b.onclick = () => { sfx('pop'); storeBuy(b.dataset.iap); });
  if ($('adC')) $('adC').onclick = () => { sfx('pop'); rewardAd('coins', r => { if (!r) return; PF.coins += 500; PF.adT = Date.now() + 3 * 60e3; PF.save(); sfx('fanfare'); shop(back); }); };
  $('closeB').onclick = () => { sfx('pop'); closeModal(); if (back) back(); else refreshHome(); };
}
function closeGarage() { closeModal(); G.garage = false; gCar = null; if (G.me && G.state === 'home') showCar(PF.car); $('home').classList.remove('hidden'); refreshHome(); }
// ---------------- stage select: every place has a JOB and a MAD RACE ----------------
const STAGE_ICO = { bazaar: '🛺', shaadi: '💍', ghat: '⛰️', marine: '🌅', monsoon: '🌧️', stadium: '🏏', cyber: '🏙️', holi: '🎨' };
const rideFor = i => PF.level < i + 1 ? 0 : i + 1 + 8 * Math.floor((PF.level - 1 - i) / 8);
function stages() {
  const cards = PASS.map((P, i) => { const st = STAGE_OF[P.id], S = STAGES[st], J = JOBS[P.job], n = rideFor(i), b = PF.may[st] || 0, js = (PF.jobStars || {})[n] || 0;
    return `<div class="stage" style="--g1:${S.sky[0]};--g2:${S.sky[1]}"><div class="si">${STAGE_ICO[st]}</div><div class="sn"><b>${S.name}</b><span>${J.ico} ${J.title} · ${P.name}</span><span class="ms">${'⭐'.repeat(js) || '☆'} · 🏁 best: ${b ? ['', '🥇', '🥈', '🥉', '4th'][b] || '—' : '—'}</span></div><div class="sb">${n ? `<button class="btn small green" data-ride="${n}">${J.ico} JOB ${n}</button>` : `<button class="btn small" disabled>🔒 JOB ${i + 1}</button>`}<button class="btn small" data-may="${i + 1}">🏁 MAD RACE</button></div></div>`; }).join('');
  openModal(`<h2>🗺️ STAGES</h2><p class="tip">Every place has a crazy <b>JOB</b>, and a <b>MAD RACE</b> against 3 rivals (watch your fuel!)</p><div class="stages">${cards}</div><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-ride]').forEach(b => b.onclick = () => { sfx('pop'); play(+b.dataset.ride); });
  document.querySelectorAll('[data-may]').forEach(b => b.onclick = () => { sfx('pop'); play(+b.dataset.may, true); });
  $('closeB').onclick = () => { sfx('pop'); closeModal(); };
}
// ---------------- screens ----------------
function setScreen(s) { $('home').classList.toggle('hidden', s !== 'home'); $('hud').classList.toggle('hidden', s !== 'hud'); }
function play(n = PF.level, mayhem = false) { closeModal(); G.garage = false; G.resultsShown = false; G.cardShown = false; $('bubble').classList.add('hidden'); if (G.pristine === n + (mayhem ? 'm' : '') && G.state === 'home') { G.me.V.obj.removeFromParent(); G.me = Object.assign(makeMe(), { x: G.me.x, z: G.me.z }); setScreen('hud'); beginRide(); return; } busy(async () => { startLevel(n, true, mayhem); setScreen('hud'); }); }
// heavy work after the screen has shown 'loading' (so a tap never looks frozen)
function busy(f) { const L = $('loading'); L.textContent = '🚕 Loading…'; L.classList.remove('hidden'); requestAnimationFrame(() => requestAnimationFrame(() => { Promise.resolve().then(f).catch(e => console.error(e)).finally(() => L.classList.add('hidden')); })); }
// passengers are loaded only when their ride starts (a much faster start)

function goHome() { closeModal(); Engine.stop(); if (!G.lv) startLevel(PF.level, false); else { G.state = 'home'; G.me.speed = 0; G.me.brake = false; G.me.air = false; G.me.y = 0; G.me.z = Math.min(G.me.z, 0); if (G.police) { scene.remove(G.police.V.obj); G.police = null; } $('combo').classList.add('hidden'); } setScreen('home'); refreshHome(); music('title'); }
function refreshHome() { const P = PASS[(PF.level - 1) % PASS.length]; $('homeCoins').textContent = PF.coins.toLocaleString(); $('carName').textContent = (CARS.find(c => c.id === PF.car) || CARS[0]).ico + ' ' + (CARS.find(c => c.id === PF.car) || CARS[0]).name + ' · ' + ENG[engLv()].n + ' engine'; $('homeLevel').innerHTML = `${JOBS[P.job].ico} JOB ${PF.level}: ${JOBS[P.job].title}<small>${STAGES[STAGE_OF[P.id]].name} · for ${P.name}</small>`; $('giftB').classList.toggle('dot', giftState(PF).can); }
function pause() { if (G.state !== 'drive' && G.state !== 'intro') return; G.paused = G.state; G.state = 'pause'; Engine.stop(); Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { sfx('pop'); closeModal(); resume(); }; $('setB2').onclick = () => settings(); $('homeB').onclick = () => { sfx('pop'); goHome(); }; }
function resume() { G.state = G.paused || 'drive'; if (G.state === 'drive') Engine.start(); music(G.lv.music); }
function settings() { settingsPanel(PF, 'Mad Taxi Masti', 'Characters, animals, nature: Quaternius (CC0) · Road signs and cones: Kenney (CC0) · Cars and streets: BajrangVerse Studios<br>Title and victory music: BajrangVerse Studios<br>Music: "Riley", "Polka Train", "Monkeys Spinning Monkeys", "Fuzzball Parade", "Merry Go" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0', k => { if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : G.lv.music); else Music.stop(); } if (k === 'hi') setQuality(PF.set.hi ? 2 : 0); }, () => { if (G.state === 'pause') resume(); }); }
onAdDone(() => { if (PF.set.music && G.lv) music(G.state === 'home' ? 'title' : G.state === 'arrive' ? 'win' : G.lv.music); });
window.onAppPause = () => { pause(); Engine.stop(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (modalOpen()) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.garage) closeGarage(); else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'drive' || G.state === 'intro') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };
// ---------------- input: drag to steer, hold BRAKE, tap HORN and TURBO ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); drag = { x: e.clientX, y: e.clientY, tx: G.tx, id: e.pointerId, sw: false }; });
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id || G.state !== 'drive') return; const dy = e.clientY - drag.y; if (!drag.sw && dy < -40 && G.me.air) { drag.sw = true; stunt(); return; } G.tx = drag.tx + (e.clientX - drag.x) / Math.min(innerWidth, 500) * 16; });
addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) drag = null; });
const brakeOn = on => { if (G.me) G.me.brake = on; $('brakeB').classList.toggle('on', on); };
const gasOn = on => { if (G.me) G.me.gas = on; $('gasB').classList.toggle('on', on); };
// a held button: pressed while a finger is on it (pointer capture: sliding a little off it does not let go)
function holdButton(el, down, up) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.resume(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* old WebView */ } down(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => up());
  el.addEventListener('contextmenu', e => e.preventDefault());
}
holdButton($('gasB'), () => gasOn(true), () => gasOn(false));
holdButton($('brakeB'), () => brakeOn(true), () => brakeOn(false));
holdButton($('hornB'), () => honk(), () => hornUp());
holdButton($('turboB'), () => useTurbo(), () => {});
holdButton($('throwB'), () => throwIt(), () => {});
addEventListener('keydown', e => { if (e.repeat) return; if (e.key === 'ArrowDown' || e.key === 's') brakeOn(true); if (e.key === 'h') honk(); if (e.key === 't' || e.key === 'Enter') throwIt(); if (e.key === 'ArrowUp' || e.key === 'w') gasOn(true); if (e.key === 'x') stunt(); if (e.key === ' ' || e.key === 'n') useTurbo(); if (e.key === 'ArrowLeft') G.tx -= 3.5; if (e.key === 'ArrowRight') G.tx += 3.5; });
addEventListener('keyup', e => { if (e.key === 'ArrowDown' || e.key === 's') brakeOn(false); if (e.key === 'ArrowUp' || e.key === 'w') gasOn(false); if (e.key === 'h') hornUp(); });
$('playB').onclick = () => { Audio.resume(); sfx('pop'); play(); };
$('garageB').onclick = () => { sfx('pop'); garage('cars'); };
$('stagesB').onclick = () => { sfx('pop'); stages(); };
$('mayhemB').onclick = () => { Audio.resume(); sfx('pop'); play(((PF.level - 1) % 8) + 1, true); };
$('shopB').onclick = () => { sfx('pop'); shop(); };
$('giftB').onclick = () => { sfx('pop'); giftPanel(PF, '🪙', refreshHome); };
$('setB').onclick = () => { sfx('pop'); settings(); };
$('pauseB').onclick = () => { sfx('pop'); pause(); };
document.addEventListener('pointerdown', () => { Audio.resume(); if (G.state === 'home') music('title'); }, { once: true });

// ---------------- camera ----------------
const camP = new THREE.Vector3(0, 6, 12), camL = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3();
function camera(dt) {
  const R = G.me; let k1 = 5, k2 = 7;
  if (G.state === 'home' && G.garage) { const a = G.t * 0.35, r = innerHeight > innerWidth ? 9.5 : 7; tp.set(R.x + Math.sin(a) * r, 3.2, R.z + Math.cos(a) * r); tl.set(R.x, innerHeight > innerWidth ? -2.7 : -1.2, R.z); k1 = 3; k2 = 3; }
  else if (G.state === 'home') { tp.set(R.x + 4.5 + Math.sin(G.t * 0.3) * 1.5, 2.3, R.z - 5.5 + Math.sin(G.t * 0.2)); tl.set(R.x - 0.4, 0.9, R.z + 0.5); k1 = 2; }
  else if (G.state === 'intro') { tp.set(R.x + 6.5, 2.8, R.z - 6.5); tl.set(R.x - 2.2, 1.0, R.z); k1 = 2.5; }
  else if (G.state === 'arrive') { tp.set(R.x + 4.5, 3, R.z + 6.5); tl.set(R.x - 2.5, 1.3, R.z - 1); k1 = 1.8; }
  else { const air = R.air ? Math.min(3, R.y * 0.45) : 0; tp.set(R.x * 0.85, R.y * 0.5 + 4.2 + air, R.z + 9 + air); tl.set(R.x * 0.92, R.y * 0.6 + 1.3, R.z - 10); }
  camP.lerp(tp, 1 - Math.exp(-k1 * dt)); camL.lerp(tl, 1 - Math.exp(-k2 * dt));
  if (G.state === 'drive') { camP.z = tp.z; camL.z = tl.z; }
  const fovT = E.fovBase + (R.turbo > 0 ? 12 : 0) + Math.min(6, R.speed * 0.12); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); cam.lookAt(bendPoint(camL, _q));
  G.track.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(R.x, 0, R.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(_q.set(-8, 22, 10));
}
// ---------------- boot ----------------
const t0 = performance.now(); const BT = window.__bt = []; const T = k => BT.push(k + ':' + Math.round(performance.now() - t0));
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap */ } }
const BOOTL = {}, BOOTS = {};
Promise.all(['people/pedM.bin', 'people/pedF.bin', 'kit.glb.pak', 'nature.glb.pak', 'cow.glb.pak', 'pug.glb.pak', 'horse.glb.pak'].map((f, i, all) => loadBin(f, (a, b) => { BOOTL[f] = a; BOOTS[f] = b || BOOTS[f] || 0; const x = Object.values(BOOTL).reduce((p, q) => p + q, 0); $('loading').textContent = '🚕 Loading… ' + Math.min(99, Math.round(x / 6.4e6 * 100)) + '%'; }))).then(async ([pm, pf, kb, nb, cb, db, hb]) => {
  T('files'); PEOPLE = Object.assign({}, await loadPeople(pm), await loadPeople(pf)); T('people');
  const gl = new GLTFLoader(), K = (await gl.parseAsync(kb, '')).scene, N = (await gl.parseAsync(nb, '')).scene.getObjectByName('nature');
  setKits(K, N); T('kits');
  const cow = await gl.parseAsync(cb, ''); COW = { scene: cow.scene, anims: cow.animations, s: animalScale(cow.scene, 1.6) };
  const pug = await gl.parseAsync(db, ''); PUG = { scene: pug.scene, anims: pug.animations, s: animalScale(pug.scene, 0.6) };
  const hor = await gl.parseAsync(hb, ''); HORSE = { scene: hor.scene, anims: hor.animations, s: animalScale(hor.scene, 2.0) };
  blobs = new Blobs(scene, dotTex, 90); crowdM = new Crowd(scene, PEOPLE.pedM); crowdF = new Crowd(scene, PEOPLE.pedF); crowdM.prewarm(16); crowdF.prewarm(16); T('animals+crowd');
  if (Q.get('level')) PF.level = +Q.get('level');
  placeCabFrame(); startLevel(PF.level, false); T('level'); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  syncStore(); Music.warm(['title', 'drive', 'win']);
  // the other places' shaders are prepared a moment after the home screen shows (not while the player waits)
  setTimeout(() => { if (G.state !== 'home') return; const W = warmMeshes(); W.forEach(m => scene.add(m)); try { renderer.compile(scene, cam); } catch (e) { /* not needed */ } W.forEach(m => scene.remove(m)); }, 1500);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  startLoop({ update, camera, active: () => G.state === 'drive', frozen: () => G.state === 'load' || G.state === 'pause' });
  if (Q.get('play')) play();
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; console.error(e); });
window.__gas = gasOn; window.__throw = throwIt; window.__hv = hornVoice; window.__A = Audio; window.__CARS = CARS; window.__hornUp = hornUp; window.__task = task; window.__G = G; window.__garage = garage; window.__stages = stages; window.__PF = PF; window.__start = startLevel; window.__play = play; window.__honk = honk; window.__turbo = useTurbo; window.__brake = brakeOn; window.__stunt = stunt; window.__police = callPolice; window.__places = () => [G.state, Math.round(G.me.z), G.M && Math.round(G.M.mood)];
