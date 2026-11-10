// MAD TAXI MASTI — by BajrangVerse Studios
// Drive a real Mumbai kaali-peeli taxi through eight crazy Indian places, each with a crazy passenger who belongs
// there: a groom late for his own wedding down a glittering Shaadi Street, Dadi Ji with twelve eggs through the old
// bazaar, a sleeping uncle on the mountain ghat highway, an influencer on Marine Drive at sunset, a detective aunty
// chasing a thief through the monsoon, a cricket fan on stadium road, a boss in the glass Cyber City, a kid at the Holi
// festival. Smash fruit carts and pots for MASTI combos, fly off ramps over the traffic, grab the mega horn, the magnet
// and the bumper shield, honk the cows away, and if you smash too much — the police come after you! Drag to steer,
// hold BRAKE, tap HORN and TURBO. The back-seat camera shows your passenger's face live. Stop in the green zone.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { setBend, bendPoint, canvasTex, flat, mesh, oneMesh } from '../common/gfx.js';
import { renderer, scene, cam, hemi, sun, rim, E, $, Q, PI, clamp, damp, rnd, pick, puff, popText, banner, flash, startLoop, loadBin, setQuality, fling, clearFx, clearPops, warmRing, dotTex } from '../common/engine.js';
import { setKits, kit } from '../common/track.js';
import { buildStreet, STAGES, cart, ferris, marigoldArch, billboard, fanStand, glow, bulb, mergeBulbs } from '../common/street.js';
import { makeCar, spinWheels } from '../common/cars.js';
import { loadPeople, Actor, Crowd, Blobs, EXPR } from '../common/people.js';
import { drawFace } from '../common/portrait.js';
import { Audio } from '../common/audio.js';
import { Music } from '../common/music.js';
import { Engine } from '../common/sfx.js';
import { makePrefs, openModal, closeModal, modalOpen, onAdDone, adReady, rewardAd, betweenLevels, vibrate, settingsPanel, giftPanel, giftState } from '../common/ui.js';

const PF = makePrefs('madtaxi_v2', { level: 1, coins: 0, cars: ['kaalipeeli'], car: 'kaalipeeli', horns: [0], horn: 0, rides: 0, stars: 0, gift: null, set: { sound: true, music: true, vib: true, hi: true } });
setQuality(PF.set.hi ? 2 : 0); Audio.setMuted(!PF.set.sound);
Music.config({ title: 'bv_title', drive: 'riley', drive2: 'polka', drive3: 'monkeys', chase: 'fuzzball', win: 'bv_win', happy: 'merry_go' }, { bv_title: 0.95, bv_win: 1, riley: 0.7, polka: 0.7, monkeys: 0.7, fuzzball: 0.75, merry_go: 0.75 });
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
E.onSfx = n => sfxT(n, 0.05);
const vib = ms => vibrate(PF, ms);
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
// a police siren and a crowd "wah!" (made from oscillators, no sound files)
{ const H = Audio.H; Audio.extend({ siren(t) { for (let i = 0; i < 2; i++) { const o = H.osc('square', 700, t + i * 0.6, 0.6, 0.05); o.frequency.linearRampToValueAtTime(1050, t + i * 0.6 + 0.3); o.frequency.linearRampToValueAtTime(700, t + i * 0.6 + 0.6); } }, smash(t) { H.noise(t, 0.35, 0.6, 'bandpass', 1800, 600, 1.2); for (let i = 0; i < 6; i++) H.noise(t + Math.random() * 0.2, 0.06, 0.3, 'highpass', 2500 + Math.random() * 2000); const o = H.osc('sine', 160, t, 0.2, 0.4); o.frequency.exponentialRampToValueAtTime(60, t + 0.18); } }); }

// ---------------- taxis and horns ----------------
const CARS = [
  { id: 'kaalipeeli', type: 'padmini', livery: 'kaalipeeli', name: 'Kaali-Peeli Classic', price: 0, sp: 1, soft: 1 },
  { id: 'coolcab', type: 'sedan', livery: 'coolcab', name: 'Cool Cab', price: 700, sp: 1.04, soft: 0.8 },
  { id: 'ecab', type: 'hatch', livery: 'ecab', name: 'Electric E-Cab', price: 1400, sp: 1.06, soft: 0.9 },
  { id: 'suvcab', type: 'suv', col: 0xffd21a, name: 'Bump-Proof SUV Cab', price: 2400, sp: 1.06, soft: 0.5 },
  { id: 'sportscab', type: 'sports', col: 0xff3a6a, name: 'Speedy Sports Cab', price: 3800, sp: 1.13, soft: 0.85 },
  { id: 'goldcab', type: 'sedan', col: 0xffc21a, name: 'Golden Maharaja Cab', price: 6500, sp: 1.18, soft: 0.6 }];
const HORNS = [{ k: 0, name: 'Classic Peep-Peep', price: 0 }, { k: 2, name: 'Tiny Toot', price: 250 }, { k: 3, name: 'Truck POM-POM', price: 500 }, { k: 1, name: 'Party Tune', price: 900 }];
const carSpec = () => CARS.find(c => c.id === PF.car) || CARS[0];

// ---------------- the passengers ----------------
// look: the cartoon face in the HUD; tint/skin/hair: the 3D person; f0/fk: voice. Each has a mission (see MISSIONS).
const PASS = [
  { id: 'groom', name: 'Dulha Raju', m: 'late', place: '💍 SHAADI HALL', tint: 0xf2dfb0, skin: 0xb97a52, hair: 0x1a1210, look: { skin: 0xb97a52, hair: 0x1a1210, style: 'turban', hat: 0xd83a2a, tache: 1 }, f0: 150, fk: 0.95,
    intro: 'Bhaiya! My WEDDING starts soon! FAST, FAST!', task: 'Reach the wedding before time runs out!', happy: ['Yes! Faster!', 'TURBO bhaiya, TURBO!', 'The pandit is waiting!', 'Wheee! I am the fastest groom!'], sad: ['Arre, my bride will marry someone else!', 'Why so slow?!', 'Even my granny walks faster!'],
    hurt: ['My sherwani!', 'Careful! I am getting MARRIED!', 'My turban!'], cow: ['Cow ji, please move, it is my wedding!'], win: 'I made it! You are invited to the dinner!', lose: 'The wedding started without me… 😭',
    reviews: ['Reached before the pandit! Best driver in India! Invite to every wedding!', 'Fast and fun. My turban survived!', 'Reached… barely. My bride gave me THE look.', 'Too slow. I danced alone at my own baraat.'] },
  { id: 'granny', name: 'Dadi Ji', m: 'eggs', place: '🏠 DADI\'S HOUSE', tint: 0x8a3ab0, skin: 0xd8a070, hair: 0xd8d8d8, look: { skin: 0xd8a070, hair: 0xd8d8d8, style: 'buns', glasses: 1, bindi: 1 }, f0: 250, fk: 1.12,
    intro: 'Beta, drive slowly. I have TWELVE eggs!', task: 'Drive smooth! Slow down for bumps. Save the eggs!', happy: ['Jeete raho beta!', 'So smooth, like butter!', 'Good boy, good driving!'], sad: ['Slow down beta, SLOW!', 'Hai Ram! Too fast!', 'Are you a racing driver?!'],
    hurt: ['My EGGS!', 'Omelette in my lap!', 'Hai hai, my back!'], cow: ['Gau mata! Let her pass, beta.'], win: 'Bless you beta! Come, eat laddoo!', lose: 'All my eggs! Scrambled! I am calling your mother!',
    reviews: ['Smooth like my kheer. Every egg safe. God bless this boy!', 'Good driving. Only a little shaking.', 'Some eggs broke. Some prayers were needed.', 'I am making omelettes from my lap. One star.'] },
  { id: 'uncle', name: 'Sleepy Sharma Uncle', m: 'sleep', place: '🏔️ HILLTOP OFFICE', tint: 0x2a5a8a, skin: 0xc68642, hair: 0x2a2018, look: { skin: 0xc68642, hair: 0x2a2018, style: 'short', tache: 1 }, f0: 110, fk: 0.86,
    intro: 'Yawn… wake me at the office. Don\'t honk. Don\'t bump. Zzz…', task: 'Don\'t wake him! No HORN, no bumps. 3 wake-ups = out!', happy: ['Zzz… mmm… samosa… zzz', 'Zzz…'], sad: ['WHO HONKED?!', 'I WAS DREAMING OF A HOLIDAY!', 'Grrr! Let me sleep!'],
    hurt: ['WHAT?! An earthquake?!', 'Huh?! Who?! Where?!'], cow: [], win: 'Ahh, what a nice nap! Here, a big tip!', lose: 'THAT\'S IT! I\'m awake! I will walk to office!',
    reviews: ['Best nap of my life. Did not even know I was in a taxi!', 'Slept well. One small earthquake.', 'Woke up twice. Grumpy all day.', 'Sleep? In this taxi? Impossible.'] },
  { id: 'influencer', name: 'Insta Pinky', m: 'likes', place: '🌅 SEA FACE CAFE', tint: 0xff4fa8, skin: 0xe0ac69, hair: 0x3a2010, look: { skin: 0xe0ac69, hair: 0x3a2010, style: 'long' }, f0: 280, fk: 1.15,
    intro: 'Hiii guys! LIVE from a taxi! Driver, do STUNTS for my followers!', task: 'Near-misses, TURBO and jumps get LIKES!', happy: ['OMG! So viral!', 'Like and subscribe!', 'My followers LOVE you!', 'Do it again!'], sad: ['Boring! Followers are leaving!', 'This is so not viral…', 'Zero likes. ZERO.'],
    hurt: ['My phone! Did it record that?!', 'OMG my hair!'], cow: ['A cow! Selfie time!'], win: 'You\'re famous now! Tagging you!', lose: 'Unfollow! Un-sub-scribe!',
    reviews: ['10 MILLION views! This driver is a legend!', 'Pretty viral. Would ride again!', 'Some views. Kinda mid.', 'Zero views. My career is over.'] },
  { id: 'detective', name: 'Detective Aunty', m: 'chase', place: '🚓 POLICE STATION', tint: 0x6a4a2a, skin: 0xc68642, hair: 0x1a1210, look: { skin: 0xc68642, hair: 0x1a1210, style: 'buns', glasses: 1, hat: 0x1c1c20, hatTop: 1 }, f0: 230, fk: 1.08,
    intro: 'Follow that car! The thief stole Mrs. Gupta\'s pickle jar!', task: 'Stay close behind the THIEF car to catch him!', happy: ['Closer! Closer!', 'We have him now!', 'Elementary, my dear driver!'], sad: ['He\'s getting away!', 'Faster! Use TURBO!', 'Don\'t lose him!'],
    hurt: ['My magnifying glass!', 'Careful!'], cow: ['Out of the way, cow! Police business!'], win: 'CAUGHT! The pickle is safe! Case closed!', lose: 'He escaped… with the pickle!',
    reviews: ['Caught him in record time! Junior detective material!', 'Good chase. Pickle saved.', 'We caught him… eventually.', 'The pickle is gone forever.'] },
  { id: 'fan', name: 'Cricket Bunty', m: 'runs', place: '🏏 STADIUM', tint: 0x2a5ad8, skin: 0xa86b3c, hair: 0x1a1210, look: { skin: 0xa86b3c, hair: 0x1a1210, style: 'cap', hat: 0x2a5ad8 }, f0: 170, fk: 0.98,
    intro: 'Match is starting! Hit the 4s and 6s on the way, bhai!', task: 'Drive through the 4 and 6 signs to score RUNS!', happy: ['SIXER!', 'What a shot!', 'Chak de!', 'Out of the stadium!'], sad: ['Dot ball… dot ball…', 'Bowled! Nooo!'],
    hurt: ['Howzaaat?!', 'Run out!'], cow: ['Cow on the pitch! Rain delay!'], win: 'We won the match! Free tickets for you!', lose: 'We lost the match… and my voice.',
    reviews: ['Man of the match: my taxi driver!', 'Good innings! Nice runs.', 'A slow test match ride.', 'Duck. Zero. Bowled out.'] },
  { id: 'boss', name: 'Boss Khanna', m: 'call', place: '🏙️ KHANNA TOWER', tint: 0x2a2a30, skin: 0xd8a070, hair: 0x1a1210, look: { skin: 0xd8a070, hair: 0x1a1210, style: 'short', beard: 1 }, f0: 120, fk: 0.9,
    intro: 'Tower. Quickly. And QUIET when I\'m on a call!', task: 'No HORN, no bumps during the 📞 call. Don\'t be slow!', happy: ['Good. Very good.', 'Promotion for you!', 'Excellent driving.'], sad: ['Time is money!', 'You are fired! …oh wait.', 'Hello? Hello?! The line is breaking!'],
    hurt: ['My coffee!', 'My suit!'], cow: ['A COW?! Schedule a meeting with it!'], win: 'Deal closed! Here, a fat tip!', lose: 'Unacceptable! I\'ll take a helicopter!',
    reviews: ['Executive class driving. Hired as my personal driver!', 'Efficient. Professional. Good.', 'Acceptable. Barely.', 'Lost a million-rupee deal. Thanks.'] },
  { id: 'kid', name: 'Little Chintu', m: 'fun', place: '🍦 ICE-CREAM PARLOUR', tint: 0xffc21a, skin: 0xe0ac69, hair: 0x2a1a10, look: { skin: 0xe0ac69, hair: 0x2a1a10, style: 'cap', hat: 0xe8402a }, f0: 330, fk: 1.25,
    intro: 'Uncle uncle! Ice cream! And I want BALLOONS! And HONK!', task: 'Grab balloons and HONK to keep Chintu happy!', happy: ['Hehehe! Again!', 'Weeee!', 'You are the best uncle!', 'Balloon! BALLOON!'], sad: ['I\'m boooored!', 'Are we there yet?', 'Waaah!'],
    hurt: ['Whoa! Again! Again!', 'Hehe, bumpy!'], cow: ['MOO! Hehehe!'], win: 'ICE CREAM! You are my best friend!', lose: 'Waaah! I want my mummy!',
    reviews: ['Best day ever! Balloon! Ice cream! Honk honk!', 'Fun ride! Can we go again?', 'It was okay. A little boring.', 'Waaaah. (Chintu is crying.)'] },
];


// ---------------- the ride: each passenger has a place of their own ----------------
const RW = 14, HALF = RW / 2 - 1.2, LANES = [-5.25, -1.75, 1.75, 5.25];   // India drives on the LEFT: our lanes are x < 0
const STAGE_OF = { groom: 'shaadi', granny: 'bazaar', uncle: 'ghat', influencer: 'marine', detective: 'monsoon', fan: 'stadium', boss: 'cyber', kid: 'holi' };
const SMASH = { bazaar: ['fruit', 'pots', 'boxes', 'veg'], shaadi: ['flowers', 'chairs', 'mithai', 'speakers'], ghat: ['hay', 'crates', 'cans'], marine: ['coco', 'umbrella', 'boxes'], monsoon: ['boxes', 'umbrella', 'drums'], stadium: ['chairs', 'cutout', 'boxes'], cyber: ['boxes', 'cones', 'barrier'], holi: ['colour', 'colour', 'pots', 'balloons'] };
const STOPS = { granny: ['🍬 Mithai shop!', 'Beta, stop! Fresh laddoo!'], boss: ['☕ Coffee stop!', 'Stop. I need my coffee.'], kid: ['🍧 Gola stall!', 'Uncle! Gola! GOLA!'], influencer: ['🤳 Selfie point!', 'Stop! Selfie with the sea!'], fan: ['🏏 Flag stall!', 'Bhai, stop! I need a flag!'] };
const TRAFFIC = { bazaar: ['auto', 'auto', 'auto', 'hatch', 'hatch', 'sedan', 'gypsy'], shaadi: ['sedan', 'suv', 'hatch', 'auto', 'sedan'], ghat: ['truck', 'truck', 'bus', 'suv', 'hatch', 'truck'], marine: ['sedan', 'hatch', 'suv', 'sports', 'bus', 'auto'], monsoon: ['bus', 'auto', 'hatch', 'sedan', 'truck', 'auto'], stadium: ['bus', 'auto', 'hatch', 'suv', 'sedan'], cyber: ['sedan', 'suv', 'sports', 'hatch', 'sedan', 'bus'], holi: ['auto', 'auto', 'hatch', 'sedan', 'bus'] };
const PAINT = [0xf4f4f4, 0xf4f4f4, 0xc0c4c8, 0x8a8e94, 0x1a1a1e, 0xb8202a, 0x1a4a9a, 0x6a1a2a, 0x2a6a4a, 0xd8c8a0];
function makeLevel(n) {
  let seed = n * 4241 + 7; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const P = PASS[(n - 1) % PASS.length], stage = STAGE_OF[P.id], d = Math.min(1, (n - 1) / 24), loop = Math.floor((n - 1) / PASS.length);
  const L = Math.round(Math.min(3400, (P.m === 'chase' ? 2300 : 1900) + n * 45));
  const ev = []; const our = [LANES[0], LANES[1]]; let lastRamp = 0, lastPow = 0;
  for (let z = -110; z > -L + 110; z -= r(26, 38) - d * 6) {
    const pool = ['coins', 'smash', 'smash', 'smash', 'breaker', 'pothole', 'cows', 'turbo', 'cones'];
    if (n >= 2) pool.push('smash', 'dog'); if (stage === 'monsoon') pool.push('puddle', 'puddle'); if (stage === 'shaadi') pool.push('baraat'); if (stage === 'holi') pool.push('colour', 'colour'); if (stage === 'stadium') pool.push('fans'); if (stage === 'marine') pool.push('seawave'); if (stage === 'ghat') pool.push('cows');
    if (P.m === 'runs') pool.push('runs', 'runs', 'runs', 'runs'); if (P.m === 'fun') pool.push('balloon', 'balloon', 'balloon'); if (P.m === 'likes') pool.push('ramp', 'heart');
    let t = pk(pool);
    if (P.m !== 'eggs' && P.m !== 'sleep' && lastRamp - z > 230) { t = 'ramp'; lastRamp = z; }
    else if (lastPow - z > 280) { t = 'power'; lastPow = z; }
    ev.push({ t, z, x: ['cows', 'cones', 'pothole', 'puddle', 'ramp'].includes(t) ? pk(our) : t === 'smash' ? pk([-6.2, 6.2, ...LANES]) : pk(LANES), n: 1 + Math.floor(R() * 2), kind: pk(SMASH[stage]), pow: pk(['magnet', 'mega', 'shield']) });
  }
  if (STOPS[P.id]) ev.push({ t: 'stop', z: Math.round(-L * 0.48), x: LANES[0] });
  const traffic = Math.round(6 + d * 5 + loop), oncoming = Math.round(5 + d * 4 + loop);
  return { n, L, d, P, stage, S: STAGES[stage], ev, traffic, oncoming, music: P.m === 'chase' ? 'chase' : pk(['drive', 'drive2', 'drive3']) };
}
// ---------------- state ----------------
const G = { state: 'load', t: 0, lv: null, track: null, objs: [], cars: [], coins: 0, turbo: 0.34, me: null, combo: 0, comboT: 0, wanted: 0, police: null, power: null, powerT: 0 };
let PEOPLE = null, COW = null, PUG = null, HORSE = null, blobs = null, crowdM = null, crowdF = null;
// ---------------- the player's taxi ----------------
function makeMe() {
  const C = carSpec(), V = makeCar(C.type, C.col ?? 0, { livery: C.livery, taxi: true, spin: true }); scene.add(V.obj);
  return { V, x: LANES[1], z: 0, y: 0, vy: 0, speed: 0, air: false, turbo: 0, stun: 0, steer: 0, brake: false, crashT: 0, spinA: 0, len: V.size.z, wide: V.size.x };
}

// ---------------- the passenger in the back seat (a small 3D scene of its own) ----------------
const cab = new THREE.Scene(); cab.background = new THREE.Color(0x2a1a10);
const cabCam = new THREE.PerspectiveCamera(42, 1, 0.05, 20);
const cabHemi = new THREE.HemisphereLight(0xfff4e0, 0x6a4a3a, 2.6), cabSun = new THREE.DirectionalLight(0xffeedd, 2.2), cabRim = new THREE.DirectionalLight(0x9ac8ff, 0.9);
cabSun.position.set(1.5, 3, 3); cabRim.position.set(-2, 1, -2); cab.add(cabHemi, cabSun, cabSun.target, cabRim);
const winTex = canvasTex(512, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7ac8ff'); g.addColorStop(1, '#e0f4ff'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 26 + Math.random() * 30) { const bh = 30 + Math.random() * 80, bw = 24 + Math.random() * 40; c.fillStyle = pick(['#e8b070', '#d87a5a', '#f0d8a0', '#8ab0d8', '#c8c8d0', '#e89aa0']); c.fillRect(x, h - bh, bw, bh); c.fillStyle = 'rgba(40,60,90,.45)'; for (let y = h - bh + 8; y < h - 10; y += 14) for (let wx = x + 5; wx < x + bw - 6; wx += 10) c.fillRect(wx, y, 5, 7); } c.fillStyle = '#5a9a3a'; for (let x = 0; x < w; x += 40) { c.beginPath(); c.arc(x + Math.random() * 20, h - 6, 12 + Math.random() * 8, 0, 7); c.fill(); } });
winTex.wrapS = THREE.RepeatWrapping;
const CAB = { g: new THREE.Group(), actor: null, extras: null, look: 0, bounce: 0, bv: 0, sway: 0 };
cab.add(CAB.g);
{ const g = CAB.g, seat = flat(0xa83a2a), dark = flat(0x3a2418);
  const sg = CAB.seat = new THREE.Group(); g.add(sg); mesh(new THREE.BoxGeometry(2.0, 0.42, 0.75), seat, 0, 0.21, 0, sg); mesh(new THREE.BoxGeometry(2.0, 0.95, 0.22), seat, 0, 0.75, -0.42, sg);
  for (const x of [-0.62, 0.62]) mesh(new THREE.BoxGeometry(0.03, 0.9, 0.02), flat(0x7a2418), x, 0.75, -0.3, sg);
  mesh(new THREE.BoxGeometry(2.4, 0.08, 2.4), dark, 0, 1.62, 0.2, g); mesh(new THREE.BoxGeometry(2.4, 0.05, 2.4), flat(0x2a1a10), 0, -0.02, 0.2, g);
  for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(0.06, 1.7, 2.4), flat(0xe8c040), s * 1.12, 0.8, 0.2, g); const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), new THREE.MeshBasicMaterial({ map: winTex })); w.material.userData.flat = true; w.position.set(s * 1.08, 1.12, 0.15); w.rotation.y = -s * PI / 2; g.add(w); }
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: winTex })); rw.position.set(0, 1.38, -0.6); g.add(rw);
  // nimbu-mirchi (lemon and chillies) hanging from the roof for good luck
  const nm = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4), flat(0xffffff), 0, -0.11, 0, nm); mesh(new THREE.SphereGeometry(0.045, 10, 8), flat(0xf0e030), 0, -0.25, 0, nm);
  for (let i = 0; i < 4; i++) { const c = mesh(new THREE.ConeGeometry(0.018, 0.12, 6), flat(i % 2 ? 0x2a9a2a : 0x3aaa3a), 0, -0.33 - i * 0.03, 0, nm); c.rotation.x = PI; c.position.x = (i - 1.5) * 0.02; }
  nm.position.set(0.55, 1.58, 0.75); g.add(nm); CAB.charm = nm; }
const cabFrame = $('cabFrame');
function cabRect() { const w = Math.round(Math.min(156, innerWidth * 0.38)), h = Math.round(w * 1.12); return { w, h, x: innerWidth - w - 14, top: 66 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0) }; }
function placeCabFrame() { const r = cabRect(); cabFrame.style.boxSizing = 'border-box'; cabFrame.style.right = 'auto'; cabFrame.style.left = r.x - 4 + 'px'; cabFrame.style.width = r.w + 8 + 'px'; cabFrame.style.height = r.h + 8 + 'px'; cabFrame.style.top = r.top - 4 + 'px'; document.documentElement.style.setProperty('--cabW', r.w + 'px'); document.documentElement.style.setProperty('--cabH', r.h + 'px'); cabCam.aspect = r.w / r.h; cabCam.updateProjectionMatrix(); }
addEventListener('resize', placeCabFrame);
// the head of a sitting person (to put the sleeping mask / the egg basket in the right place)
function headOf(actor) { const a = actor.geometry.attributes.position.array; let top = -9, hx = 0, hz = 0, n = 0; for (let i = 1; i < a.length; i += 3) if (a[i] > top) top = a[i]; for (let i = 0; i < a.length; i += 3) if (a[i + 1] > top - 0.2) { hx += a[i]; hz += a[i + 2]; n++; } return { top, x: hx / n, z: hz / n }; }
function seatPassenger(P) {
  if (CAB.actor) { CAB.g.remove(CAB.actor); CAB.actor.geometry.dispose(); }
  if (CAB.extras) CAB.g.remove(CAB.extras);
  const a = CAB.actor = new Actor(PEOPLE[P.id], { tint: P.tint, skin: P.skin, hair: P.hair, expr: EXPR.happy }); a.play('sit'); a.mixT = 1; a.pose('sit', 0); a.position.set(0, 0.05, -0.12); a.rotation.y = PI; CAB.g.add(a);   // the people face -z: turn round to face the camera
  { // slide the seat so its back is right behind this person's back (the sitting poses differ)
    const A = a.geometry.attributes.position.array; let back = 9; for (let i = 0; i < A.length; i += 3) if (A[i + 1] > 0.6 && A[i + 1] < 1.15 && Math.abs(A[i]) < 0.18) back = Math.min(back, a.position.z - A[i + 2]);
    CAB.seat.position.z = back - 0.02 + 0.31; }
  const h = headOf(a), ex = CAB.extras = new THREE.Group(); ex.position.copy(a.position); ex.rotation.y = PI; CAB.g.add(ex); CAB.head = h;
  if (P.m === 'eggs') { const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.12, 14, 1, true), flat(0xc8904a), 0, 0, 0, b).material.side = THREE.DoubleSide; mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 18), flat(0xa8703a), 0, 0.06, 0, b).rotation.x = PI / 2; const hd = mesh(new THREE.TorusGeometry(0.15, 0.01, 6, 16, PI), flat(0xa8703a), 0, 0.06, 0, b); void hd; CAB.eggs = []; for (let i = 0; i < 12; i++) { const e = mesh(new THREE.SphereGeometry(0.036, 10, 8), flat(0xfff4e0), Math.cos(i * 2.4) * 0.09 * (i % 3 ? 1 : 0.4), 0.05 + (i > 7 ? 0.04 : 0), Math.sin(i * 2.4) * 0.09 * (i % 3 ? 1 : 0.4), b); e.scale.y = 1.3; CAB.eggs.push(e); } b.position.set(h.x, 0.66, h.z - 0.3); ex.add(b); }
  if (P.m === 'sleep') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.06, 20, 1, true, PI - 1.25, 2.5), flat(0x2a3a8a)); m.material.side = THREE.DoubleSide; m.position.set(h.x, h.top - 0.12, h.z + 0.005); ex.add(m); CAB.mask = m; CAB.maskY = m.position.y; } else CAB.mask = null;
  const hx = a.position.x - h.x, hy = a.position.y + h.top, hz = a.position.z - h.z; cabCam.position.set(hx + 0.12, hy - 0.12, hz + 1.4); cabCam.lookAt(hx, hy - 0.4, hz);
  $('cabName').textContent = P.name;
}
function renderCab() {
  if (!G.lv || !CAB.actor || $('hud').classList.contains('hidden')) return;
  const r = cabRect(), H = innerHeight; renderer.setScissorTest(true); renderer.setScissor(r.x, H - r.top - r.h, r.w, r.h); renderer.setViewport(r.x, H - r.top - r.h, r.w, r.h);
  renderer.render(cab, cabCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
}
function updateCab(dt) {
  const M = G.M, a = CAB.actor; if (!a) return;
  a.update(dt);
  // the body follows the car: bounces on bumps, leans in turns
  CAB.bv -= CAB.bounce * 60 * dt; CAB.bv *= Math.exp(-5 * dt); CAB.bounce += CAB.bv * dt;
  const lean = clamp(-G.me.steer * 0.5, -0.12, 0.12); CAB.sway = damp(CAB.sway, lean, 5, dt);
  a.position.y = 0.05 + Math.max(-0.03, CAB.bounce); a.rotation.z = CAB.sway; CAB.extras.position.y = a.position.y; CAB.extras.rotation.z = CAB.sway;
  CAB.charm.rotation.z = damp(CAB.charm.rotation.z, -lean * 3 + Math.sin(G.t * 3) * 0.08, 3, dt); CAB.charm.rotation.x = Math.sin(G.t * 2.3) * 0.1 + (G.me.brake ? 0.4 : 0);
  winTex.offset.x += G.me.speed * dt * 0.012;
  if (CAB.mask) CAB.mask.position.y = damp(CAB.mask.position.y, CAB.maskY + (M && M.awake > 0 ? 0.075 : 0), 8, dt);
  cabCam.position.x = 0.12 + Math.sin(G.t * 9) * 0.004 * Math.min(1, G.me.speed / 20);
}

// ---------------- missions: a mood meter (0-100) and a goal of their own ----------------
const MISSIONS = {
  late: { setup(M) { M.time = Math.round(G.lv.L / 19 + 14 - G.lv.d * 8); }, tick(M, dt) { M.time -= dt; const v = G.me.speed; if (v > 20 || G.me.turbo > 0) mood(+2.2 * dt); else if (v < 11) { mood(-4 * dt); moan(M, 'sad'); } if (M.time <= 0) fail('Time up! The wedding started without him!'); },
    goal(M) { const t = Math.max(0, Math.ceil(M.time)); return { t: '⏱ ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), warn: t < 12 }; }, turbo() { mood(4); react('laugh', 'happy'); }, bump(k) { mood(-4 * k); }, crash() { mood(-10); }, near() { mood(3); } },
  eggs: { setup(M) { M.eggs = 12; }, tick(M, dt) { const v = G.me.speed; if (v > 19.5) { mood(-7 * dt); moan(M, 'sad'); } else if (v > 7) mood(1.3 * dt); },
    goal(M) { return { t: '🥚 ' + M.eggs + ' / 12 eggs', warn: M.eggs <= 4 }; }, bump(k, M) { const b = Math.min(M.eggs, Math.round(k * 3)); if (b > 0) { breakEggs(M, b); mood(-8 * k); } else mood(-2); }, crash(M) { breakEggs(M, 3); mood(-12); }, smooth() { mood(4); say(pick(['Ahh, so smooth!', 'Good beta, slowly!']), 'happy'); }, turbo() { mood(-12); say('TURBO?! With EGGS?!', 'scared'); }, ok(M) { return M.eggs > 0; } },
  sleep: { setup(M) { M.wakes = 0; M.awake = 0; M.zT = 0; }, tick(M, dt) { if (M.awake > 0) { M.awake -= dt; if (M.awake <= 0) { setExpr('calm', 99); say('Zzz… zzz…', null, true); } } else { mood(0.6 * dt); M.zT -= dt; if (M.zT <= 0) { M.zT = 2.2; cabFx('💤'); sfx('snore'); } } },
    goal(M) { return { t: '😴 Woke up: ' + M.wakes + ' / 3', warn: M.wakes >= 2 }; }, honk(M) { wake(M, 'WHO HONKED?!'); }, bump(k, M) { if (k > 0.45) wake(M, pick(['WHAT?! An earthquake?!', 'Huh?! Who?! Where?!'])); }, crash(M) { wake(M, 'AAAH! What happened?!'); }, ok(M) { return M.wakes < 3; } },
  likes: { setup(M) { M.likes = 0; M.need = 2000 + G.lv.n * 80; M.boredT = 0; }, tick(M, dt) { M.boredT += dt; if (G.me.speed > 22) { M.likes += 30 * dt; M.boredT = Math.max(0, M.boredT - dt * 0.5); } if (M.boredT > 8) { mood(-2 * dt); moan(M, 'sad'); } },
    goal(M) { return { t: '❤️ ' + fmtK(M.likes) + ' / ' + fmtK(M.need) + ' likes', warn: false }; }, near(M) { like(M, 250, 'NEAR MISS! +250 ❤️'); }, turbo(M) { like(M, 120); }, air(M) { like(M, 600, 'AIR STUNT! +600 ❤️'); }, heart(M) { like(M, 200); }, crash(M) { M.likes = Math.max(0, M.likes - 150); mood(-6); }, bump() { }, ok(M) { return M.likes >= M.need; }, why: 'Not enough likes!' },
  chase: { setup(M) { M.catch = 0; M.lostT = 0; spawnThief(); }, tick(M, dt) { const T = G.thief; if (!T || T.caught) return; const gap = G.me.z - T.z, dx = Math.abs(G.me.x - T.x); if (gap > 0 && gap < 9 && dx < 3.2) { M.catch = Math.min(100, M.catch + 13 * dt); if (Math.random() < dt) say(pick(PASSR().happy), 'laugh'); } else M.catch = Math.max(0, M.catch - 2 * dt); if (gap > 130) { M.lostT += dt; moan(M, 'sad'); mood(-3 * dt); if (M.lostT > 7) fail('The thief got away!'); } else M.lostT = 0; if (M.catch >= 100) caught(); },
    goal(M) { return { t: '🚨 Catch: ' + Math.round(M.catch) + '%' + (G.thief ? '  ·  ' + Math.max(0, Math.round(G.me.z - G.thief.z)) + ' m' : ''), warn: M.lostT > 0 }; }, crash() { mood(-5); }, bump() { }, near() { mood(2); } },
  runs: { setup(M) { M.runs = 0; M.need = 20 + Math.round(G.lv.n / 2); }, tick(M, dt) { mood(-0.3 * dt); },
    goal(M) { return { t: '🏏 Runs: ' + M.runs + ' / ' + M.need, warn: false }; }, runs(M, k) { M.runs += k; mood(k === 6 ? 14 : 9); say(k === 6 ? 'SIXER!!' : 'FOUR! What a shot!', 'laugh'); sfx('crowd'); }, crash() { mood(-8); }, bump(k) { mood(-3 * k); }, ok(M) { return M.runs >= M.need; }, why: 'Not enough runs!' },
  call: { setup(M) { M.callT = 4; M.on = false; M.slowT = 0; }, tick(M, dt) { M.callT -= dt; if (M.callT <= 0) { M.on = !M.on; M.callT = M.on ? 7 : rnd(6, 9); if (M.on) { say('Hello? Yes, Khanna here…', 'calm'); CAB.actor.play('sittalk'); cabFx('📞'); } else { say(pick(['Deal! Okay, bye.', 'Call you back.']), 'happy'); CAB.actor.play('sit'); cabFx(''); } }
      if (G.me.speed < 12) { M.slowT += dt; if (M.slowT > 3) { mood(-3 * dt); moan(M, 'sad'); } } else { M.slowT = 0; mood(0.8 * dt); } },
    goal(M) { return { t: M.on ? '📞 ON CALL — QUIET! ' + Math.ceil(M.callT) : '🤫 Next call in ' + Math.ceil(M.callT), warn: M.on }; }, honk(M) { if (M.on) { mood(-12); say('I\'M ON A CALL!', 'angry'); } }, bump(k, M) { if (M.on && k > 0.2) { mood(-8); say('The line is breaking!', 'angry'); } }, crash() { mood(-10); }, near() { } },
  fun: { setup(M) { M.honkT = 0; }, tick(M, dt) { M.honkT -= dt; mood(-1.7 * dt); if (G.M.mood < 40) moan(M, 'sad'); },
    goal(M) { return { t: '🎈 Keep Chintu happy!', warn: G.M.mood < 30 }; }, honk(M) { if (M.honkT <= 0) { M.honkT = 2.5; mood(6); react('laugh', 'happy'); if (Math.random() < 0.5) say('HONK HONK! Hehehe!', 'laugh'); } }, balloon() { mood(10); say(pick(['BALLOON!', 'Weee! Another one!', 'Red balloon!']), 'laugh'); }, bump(k) { mood(2); react('laugh', 'happy'); }, crash() { mood(-6); }, air() { mood(15); say('Again! AGAIN!', 'laugh'); }, near() { mood(2); } },
};
const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));
const PASSR = () => G.lv.P;
function mood(d) { const M = G.M; if (!M || M.done) return; M.mood = clamp(M.mood + d, 0, 100); if (M.mood <= 0) fail(PASSR().lose); }
function moan(M, e) { M.moanT = (M.moanT || 0) - 0.016; if (M.moanT > 0) return; M.moanT = rnd(5, 8); say(pick(PASSR().sad), e === 'sad' ? (G.M.mood < 40 ? 'angry' : 'sad') : e); }
function like(M, n, txt) { M.likes += n; M.boredT = 0; mood(n / 60); if (txt) popText(txt, _p.set(G.me.x, 3, G.me.z - 3), '#ff7ac8', 26, 0.9); cabFx('❤️'); if (Math.random() < 0.4) say(pick(PASSR().happy), 'laugh'); }
function breakEggs(M, n) { M.eggs = Math.max(0, M.eggs - n); CAB.eggs.forEach((e, i) => { e.visible = i < M.eggs; }); popText('CRACK! -' + n + ' 🥚', _p.set(G.me.x, 3, G.me.z - 3), '#fff4a0', 28, 0.9); sfx('crash'); say(pick(PASSR().hurt), 'scared'); cabFx('🍳'); if (M.eggs <= 0) fail('All the eggs are broken!'); }
function wake(M, line) { if (M.awake > 0) return; M.wakes++; M.awake = 3.5; mood(-22); setExpr('angry', 3.5); CAB.actor.play('sittalk'); setTimeout(() => CAB.actor && CAB.actor.play('sit'), 3200); say(line, 'angry'); cabFx('💢'); sfx('talk', 0, { w: 'aaah', f0: 110, fk: 0.86 }); vib(80); if (M.wakes >= 3) fail(PASSR().lose); }
// what the passenger feels: the 3D face and the cartoon face
let faceT = 0;
function setExpr(e, dur = 2) { const M = G.M; if (!M) return; M.expr = e; faceT = dur; if (CAB.actor) CAB.actor.expr = EXPR[e === 'sleep' ? 'calm' : e] ?? 0; }
function baseExpr() { const M = G.M; if (!M) return 'happy'; if (G.lv.P.m === 'sleep' && M.awake <= 0) return 'sleep'; return M.mood > 72 ? 'happy' : M.mood > 45 ? 'calm' : M.mood > 22 ? 'sad' : 'angry'; }
function react(e, after) { setExpr(e, 1.6); void after; }
let cabFxT = 0;
function cabFx(s) { $('cabFx').textContent = s; $('cabFx').style.opacity = 1; cabFxT = 2; }
let bubbleT = 0;
function say(text, e, quiet) { const P = PASSR(); if (!P) return; const b = $('bubble'); $('bubbleName').textContent = P.name; $('bubbleText').textContent = text; b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); bubbleT = 2.8; if (e) setExpr(e, 2.2); if (!quiet) sfx('talk', 0, { w: pick(['hey', 'wow', 'haha', 'hurry', 'faster', 'slow', 'nice']), f0: P.f0, fk: P.fk }); }
const faceCv = document.createElement('canvas'); faceCv.width = faceCv.height = 64;


// ---------------- building a ride ----------------
function clearLevel() {
  if (G.track) G.track.dispose(); G.objs.forEach(o => o.obj && scene.remove(o.obj)); G.objs = [];
  G.cars.forEach(c => scene.remove(c.V.obj)); G.cars = []; if (G.me) scene.remove(G.me.V.obj); if (G.thief) { scene.remove(G.thief.V.obj); G.thief = null; } if (G.police) { scene.remove(G.police.V.obj); G.police = null; }
  if (G.dest) { scene.remove(G.dest); G.dest = null; } if (G.walker) { scene.remove(G.walker); G.walker = null; } (G.debris || []).forEach(d => scene.remove(d)); G.debris = []; clearFx(); clearPops();
}
function startLevel(n, playNow) {
  clearLevel();
  const lv = G.lv = makeLevel(n), P = lv.P, S = lv.S;
  setBend(n + 3, -lv.L - 300, S.hills ? 1.3 : 0.9, S.hills ? 0.9 : 0.15, -40);
  G.track = buildStreet({ L: lv.L + 260, RW, stage: lv.stage, seed: n * 17 + 3 }, scene);
  hemi.intensity = S.hemi; sun.intensity = S.light; rim.intensity = S.night ? 1.2 : 0.7; hemi.color.set(S.night ? 0x9a8aff : S.warm ? 0xffd8b8 : S.rain ? 0xc8d4e0 : 0xe4f0ff); sun.color.set(S.night ? 0xffc8a0 : S.warm ? 0xffb080 : 0xffeccc);
  G.me = makeMe(); G.me.x = LANES[0]; G.me.z = 0;
  for (const e of lv.ev) spawn(e);
  for (let i = 0; i < lv.traffic; i++) addCar(1, -40 - i * (210 / lv.traffic) - rnd(0, 15));
  for (let i = 0; i < lv.oncoming; i++) addCar(-1, -30 - i * (250 / lv.oncoming) - rnd(0, 20));
  buildDest();
  seatPassenger(P); const w = G.walker = new Actor(PEOPLE[P.id], { tint: P.tint, skin: P.skin, hair: P.hair, expr: EXPR.happy }); w.position.set(-RW / 2 - 1.1, 0.25, -1.5); w.rotation.y = PI / 2; w.play('wave'); scene.add(w);
  G.M = { mood: 70, expr: 'happy', done: false };
  MISSIONS[P.m].setup(G.M); setExpr(baseExpr(), 0);
  Object.assign(G, { t: 0, coins: 0, turbo: 0.34, tx: G.me.x, introT: 0, state: playNow ? 'intro' : 'home', arriveT: 0, missedN: 0, result: null, combo: 0, comboT: 0, best: 0, wanted: 0, power: null, powerT: 0, fines: 0, smashed: 0, escapes: 0 });
  $('lvl').textContent = S.name.toUpperCase(); $('cabFx').textContent = ''; setPower(null); updateWanted();
  try { G.track.cullAll(); const done = warmRing(); renderer.compile(scene, cam); renderer.render(scene, cam); renderer.compile(cab, cabCam); done(); } catch (e) { /* not needed */ }
  if (playNow) { music(lv.music); placeCabFrame(); }
}
// ---------------- the destination: a green stop zone, the place itself, people waiting ----------------
function buildDest() {
  const P = G.lv.P, g = G.dest = new THREE.Group(), z = -G.lv.L, st = G.lv.stage; g.position.z = z; scene.add(g);
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 26), new THREE.MeshBasicMaterial({ color: 0x3fff6e, transparent: true, opacity: 0.38, depthWrite: false })); zone.rotation.x = -PI / 2; zone.position.set(-3.5, 0.06, 0); g.add(zone); G.zone = zone;
  const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ff4fa8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a0a4a'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#fff'; c.font = 'bold 52px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.place, w / 2, h / 2 + 4); });
  const sg = new THREE.Group(); const sm = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: sign })); sm.position.set(0, 6.2, 0); sm.rotation.y = 0; sg.add(sm);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.4, 8), flat(0x6a4a2a), s * 3.8, 3.2, 0, sg);
  sg.position.set(-RW / 2 - 1.6, 0, 6); g.add(sg);
  // the place itself
  if (st === 'shaadi') { const a = oneMesh(marigoldArch()); a.position.set(0, 0, -16); g.add(a); const hall = new THREE.Group(); mesh(new THREE.BoxGeometry(12, 9, 26), flat(0xfff0d8), 0, 4.5, 0, hall); for (let i = 0; i < 60; i++) { const b = bulb(pick([0xffe04a, 0xff4a8a, 0x4ae8ff]), 0.16); b.position.set(6.05, rnd(1, 9), rnd(-13, 13)); hall.add(b); } mergeBulbs(hall); hall.position.set(-RW / 2 - 12, 0, 0); g.add(hall); if (HORSE) { const h = makeAnimal(HORSE); h.obj.position.set(-RW / 2 - 2.5, 0.25, -6); h.obj.rotation.y = PI / 2; g.add(h.obj); G.horse = h; mesh(new THREE.BoxGeometry(0.9, 0.12, 1.3), flat(0xd8202a), -RW / 2 - 2.5, 1.55, -6, g); } }
  if (st === 'stadium') { const s = new THREE.Group(); mesh(new THREE.CylinderGeometry(42, 36, 18, 28, 1, true), flat(0x2a5ad8, { side: THREE.DoubleSide }), 0, 9, 0, s); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), glow(0xffffff)); const a = i / 4 * PI * 2 + 0.4; l.position.set(Math.cos(a) * 40, 30, Math.sin(a) * 40); s.add(l); mesh(new THREE.BoxGeometry(0.6, 30, 0.6), flat(0xb8bcc4), Math.cos(a) * 40, 15, Math.sin(a) * 40, s); } s.position.set(-RW / 2 - 52, 0, -20); g.add(s); for (let i = 0; i < 3; i++) { const f = oneMesh(fanStand()); f.position.set(-RW / 2 - 8 - i * 0.1, 0, -30 + i * 18); g.add(f); } }
  if (st === 'holi') { const f = oneMesh(ferris()); f.position.set(-RW / 2 - 18, 0, -10); g.add(f); G.ferris = f; }
  if (st === 'cyber') { const t = mesh(new THREE.BoxGeometry(22, 90, 22), new THREE.MeshPhysicalMaterial({ color: 0x3a6a9a, roughness: 0.1 }), -RW / 2 - 18, 45, -10, g); void t; }
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4), new THREE.MeshBasicMaterial({ color: 0x3fff6e })); arrow.rotation.x = PI; arrow.position.set(-3.5, 4, 0); g.add(arrow); G.arrow = arrow;
  G.party = []; const n = st === 'shaadi' || st === 'stadium' ? 12 : 6;
  for (let i = 0; i < n; i++) G.party.push({ x: -RW / 2 - 2 - rnd(0, 3.5), z: z + rnd(-9, 9), f: i % 2, ry: PI / 2 + rnd(-0.5, 0.5), t: rnd(0, 3), tint: pick(st === 'stadium' ? [0x2a5ad8, 0xff8a1a] : [0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524, 0xd8a070]), hair: pick([0x1a1210, 0x3a2010, 0x2a2018]) });
  g.traverse(q => { q.frustumCulled = false; });
}
// ---------------- traffic (real Indian traffic) ----------------
function addCar(dir, z) {
  const type = pick(TRAFFIC[G.lv.stage]), col = type === 'auto' ? pick([0x2a9a3a, 0x1a1a1a, 0x2a9a3a]) : type === 'bus' ? pick([0xc8202a, 0x2a6ab0]) : type === 'truck' ? pick([0xff7a1a, 0x2a8ae8, 0xe8202a, 0x2aa84a]) : pick(PAINT);
  const V = makeCar(type, col, { top: type === 'auto' ? (col === 0x1a1a1a ? 0xffd21a : 0xffd21a) : undefined }); if (dir < 0) V.obj.rotation.y = PI; scene.add(V.obj);
  const lanes = dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  const c = { V, type, dir, x: pick(lanes), z, sp: dir > 0 ? (type === 'auto' ? rnd(8, 11) : type === 'truck' || type === 'bus' ? rnd(8, 12) : rnd(11, 16)) : rnd(13, 19), cur: 0, honkT: 0, hitT: 0, len: V.size.z, wide: V.size.x, fly: 0 };
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
    if (c.fly > 0) { c.fly -= dt; c.vy -= 20 * dt; c.y = Math.max(0, (c.y || 0) + c.vy * dt); c.x += c.vx * dt; c.V.obj.position.set(c.x, c.y, c.z); c.V.obj.rotation.z += c.rz * dt; if (c.fly <= 0) { c.V.obj.rotation.z = 0; c.y = 0; c.lane = c.x = clamp(c.x, -HALF, HALF); } continue; }
    if (c.dir > 0) {
      let want = c.sp; const front = c.z - c.len / 2;
      const ahead = [...G.cars.filter(q => q !== c && q.dir > 0 && Math.abs(q.x - c.x) < 1.6 && q.z < c.z), ...(Math.abs(me.x - c.x) < 1.8 && me.z < c.z ? [me] : [])].sort((a, b) => b.z - a.z)[0];
      if (ahead) { const gap = front - (ahead.z + (ahead.len || 4) / 2); if (gap < 14) want = Math.min(want, (ahead.cur ?? ahead.speed) * (gap < 6 ? 0.5 : 0.95)); if (gap < 3) want = 0; if (ahead === me && gap < 10 && me.speed < 3) { c.honkT -= dt; if (c.honkT <= 0) { c.honkT = rnd(1.5, 3); if (Math.abs(c.z - me.z) < 30) { sfxT('horn', 0.6, 0, c.type === 'truck' || c.type === 'bus' ? 3 : 2); popText('PEEP PEEP!', _p.set(c.x, 3, c.z), '#fff', 20, 0.6); } } } }
      if (laneBlocked(c.x, front, front - 16, c)) { const other = c.x === LANES[0] ? LANES[1] : LANES[0]; if (!laneBlocked(other, c.z + 6, front - 16, c) && !(Math.abs(me.x - other) < 2 && Math.abs(me.z - c.z) < 8)) c.lane = other; else want = Math.min(want, 1); }
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
    c.V.obj.visible = c.z < me.z + 40 && c.z > me.z - 240;
  }
}
function respawn(c, z, behind) {
  const lanes = c.dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  for (let k = 0; k < 6; k++) { const x = pick(lanes); if (!G.cars.some(q => q !== c && Math.abs(q.x - x) < 1.6 && Math.abs(q.z - z) < 16) && !(behind && Math.abs(G.me.x - x) < 2)) { c.x = c.lane = x; c.z = z; c.cur = c.sp; return; } z -= 16; }
  c.z = z;
}
// ---------------- the detective's thief ----------------
function spawnThief() {
  const V = makeCar('sedan', 0xd81a1a, { spin: false }); scene.add(V.obj);
  const d = new Actor(PEOPLE.pedM, { tint: 0x1a1a1a, skin: 0xa86b3c, hair: 0x1a1a1a, expr: EXPR.laugh }); d.play('idle'); d.scale.setScalar(0.85); d.position.set(0.4, 0.4, 0.1); V.obj.add(d);
  const tag = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#e8202a'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 30, 18); c.fill(); c.beginPath(); c.moveTo(w / 2 - 18, h - 27); c.lineTo(w / 2 + 18, h - 27); c.lineTo(w / 2, h - 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 46px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🥒 THIEF!', w / 2, 37); });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.12), new THREE.MeshBasicMaterial({ map: tag, transparent: true, depthTest: false })); tm.renderOrder = 5; tm.position.set(0, V.size.y + 1.6, 0); V.obj.add(tm);
  G.thief = { V, d, tm, x: LANES[1], z: -45, lane: LANES[1], cur: 18, len: V.size.z, wide: V.size.x, laneT: 2, dropT: 6, caught: false, sp: 21.5 + G.lv.d * 4 };
}
function updateThief(dt) {
  const T = G.thief; if (!T) return;
  if (T.caught) { T.cur = damp(T.cur, 0, 2, dt); T.z -= T.cur * dt; T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = damp(T.V.obj.rotation.y, 0.6, 3, dt); return; }
  const me = G.me, gap = me.z - T.z; let want = G.state === 'drive' ? T.sp + (gap > 70 ? -6 : gap < 12 ? 5 : 0) : 0;
  T.laneT -= dt; const front = T.z - 2;
  if (laneBlocked(T.lane, front + 1, front - 22, T) || T.laneT <= 0) { const opts = [LANES[0], LANES[1]].filter(x => !laneBlocked(x, front + 4, front - 22, T)); if (opts.length) T.lane = pick(opts); else want *= 0.5; T.laneT = rnd(2, 4.5); }
  T.cur = damp(T.cur, want, 1.5, dt); T.z -= T.cur * dt; T.x = damp(T.x, T.lane, 2.2, dt);
  T.dropT -= dt; if (T.dropT <= 0 && G.state === 'drive' && gap > 8 && gap < 60) { T.dropT = rnd(4, 7); spawn({ t: 'smash', z: T.z + 4, x: T.x, kind: 'boxes' }); sfx('thud'); popText('HEHEHE!', _p.set(T.x, 3, T.z), '#ffb0a0', 22, 0.7); }
  T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = (T.lane - T.x) * 0.06; T.d.update(dt); T.tm.position.y = T.V.size.y + 1.6 + Math.sin(G.t * 6) * 0.2; T.tm.scale.setScalar(clamp(gap / 22, 1.2, 4));
}
function caught() {
  const T = G.thief; T.caught = true; G.M.catch = 100; sfx('fanfare'); flash('#ff4040', 0.3); banner('🚨 CAUGHT!', 'The pickle is safe!', 2); T.d.expr = EXPR.scared; say(PASSR().win, 'laugh');
  for (let i = 0; i < 3; i++) setTimeout(() => sfx('siren'), i * 400);
  setTimeout(() => arrive(true), 1600);
}
// ---------------- the police (smash too much and they come!) ----------------
function updateWanted() { const n = Math.floor(G.wanted + 0.001); $('wanted').innerHTML = [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join(''); $('wanted').classList.toggle('hot', !!G.police); }
function addWanted(k, why) {
  if (G.lv.P.m === 'chase') return;   // the detective IS the police
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
    const fine = 40 + G.lv.n * 5; G.fines += fine; G.wanted = 0; C.leaving = true; me.speed *= 0.3; E.shake = 0.4; vib(100); sfx('crash'); banner('🚓 CAUGHT!', 'Fine: ₹' + fine, 1.6); popText('CHALLAN ₹' + fine, _p.set(me.x, 4, me.z), '#ff6a6a', 30, 1.2); mood(-10); say(pick(['Arre bhaiya, police ka challan!', 'We got caught!', 'Shame shame!']), 'angry'); updateWanted();
  } else if (gap > 110 || C.T > 26) { C.leaving = true; G.wanted = 0; G.escapes++; const b = 60 + G.lv.n * 4; G.coins += b; addCombo(3, 'ESCAPED!'); banner('😎 ESCAPED!', '+' + b + ' coins', 1.4); sfx('fanfare'); say(pick(['Hahaha! We lost them!', 'Bye bye police!', 'What a driver!']), 'laugh'); updateWanted(); }
}
// ---------------- MASTI combos ----------------
function addCombo(k, label) {
  G.combo += k; G.comboT = 3.2; G.best = Math.max(G.best, G.combo); const el = $('combo'); el.innerHTML = `MASTI <b>x${G.combo}</b>${label ? `<small>${label}</small>` : ''}`; el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
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
  for (const c of G.cars) if (c.z < G.me.z && c.z > G.me.z - 70 && c.fly <= 0) { c.fly = 1.1; c.vy = rnd(6, 9); c.vx = (c.x < 0 ? -1 : 1) * rnd(3, 6) * (c.dir > 0 ? 1 : 1); c.rz = rnd(-3, 3); addCombo(1); }
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
  sfx('smash'); E.shake = Math.max(E.shake, 0.25); vib(40); R.speed *= 0.88; G.coins += 2;
  popText(pick(['SMASH!', 'BADAAM!', 'DHISHOOM!', 'KABOOM!', 'OOPS!']), _p.set(x, 3, z), pick(['#ffe066', '#ff9ad8', '#7affe8']), 30, 0.8);
  addCombo(1, o.kind === 'colour' ? 'HOLI HAI!' : ''); addWanted(o.kind === 'colour' || o.kind === 'balloons' ? 0.15 : 0.4, 'smash');
  const P = G.lv.P; if (P.m === 'likes' || P.m === 'fun') { mood(5); react('laugh'); if (Math.random() < 0.5) say(pick(['Hahaha! Again!', 'SO viral!', 'Dhishoom!']), 'laugh'); } else if (P.m === 'eggs' || P.m === 'call') { mood(-2); if (Math.random() < 0.5) say(pick(['Arre, that poor man\'s stall!', 'What are you DOING?!']), 'angry'); } else if (Math.random() < 0.3) say(pick(['Hahaha!', 'Oho! Careful!', 'Who will pay for that?!']), 'laugh');
  bumpPassenger(0.15, 'smash');
}
// ---------------- driving ----------------
const GRAV = 22;
function updateMe(dt) {
  const R = G.me, cs = carSpec(), driving = G.state === 'drive';
  let top = 26 * cs.sp * (1 + G.lv.d * 0.06);
  if (R.turbo > 0) { R.turbo -= dt; top += 13; }
  if (R.stun > 0) { R.stun -= dt; top *= 0.4; }
  if (!driving) top = 0;
  const brake = driving && R.brake;
  if (brake) R.speed = Math.max(0, R.speed - 20 * dt); else R.speed = damp(R.speed, top, R.turbo > 0 ? 2.6 : R.speed < top ? 0.9 : 2.2, dt);
  if (G.state === 'arrive' || G.state === 'fail') R.speed = Math.max(0, R.speed - 14 * dt);
  const pz = R.z; R.z -= R.speed * dt;
  const px = R.x; G.tx = clamp(G.tx, -HALF, HALF); R.x = damp(R.x, G.tx, R.speed > 2 ? 7 : 2, dt); R.x = clamp(R.x, -HALF, HALF);
  R.steer = R.speed > 1 ? (R.x - px) / dt / Math.max(8, R.speed) : 0;
  if (R.air) { R.vy -= GRAV * dt; R.y += R.vy * dt; if (R.spinA > 0) R.spinA = Math.min(PI * 2, R.spinA + dt * 9); if (R.y <= 0 && R.vy < 0) land(R); }
  else { R.y = Math.max(0, R.y - dt * 4); }
  R.bumpY = damp(R.bumpY || 0, 0, 8, dt);
  R.V.obj.position.set(R.x, R.y + R.bumpY, R.z); R.V.obj.rotation.set(R.air ? -0.1 : -(R.bumpY || 0) * 0.3 + (brake ? 0.025 : 0), -R.steer * 0.35 + R.spinA, R.steer * 0.05, 'YXZ');
  spinWheels(R.V, pz - R.z, R.steer * 0.8);
  if (brake && R.speed > 8 && Math.random() < dt * 20) puff(_p.set(R.x + rnd(-0.8, 0.8), 0.2, R.z + 1.6), 1, 0xd8d8d8, { size: 0.5, speed: 0.6, life: 0.5, grav: -1 });
  if (R.turbo > 0 && Math.random() < dt * 40) puff(_p.set(R.x + rnd(-0.3, 0.3), 0.55, R.z + R.len / 2 + 0.2), 1, 0xff9a1a, { add: true, size: 0.6, speed: 1, life: 0.25, grav: -1, cols: [0xffe04a, 0xff7a1a, 0x4ad8ff] });
  if (G.lv.S.rain && R.speed > 6 && Math.random() < dt * 14) puff(_p.set(R.x + rnd(-1, 1), 0.2, R.z + R.len / 2), 1, 0xd8e4f0, { size: 0.45, speed: 1.5, life: 0.4, grav: 6 });
  if (brake && R.speed > 14) sfxT('skid', 0.6);
  if (G.power === 'shield') { if (!R.bub) { R.bub = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7affe8, transparent: true, opacity: 0.22, depthWrite: false })); R.bub.scale.set(0.8, 0.6, 1.3); R.bub.position.y = 1; R.V.obj.add(R.bub); } R.bub.visible = true; } else if (R.bub) R.bub.visible = false;
  if (driving) { const M = G.M; if (!M.lastSwerve && Math.abs(R.steer) > 0.9 && R.speed > 18) { M.lastSwerve = 1; if (G.lv.P.m === 'eggs' || G.lv.P.m === 'call') { mood(-4); say(pick(['Arre, careful!', 'Zig-zag?!', 'Straight, beta, straight!']), 'scared'); } else if (G.lv.P.m === 'fun' || G.lv.P.m === 'likes') { mood(3); react('laugh'); } } if (Math.abs(R.steer) < 0.3) M.lastSwerve = 0; }
}
function land(R) {
  R.y = 0; R.vy = 0; R.air = false; puff(_p.set(R.x, 0.3, R.z), 6, 0xd8d0c0, { size: 0.8, speed: 2, life: 0.5 }); sfx('thud'); E.shake = 0.3; vib(30);
  if (R.spinA > 0) { const ok = R.spinA >= PI * 2 - 0.01; R.spinA = 0; if (ok) { addCombo(2, '360° SPIN!'); G.coins += 10; popText('360° SPIN! +10', _p.set(R.x, 3.5, R.z), '#ffe066', 30, 1); sfx('gateGood'); } }
  bumpPassenger(0.9 * carSpec().soft, 'land');
}
function stunt() { const R = G.me; if (!R.air || R.spinA > 0 || R.y < 1.2) return; R.spinA = 0.01; sfx('swoosh'); }
function bumpPassenger(k, why) {
  CAB.bv += 2.4 * Math.min(1.4, k + 0.2); cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  const M = G.M, H = MISSIONS[G.lv.P.m]; if (!M || M.done) return;
  if (G.power === 'shield' && why !== 'land' && why !== 'breaker' && why !== 'pothole') return;
  if (H.bump) H.bump(k, M, why);
  if (k > 0.3 && G.lv.P.m !== 'sleep' && G.lv.P.m !== 'fun') { setExpr('scared', 1.4); if (Math.random() < 0.5) say(pick(PASSR().hurt), 'scared'); }
}
// ---------------- what the player does ----------------
function useTurbo() {
  const R = G.me; if (G.state !== 'drive' || G.turbo < 0.33 || R.turbo > 0) return;
  G.turbo -= 0.33; R.turbo = 1.8; sfx('nitro'); flash('#9ae8ff', 0.25); vib(40); E.shake = 0.2; popText('TURBO!', _p.set(R.x, 3, R.z - 3), '#7ae8ff', 30, 0.7);
  const H = MISSIONS[G.lv.P.m]; if (H.turbo) H.turbo(G.M);
}
function honk() {
  if (G.state !== 'drive' && G.state !== 'intro') return; const h = HORNS.find(q => q.k === PF.horn) || HORNS[0]; sfxT('horn', 0.25, 0, h.k); vib(15);
  $('hornB').classList.remove('ready'); void $('hornB').offsetWidth; $('hornB').classList.add('ready'); setTimeout(() => $('hornB').classList.remove('ready'), 250);
  if (G.state !== 'drive') return;
  const R = G.me;
  for (const o of G.objs) { if (o.t === 'cows' && !o.gone && o.z < R.z && o.z > R.z - 50) { o.gone = true; o.goT = 0; sfxT('moo', 0.5); popText('MOOO! OKAY OKAY!', _p.set(o.x, 3, o.z), '#fff', 22, 0.9); o.cows.forEach(c => animalWalk(c, true)); } if ((o.t === 'baraat' || o.t === 'fans') && o.cross && o.z < R.z && o.z > R.z - 40) { o.hurry = true; popText(o.t === 'baraat' ? 'Arre, the baraat!' : 'Make way for the fans!', _p.set(0, 3.5, o.z), '#ffe066', 22, 0.9); } }
  const H = MISSIONS[G.lv.P.m]; if (H.honk) H.honk(G.M);
}

// ---------------- collisions and pickups ----------------
function interact(dt) {
  const R = G.me, M = G.M, H = MISSIONS[G.lv.P.m], mag = G.power === 'magnet';
  for (const o of G.objs) {
    const dz = R.z - o.z; if (dz > 12 || dz < -45) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp')) for (const c of o.items) { if (!c.visible) continue; const cz = o.z + c.position.z; if (mag && Math.abs(cz - R.z) < 12 && Math.abs(c.position.x - R.x) < 9) { c.position.x = damp(c.position.x, R.x, 6, dt); c.position.z = damp(c.position.z, R.z - o.z, 6, dt); c.position.y = damp(c.position.y, R.y + 1, 6, dt); } if (Math.abs(cz - R.z) < 1.6 && Math.abs(c.position.x - R.x) < 1.6 && Math.abs(c.position.y - R.y - 0.8) < 1.8) { c.visible = false; G.coins++; sfxT('coin', 0.03); G.turbo = Math.min(1, G.turbo + 0.02); } }
    if (o.t === 'turbo') for (const b of o.items) { if (b.visible && Math.abs(o.z - R.z) < 1.8 && Math.abs(b.position.x - R.x) < 1.7) { b.visible = false; G.turbo = Math.min(1, G.turbo + 0.34); sfx('kaching'); popText('+TURBO', _p.set(R.x, 2.5, R.z), '#7ae8ff', 26, 0.7); } }
    if (o.t === 'power' && o.items[0].visible && Math.abs(dz) < 1.8 && Math.abs(o.x - R.x) < 1.9) { o.items[0].visible = false; gotPower(o.pow); }
    if (o.t === 'runs' && o.items[0].visible && Math.abs(dz) < 1.6 && Math.abs(o.x - R.x) < 1.8) { o.items[0].visible = false; sfx('gateGood'); popText(o.k === 6 ? 'SIXER! +6' : 'FOUR! +4', _p.set(R.x, 3, R.z), o.k === 6 ? '#ffb03a' : '#7ac8ff', 32, 1); H.runs && H.runs(M, o.k); addCombo(1); puff(_p.set(o.x, 2, o.z), 12, 0xffffff, { star: true, add: true, cols: [0xffd23f, 0xff7a1a, 0x2a8ad8], speed: 4 }); }
    if ((o.t === 'balloon' || o.t === 'heart') && o.items) for (const b of o.items) { const bz = o.z + b.position.z; if (b.visible && Math.abs(bz - R.z) < 1.6 && Math.abs(b.position.x - R.x) < 1.6) { b.visible = false; sfx(o.t === 'balloon' ? 'pop' : 'gateGood'); puff(_p.set(b.position.x, 2, bz), 8, o.t === 'balloon' ? 0xffd23f : 0xff3a7a, { star: true, add: true, speed: 3 }); if (o.t === 'balloon' && H.balloon) H.balloon(M); if (o.t === 'heart' && H.heart) H.heart(M); } }
    if (o.t === 'ramp' && !R.air && dz <= 0.5 && dz > -0.8 && Math.abs(R.x - o.x) < o.w / 2) { R.air = true; R.vy = 9 + R.speed * 0.13; sfx('whoosh'); banner('🚀 JUMP!', 'Swipe UP to SPIN!', 0.9); E.slow = 0.65; setTimeout(() => { E.slow = 1; }, 650); addCombo(1, 'BIG AIR'); if (H.air) H.air(M); else if (G.lv.P.m !== 'sleep') say(pick(['AAAAH!', 'We are FLYING!', 'Wheee!', 'Bhaiya, this is a TAXI not a plane!']), 'scared'); }
    if (o.t === 'stop' && o.state === 'wait') {
      if (Math.abs(dz) < 7 && R.x < -2.5 && R.speed < 3) { o.state = 'done'; mood(22); G.coins += 40; addCombo(2, 'GOOD STOP'); sfx('kaching'); popText('+₹40 TIP · 😍', _p.set(R.x, 3.5, R.z), '#ff9ad8', 30, 1.1); say(pick(['Wah! Thank you!', 'Perfect stop!', 'You are the best driver!']), 'laugh'); o.zone.visible = false; }
      else if (dz > -60 && dz < -20 && !o.told) { o.told = true; say(STOPS[G.lv.P.id][1], 'happy'); showHint('🛑 STOP in the PINK zone for a tip!'); }
      else if (R.z < o.z - 9) { o.state = 'missed'; mood(-8); say(pick(['Arre! You passed it!', 'Never mind…', 'Hmph.']), 'sad'); o.zone.visible = false; }
    }
    if (R.air && R.y > 1) continue;
    if (o.t === 'breaker' && !o.hit.has(R) && dz < 0.6 && dz > -0.8) { o.hit.add(R); const k = clamp((R.speed - 10) / 10, 0, 1.4) * carSpec().soft; if (k > 0.05) { R.bumpY = 0.25 + k * 0.4; E.shake = 0.2 + k * 0.3; sfx('thud'); vib(40); popText(k > 0.6 ? 'BUMP!! 😵' : 'BUMP!', _p.set(R.x, 3, R.z), '#ffd0a0', 28, 0.8); bumpPassenger(k, 'breaker'); } else { popText('SMOOTH! 👌', _p.set(R.x, 3, R.z), '#a0ffb0', 24, 0.8); if (H.smooth) H.smooth(M); } }
    if (o.t === 'pothole' && !o.hit.has(R) && Math.abs(dz) < 1 && Math.abs(R.x - o.x) < 1.4) { o.hit.add(R); const k = clamp(R.speed / 22, 0.15, 1.2) * carSpec().soft; R.bumpY = 0.2 + k * 0.3; E.shake = 0.3; sfx('thud'); vib(50); popText('POTHOLE! 🕳️', _p.set(R.x, 3, R.z), '#ffd0a0', 26, 0.8); bumpPassenger(k, 'pothole'); }
    if (o.t === 'puddle' && !o.hit.has(R) && Math.abs(dz) < 2.5 && Math.abs(R.x - o.x) < 2.4) { o.hit.add(R); for (let i = 0; i < 3; i++) puff(_p.set(R.x + (i - 1) * 1.4, 0.5, R.z), 14, 0xc8dcf0, { size: 0.9, speed: 6, life: 0.9, grav: 12 }); sfx('bigSplash'); popText('SPLAAASH! 💦', _p.set(R.x, 3, R.z), '#8ae8ff', 30, 0.9); addCombo(1, 'SPLASH'); R.speed *= 0.85; if (Math.random() < 0.5) say(pick(['Hahaha! Everyone is wet!', 'My shoes!', 'Splash!']), 'laugh'); }
    if (o.t === 'smash' && !o.hit.has(R) && Math.abs(dz) < 2 && Math.abs(R.x - o.x) < 1.9) smash(o, R);
    if ((o.t === 'baraat' || o.t === 'fans') && o.cross && !o.scared && dz < 3 && dz > -2 && R.speed > 6) { o.scared = true; o.people.forEach(p => { p.jump = 1; }); R.speed *= 0.6; mood(-5); addWanted(0.3); popText(o.t === 'baraat' ? 'ARRE! THE BARAAT!' : 'WATCH OUT!', _p.set(R.x, 3.5, R.z), '#ff9a9a', 26, 0.9); sfx('talk', 0, { w: 'aaah', f0: 220 }); say(pick(['Careful!! People!', 'Bhaiya, BRAKE!']), 'scared'); }
    if (o.t === 'seawave' && !o.done && dz < 22) { o.done = true; for (let i = 0; i < 4; i++) setTimeout(() => puff(_p.set(rnd(3, 9), 2, o.z - i * 2), 22, 0xe8f8ff, { size: 1.2, speed: 6, life: 1.1, grav: 10, vel: _q.set(-6, 6, 0) }), i * 90); sfx('bigSplash'); if (R.x > 0) { R.speed *= 0.7; popText('WAVE SPLASH! 🌊', _p.set(R.x, 3, R.z), '#8ae8ff', 30, 1); say('Aaah! The sea is on the road!', 'scared'); } else { addCombo(1, 'DODGED THE WAVE'); popText('WHOOSH! 🌊', _p.set(5, 4, o.z), '#8ae8ff', 26, 0.9); } }
    if (Math.abs(dz) < 2 && !o.hit.has(R)) {
      let hitIt = false;
      if (o.t === 'cows') for (const c of o.cows) { if (Math.abs(c.obj.position.x - R.x) < 1.8 && Math.abs(o.z + c.obj.position.z - R.z) < 2) { hitIt = true; c.bonk = 1; } }
      else if (o.t === 'cones' && o.items) for (const c of o.items) { if (c.visible !== false && Math.abs(c.position.x - R.x) < 1.4 && Math.abs(o.z + c.position.z - R.z) < 1.6) { hitIt = true; c.visible = false; const f = c.clone(); f.position.set(c.position.x, c.position.y, o.z + c.position.z); fling(f, new THREE.Vector3(rnd(-4, 4), rnd(6, 9), -R.speed * 0.6), 1.4, 18, 10); } }
      if (hitIt) { o.hit.add(R); if (G.power === 'shield') { popText('BOING!', _p.set(R.x, 3, R.z), '#7affe8', 24, 0.7); sfx('boing'); } else crash(o.t === 'cows' ? 'cow' : 'thing', o); }
    }
  }
  R.crashT = Math.max(0, R.crashT - dt);
  for (const c of G.cars) {
    if (c.fly > 0) continue;
    const dz = c.z - R.z, dx = Math.abs(c.x - R.x), lenZ = (c.len + R.len) / 2, wx = (c.wide + R.wide) / 2;
    const ox = wx - dx, oz = lenZ - Math.abs(dz);
    if (ox > 0 && oz > 0 && !R.air) {
      if (G.power === 'shield') { c.fly = 1.1; c.vy = 8; c.vx = (c.x < R.x ? -1 : 1) * 6; c.rz = rnd(-4, 4); sfx('boing'); addCombo(1, 'BUMPER!'); popText('BOING!', _p.set(c.x, 3, c.z), '#7affe8', 26, 0.8); continue; }
      const sx = R.x >= c.x ? 1 : -1, head = c.dir < 0, rel = head ? R.speed + c.cur : R.speed - c.cur;
      if (ox < oz * 0.5) { R.x += sx * ox; G.tx = R.x + sx * 0.6; } else if (dz < 0) { R.z = c.z + lenZ; R.speed = head ? 0 : Math.min(R.speed, c.cur * 0.6); } else { R.z = c.z - lenZ; }
      if (R.crashT <= 0) { R.crashT = 1.2; c.hitT = 1; if (rel > 6 && ox >= oz * 0.5) { c.cur *= 0.3; crash(head ? 'head' : 'car', c); } else { sfx('bonk'); E.shake = 0.15; popText(ox < oz * 0.5 ? 'SCRAPE!' : 'TAP!', _p.set(R.x, 3, R.z), '#ffd0a0', 22, 0.6); bumpPassenger(0.15, 'tap'); } }
    }
    if (!c.nm && Math.abs(dz) < 1 && dx >= wx && dx < wx + 1.0 && R.speed > 14) { c.nm = true; G.turbo = Math.min(1, G.turbo + 0.12); sfx('swoosh'); popText(c.dir < 0 ? 'CLOSE CALL! 😱' : 'NEAR MISS!', _p.set(R.x, 3, R.z), '#ffe066', 26, 0.8); addCombo(c.dir < 0 ? 2 : 1); const H2 = MISSIONS[G.lv.P.m]; if (H2.near) H2.near(G.M); }
    if (Math.abs(dz) > 8) c.nm = false;
  }
  if (G.thief && !G.thief.caught) { const T = G.thief, dz = T.z - R.z; if (Math.abs(dz) < (T.len + R.len) / 2 && Math.abs(T.x - R.x) < 2 && R.crashT <= 0) { R.crashT = 0.8; R.speed *= 0.6; T.cur *= 0.7; G.M.catch = Math.min(100, G.M.catch + 12); sfx('crash'); E.shake = 0.4; popText('BAM! +12%', _p.set(R.x, 3, R.z), '#ff8a8a', 28, 0.8); say('Got him! Again!', 'laugh'); if (G.M.catch >= 100) caught(); } }
}
function crash(what, src) {
  const R = G.me; R.stun = 0.6; E.shake = what === 'head' ? 0.7 : 0.45; vib(what === 'head' ? 140 : 90);
  sfx(what === 'cow' ? 'moo' : 'crash'); puff(_p.set(R.x, 1, R.z - 2), 8, 0xffffff, { star: true, size: 0.4, speed: 4, cols: [0xffe066, 0xffffff] });
  popText(what === 'cow' ? 'MOOOO! 🐄' : what === 'head' ? 'HEAD-ON! 💥' : pick(['BONK!', 'CRASH!', 'OOPS!']), _p.set(R.x, 3, R.z), '#ff8a8a', 30, 0.8);
  if (src && src.V && Math.abs(src.z - R.z) < 30) { setTimeout(() => sfxT('horn', 0.3, 0, 3), 200); popText(pick(['ARRE BHAI!', 'OYE! Look!', 'Who gave you a licence?!']), _p.set(src.x, 3.6, src.z), '#fff', 20, 1); }
  addWanted(what === 'cow' ? 0.6 : 0.5, 'crash'); G.combo = 0; G.comboT = 0; $('combo').classList.add('hidden');
  const M = G.M, H = MISSIONS[G.lv.P.m]; CAB.bv += 3; cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  if (M && !M.done && G.t - (M.crashAt || -9) > 1.5) { M.crashAt = G.t; if (H.crash) H.crash(M); if (G.lv.P.m !== 'sleep') say(what === 'cow' && PASSR().cow.length ? pick(PASSR().cow) : pick(PASSR().hurt), 'scared'); }
}
// ---------------- the world each frame ----------------
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
function updateObjs(dt) {
  let nC = 0; const me = G.me;
  for (const o of G.objs) {
    const dz = o.z - me.z; o.obj.visible = dz < 30 && dz > -230; if (!o.obj.visible) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp')) for (const c of o.items) if (c.visible && nC < 160) { _cq.setFromAxisAngle(_Y, G.t * 4 + c.position.x); coinIM.setMatrixAt(nC++, _cm.compose(_cp.set(c.position.x, c.position.y, o.z + c.position.z), _cq, _cs)); }
    if (o.t === 'turbo') for (const b of o.items) { b.rotation.y += dt * 3; b.position.y = 1 + Math.sin(G.t * 4) * 0.2; }
    if (o.t === 'power') { o.items[0].rotation.y += dt * 2.5; o.items[0].position.y = 1.6 + Math.sin(G.t * 3) * 0.25; }
    if (o.t === 'runs') o.items[0].rotation.y = Math.sin(G.t * 2) * 0.4;
    if (o.t === 'stop' && o.zone.visible) o.zone.material.opacity = 0.3 + Math.sin(G.t * 6) * 0.15;
    if (o.t === 'balloon' || o.t === 'heart') o.items.forEach((b, i) => { b.position.y = 2 + Math.sin(G.t * 2 + i) * 0.3; if (o.t === 'heart') b.rotation.y += dt * 2; });
    if (o.t === 'cows') {
      if (dz > -50 && dz < 0) { o.chewT -= dt; if (o.chewT <= 0 && !o.gone) { o.chewT = 3; if (dz > -40) sfxT('moo', 1.5); if (G.state === 'drive' && dz > -45) showHint('📯 HONK to move the cows!'); } }
      o.cows.forEach(c => { if (o.gone) { c.obj.position.x = damp(c.obj.position.x, c.side * (RW / 2 + 3), 0.55, dt); c.obj.rotation.y = damp(c.obj.rotation.y, c.side < 0 ? -PI / 2 : PI / 2, 3, dt); } if (c.bonk) { c.bonk = Math.max(0, c.bonk - dt); c.obj.position.y = Math.sin(c.bonk * PI) * 1.2; } c.mx.update(dt); });
      o.x = o.cows.reduce((s, c) => s + c.obj.position.x, 0) / o.cows.length;
    }
    if (o.t === 'dog') { if (!o.go && dz > -26) { o.go = true; sfxT('woof', 0.5); animalWalk(o.dog, true); } if (o.go) { const p = o.dog.obj.position; p.x += dt * 5; if (p.x > RW / 2 + 3) p.x = 99; } o.dog.mx.update(dt * 2); o.x = o.dog.obj.position.x; }
    if (o.t === 'baraat' || o.t === 'fans') { if (!o.cross && dz > -55) { o.cross = true; o.ct = 0; if (o.t === 'baraat') { sfx('horn', 0, 1); popText('🥁 BARAAT! Band baaja! 🎺', _p.set(0, 4, o.z), '#ffe066', 24, 1.2); } else { sfx('crowd'); popText('🏏 FANS CROSSING!', _p.set(0, 4, o.z), '#7ac8ff', 24, 1.2); } showHint('🛑 BRAKE or HONK — people crossing!'); } if (o.cross) { o.ct += dt * (o.hurry ? 2.2 : 1); o.people.forEach(p => { if (p.jump) { p.jump = Math.max(0, p.jump - dt * 1.5); p.x += dt * 9; } else p.x += dt * (o.hurry ? 4 : 1.9); }); if (o.people.every(p => p.x > RW / 2 + 2)) { o.cross = false; o.t = o.t + 'Done'; } } }
  }
  coinIM.count = nC; coinIM.instanceMatrix.needsUpdate = true;
  for (const o of G.objs) if (o.t === 'dog' && o.go && !o.hit.has(me) && Math.abs(o.z - me.z) < 1.8 && Math.abs(o.x - me.x) < 1.4) { o.hit.add(me); me.speed *= 0.5; sfx('woof'); popText('WOOF! 🐶', _p.set(me.x, 3, me.z), '#fff', 26, 0.8); bumpPassenger(0.2, 'dog'); }
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
  for (const o of G.objs) if ((o.t === 'baraat' || o.t === 'fans') && o.cross && o.obj.visible) for (const p of o.people) { p.t += dt; (p.f ? lf : lm).push({ x: p.x, z: o.z - p.dz, y: p.jump ? Math.sin(p.jump * PI) * 1.2 : 0, ry: PI / 2, clip: p.jump ? 'hit' : o.t === 'baraat' ? 'cheer' : 'run', t: p.t, s: 1, tint: p.tint, skin: 0xc68642, hair: 0x1a1210, expr: p.jump ? EXPR.scared : EXPR.laugh }); }
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
  if (G.state === 'drive') { interact(dt); MISSIONS[G.lv.P.m].tick(G.M, dt); checkArrive(dt); Engine.set(G.me.speed / 30, false, PF.set.sound ? 0.07 : 0); G.wanted = Math.max(0, G.wanted - dt * 0.025); if ((G.t * 2 | 0) % 4 === 0) updateWanted(); }
  updateCombo(dt); if (G.powerT > 0) { G.powerT -= dt; if (G.powerT <= 0) setPower(null); }
  if (G.walker && G.walker.visible) { G.walker.update(dt); walkerMove(dt); }
  if (faceT > 0) { faceT -= dt; if (faceT <= 0) setExpr(baseExpr(), 0); } else if (G.M && G.M.expr !== baseExpr() && G.state === 'drive') setExpr(baseExpr(), 0);
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.add('hidden'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hidden'); }
  if (cabFxT > 0) { cabFxT -= dt; if (cabFxT <= 0) $('cabFx').style.opacity = 0; }
  if (G.arrow) { G.arrow.position.y = 4 + Math.sin(G.t * 4) * 0.4; G.arrow.rotation.y += dt * 2; G.zone.material.opacity = 0.3 + Math.sin(G.t * 5) * 0.12; }
  // the weather and the life of each place
  const S = G.lv.S, me = G.me;
  if (S.rain && Math.random() < dt * 60) puff(_p.set(me.x + rnd(-14, 14), rnd(6, 12), me.z - rnd(-4, 40)), 1, 0xc8d8f0, { size: 0.1, speed: 0, life: 0.5, grav: 40 });
  if (S.rain && Math.random() < dt * 0.08 && G.state === 'drive') { flash('#e8f0ff', 0.45); setTimeout(() => sfx('boom'), 400); }
  if (S.holi && Math.random() < dt * 1.2) puff(_p.set(pick([-1, 1]) * rnd(8, 12), rnd(1, 3), me.z - rnd(20, 80)), 10, 0xffffff, { cols: SMASHC.colour, size: 1.6, speed: 2, life: 1.6, grav: -0.3, grow: 2 });
  if (S.night && Math.random() < dt * 0.7) { puff(_p.set(rnd(-30, 30), rnd(25, 40), me.z - rnd(60, 140)), 24, 0xffffff, { star: true, add: true, cols: [0xff4fa8, 0x4fe8ff, 0xffe04f, 0x8aff4f], speed: 8, life: 1.3, size: 0.8, grav: 3 }); if (Math.random() < 0.3) sfxT('firework', 0.6); }
  if (S.fans && Math.random() < dt * 0.15 && G.state === 'drive') sfxT('crowd', 3);
  updateCab(dt); updateHud(dt);
  if (G.state === 'arrive') { G.arriveT += dt; if (G.arriveT > 3.6 && !G.resultsShown) { G.resultsShown = true; results(); } }
}

// ---------------- the start of a ride: the passenger walks to the taxi and gets in ----------------
function intro(dt) {
  G.introT += dt; const t = G.introT, P = G.lv.P, w = G.walker;
  if (t > 1.2 && w.clip === 'wave') { w.play('walk'); sfx('talk', 0, { w: 'taxi', f0: P.f0, fk: P.fk }); }
  if (t > 2.6 && w.visible) { w.visible = false; sfx('thud'); say(P.intro, 'happy'); setExpr('happy', 2); }
  if (t > 3.1 && !G.cardShown) { G.cardShown = true; banner(P.name.toUpperCase(), P.task, 3); }
  if (t > 5.4) { G.state = 'drive'; Engine.start(); banner('GO!', '', 0.7); sfx('go'); vib(30); if (P.m === 'sleep') setExpr('calm', 99); if (P.m === 'chase') say('Follow that THIEF car!', 'angry'); }
}
function walkerMove(dt) { const w = G.walker; if (w.clip === 'walk') { w.position.x = damp(w.position.x, G.me.x - 1.2, 2.2, dt); w.position.z = damp(w.position.z, G.me.z, 2.2, dt); w.position.y = damp(w.position.y, 0, 4, dt); w.rotation.y = Math.atan2(G.me.x - 1.2 - w.position.x, G.me.z - w.position.z) || PI / 2; } }
// ---------------- the end of a ride ----------------
function checkArrive(dt) {
  const R = G.me, L = G.lv.L; if (G.lv.P.m === 'chase') { if (R.z < -L - 40 && !G.thief.caught) fail('The thief reached his hideout!'); return; }
  const d = R.z + L;
  if (d < 70 && d > -14) showHint(R.x > 0 ? '⬅️ Pull over to the LEFT!' : '🛑 BRAKE in the green zone!');
  if (Math.abs(d) < 13 && R.speed < 2.2 && R.x < 0.5) arrive(MISSIONS[G.lv.P.m].ok ? MISSIONS[G.lv.P.m].ok(G.M) : true);
  else if (d < -14) {   // missed the stop: around the block (it costs time and mood)
    G.missedN++; mood(-15); say(pick(['Arre! You MISSED it!', 'Bhaiya, it was THERE!', 'Go back! Go back!']), 'angry'); sfx('gateBad');
    G.lv.L += 160; G.dest.position.z = -G.lv.L; G.party.forEach(q => { q.z -= 160; }); banner('⤴️ MISSED THE STOP!', 'Around the block…', 1.4);
  }
}
function arrive(ok) {
  if (G.state !== 'drive') return; const M = G.M; M.done = true; G.state = 'arrive'; G.arriveT = 0; Engine.stop(); $('hint').classList.add('hidden');
  const P = G.lv.P; if (!ok) { fail(MISSIONS[P.m].why || P.lose); return; }
  G.result = { ok: true, why: '' };
  sfx('fanfare'); sfx('crowd', 0.3); music('win'); setExpr('laugh', 99); CAB.actor.play('sittalk'); say(P.win, 'laugh');
  banner('🎉 RIDE COMPLETE!', P.name + ' is happy!', 2.2);
  // the passenger gets out and dances with the welcome party
  const w = G.walker; w.visible = true; w.position.set(G.me.x - 1.4, 0, G.me.z); w.rotation.y = 0.8; w.play('cheer'); w.expr = EXPR.laugh;
  for (let i = 0; i < 5; i++) setTimeout(() => puff(_p.set(G.me.x + rnd(-4, 2), rnd(4, 7), G.me.z + rnd(-3, 3)), 16, 0xffffff, { star: true, add: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0], speed: 5, life: 1.2, size: 0.4 }), i * 300);
}
function fail(why) {
  if (G.state !== 'drive' && G.state !== 'arrive') return; const M = G.M; M.done = true; G.state = 'arrive'; G.arriveT = 0; Engine.stop(); G.result = { ok: false, why };
  const P = G.lv.P; sfx('sad'); setExpr('angry', 99); say(P.lose, 'angry'); banner('😤 RIDE FAILED', why, 2.4); vib(120);
  const w = G.walker; w.visible = true; w.position.set(G.me.x - 1.4, 0, G.me.z); w.rotation.y = 0.8; w.play('angry'); w.expr = EXPR.angry;
}
// ---------------- HUD ----------------
let hudN = 0;
const MOODE = ['😡', '😠', '😟', '🙂', '😀', '🤩'];
function updateHud(dt) {
  if (!G.M || $('hud').classList.contains('hidden')) return; const M = G.M, R = G.me;
  $('coinN').textContent = G.coins; $('kmh').textContent = Math.round(R.speed * 3.6);
  $('turboB').style.setProperty('--p', Math.round(G.turbo * 100)); $('turboB').classList.toggle('ready', G.turbo >= 0.33); $('turboN').textContent = Math.floor(G.turbo / 0.33 + 0.001);
  if ((hudN++ & 3) === 0) {
    $('moodFill').style.width = M.mood + '%'; $('moodE').textContent = MOODE[Math.min(5, Math.floor(M.mood / 17))]; $('moodName').textContent = G.lv.P.name.toUpperCase();
    $('moodBar').style.setProperty('--bw', $('moodBar').offsetWidth + 'px');
    const g = MISSIONS[G.lv.P.m].goal(M); $('goal').textContent = g.t; $('goal').classList.toggle('warn', !!g.warn);
    $('dist').textContent = G.police && !G.police.leaving ? '🚨 POLICE ' + Math.max(0, Math.round(G.police.z - R.z)) + ' m behind — ESCAPE!' : G.lv.P.m === 'chase' ? '🚓 Don\'t let him escape!' : '🏁 ' + Math.max(0, Math.round(R.z + G.lv.L)) + ' m to ' + G.lv.P.place.replace(/^\S+\s/, '');
  }
  if ((hudN & 7) === 0) { drawFace(faceCv, G.lv.P.look, M.expr, G.t, bubbleT > 0); $('bubbleFace').getContext('2d').drawImage(faceCv, 0, 0); }
}

// ---------------- results, garage ----------------
function stars() { const m = G.M.mood; return m > 80 ? 5 : m > 60 ? 4 : m > 40 ? 3 : m > 20 ? 2 : 1; }
function results() {
  const P = G.lv.P, ok = G.result.ok, st = ok ? stars() : 0, fare = ok ? 50 + Math.round(G.lv.L / 12) : 10, tip = ok ? [0, 0, 10, 30, 60, 100][st] + G.lv.n * 2 : 0, combo = G.best >= 3 ? G.best * 4 : 0, total = Math.max(0, fare + tip + G.coins + combo - G.fines);
  PF.coins += total; if (ok) { PF.level = Math.max(PF.level, G.lv.n + 1); PF.rides++; PF.stars += st; } PF.save();
  const rv = ok ? P.reviews[st >= 5 ? 0 : st >= 4 ? 1 : st >= 3 ? 2 : 3] : P.lose, unlock = ok ? nextUnlock() : null, nextP = PASS[G.lv.n % PASS.length];
  openModal(`<h2>${ok ? (st >= 5 ? '🤩 SUPER RIDE!' : '🚕 RIDE DONE!') : '😤 RIDE FAILED'}</h2>${ok ? `<div class="stars">${[0, 1, 2, 3, 4].map(i => `<i class="${i < st ? 'on' : ''}">⭐</i>`).join('')}</div>` : `<p class="tip">${G.result.why}</p>`}
    <div class="review"><div class="who"><canvas id="revFace" width="64" height="64"></canvas><b>${P.name}</b></div>“${rv}”</div>
    <div class="stat"><span>🚕 Fare</span><b>₹${fare}</b></div><div class="stat"><span>💝 Tip</span><b>₹${tip}</b></div><div class="stat"><span>🪙 Coins, smashes & stunts</span><b>₹${G.coins}</b></div>
    ${combo ? `<div class="stat"><span>🔥 Best MASTI combo x${G.best}</span><b>₹${combo}</b></div>` : ''}${G.fines ? `<div class="stat"><span>🚓 Police challan</span><b>-₹${G.fines}</b></div>` : ''}
    <div class="big" id="totalB">+₹${total}</div>${ok ? `<p class="tip">Next: <b>${nextP.name}</b> · ${STAGES[STAGE_OF[nextP.id]].name}</p>` : ''}
    ${unlock ? `<div class="card" style="--rc:#ff4fa8"><div class="rar">NEW IN THE GARAGE</div><div class="hico">${unlock.horn ? '📯' : '🚕'}</div><b>${unlock.name}</b><span>can be bought now!</span></div>` : ''}
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE ₹</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">${ok ? 'NEXT RIDE ▶' : 'TRY AGAIN ↻'}</button></div><div class="row"><button class="btn small" id="garB">🔧 GARAGE</button><button class="btn small" id="homeB">HOME</button></div>`);
  drawFace($('revFace'), P.look, ok ? (st >= 3 ? 'laugh' : 'calm') : 'angry', 0, false);
  if ($('dblB')) $('dblB').onclick = () => { sfx('pop'); rewardAd('double', r => { if (!r) return; PF.coins += total; PF.save(); $('totalB').textContent = '+₹' + total * 2; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { sfx('pop'); closeModal(); betweenLevels(PF.level, () => play(ok ? G.lv.n + 1 : G.lv.n)); };
  $('garB').onclick = () => { sfx('pop'); garage(() => goHome()); };
  $('homeB').onclick = () => { sfx('pop'); goHome(); };
}
function nextUnlock() { const n = G.lv.n; if (n % 2) return null; const all = [...CARS.slice(1).map(c => ({ ...c })), ...HORNS.slice(1).map(h => ({ ...h, horn: 1 }))].sort((a, b) => a.price - b.price); return all[Math.min(all.length - 1, n / 2 - 1)] || null; }
function garage(back) {
  const cars = CARS.map(v => { const own = PF.cars.includes(v.id), on = PF.car === v.id; return `<div class="item"><div class="ico">🚕</div><div class="txt"><b>${v.name}</b><span>Speed ${'★'.repeat(Math.round((v.sp - 0.95) * 30))} · Comfort ${'★'.repeat(Math.round((1.2 - v.soft) * 5))}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-c="${v.id}" ${on || (!own && PF.coins < v.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'USE' : '₹' + v.price}</button></div>`; }).join('');
  const horns = HORNS.map(h => { const own = PF.horns.includes(h.k), on = PF.horn === h.k; return `<div class="item"><div class="ico">📯</div><div class="txt"><b>${h.name}</b><span><a data-try="${h.k}">▶ listen</a></span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-h="${h.k}" ${on || (!own && PF.coins < h.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'USE' : '₹' + h.price}</button></div>`; }).join('');
  openModal(`<h2>GARAGE</h2><p>₹ <b>${PF.coins}</b></p><h3>Taxis</h3><div class="list">${cars}</div><h3>Horns</h3><div class="list">${horns}</div><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const v = CARS.find(q => q.id === b.dataset.c); if (!PF.cars.includes(v.id)) { if (PF.coins < v.price) return; PF.coins -= v.price; PF.cars.push(v.id); sfx('kaching'); } else sfx('pop'); PF.car = v.id; PF.save(); if (G.state === 'home') startLevel(PF.level, false); garage(back); });
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const h = HORNS.find(q => q.k === +b.dataset.h); if (!PF.horns.includes(h.k)) { if (PF.coins < h.price) return; PF.coins -= h.price; PF.horns.push(h.k); sfx('kaching'); } PF.horn = h.k; PF.save(); sfx('horn', 0, h.k); garage(back); });
  document.querySelectorAll('[data-try]').forEach(b => b.onclick = () => { Audio.resume(); sfx('horn', 0, +b.dataset.try); });
  $('closeB').onclick = () => { sfx('pop'); closeModal(); back(); };
}
// ---------------- screens ----------------
function setScreen(s) { $('home').classList.toggle('hidden', s !== 'home'); $('hud').classList.toggle('hidden', s !== 'hud'); }
function play(n = PF.level) { closeModal(); setScreen('hud'); G.resultsShown = false; G.cardShown = false; startLevel(n, true); $('bubble').classList.add('hidden'); }
function goHome() { closeModal(); Engine.stop(); startLevel(PF.level, false); setScreen('home'); refreshHome(); music('title'); }
function refreshHome() { const P = PASS[(PF.level - 1) % PASS.length]; $('homeCoins').textContent = PF.coins.toLocaleString(); $('homeLevel').innerHTML = `RIDE ${PF.level}<small>Next: ${P.name}</small>`; $('giftB').classList.toggle('dot', giftState(PF).can); }
function pause() { if (G.state !== 'drive' && G.state !== 'intro') return; G.paused = G.state; G.state = 'pause'; Engine.stop(); Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { sfx('pop'); closeModal(); resume(); }; $('setB2').onclick = () => settings(); $('homeB').onclick = () => { sfx('pop'); goHome(); }; }
function resume() { G.state = G.paused || 'drive'; if (G.state === 'drive') Engine.start(); music(G.lv.music); }
function settings() { settingsPanel(PF, 'Mad Taxi Masti', 'Characters, animals, nature: Quaternius (CC0) · Road signs and cones: Kenney (CC0) · Cars and streets: BajrangVerse Studios<br>Title and victory music: BajrangVerse Studios<br>Music: "Riley", "Polka Train", "Monkeys Spinning Monkeys", "Fuzzball Parade", "Merry Go" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0', k => { if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : G.lv.music); else Music.stop(); } if (k === 'hi') setQuality(PF.set.hi ? 2 : 0); }, () => { if (G.state === 'pause') resume(); }); }
onAdDone(() => { if (PF.set.music && G.lv) music(G.state === 'home' ? 'title' : G.state === 'arrive' ? 'win' : G.lv.music); });
window.onAppPause = () => { pause(); Engine.stop(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (modalOpen()) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'drive' || G.state === 'intro') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };
// ---------------- input: drag to steer, hold BRAKE, tap HORN and TURBO ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); drag = { x: e.clientX, y: e.clientY, tx: G.tx, id: e.pointerId, sw: false }; });
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id || G.state !== 'drive') return; const dy = e.clientY - drag.y; if (!drag.sw && dy < -40 && G.me.air) { drag.sw = true; stunt(); return; } G.tx = drag.tx + (e.clientX - drag.x) / Math.min(innerWidth, 500) * 16; });
addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) drag = null; });
const brakeOn = on => { if (G.me) G.me.brake = on; $('brakeB').classList.toggle('on', on); };
$('brakeB').addEventListener('pointerdown', e => { e.stopPropagation(); brakeOn(true); });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('brakeB').addEventListener(ev, () => brakeOn(false));
$('hornB').addEventListener('pointerdown', e => { e.stopPropagation(); honk(); });
$('turboB').addEventListener('pointerdown', e => { e.stopPropagation(); useTurbo(); });
addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 's') brakeOn(true); if (e.key === 'h') honk(); if (e.key === 'ArrowUp') stunt(); if (e.key === ' ' || e.key === 'n') useTurbo(); if (e.key === 'ArrowLeft') G.tx -= 3.5; if (e.key === 'ArrowRight') G.tx += 3.5; });
addEventListener('keyup', e => { if (e.key === 'ArrowDown' || e.key === 's') brakeOn(false); });
$('playB').onclick = () => { Audio.resume(); sfx('pop'); play(); };
$('garageB').onclick = () => { sfx('pop'); garage(refreshHome); };
$('giftB').onclick = () => { sfx('pop'); giftPanel(PF, '₹', refreshHome); };
$('setB').onclick = () => { sfx('pop'); settings(); };
$('pauseB').onclick = () => { sfx('pop'); pause(); };
document.addEventListener('pointerdown', () => { Audio.resume(); if (G.state === 'home') music('title'); }, { once: true });

// ---------------- camera ----------------
const camP = new THREE.Vector3(0, 6, 12), camL = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3();
function camera(dt) {
  const R = G.me; let k1 = 5, k2 = 7;
  if (G.state === 'home') { tp.set(R.x + 4.5 + Math.sin(G.t * 0.3) * 1.5, 2.3, R.z - 5.5 + Math.sin(G.t * 0.2)); tl.set(R.x - 0.4, 0.9, R.z + 0.5); k1 = 2; }
  else if (G.state === 'intro') { tp.set(R.x + 6.5, 2.8, R.z - 6.5); tl.set(R.x - 2.2, 1.0, R.z); k1 = 2.5; }
  else if (G.state === 'arrive') { tp.set(R.x + 4.5, 3, R.z + 6.5); tl.set(R.x - 2.5, 1.3, R.z - 1); k1 = 1.8; }
  else { const air = R.air ? Math.min(3, R.y * 0.45) : 0; tp.set(R.x * 0.7, R.y * 0.5 + 4.2 + air, R.z + 9 + air); tl.set(R.x * 0.85, R.y * 0.6 + 1.3, R.z - 10); }
  camP.lerp(tp, 1 - Math.exp(-k1 * dt)); camL.lerp(tl, 1 - Math.exp(-k2 * dt));
  if (G.state === 'drive') { camP.z = tp.z; camL.z = tl.z; }
  const fovT = E.fovBase + (R.turbo > 0 ? 12 : 0) + Math.min(6, R.speed * 0.12); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); cam.lookAt(bendPoint(camL, _q));
  G.track.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(R.x, 0, R.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(_q.set(-8, 22, 10));
}
// ---------------- boot ----------------
const t0 = performance.now();
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap */ } }
Promise.all(['people.bin', 'kit.glb', 'nature.glb', 'cow.glb', 'pug.glb', 'horse.glb'].map(loadBin)).then(async ([pb, kb, nb, cb, db, hb]) => {
  PEOPLE = await loadPeople(pb);
  const gl = new GLTFLoader(), K = (await gl.parseAsync(kb, '')).scene, N = (await gl.parseAsync(nb, '')).scene.getObjectByName('nature');
  setKits(K, N);
  const cow = await gl.parseAsync(cb, ''); COW = { scene: cow.scene, anims: cow.animations, s: animalScale(cow.scene, 1.6) };
  const pug = await gl.parseAsync(db, ''); PUG = { scene: pug.scene, anims: pug.animations, s: animalScale(pug.scene, 0.6) };
  const hor = await gl.parseAsync(hb, ''); HORSE = { scene: hor.scene, anims: hor.animations, s: animalScale(hor.scene, 2.0) };
  blobs = new Blobs(scene, dotTex, 90); crowdM = new Crowd(scene, PEOPLE.pedM); crowdF = new Crowd(scene, PEOPLE.pedF); crowdM.prewarm(16); crowdF.prewarm(16);
  if (Q.get('level')) PF.level = +Q.get('level');
  placeCabFrame(); startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  Music.warm(['title', 'drive', 'win']);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  startLoop({ update, camera, post: renderCab, active: () => G.state === 'drive', frozen: () => G.state === 'load' || G.state === 'pause' });
  if (Q.get('play')) play();
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; console.error(e); });
window.__cab = { cab, cabCam, CAB, renderCab };
window.__G = G; window.__play = play; window.__honk = honk; window.__turbo = useTurbo; window.__brake = brakeOn; window.__stunt = stunt; window.__police = callPolice; window.__places = () => [G.state, Math.round(G.me.z), G.M && Math.round(G.M.mood)];
