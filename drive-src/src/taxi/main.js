// MAD TAXI MASTI — by BajrangVerse Studios
// You drive a city taxi. Every ride is a crazy passenger with a crazy wish: a groom who is late for his own wedding,
// a granny with a basket of eggs, a sleeping uncle who must not wake up, an influencer who wants stunts, a detective
// aunty chasing a thief, a cricket fan, a boss on a call, a bored kid. Drag to steer, hold BRAKE, tap HORN to move
// cows, TURBO to fly. The back-seat camera shows your passenger's face live. Stop in the green zone to drop them off.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { setBend, bendPoint, canvasTex, flat, mesh, oneMesh } from '../common/gfx.js';
import { renderer, scene, cam, hemi, sun, E, $, Q, PI, clamp, damp, rnd, pick, puff, popText, banner, flash, startLoop, loadBin, setQuality, fling, clearFx, clearPops, warmRing, dotTex } from '../common/engine.js';
import { buildTrack, setKits, kit } from '../common/track.js';
import { makeVehicle, driveWheels, CAR_S } from '../common/vehicles.js';
import { loadPeople, Actor, Crowd, Blobs, EXPR } from '../common/people.js';
import { drawFace } from '../common/portrait.js';
import { Audio } from '../common/audio.js';
import { Music } from '../common/music.js';
import { Engine } from '../common/sfx.js';
import { makePrefs, openModal, closeModal, modalOpen, onAdDone, adReady, rewardAd, betweenLevels, vibrate, settingsPanel, giftPanel, giftState } from '../common/ui.js';

const PF = makePrefs('madtaxi_v1', { level: 1, coins: 0, cars: ['taxi'], car: 'taxi', horns: [0], horn: 0, rides: 0, stars: 0, gift: null, set: { sound: true, music: true, vib: true, hi: true } });
setQuality(PF.set.hi ? 2 : 0); Audio.setMuted(!PF.set.sound);
Music.config({ title: 'bv_title', drive: 'riley', drive2: 'polka', drive3: 'monkeys', chase: 'fuzzball', win: 'bv_win', happy: 'merry_go' }, { bv_title: 0.95, bv_win: 1, riley: 0.7, polka: 0.7, monkeys: 0.7, fuzzball: 0.75, merry_go: 0.75 });
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d, a) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d, a); };
E.onSfx = n => sfxT(n, 0.05);
const vib = ms => vibrate(PF, ms);
const _p = new THREE.Vector3(), _q = new THREE.Vector3();

// ---------------- cars and horns ----------------
const CARS = [
  { id: 'taxi', name: 'Kaali-Peeli Classic', price: 0, sp: 1, soft: 1 }, { id: 'hatchback-sports', name: 'Zippy Hatch', price: 700, sp: 1.05, soft: 1 },
  { id: 'sedan', name: 'Comfy Sedan', price: 1400, sp: 1.04, soft: 0.7 }, { id: 'suv', name: 'Bump-Proof SUV', price: 2400, sp: 1.06, soft: 0.5 },
  { id: 'sedan-sports', name: 'Speedy Sports', price: 3600, sp: 1.12, soft: 0.85 }, { id: 'race-future', name: 'Rocket Taxi 3000', price: 6000, sp: 1.18, soft: 0.7 }];
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
  { id: 'uncle', name: 'Sleepy Sharma Uncle', m: 'sleep', place: '🏢 UNCLE\'S OFFICE', tint: 0x2a5a8a, skin: 0xc68642, hair: 0x2a2018, look: { skin: 0xc68642, hair: 0x2a2018, style: 'short', tache: 1 }, f0: 110, fk: 0.86,
    intro: 'Yawn… wake me at the office. Don\'t honk. Don\'t bump. Zzz…', task: 'Don\'t wake him! No HORN, no bumps. 3 wake-ups = out!', happy: ['Zzz… mmm… samosa… zzz', 'Zzz…'], sad: ['WHO HONKED?!', 'I WAS DREAMING OF A HOLIDAY!', 'Grrr! Let me sleep!'],
    hurt: ['WHAT?! An earthquake?!', 'Huh?! Who?! Where?!'], cow: [], win: 'Ahh, what a nice nap! Here, a big tip!', lose: 'THAT\'S IT! I\'m awake! I will walk to office!',
    reviews: ['Best nap of my life. Did not even know I was in a taxi!', 'Slept well. One small earthquake.', 'Woke up twice. Grumpy all day.', 'Sleep? In this taxi? Impossible.'] },
  { id: 'influencer', name: 'Insta Pinky', m: 'likes', place: '🛍️ MEGA MALL', tint: 0xff4fa8, skin: 0xe0ac69, hair: 0x3a2010, look: { skin: 0xe0ac69, hair: 0x3a2010, style: 'long' }, f0: 280, fk: 1.15,
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

// ---------------- the city of a ride ----------------
const RW = 14, HALF = RW / 2 - 1.2, LANES = [-5.25, -1.75, 1.75, 5.25];   // India drives on the LEFT: our lanes are x < 0
const THEMES = ['city', 'town', 'city', 'night', 'town', 'city', 'town', 'night'];
function makeLevel(n) {
  let seed = n * 4241 + 7; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const P = PASS[(n - 1) % PASS.length], d = Math.min(1, (n - 1) / 24), loop = Math.floor((n - 1) / PASS.length);
  const L = Math.round(Math.min(2300, (P.m === 'chase' ? 1700 : 1100) + n * 35));
  const ev = []; const our = [LANES[0], LANES[1]];
  for (let z = -110; z > -L + 90; z -= r(34, 52) - d * 8) {
    const pool = ['coins', 'coins', 'breaker', 'pothole', 'cows', 'turbo', 'cones'];
    if (n >= 3) pool.push('cows', 'dog'); if (n >= 2) pool.push('breaker');
    if (P.m === 'likes' || (n >= 4 && R() < 0.3)) pool.push('ramp');
    if (P.m === 'runs') pool.push('runs', 'runs', 'runs', 'runs'); if (P.m === 'fun') pool.push('balloon', 'balloon', 'balloon'); if (P.m === 'likes') pool.push('ramp', 'heart');
    const t = pk(pool); ev.push({ t, z, x: t === 'cows' || t === 'cones' || t === 'pothole' ? pk(our) : pk(LANES), x2: pk(LANES), n: 1 + Math.floor(R() * 2) });
  }
  const traffic = Math.round(5 + d * 5 + loop), oncoming = Math.round(4 + d * 4 + loop);
  return { n, L, d, P, theme: THEMES[(n - 1) % THEMES.length], ev, traffic, oncoming, music: P.m === 'chase' ? 'chase' : pk(['drive', 'drive2', 'drive3']) };
}

// ---------------- state ----------------
const G = { state: 'load', t: 0, lv: null, track: null, objs: [], cars: [], coins: 0, turbo: 0.34, me: null };
let PEOPLE = null, COW = null, PUG = null, blobs = null, crowdM = null, crowdF = null;
// ---------------- the player's taxi ----------------
function makeMe() {
  const V = makeVehicle(PF.car, CAR_S); scene.add(V.obj);
  const roof = new THREE.Group(); if (PF.car !== 'taxi') { mesh(new THREE.BoxGeometry(0.9, 0.32, 0.4), flat(0xffd23f), 0, 0, 0, roof); const t = canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = 'bold 34px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TAXI', w / 2, h / 2 + 2); }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.3), new THREE.MeshBasicMaterial({ map: t })); s.position.set(0, 0, 0.205); roof.add(s); const s2 = s.clone(); s2.position.z = -0.205; s2.rotation.y = PI; roof.add(s2); roof.position.set(0, V.size.y + 0.12, 0.1); V.obj.add(roof); }
  return { V, x: LANES[1], z: 0, y: 0, vy: 0, speed: 0, air: false, turbo: 0, stun: 0, steer: 0, brake: false, crashT: 0 };
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
function placeCabFrame() { const r = cabRect(); cabFrame.style.boxSizing = 'border-box'; cabFrame.style.right = 'auto'; cabFrame.style.left = r.x - 4 + 'px'; cabFrame.style.width = r.w + 8 + 'px'; cabFrame.style.height = r.h + 8 + 'px'; cabFrame.style.top = r.top - 4 + 'px'; document.documentElement.style.setProperty('--cabW', r.w + 'px'); cabCam.aspect = r.w / r.h; cabCam.updateProjectionMatrix(); }
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
  runs: { setup(M) { M.runs = 0; M.need = 24 + Math.round(G.lv.n / 2); }, tick(M, dt) { mood(-0.5 * dt); },
    goal(M) { return { t: '🏏 Runs: ' + M.runs + ' / ' + M.need, warn: false }; }, runs(M, k) { M.runs += k; mood(k === 6 ? 14 : 9); say(k === 6 ? 'SIXER!!' : 'FOUR! What a shot!', 'laugh'); sfx('crowd'); }, crash() { mood(-8); }, bump(k) { mood(-3 * k); }, ok(M) { return M.runs >= M.need; }, why: 'Not enough runs!' },
  call: { setup(M) { M.callT = 4; M.on = false; M.slowT = 0; }, tick(M, dt) { M.callT -= dt; if (M.callT <= 0) { M.on = !M.on; M.callT = M.on ? 7 : rnd(6, 9); if (M.on) { say('Hello? Yes, Khanna here…', 'calm'); CAB.actor.play('sittalk'); cabFx('📞'); } else { say(pick(['Deal! Okay, bye.', 'Call you back.']), 'happy'); CAB.actor.play('sit'); cabFx(''); } }
      if (G.me.speed < 12) { M.slowT += dt; if (M.slowT > 3) { mood(-3 * dt); moan(M, 'sad'); } } else { M.slowT = 0; mood(0.8 * dt); } },
    goal(M) { return { t: M.on ? '📞 ON CALL — QUIET! ' + Math.ceil(M.callT) : '🤫 Next call in ' + Math.ceil(M.callT), warn: M.on }; }, honk(M) { if (M.on) { mood(-14); say('I\'M ON A CALL!', 'angry'); } }, bump(k, M) { if (M.on && k > 0.2) { mood(-10); say('The line is breaking!', 'angry'); } }, crash() { mood(-15); }, near() { } },
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
  G.cars.forEach(c => scene.remove(c.V.obj)); G.cars = []; if (G.me) scene.remove(G.me.V.obj); if (G.thief) { scene.remove(G.thief.V.obj); G.thief = null; }
  if (G.dest) { scene.remove(G.dest); G.dest = null; } if (G.walker) { scene.remove(G.walker); G.walker = null; } clearFx(); clearPops();
}
function startLevel(n, playNow) {
  clearLevel();
  const lv = G.lv = makeLevel(n), P = lv.P;
  setBend(n + 3, -lv.L - 300, 0.9, 0.2, -40);
  G.track = buildTrack({ L: lv.L + 260, RW, lanes: 4, theme: lv.theme, water: [] }, scene);
  hemi.intensity = G.track.theme.night ? 1.2 : 2.5; sun.intensity = G.track.theme.night ? 1.0 : 2.9;
  G.me = makeMe(); G.me.x = LANES[0]; G.me.z = 0;
  for (const e of lv.ev) spawn(e);
  // traffic: our side (slower cars to overtake) and the other side (coming at you!)
  for (let i = 0; i < lv.traffic; i++) addCar(1, -40 - i * (200 / lv.traffic) - rnd(0, 15));
  for (let i = 0; i < lv.oncoming; i++) addCar(-1, -30 - i * (240 / lv.oncoming) - rnd(0, 20));
  buildDest();
  // the passenger waits at the kerb and waves
  seatPassenger(P); const w = G.walker = new Actor(PEOPLE[P.id], { tint: P.tint, skin: P.skin, hair: P.hair, expr: EXPR.happy }); w.position.set(-RW / 2 - 1.1, 0.25, -1.5); w.rotation.y = PI / 2; w.play('wave'); scene.add(w);
  G.M = { mood: 70, expr: 'happy', done: false };
  MISSIONS[P.m].setup(G.M); setExpr(baseExpr(), 0);
  Object.assign(G, { t: 0, coins: 0, turbo: 0.34, tx: G.me.x, introT: 0, state: playNow ? 'intro' : 'home', arriveT: 0, missedN: 0, result: null });
  $('lvl').textContent = 'RIDE ' + n; $('cabFx').textContent = '';
  try { G.track.cullAll(); const done = warmRing(); renderer.compile(scene, cam); renderer.render(scene, cam); renderer.compile(cab, cabCam); done(); } catch (e) { /* not needed */ }
  if (playNow) { music(lv.music); placeCabFrame(); }
}
// ---------------- the destination: a green stop zone, a sign, people waiting ----------------
function buildDest() {
  const P = G.lv.P, g = G.dest = new THREE.Group(), z = -G.lv.L; g.position.z = z; scene.add(g);
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 26), new THREE.MeshBasicMaterial({ color: 0x3fff6e, transparent: true, opacity: 0.38, depthWrite: false })); zone.rotation.x = -PI / 2; zone.position.set(-3.5, 0.06, 0); g.add(zone); G.zone = zone;
  const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2410'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#3a2410'; c.font = 'bold 52px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.place, w / 2, h / 2 + 4); });
  const sg = new THREE.Group(); const sm = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: sign })); sm.position.set(0, 6.2, 0); sg.add(sm);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.4, 8), flat(0x6a4a2a), s * 3.8, 3.2, 0, sg);
  if (P.m === 'late') for (let i = 0; i < 26; i++) { const a = i / 25 * PI; mesh(new THREE.SphereGeometry(0.28, 8, 6), flat(i % 2 ? 0xff9a1a : 0xffd23f), Math.cos(a) * 4.2, 5 + Math.sin(a) * 2.8, 0.1, sg); }
  sg.position.set(-RW / 2 - 1.6, 0, -2); g.add(sg);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4), new THREE.MeshBasicMaterial({ color: 0x3fff6e })); arrow.rotation.x = PI; arrow.position.set(-3.5, 4, 0); g.add(arrow); G.arrow = arrow;
  // the welcome party
  G.party = []; const n = P.m === 'late' ? 10 : 5;
  for (let i = 0; i < n; i++) G.party.push({ x: -RW / 2 - 2 - rnd(0, 3.5), z: z + rnd(-9, 9), f: i % 2, ry: PI / 2 + rnd(-0.5, 0.5), t: rnd(0, 3), tint: pick([0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524, 0xd8a070]), hair: pick([0x1a1210, 0x3a2010, 0x2a2018]) });
  g.traverse(q => { q.frustumCulled = false; });
}
// ---------------- traffic ----------------
const TRAFFIC = ['sedan', 'suv', 'van', 'truck', 'delivery', 'hatchback-sports', 'taxi', 'suv-luxury', 'truck-flat', 'garbage-truck', 'ambulance', 'tractor'];
function addCar(dir, z) {
  const name = pick(TRAFFIC), V = makeVehicle(name, CAR_S); if (dir < 0) V.obj.rotation.y = PI; scene.add(V.obj);
  const lanes = dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  const c = { V, dir, x: pick(lanes), z, sp: dir > 0 ? (name === 'tractor' ? 7 : rnd(9, 15)) : rnd(13, 19), cur: 0, honkT: 0, hitT: 0, len: Math.max(3.4, V.size.z), wide: V.size.x };
  c.lane = c.x; c.cur = c.sp; G.cars.push(c); return c;
}
function laneBlocked(x, z0, z1, self) {   // anything in this lane between z1 (ahead) and z0?
  for (const c of G.cars) if (c !== self && Math.abs(c.x - x) < 1.6 && c.z < z0 && c.z > z1) return true;
  for (const o of G.objs) if ((o.t === 'cows' && !o.gone) || o.t === 'cones') { if (o.z < z0 && o.z > z1 && Math.abs(o.x - x) < 2) return true; }
  return false;
}
function updateTraffic(dt) {
  const me = G.me;
  for (const c of G.cars) {
    if (c.dir > 0) {
      // keep a distance from whoever is in front (other cars, cows, cones, the taxi); change lanes to get past
      let want = c.sp; const front = c.z - c.len / 2;
      const ahead = [...G.cars.filter(q => q !== c && q.dir > 0 && Math.abs(q.x - c.x) < 1.6 && q.z < c.z), ...(Math.abs(me.x - c.x) < 1.8 && me.z < c.z ? [me] : [])].sort((a, b) => b.z - a.z)[0];
      if (ahead) { const gap = front - (ahead.z + (ahead.len || 4) / 2); if (gap < 14) want = Math.min(want, (ahead.cur ?? ahead.speed) * (gap < 6 ? 0.5 : 0.95)); if (gap < 3) want = 0; if (ahead === me && gap < 10 && me.speed < 3) { c.honkT -= dt; if (c.honkT <= 0) { c.honkT = rnd(1.5, 3); if (Math.abs(c.z - me.z) < 30) { sfxT('horn', 0.6, 0, rnd(0, 1) < 0.5 ? 2 : 0); popText('PEEP PEEP!', _p.set(c.x, 3, c.z), '#fff', 20, 0.6); } } } }
      if (laneBlocked(c.x, front, front - 16, c)) { const other = c.x === LANES[0] ? LANES[1] : LANES[0]; if (!laneBlocked(other, c.z + 6, front - 16, c) && !(Math.abs(me.x - other) < 2 && Math.abs(me.z - c.z) < 8)) c.lane = other; else want = Math.min(want, 1); }
      c.cur = damp(c.cur, want, 2, dt); c.z -= c.cur * dt; c.x = damp(c.x, c.lane, 1.8, dt);
      if (c.z > me.z + 30) respawn(c, me.z - rnd(170, 240)); else if (c.z < me.z - 280) respawn(c, me.z + 20 + rnd(0, 6), true);
    } else {
      let want = c.sp; const front = c.z + c.len / 2;
      const ahead = G.cars.filter(q => q !== c && q.dir < 0 && Math.abs(q.x - c.x) < 1.6 && q.z > c.z).sort((a, b) => a.z - b.z)[0];
      if (ahead && ahead.z - c.z < 12) want = Math.min(want, ahead.cur);
      // a taxi on the wrong side of the road coming at me: brake and honk!
      if (Math.abs(me.x - c.x) < 2 && me.z > c.z && me.z - c.z < 35) { want = Math.min(want, 4); c.honkT -= dt; if (c.honkT <= 0) { c.honkT = 1.4; sfxT('horn', 0.4, 0, 3); popText('POM POM!', _p.set(c.x, 3.4, c.z), '#ffb0a0', 22, 0.6); } }
      c.cur = damp(c.cur, want, 2.5, dt); c.z += c.cur * dt; void front;
      if (c.z > me.z + 30) respawn(c, me.z - rnd(200, 260));
    }
    c.hitT = Math.max(0, c.hitT - dt);
    c.V.obj.position.set(c.x, 0, c.z); c.V.obj.rotation.y = (c.dir < 0 ? PI : 0) + (c.lane - c.x) * 0.05 * c.dir; driveWheels(c.V, c.cur * dt, 0);
    c.V.obj.visible = c.z < me.z + 40 && c.z > me.z - 240;
  }
}
function respawn(c, z, behind) {
  const lanes = c.dir > 0 ? [LANES[0], LANES[1]] : [LANES[2], LANES[3]];
  for (let k = 0; k < 6; k++) { const x = pick(lanes); if (!G.cars.some(q => q !== c && Math.abs(q.x - x) < 1.6 && Math.abs(q.z - z) < 14) && !(behind && Math.abs(G.me.x - x) < 2)) { c.x = c.lane = x; c.z = z; c.cur = c.sp; return; } z -= 15; }
  c.z = z;
}
// ---------------- the detective's thief ----------------
function spawnThief() {
  const V = makeVehicle('sedan-sports', CAR_S); scene.add(V.obj);
  const d = new Actor(PEOPLE.pedM, { tint: 0x1a1a1a, skin: 0xa86b3c, hair: 0x1a1a1a, expr: EXPR.laugh }); d.play('idle'); d.scale.setScalar(0.85); d.position.set(0, 0.45, -0.1); V.obj.add(d);
  const tag = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#e8202a'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 30, 18); c.fill(); c.beginPath(); c.moveTo(w / 2 - 18, h - 27); c.lineTo(w / 2 + 18, h - 27); c.lineTo(w / 2, h - 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 46px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🥒 THIEF!', w / 2, 37); });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.12), new THREE.MeshBasicMaterial({ map: tag, transparent: true, depthTest: false })); tm.renderOrder = 5; tm.position.set(0, V.size.y + 1.6, 0); V.obj.add(tm);
  G.thief = { V, d, tm, x: LANES[1], z: -45, lane: LANES[1], cur: 18, len: 4, laneT: 2, dropT: 6, caught: false, sp: 21.5 + G.lv.d * 4 };
}
function updateThief(dt) {
  const T = G.thief; if (!T) return;
  if (T.caught) { T.cur = damp(T.cur, 0, 2, dt); T.z -= T.cur * dt; T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = damp(T.V.obj.rotation.y, 0.6, 3, dt); return; }
  const me = G.me, gap = me.z - T.z; let want = G.state === 'drive' ? T.sp + (gap > 70 ? -6 : gap < 12 ? 5 : 0) : 0;
  T.laneT -= dt; const front = T.z - 2;
  if (laneBlocked(T.lane, front + 1, front - 22, T) || T.laneT <= 0) { const opts = [LANES[0], LANES[1]].filter(x => !laneBlocked(x, front + 4, front - 22, T)); if (opts.length) T.lane = pick(opts); else want *= 0.5; T.laneT = rnd(2, 4.5); }
  T.cur = damp(T.cur, want, 1.5, dt); T.z -= T.cur * dt; T.x = damp(T.x, T.lane, 2.2, dt);
  T.dropT -= dt; if (T.dropT <= 0 && G.state === 'drive' && gap > 8 && gap < 60) { T.dropT = rnd(4, 7); const o = spawn({ t: 'box', z: T.z + 3, x: T.x }); o.fresh = true; sfx('thud'); popText('HEHEHE!', _p.set(T.x, 3, T.z), '#ffb0a0', 22, 0.7); }
  T.V.obj.position.set(T.x, 0, T.z); T.V.obj.rotation.y = (T.lane - T.x) * 0.06; driveWheels(T.V, T.cur * dt, 0); T.d.update(dt); T.tm.position.y = T.V.size.y + 1.6 + Math.sin(G.t * 6) * 0.2; T.tm.scale.setScalar(clamp(gap / 22, 1.2, 4));
}
function caught() {
  const T = G.thief; T.caught = true; G.M.catch = 100; sfx('fanfare'); flash('#ff4040', 0.3); banner('🚨 CAUGHT!', 'The pickle is safe!', 2); T.d.expr = EXPR.scared; say(PASSR().win, 'laugh');
  for (let i = 0; i < 3; i++) setTimeout(() => sfx('horn', 0, 2), i * 300);
  setTimeout(() => arrive(true), 1600);
}
// ---------------- things on the road ----------------
const coinG = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16); coinG.rotateX(PI / 2);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x8a5a00, roughness: 0.3 });
const coinIM = new THREE.InstancedMesh(coinG, coinMat, 120); coinIM.frustumCulled = false; coinIM.count = 0; scene.add(coinIM);
const coinAt = (x, y, z, g) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const turboMat = new THREE.MeshStandardMaterial({ color: 0x2ad8ff, emissive: 0x0a5a8a, roughness: 0.3 });
const stripeTex = canvasTex(128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#1a1a1a' : '#ffd23f'; c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 8, h); c.lineTo(i * 16 - 8, h); c.fill(); } });
stripeTex.wrapS = THREE.RepeatWrapping; stripeTex.repeat.set(4, 1);
const runTex = k => canvasTex(128, 128, (c, w) => { c.fillStyle = k === 6 ? '#ff7a1a' : '#2a8ad8'; c.beginPath(); c.arc(w / 2, w / 2, 60, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 84px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k), w / 2, w / 2 + 6); });
const RUNT = { 4: runTex(4), 6: runTex(6) };
function spawn(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, hit: new Set() };
  if (e.t === 'coins') { o.items = []; for (let i = 0; i < 6; i++) o.items.push(coinAt(e.x, 1, -i * 3, g)); }
  else if (e.t === 'turbo') { o.items = []; const b = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12), turboMat, 0, 0, 0, b); mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8), flat(0xdddddd), 0, 0.6, 0, b); b.position.set(e.x, 1, 0); g.add(b); o.items.push(b); }
  else if (e.t === 'breaker') { const m = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.16, 1.1), new THREE.MeshStandardMaterial({ map: stripeTex })); m.position.y = 0.06; g.add(m); const s = kit('road-sign-warning', 3); s.position.set(-RW / 2 - 0.6, 0, 12); s.rotation.y = PI; g.add(s); }
  else if (e.t === 'pothole') { const m = new THREE.Mesh(new THREE.CircleGeometry(1.25, 14), new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 })); m.rotation.x = -PI / 2; m.scale.set(1, 0.7, 1); m.position.set(e.x, 0.045, 0); g.add(m); const rim = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 14), flat(0x5a5248)); rim.rotation.x = -PI / 2; rim.scale.set(1, 0.7, 1); rim.position.set(e.x, 0.05, 0); g.add(rim); }
  else if (e.t === 'cows') { o.cows = []; for (let i = 0; i < Math.min(2, e.n); i++) { const c = makeAnimal(COW); c.obj.position.set(e.x + (i ? 1.4 : -0.3), 0, i * 2.2); c.obj.rotation.y = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? PI : 0); c.side = e.x < 0 ? -1 : 1; g.add(c.obj); o.cows.push(c); } o.gone = false; o.chewT = 0; }
  else if (e.t === 'dog') { const d = makeAnimal(PUG); d.obj.position.set(-RW / 2 - 2, 0, 0); d.obj.rotation.y = PI / 2; g.add(d.obj); o.dog = d; o.go = false; }
  else if (e.t === 'cones') { o.items = []; for (let i = 0; i < 4; i++) { const c = kit('construction-cone', 2.2); c.position.set(e.x + (i - 1.5) * 0.8, 0, -i * 1.2); g.add(c); o.items.push(c); } const b = kit('construction-barrier', 2.4); b.position.set(e.x, 0, -6); g.add(b); o.items.push(b); }
  else if (e.t === 'box') { o.items = []; const b = kit('box', 2.4); b.position.set(e.x, 0, 0); g.add(b); o.items.push(b); }
  else if (e.t === 'ramp') { const w = 4, r = new THREE.Group(); const rp = mesh(new THREE.BoxGeometry(w, 0.3, 6), flat(0xff8a3a), 0, 0.75, 0, r); rp.rotation.x = 0.26; for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(w + 0.05, 0.05, 0.3), flat(0xffffff), 0, 0.2 + i * 0.38, 2.5 - i * 1.4, r).rotation.x = 0.26; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 1.7, 6), flat(0x7a4a20), s * w / 2, 0.7, 0, r).rotation.x = 0.26; r.position.set(e.x, 0, 0); g.add(oneMesh(r)); o.w = w; o.items = []; for (let i = 0; i < 6; i++) o.items.push(coinAt(e.x, 3.5 + Math.sin(i / 5 * PI) * 3, -6 - i * 3, g)); }
  else if (e.t === 'runs') { o.k = Math.random() < 0.4 ? 6 : 4; const s = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ map: RUNT[o.k], transparent: true, side: THREE.DoubleSide })); s.position.set(e.x, 1.8, 0); g.add(s); mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), flat(0xdddddd), e.x, 0.6, 0, g); o.items = [s]; }
  else if (e.t === 'balloon' || e.t === 'heart') { o.items = []; for (let i = 0; i < 3; i++) { const b = new THREE.Group(); if (e.t === 'balloon') { mesh(new THREE.SphereGeometry(0.5, 14, 10), flat(pick([0xff4f6a, 0x3fcf6e, 0x2f8cf0, 0xffd23f, 0xe84aff])), 0, 0, 0, b).scale.y = 1.2; mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 3), flat(0xffffff), 0, -1.1, 0, b); } else { const hm = flat(0xff3a7a); mesh(new THREE.SphereGeometry(0.3, 10, 8), hm, -0.2, 0.1, 0, b); mesh(new THREE.SphereGeometry(0.3, 10, 8), hm, 0.2, 0.1, 0, b); const c = mesh(new THREE.ConeGeometry(0.42, 0.6, 12), hm, 0, -0.25, 0, b); c.rotation.x = PI; } b.position.set(e.x + (i - 1) * (e.t === 'heart' ? 0 : 0.9), 2, -i * (e.t === 'heart' ? 5 : 0.6)); g.add(b); o.items.push(b); } }
  g.traverse(q => { q.frustumCulled = false; }); G.objs.push(o); return o;
}
function animalScale(root, h) { root.updateMatrixWorld(true); const b = new THREE.Box3(); root.traverse(q => { if (q.isSkinnedMesh) { q.computeBoundingBox(); b.union(q.boundingBox.clone().applyMatrix4(q.matrixWorld)); } }); return h / Math.max(0.001, b.max.y - b.min.y); }
function makeAnimal(A) { const o = cloneSkinned(A.scene); o.scale.setScalar(A.s); const mx = new THREE.AnimationMixer(o), walk = A.anims.find(a => /Walk/i.test(a.name)) || A.anims[0], idle = A.anims.find(a => /Idle|Eat/i.test(a.name)) || walk; const act = { walk: walk && mx.clipAction(walk), idle: idle && mx.clipAction(idle) }; if (act.idle) act.idle.play(); o.traverse(q => { q.frustumCulled = false; }); return { obj: o, mx, act, walking: false }; }
function animalWalk(c, on) { if (c.walking === on) return; c.walking = on; const a = on ? c.act.walk : c.act.idle, b = on ? c.act.idle : c.act.walk; if (a && b && a !== b) { a.reset().play(); a.crossFadeFrom(b, 0.3, false); } }

// ---------------- driving ----------------
const GRAV = 22;
function updateMe(dt) {
  const R = G.me, cs = carSpec(), driving = G.state === 'drive';
  let top = 25 * cs.sp * (1 + G.lv.d * 0.06);
  if (R.turbo > 0) { R.turbo -= dt; top += 13; }
  if (R.stun > 0) { R.stun -= dt; top *= 0.4; }
  if (!driving) top = 0;
  const brake = driving && R.brake;
  if (brake) R.speed = Math.max(0, R.speed - 20 * dt); else R.speed = damp(R.speed, top, R.turbo > 0 ? 2.6 : R.speed < top ? 0.9 : 2.2, dt);
  if (G.state === 'arrive' || G.state === 'fail') R.speed = Math.max(0, R.speed - 14 * dt);
  const pz = R.z; R.z -= R.speed * dt;
  const px = R.x; G.tx = clamp(G.tx, -HALF, HALF); R.x = damp(R.x, G.tx, R.speed > 2 ? 7 : 2, dt); R.x = clamp(R.x, -HALF, HALF);
  R.steer = R.speed > 1 ? (R.x - px) / dt / Math.max(8, R.speed) : 0;
  if (R.air) { R.vy -= GRAV * dt; R.y += R.vy * dt; if (R.y <= 0 && R.vy < 0) land(R); }
  else { R.y = Math.max(0, R.y - dt * 4); }
  R.bumpY = damp(R.bumpY || 0, 0, 8, dt);
  R.V.obj.position.set(R.x, R.y + R.bumpY, R.z); R.V.obj.rotation.set(R.air ? -0.1 : -(R.bumpY || 0) * 0.3 + (brake ? 0.025 : 0), -R.steer * 0.35, R.steer * 0.05);
  driveWheels(R.V, pz - R.z, R.steer * 0.8);
  // smoke from a hard stop, flames from the turbo
  if (brake && R.speed > 8 && Math.random() < dt * 20) puff(_p.set(R.x + rnd(-0.8, 0.8), 0.2, R.z + 1.6), 1, 0xd8d8d8, { size: 0.5, speed: 0.6, life: 0.5, grav: -1 });
  if (R.turbo > 0 && Math.random() < dt * 40) puff(_p.set(R.x + rnd(-0.3, 0.3), 0.55, R.z + 2.2), 1, 0xff9a1a, { add: true, size: 0.6, speed: 1, life: 0.25, grav: -1, cols: [0xffe04a, 0xff7a1a, 0x4ad8ff] });
  if (brake && R.speed > 14) sfxT('skid', 0.6);
  if (driving) { const M = G.M; if (!M.lastSwerve && Math.abs(R.steer) > 0.9 && R.speed > 18) { M.lastSwerve = 1; if (G.lv.P.m === 'eggs' || G.lv.P.m === 'call') { mood(-4); say(pick(['Arre, careful!', 'Zig-zag?!', 'Straight, beta, straight!']), 'scared'); } else if (G.lv.P.m === 'fun' || G.lv.P.m === 'likes') { mood(3); react('laugh'); } } if (Math.abs(R.steer) < 0.3) M.lastSwerve = 0; }
}
function land(R) {
  R.y = 0; R.vy = 0; R.air = false; puff(_p.set(R.x, 0.3, R.z), 6, 0xd8d0c0, { size: 0.8, speed: 2, life: 0.5 }); sfx('thud'); E.shake = 0.3; vib(30);
  bumpPassenger(0.9 * carSpec().soft, 'land');
}
function bumpPassenger(k, why) {
  CAB.bv += 2.4 * Math.min(1.4, k + 0.2); cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  const M = G.M, H = MISSIONS[G.lv.P.m]; if (!M || M.done) return;
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
  for (const o of G.objs) { if (o.t === 'cows' && !o.gone && o.z < R.z && o.z > R.z - 50) { o.gone = true; o.goT = 0; sfxT('moo', 0.5); popText('MOOO! OKAY OKAY!', _p.set(o.x, 3, o.z), '#fff', 22, 0.9); o.cows.forEach(c => animalWalk(c, true)); } }
  const H = MISSIONS[G.lv.P.m]; if (H.honk) H.honk(G.M);
}
// ---------------- collisions and pickups ----------------
function interact(dt) {
  const R = G.me, M = G.M, H = MISSIONS[G.lv.P.m];
  for (const o of G.objs) {
    const dz = R.z - o.z; if (dz > 10 || dz < -40) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp')) for (const c of o.items) { if (!c.visible) continue; const cz = o.z + c.position.z; if (Math.abs(cz - R.z) < 1.6 && Math.abs(c.position.x - R.x) < 1.6 && Math.abs(c.position.y - R.y - 0.8) < 1.8) { c.visible = false; G.coins++; sfxT('coin', 0.03); G.turbo = Math.min(1, G.turbo + 0.02); } }
    if (o.t === 'turbo') for (const b of o.items) { if (b.visible && Math.abs(o.z - R.z) < 1.8 && Math.abs(b.position.x - R.x) < 1.7) { b.visible = false; G.turbo = Math.min(1, G.turbo + 0.34); sfx('kaching'); popText('+TURBO', _p.set(R.x, 2.5, R.z), '#7ae8ff', 26, 0.7); } }
    if (o.t === 'runs' && o.items[0].visible && Math.abs(dz) < 1.6 && Math.abs(o.x - R.x) < 1.8) { o.items[0].visible = false; sfx('gateGood'); popText(o.k === 6 ? 'SIXER! +6' : 'FOUR! +4', _p.set(R.x, 3, R.z), o.k === 6 ? '#ffb03a' : '#7ac8ff', 32, 1); H.runs && H.runs(M, o.k); puff(_p.set(o.x, 2, o.z), 12, 0xffffff, { star: true, add: true, cols: [0xffd23f, 0xff7a1a, 0x2a8ad8], speed: 4 }); }
    if ((o.t === 'balloon' || o.t === 'heart') && o.items) for (const b of o.items) { const bz = o.z + b.position.z; if (b.visible && Math.abs(bz - R.z) < 1.6 && Math.abs(b.position.x - R.x) < 1.6) { b.visible = false; sfx(o.t === 'balloon' ? 'pop' : 'gateGood'); puff(_p.set(b.position.x, 2, bz), 8, o.t === 'balloon' ? 0xffd23f : 0xff3a7a, { star: true, add: true, speed: 3 }); if (o.t === 'balloon' && H.balloon) H.balloon(M); if (o.t === 'heart' && H.heart) H.heart(M); } }
    if (o.t === 'ramp' && !R.air && dz <= 0.5 && dz > -0.8 && Math.abs(R.x - o.x) < o.w / 2) { R.air = true; R.vy = 9 + R.speed * 0.12; sfx('whoosh'); banner('🚀 JUMP!', '', 0.8); E.slow = 0.7; setTimeout(() => { E.slow = 1; }, 600); if (H.air) H.air(M); else if (G.lv.P.m !== 'sleep') say(pick(['AAAAH!', 'We are FLYING!', 'Wheee!']), 'scared'); }
    if (R.air && R.y > 1) continue;
    if (o.t === 'breaker' && !o.hit.has(R) && dz < 0.6 && dz > -0.8) { o.hit.add(R); const k = clamp((R.speed - 10) / 10, 0, 1.4) * carSpec().soft; if (k > 0.05) { R.bumpY = 0.25 + k * 0.4; E.shake = 0.2 + k * 0.3; sfx('thud'); vib(40); popText(k > 0.6 ? 'BUMP!! 😵' : 'BUMP!', _p.set(R.x, 3, R.z), '#ffd0a0', 28, 0.8); bumpPassenger(k, 'breaker'); } else { popText('SMOOTH! 👌', _p.set(R.x, 3, R.z), '#a0ffb0', 24, 0.8); if (H.smooth) H.smooth(M); } }
    if (o.t === 'pothole' && !o.hit.has(R) && Math.abs(dz) < 1 && Math.abs(R.x - o.x) < 1.4) { o.hit.add(R); const k = clamp(R.speed / 22, 0.15, 1.2) * carSpec().soft; R.bumpY = 0.2 + k * 0.3; E.shake = 0.3; sfx('thud'); vib(50); popText('POTHOLE! 🕳️', _p.set(R.x, 3, R.z), '#ffd0a0', 26, 0.8); bumpPassenger(k, 'pothole'); }
    if (Math.abs(dz) < 2 && !o.hit.has(R)) {
      let hitIt = false;
      if (o.t === 'cows') for (const c of o.cows) { if (Math.abs(c.obj.position.x - R.x) < 1.8 && Math.abs(o.z + c.obj.position.z - R.z) < 2) { hitIt = true; c.bonk = 1; } }
      else if ((o.t === 'cones' || o.t === 'box') && o.items) for (const c of o.items) { if (c.visible !== false && Math.abs(c.position.x - R.x) < 1.4 && Math.abs(o.z + c.position.z - R.z) < 1.6) { hitIt = true; c.visible = false; const f = c.clone(); f.position.set(c.position.x, c.position.y, o.z + c.position.z); fling(f, new THREE.Vector3(rnd(-4, 4), rnd(6, 9), -R.speed * 0.6), 1.4, 18, 10); } }
      if (hitIt) { o.hit.add(R); crash(o.t === 'cows' ? 'cow' : 'thing', o); }
    }
  }
  // cars: crashes and near misses
  R.crashT = Math.max(0, R.crashT - dt);
  for (const c of G.cars) {
    const dz = c.z - R.z, dx = Math.abs(c.x - R.x), lenZ = (c.len + 4) / 2;
    const ox = (c.wide + 1.9) / 2 - dx, oz = lenZ - Math.abs(dz);
    if (ox > 0 && oz > 0 && !R.air) {   // touching: push the taxi out (sideways for a scrape, behind for a bump), then judge how hard it was
      const sx = R.x >= c.x ? 1 : -1, head = c.dir < 0, rel = head ? R.speed + c.cur : R.speed - c.cur;
      if (ox < oz * 0.5) { R.x += sx * ox; G.tx = R.x + sx * 0.6; } else if (dz < 0) { R.z = c.z + lenZ; R.speed = head ? 0 : Math.min(R.speed, c.cur * 0.6); } else { R.z = c.z - lenZ; }
      if (R.crashT <= 0) { R.crashT = 1.2; c.hitT = 1; if (rel > 6 && ox >= oz * 0.5) { c.cur *= 0.3; crash(head ? 'head' : 'car', c); } else { sfx('bonk'); E.shake = 0.15; popText(ox < oz * 0.5 ? 'SCRAPE!' : 'TAP!', _p.set(R.x, 3, R.z), '#ffd0a0', 22, 0.6); bumpPassenger(0.15, 'tap'); } }
    }
    // a near miss: passing close (but not touching) at speed
    if (!c.nm && Math.abs(dz) < 1 && dx >= (c.wide + 1.9) / 2 && dx < (c.wide + 1.9) / 2 + 1.0 && R.speed > 14) { c.nm = true; G.turbo = Math.min(1, G.turbo + 0.12); sfx('swoosh'); popText(c.dir < 0 ? 'CLOSE CALL! 😱' : 'NEAR MISS!', _p.set(R.x, 3, R.z), '#ffe066', 26, 0.8); const H2 = MISSIONS[G.lv.P.m]; if (H2.near) H2.near(G.M); }
    if (Math.abs(dz) > 8) c.nm = false;
  }
  if (G.thief && !G.thief.caught) { const T = G.thief, dz = T.z - R.z; if (Math.abs(dz) < 4 && Math.abs(T.x - R.x) < 2 && R.crashT <= 0) { R.crashT = 0.8; R.speed *= 0.6; T.cur *= 0.7; G.M.catch = Math.min(100, G.M.catch + 12); sfx('crash'); E.shake = 0.4; popText('BAM! +12%', _p.set(R.x, 3, R.z), '#ff8a8a', 28, 0.8); say('Got him! Again!', 'laugh'); if (G.M.catch >= 100) caught(); } }
}
function crash(what, src) {
  const R = G.me; R.stun = 0.6; E.shake = what === 'head' ? 0.7 : 0.45; vib(what === 'head' ? 140 : 90);
  sfx(what === 'cow' ? 'moo' : 'crash'); puff(_p.set(R.x, 1, R.z - 2), 8, 0xffffff, { star: true, size: 0.4, speed: 4, cols: [0xffe066, 0xffffff] });
  popText(what === 'cow' ? 'MOOOO! 🐄' : what === 'head' ? 'HEAD-ON! 💥' : pick(['BONK!', 'CRASH!', 'OOPS!']), _p.set(R.x, 3, R.z), '#ff8a8a', 30, 0.8);
  if (src && src.V && Math.abs(src.z - R.z) < 30) { setTimeout(() => sfxT('horn', 0.3, 0, 3), 200); popText(pick(['ARRE BHAI!', 'OYE! Look!', 'Who gave you a licence?!']), _p.set(src.x, 3.6, src.z), '#fff', 20, 1); }
  const M = G.M, H = MISSIONS[G.lv.P.m]; CAB.bv += 3; cabFrame.classList.remove('shake'); void cabFrame.offsetWidth; cabFrame.classList.add('shake');
  if (M && !M.done && G.t - (M.crashAt || -9) > 1.5) { M.crashAt = G.t; if (H.crash) H.crash(M); if (G.lv.P.m !== 'sleep') say(what === 'cow' && PASSR().cow.length ? pick(PASSR().cow) : pick(PASSR().hurt), 'scared'); }
}
// ---------------- the world each frame ----------------
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);
function updateObjs(dt) {
  let nC = 0; const me = G.me;
  for (const o of G.objs) {
    const dz = o.z - me.z; o.obj.visible = dz < 30 && dz > -230; if (!o.obj.visible) continue;
    if (o.items && (o.t === 'coins' || o.t === 'ramp')) for (const c of o.items) if (c.visible && nC < 120) { _cq.setFromAxisAngle(_Y, G.t * 4 + c.position.x); coinIM.setMatrixAt(nC++, _cm.compose(_cp.set(c.position.x, c.position.y, o.z + c.position.z), _cq, _cs)); }
    if (o.t === 'turbo') for (const b of o.items) { b.rotation.y += dt * 3; b.position.y = 1 + Math.sin(G.t * 4) * 0.2; }
    if (o.t === 'runs') o.items[0].rotation.y = Math.sin(G.t * 2) * 0.4;
    if (o.t === 'balloon' || o.t === 'heart') o.items.forEach((b, i) => { b.position.y = 2 + Math.sin(G.t * 2 + i) * 0.3; if (o.t === 'heart') b.rotation.y += dt * 2; });
    if (o.t === 'cows') {   // they stand chewing in the lane… until you honk. Then they walk off (slowly!)
      if (dz > -50 && dz < 0) { o.chewT -= dt; if (o.chewT <= 0 && !o.gone) { o.chewT = 3; if (dz > -40) sfxT('moo', 1.5); if (G.state === 'drive' && dz > -45) showHint('📯 HONK to move the cows!'); } }
      o.cows.forEach(c => { if (o.gone) { c.obj.position.x = damp(c.obj.position.x, c.side * (RW / 2 + 3), 0.55, dt); c.obj.rotation.y = damp(c.obj.rotation.y, c.side < 0 ? -PI / 2 : PI / 2, 3, dt); } if (c.bonk) { c.bonk = Math.max(0, c.bonk - dt); c.obj.position.y = Math.sin(c.bonk * PI) * 1.2; } c.mx.update(dt); });
      o.x = o.cows.reduce((s, c) => s + c.obj.position.x, 0) / o.cows.length;
    }
    if (o.t === 'dog') { if (!o.go && dz > -26) { o.go = true; sfxT('woof', 0.5); animalWalk(o.dog, true); } if (o.go) { const p = o.dog.obj.position; p.x += dt * 5; if (p.x > RW / 2 + 3) p.x = 99; } o.dog.mx.update(dt * 2); o.x = o.dog.obj.position.x; }
  }
  coinIM.count = nC; coinIM.instanceMatrix.needsUpdate = true;
  // the dog running across: bump if it is right in front of you
  for (const o of G.objs) if (o.t === 'dog' && o.go && !o.hit.has(me) && Math.abs(o.z - me.z) < 1.8 && Math.abs(o.x - me.x) < 1.4) { o.hit.add(me); me.speed *= 0.5; sfx('woof'); popText('WOOF! 🐶', _p.set(me.x, 3, me.z), '#fff', 26, 0.8); bumpPassenger(0.2, 'dog'); }
}
// people walking on the pavements (two crowds: men and women), the welcome party at the destination
const PEDS = [];
function updatePeople(dt) {
  const me = G.me, side = RW / 2 + 1.6;
  if (!PEDS.length) for (let i = 0; i < 20; i++) PEDS.push({ f: i % 2, x: (i % 4 < 2 ? -1 : 1) * (side + rnd(-0.9, 0.9)), z: rnd(-150, 20), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(1, 1.6), t: rnd(0, 5), tint: pick([0xd83a2a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xe84a9a, 0xf0f0f0, 0x8a5ad8]), skin: pick([0xc68642, 0xe0ac69, 0x8d5524, 0xd8a070]), hair: pick([0x1a1210, 0x3a2010, 0x2a2018, 0x5a4030]), wave: Math.random() < 0.25 });
  const lm = [], lf = [];
  for (const p of PEDS) {
    p.t += dt; p.z += p.dir * p.sp * dt;
    if (p.z > me.z + 25) { p.z = me.z - rnd(110, 150); } else if (p.z < me.z - 160) p.z = me.z + rnd(0, 20);
    const near = p.wave && p.z < me.z && p.z > me.z - 18;
    (p.f ? lf : lm).push({ x: p.x, z: p.z, y: 0.25, ry: near ? (p.x < 0 ? PI / 2 : -PI / 2) : p.dir > 0 ? 0 : PI, clip: near ? 'wave' : 'walk', t: p.t, s: 1, tint: p.tint, skin: p.skin, hair: p.hair, expr: near ? EXPR.laugh : 0 });
  }
  const atDest = G.lv && Math.abs(me.z + G.lv.L) < 120;
  if (atDest) for (const q of G.party) { q.t += dt; (q.f ? lf : lm).push({ x: q.x, z: q.z, y: 0.25, ry: q.ry, clip: G.state === 'arrive' && G.result && G.result.ok ? 'cheer' : 'idle', t: q.t, s: 1, tint: q.tint, skin: q.skin, hair: q.hair, expr: G.state === 'arrive' ? (G.result && G.result.ok ? EXPR.laugh : EXPR.sad) : EXPR.happy }); }
  crowdM.draw(lm); crowdF.draw(lf);
  blobs.draw([[...lm, ...lf].map(q => ({ x: q.x, z: q.z, s: 0.9 })), G.cars.filter(c => c.V.obj.visible).map(c => ({ x: c.x, z: c.z, s: 3 })), [{ x: me.x, z: me.z, y: me.y, s: 3 }]], 1);
}
let hintT = 0;
function showHint(t) { if (hintT > 0) return; const h = $('hint'); h.textContent = t; h.className = ''; hintT = 2.5; }
function update(dt) {
  G.t += dt; if (window.__bot) window.__bot(dt);
  G.track.update(dt, G.t); G.track.cull(G.me.z);
  if (G.state === 'intro') intro(dt);
  updateMe(dt); updateTraffic(dt); updateThief(dt); updateObjs(dt); updatePeople(dt);
  if (G.state === 'drive') { interact(dt); const M = G.M; MISSIONS[G.lv.P.m].tick(M, dt); checkArrive(dt); Engine.set(G.me.speed / 30, false, PF.set.sound ? 0.07 : 0); }
  if (G.walker && G.walker.visible) { G.walker.update(dt); walkerMove(dt); }
  if (faceT > 0) { faceT -= dt; if (faceT <= 0) setExpr(baseExpr(), 0); } else if (G.M && G.M.expr !== baseExpr() && G.state === 'drive') setExpr(baseExpr(), 0);
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.add('hidden'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hidden'); }
  if (cabFxT > 0) { cabFxT -= dt; if (cabFxT <= 0) $('cabFx').style.opacity = 0; }
  if (G.arrow) { G.arrow.position.y = 4 + Math.sin(G.t * 4) * 0.4; G.arrow.rotation.y += dt * 2; G.zone.material.opacity = 0.3 + Math.sin(G.t * 5) * 0.12; }
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
    $('dist').textContent = G.lv.P.m === 'chase' ? '🚓 Don\'t let him escape!' : '🏁 ' + Math.max(0, Math.round(R.z + G.lv.L)) + ' m to ' + G.lv.P.place.replace(/^\S+\s/, '');
  }
  if ((hudN & 7) === 0) { drawFace(faceCv, G.lv.P.look, M.expr, G.t, bubbleT > 0); $('bubbleFace').getContext('2d').drawImage(faceCv, 0, 0); }
}
// ---------------- results, garage ----------------
function stars() { const m = G.M.mood; return m > 80 ? 5 : m > 60 ? 4 : m > 40 ? 3 : m > 20 ? 2 : 1; }
function results() {
  const P = G.lv.P, ok = G.result.ok, st = ok ? stars() : 0, fare = ok ? 40 + Math.round(G.lv.L / 12) : 10, tip = ok ? [0, 0, 10, 30, 60, 100][st] + G.lv.n * 2 : 0, total = fare + tip + G.coins;
  PF.coins += total; if (ok) { PF.level = Math.max(PF.level, G.lv.n + 1); PF.rides++; PF.stars += st; } PF.save();
  const rv = ok ? P.reviews[st >= 5 ? 0 : st >= 4 ? 1 : st >= 3 ? 2 : 3] : P.lose, unlock = ok ? nextUnlock() : null;
  openModal(`<h2>${ok ? (st >= 5 ? '🤩 SUPER RIDE!' : '🚕 RIDE DONE!') : '😤 RIDE FAILED'}</h2>${ok ? `<div class="stars">${[0, 1, 2, 3, 4].map(i => `<i class="${i < st ? 'on' : ''}">⭐</i>`).join('')}</div>` : `<p class="tip">${G.result.why}</p>`}
    <div class="review"><div class="who"><canvas id="revFace" width="64" height="64"></canvas><b>${P.name}</b></div>“${rv}”</div>
    <div class="stat"><span>🚕 Fare</span><b>₹${fare}</b></div><div class="stat"><span>💝 Tip</span><b>₹${tip}</b></div><div class="stat"><span>🪙 Coins on the road</span><b>₹${G.coins}</b></div>
    <div class="big" id="totalB">+₹${total}</div>
    ${unlock ? `<div class="card" style="--rc:#ff9a1a"><div class="rar">NEW IN THE GARAGE</div><div class="hico">${unlock.horn ? '📯' : '🚗'}</div><b>${unlock.name}</b><span>can be bought now!</span></div>` : ''}
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
  const cars = CARS.map(v => { const own = PF.cars.includes(v.id), on = PF.car === v.id; return `<div class="item"><div class="ico">🚗</div><div class="txt"><b>${v.name}</b><span>Speed ${'★'.repeat(Math.round((v.sp - 0.95) * 30))} · Comfort ${'★'.repeat(Math.round((1.2 - v.soft) * 5))}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-c="${v.id}" ${on || (!own && PF.coins < v.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'USE' : '₹' + v.price}</button></div>`; }).join('');
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
function settings() { settingsPanel(PF, 'Mad Taxi Masti', 'Characters, animals, nature: Quaternius (CC0) · Cars and city: Kenney (CC0)<br>Title and victory music: BajrangVerse Studios<br>Music: "Riley", "Polka Train", "Monkeys Spinning Monkeys", "Fuzzball Parade", "Merry Go" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0', k => { if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : G.lv.music); else Music.stop(); } if (k === 'hi') setQuality(PF.set.hi ? 2 : 0); }, () => { if (G.state === 'pause') resume(); }); }
onAdDone(() => { if (PF.set.music && G.lv) music(G.state === 'home' ? 'title' : G.state === 'arrive' ? 'win' : G.lv.music); });
window.onAppPause = () => { pause(); Engine.stop(); Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (modalOpen()) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'drive' || G.state === 'intro') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };
// ---------------- input: drag to steer, hold BRAKE, tap HORN and TURBO ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); drag = { x: e.clientX, tx: G.tx, id: e.pointerId }; });
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id || G.state !== 'drive') return; G.tx = drag.tx + (e.clientX - drag.x) / Math.min(innerWidth, 500) * 16; });
addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) drag = null; });
const brakeOn = on => { if (G.me) G.me.brake = on; $('brakeB').classList.toggle('on', on); };
$('brakeB').addEventListener('pointerdown', e => { e.stopPropagation(); brakeOn(true); });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('brakeB').addEventListener(ev, () => brakeOn(false));
$('hornB').addEventListener('pointerdown', e => { e.stopPropagation(); honk(); });
$('turboB').addEventListener('pointerdown', e => { e.stopPropagation(); useTurbo(); });
addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 's') brakeOn(true); if (e.key === 'h') honk(); if (e.key === ' ' || e.key === 'n') useTurbo(); if (e.key === 'ArrowLeft') G.tx -= 3.5; if (e.key === 'ArrowRight') G.tx += 3.5; });
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
  if (G.state === 'home') { tp.set(R.x + 4.5 + Math.sin(G.t * 0.3) * 1.5, 2.5, R.z + 6.5 + Math.sin(G.t * 0.2)); tl.set(R.x - 0.8, 1.1, R.z - 1); k1 = 2; }
  else if (G.state === 'intro') { tp.set(R.x + 6.5, 2.8, R.z - 6.5); tl.set(R.x - 2.2, 1.0, R.z); k1 = 2.5; }
  else if (G.state === 'arrive') { tp.set(R.x + 4.5, 3, R.z + 6.5); tl.set(R.x - 2.5, 1.3, R.z - 1); k1 = 1.8; }
  else { const air = R.air ? Math.min(2.5, R.y * 0.4) : 0; tp.set(R.x * 0.7, R.y * 0.5 + 4.2 + air, R.z + 9); tl.set(R.x * 0.85, R.y * 0.6 + 1.3, R.z - 10); }
  camP.lerp(tp, 1 - Math.exp(-k1 * dt)); camL.lerp(tl, 1 - Math.exp(-k2 * dt));
  const fovT = E.fovBase + (R.turbo > 0 ? 12 : 0) + Math.min(6, R.speed * 0.12); if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix(); }
  bendPoint(camP, cam.position); cam.lookAt(bendPoint(camL, _q));
  G.track.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(R.x, 0, R.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(_q.set(-8, 22, 10));
}
// ---------------- boot ----------------
const t0 = performance.now();
if (PF.set.music && !Q.get('fast')) { try { Music.play('title'); } catch (e) { /* needs a tap */ } }
Promise.all(['people.bin', 'kit.glb', 'nature.glb', 'cow.glb', 'pug.glb'].map(loadBin)).then(async ([pb, kb, nb, cb, db]) => {
  PEOPLE = await loadPeople(pb);
  const gl = new GLTFLoader(), K = (await gl.parseAsync(kb, '')).scene, N = (await gl.parseAsync(nb, '')).scene.getObjectByName('nature');
  setKits(K, N);
  const cow = await gl.parseAsync(cb, ''); COW = { scene: cow.scene, anims: cow.animations, s: animalScale(cow.scene, 1.6) };
  const pug = await gl.parseAsync(db, ''); PUG = { scene: pug.scene, anims: pug.animations, s: animalScale(pug.scene, 0.6) };
  blobs = new Blobs(scene, dotTex, 80); crowdM = new Crowd(scene, PEOPLE.pedM); crowdF = new Crowd(scene, PEOPLE.pedF); crowdM.prewarm(16); crowdF.prewarm(16);
  if (Q.get('level')) PF.level = +Q.get('level');
  placeCabFrame(); startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
  Music.warm(['title', 'drive', 'win']);
  setTimeout(() => $('studio').classList.add('gone'), Q.get('fast') ? 0 : Math.max(1200, 2800 - (performance.now() - t0)));
  startLoop({ update, camera, post: renderCab, active: () => G.state === 'drive', frozen: () => G.state === 'load' || G.state === 'pause' });
  if (Q.get('play')) play();
}).catch(e => { $('loading').textContent = '⚠️ ' + e.message; console.error(e); });
window.__cab = { cab, cabCam, CAB, renderCab };
window.__G = G; window.__play = play; window.__honk = honk; window.__turbo = useTurbo; window.__brake = brakeOn; window.__places = () => [G.state, Math.round(G.me.z), G.M && Math.round(G.M.mood)];
