// BUCCANEER BASH
// Captain Goldtooth leads a crew of pirates down winding island paths. Run through the blue gates to grow the crew,
// dodge rolling barrels, swinging anchors and narrow bridges, out-number the navy guards, then charge the Admiral's
// sea fort until it crumbles brick by brick. One control: drag left and right.
import * as THREE from 'three';
import { WORLDS, PATH_W, buildWorld, setBend, bendPoint, slopeAt, canvasTex, flat, mesh } from './world.js';
import { CrewMesh, GuardMesh, captain, admiral, setFace, animateFace, VESTS, SKINS, HAIRS, HATS } from './crew.js';
import { buildCastle } from './castle.js';
import { Audio } from '../../game-src/src/audio.js';
import { Music } from './sfx.js';
const music = n => { if (!PF.set.music || !n) { Music.stop(); return; } Audio.resume(); Music.play(n); };

const PI = Math.PI, $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------- save ----------------
const SAVE = 'buccaneerbash_v1';
const DEF = { level: 1, apples: 0, best: 0, up: { start: 0, apples: 0 }, hats: ['none'], hat: 'none', gift: null, set: { sound: true, music: true, vib: true, hi: true } };
let PF; try { PF = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { PF = {}; }
PF = { ...DEF, ...PF, up: { ...DEF.up, ...(PF.up || {}) }, set: { ...DEF.set, ...(PF.set || {}) } };
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(PF)); } catch (e) { /* private mode */ } };
const sfx = (n, d, a) => { if (PF.set.sound) Audio.sfx(n, d, a); };
const last = {}; const sfxT = (n, gap = 0.08, d) => { const t = performance.now() / 1000; if (t - (last[n] || 0) < gap) return; last[n] = t; sfx(n, d); };
const vib = ms => { if (!PF.set.vib) return; try { if (window.BashNative) window.BashNative.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* none */ } };
Audio.setMuted(false);

// ---------------- renderer, lights ----------------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.3, 320);
const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x7a9a5a, 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -14, near: 1, far: 70 }); scene.add(sun, sun.target);
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, PF.set.hi ? 1.75 : 1.15)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.6 ? 60 : 52; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------- little effects: puffs, stars, dust, apples flying (sprites) ----------------
const dotTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
const starTex = canvasTex(64, 64, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 - PI / 2, r = i % 2 ? 12 : 30; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill(); });
const fx = [];
function puff(p, n = 8, col = 0xffffff, o = {}) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.star ? starTex : dotTex, color: o.cols ? pick(o.cols) : col, transparent: true, depthWrite: false }));
    s.position.copy(p); const sz = o.size || rnd(0.5, 1.1); s.scale.setScalar(sz); scene.add(s);
    fx.push({ s, v: new THREE.Vector3(rnd(-1, 1), rnd(0.3, 1.2), rnd(-1, 1)).multiplyScalar(o.speed || 3), life: o.life || rnd(0.4, 0.8), t: 0, sz, g: o.grav ?? 2 });
  }
}
function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; f.v.y -= f.g * dt; f.s.position.addScaledVector(f.v, dt); const k = f.t / f.life; f.s.material.opacity = 1 - k; f.s.scale.setScalar(f.sz * (1 + k * 0.6)); if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); } } }
// floating words over the herd (DOM)
const pops = [];
const _v = new THREE.Vector3();
function project(p) { bendPoint(p, _v).project(cam); return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z < 1]; }
function popText(text, p, col = '#fff', size = 28, life = 1) { const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; d.style.color = col; d.style.fontSize = size + 'px'; $('pops').appendChild(d); pops.push({ d, p: p.clone(), t: 0, life }); }
function updatePops(dt) { for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; const [x, y, ok] = project(q.p), k = q.t / q.life; q.d.style.transform = `translate(-50%,-50%) translate(${x}px,${y - k * 60}px) scale(${k < 0.15 ? 0.6 + k * 2.6 : 1})`; q.d.style.opacity = !ok ? 0 : k > 0.7 ? (1 - k) / 0.3 : 1; if (k >= 1) { q.d.remove(); pops.splice(i, 1); } } }
let bannerT = 0;
function banner(t, sub = '', dur = 1.4) { const b = $('banner'); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = dur; }
function flash(c = '#fff') { const f = $('flash'); f.style.background = c; f.style.opacity = 0.6; setTimeout(() => { f.style.opacity = 0; }, 90); }

// ---------------- levels ----------------
// one level = a winding path with gates, strays, apples and a few hazards, then the castle. Same number → same level.
const UNLOCK = { hay: 2, wolves: 3, bridge: 4, spinner: 6, log: 8 };
function makeLevel(n) {
  let seed = n * 9301 + 49297; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const r = (a, b) => a + R() * (b - a), pk = a => a[Math.floor(R() * a.length)];
  const wi = Math.floor((n - 1) / 5), boss = n % 5 === 0, world = WORLDS[wi % WORLDS.length], d = Math.min(1, (n - 1) / 25);
  const L = Math.round(Math.min(720, 330 + n * 14)), ev = [];
  let best = 5 + PF.up.start, z = -34, k = 0;
  const has = q => n >= UNLOCK[q];
  const gate = () => {   // two choices side by side: usually one good, one less good (or bad)
    const ops = [['+', Math.round(r(5, 12) + d * 10)], ['x', 2], ['+', Math.round(r(10, 20) + d * 20)], ['x', 3], ['-', Math.round(r(3, 8))], ['÷', 2]];
    let a = pk(ops.slice(0, 4)), b = R() < 0.55 || k <= 2 ? pk(ops.slice(0, 4)) : pk(ops.slice(4));   // the first two gates are always both good
    if (a[0] === b[0] && a[1] === b[1]) b = ['+', a[1] + 4];
    if (best > 60 && (a[0] === 'x' || b[0] === 'x')) { if (a[0] === 'x') a = ['+', Math.round(r(10, 20))]; if (b[0] === 'x') b = ['-', Math.round(r(4, 10))]; }
    const apply = (o, h) => o[0] === '+' ? h + o[1] : o[0] === 'x' ? h * o[1] : o[0] === '-' ? Math.max(0, h - o[1]) : Math.ceil(h / o[1]);
    const L2 = R() < 0.5 ? [a, b] : [b, a]; ev.push({ t: 'gate', z, ops: L2 }); best = Math.min(240, Math.max(apply(L2[0], best), apply(L2[1], best)));
  };
  while (z > -L + 40) {
    k++;
    let p = k <= 2 || R() < 0.32 ? 'gate' : pk(['strays', 'apples', ...(has('hay') ? ['hay', 'hay'] : []), ...(has('wolves') ? ['wolves', 'wolves'] : []), ...(has('bridge') ? ['bridge'] : []), ...(has('spinner') ? ['spinner'] : []), ...(has('log') ? ['log'] : [])]);
    const fresh = Object.keys(UNLOCK).find(q => UNLOCK[q] === n && !ev.some(e => e.t === q));
    if (k === 3 && fresh) p = fresh;
    if (p === 'gate') gate();
    else if (p === 'strays') { const c = Math.round(r(3, 7) + d * 6); ev.push({ t: 'strays', z, x: pk([-3, 3]), n: c }); best += c; }
    else if (p === 'apples') ev.push({ t: 'apples', z, x: r(-3, 3), n: 8 });
    else if (p === 'hay') ev.push({ t: 'hay', z, sp: r(4, 6) + d * 3, ph: R() * 6, n: R() < 0.3 + d * 0.4 ? 2 : 1 });
    else if (p === 'wolves') { const c = Math.max(3, Math.round(best * r(0.2, 0.35))); ev.push({ t: 'wolves', z, n: c, x: pk([-2.5, 0, 2.5]) }); best -= c; }
    else if (p === 'bridge') ev.push({ t: 'bridge', z, len: r(18, 26), w: r(4.2, 5.2) - d * 0.8 });
    else if (p === 'spinner') ev.push({ t: 'spinner', z, x: pk([-2, 0, 2]), sp: r(1.2, 1.8) + d });
    else if (p === 'log') ev.push({ t: 'log', z, sp: r(1.4, 1.9) + d * 0.6 });
    z -= p === 'bridge' ? 50 : r(30, 42);
  }
  const hp = Math.max(8, Math.round(best * (boss ? 0.55 : 0.42)));
  return { n, world, boss, L, ev, hp, d };
}

// ---------------- state ----------------
const G = { state: 'load', t: 0, z: 0, x: 0, tx: 0, speed: 0, crew: [], wolves: [], apples: 0, lost: 0, finale: null, shake: 0, slow: 1 };
let lv = null, W = null, castle = null, king = null;
const crewMesh = new CrewMesh(scene), guardMesh = new GuardMesh(scene), leader = captain(); scene.add(leader);
const objs = [];   // gates, hay, spinners, logs, bridges, strays, apples in the world
const HERD_SPEED = 12;
const herdR = () => 0.55 * Math.sqrt(Math.max(1, G.crew.length));
function slot(i) { if (i === 0) return [0, 0]; const a = i * 2.39996, r = 0.62 * Math.sqrt(i); return [Math.cos(a) * r, Math.sin(a) * r * 0.85 + 0.6]; }
function addPirate(x, z, from) { const [ox, oz] = slot(G.crew.length); G.crew.push({ x: from ? from.x : G.x + ox, y: 0, z: from ? from.z : G.z + oz, ox, oz, ph: Math.random() * 6, vest: pick(VESTS), skin: pick(SKINS), hair: pick(HAIRS), shout: Math.random() < 0.3, st: 'run', s: 1 }); }
function reslot() { G.crew.forEach((q, i) => { [q.ox, q.oz] = slot(i + 1); }); }
function losePirate(q, how, dir = 1) {
  const i = G.crew.indexOf(q); if (i < 0) return; G.crew.splice(i, 1);
  q.st = how; q.t = 0; q.vx = dir * rnd(4, 8); q.vy = how === 'fall' ? 0 : rnd(5, 9); q.vz = rnd(-2, 2); q.spin = rnd(6, 12) * dir;
  G.flying.push(q); if (G.flying.length > 50) G.flying.shift(); G.lost++; sfxT('whoa', 0.25);
  if (G.crew.length === 0 && G.state === 'play') setTimeout(() => fail('The whole crew got lost!'), 600);
}

function startLevel(n, play) {
  lv = makeLevel(n);
  if (W) W.dispose(); objs.forEach(o => scene.remove(o.obj)); objs.length = 0;
  if (castle) castle.dispose(); if (king) scene.remove(king);
  setBend(n, -lv.L - 30);
  W = buildWorld(lv, scene);
  hemi.color.set(lv.world.night ? 0x8a9aff : 0xe8f4ff); hemi.intensity = lv.world.night ? 0.9 : 1.4; sun.intensity = lv.world.night ? 1.0 : 2.4;
  Object.assign(G, { t: 0, z: 6, x: 0, tx: 0, speed: 0, crew: [], wolves: [], flying: [], apples: 0, lost: 0, finale: null, shake: 0, slow: 1, guardFight: null });
  for (let i = 0; i < 5 + PF.up.start; i++) addPirate();
  crewMesh.setHat(PF.hat);
  for (const e of lv.ev) spawnEvent(e);
  castle = buildCastle(scene, lv.world, -lv.L - 22, lv.hp); castle.group.traverse(o => { o.frustumCulled = false; });
  king = admiral(); king.position.set(0, WALL_TOP, castle.z - 0.4); king.rotation.y = PI; scene.add(king); fortExtras();
  $('lvl').textContent = 'LEVEL ' + n; $('appleN').textContent = '0';
  G.state = play ? 'play' : 'home';
  if (play) { music(lv.world.music); banner(lv.boss ? '⚓ THE ADMIRAL\'S FORT!' : 'LEVEL ' + n, lv.world.name, 1.5); sfx('crewCheer'); if (n <= 2) { $('hint').classList.remove('hidden'); setTimeout(() => $('hint').classList.add('hidden'), 3500); } const fr = Object.keys(UNLOCK).find(q => UNLOCK[q] === n); if (fr) setTimeout(() => G.state === 'play' && banner(TIPS[fr][0], TIPS[fr][1], 2.2), 1800); }
}
const TIPS = { hay: ['🛢️ ROLLING BARRELS!', 'Steer around them'], wolves: ['💂 NAVY GUARDS!', 'More pirates than guards wins'], bridge: ['🌉 NARROW BRIDGE!', 'Keep the crew in the middle'], spinner: ['🌀 SPINNING MAST!', 'Time your run'], log: ['⚓ SWINGING ANCHOR!', 'Wait for the gap'] };

// ---------------- the things on the path ----------------
const opTex = {};
function gateTex(op) {
  const k = op.join(''); if (opTex[k]) return opTex[k];
  const good = op[0] === '+' || op[0] === 'x';
  return (opTex[k] = canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = good ? 'rgba(40,140,255,.55)' : 'rgba(255,60,70,.55)'; c.fillRect(0, 0, w, h);
    c.strokeStyle = good ? '#bfe4ff' : '#ffc0c4'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.font = 'bold 92px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = 'rgba(20,30,60,.8)'; const t = (op[0] === 'x' ? '×' : op[0]) + op[1]; c.strokeText(t, w / 2, h / 2 + 6); c.fillStyle = '#fff'; c.fillText(t, w / 2, h / 2 + 6);
  }));
}
function spawnEvent(e) {
  const g = new THREE.Group(); g.position.z = e.z; scene.add(g); const o = { ...e, obj: g, done: false };
  if (e.t === 'gate') {
    e.ops.forEach((op, i) => { const s = i ? 1 : -1; const pl = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W / 2 - 0.15, 2.6), new THREE.MeshBasicMaterial({ map: gateTex(op), transparent: true, side: THREE.DoubleSide, depthWrite: false })); pl.position.set(s * PATH_W / 4, 1.5, 0); g.add(pl); o['p' + i] = pl; });
    for (const x of [-PATH_W / 2, 0, PATH_W / 2]) mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 6), flat(0xa8783a), x, 1.6, 0, g);
    mesh(new THREE.BoxGeometry(PATH_W + 0.4, 0.3, 0.3), flat(0xa8783a), 0, 3.1, 0, g);
  } else if (e.t === 'strays') {
    o.list = []; for (let i = 0; i < e.n; i++) { const [ox, oz] = slot(i); o.list.push({ x: e.x + ox * 0.8, z: e.z + oz, y: 0, ph: Math.random() * 6, vest: pick(VESTS), skin: pick(SKINS), hair: pick(HAIRS), st: 'idle' }); }
    const sign = mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), flat(0xffe8a0), e.x, 2.4, 0, g); void sign;
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 64, (c, w, h) => { c.font = 'bold 44px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2a6a1a'; c.fillText('+' + e.n, w / 2, h / 2 + 3); }), transparent: true })); lab.position.set(e.x, 2.45, 0.1); lab.scale.set(1.4, 0.7, 1); g.add(lab);
  } else if (e.t === 'apples') {
    o.list = []; for (let i = 0; i < e.n; i++) { const a = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 12), flat(0xffc21a, { metalness: 0.5, roughness: 0.3, emissive: 0x5a3a00 }), e.x + Math.sin(i * 0.6) * 1.2, 0.6, -i * 1.6, g); a.scale.set(1, 1, 0.35); o.list.push(a); }
  } else if (e.t === 'hay') {
    o.bales = []; for (let i = 0; i < e.n; i++) { const b = new THREE.Group(); g.add(b); const c = mesh(new THREE.CylinderGeometry(1.1, 0.95, 1.8, 12), flat(0x9a5a2a), 0, 0, 0, b); c.rotation.x = PI / 2; for (const zz of [-0.62, 0, 0.62]) mesh(new THREE.TorusGeometry(zz ? 1.04 : 1.1, 0.07, 4, 16), flat(0x4a4a52, { metalness: 0.5 }), 0, 0, zz, b); b.position.set(0, 1.1, -i * 5); o.bales.push(b); }
  } else if (e.t === 'wolves') {
    o.list = []; for (let i = 0; i < e.n; i++) { const [ox, oz] = slot(i); o.list.push({ x: e.x + ox * 0.9, z: e.z - oz, y: 0, ry: 0, ph: Math.random() * 6, skin: pick(SKINS), hair: pick(HAIRS) }); }
    o.label = 'w' + Math.random();
  } else if (e.t === 'bridge') {
    // a river across the path with a narrow plank bridge
    const water = mesh(new THREE.PlaneGeometry(90, e.len, 10, Math.ceil(e.len / 2)), new THREE.MeshStandardMaterial({ color: lv.world.id === 'volcano' ? 0xff5a1a : lv.world.id === 'candy' ? 0xd86aff : 0x3a9ae8, emissive: lv.world.id === 'volcano' ? 0xc83a00 : 0x000000, roughness: 0.2 }), 0, 0.12, -e.len / 2, g); water.rotation.x = -PI / 2;
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
  }
  g.traverse(q => { q.frustumCulled = false; }); objs.push(o);
}

// ---------------- update ----------------
const _p = new THREE.Vector3();
function update(dt) {
  G.t += dt; W.update(dt, G.t); if ((G.state === 'play' || G.state === 'home') && Math.random() < dt * 0.06) sfxT('gull', 6); if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  const play = G.state === 'play';
  if (play) {
    const sl = slopeAt(G.z);
    G.speed = damp(G.speed, HERD_SPEED * clamp(1 - sl * 0.9, 0.75, 1.3) * (G.guardFight ? 0.15 : 1), 3, dt);
    G.z -= G.speed * dt;
    const lim = PATH_W / 2 - 0.4 - herdR() * 0.55; G.tx = clamp(G.tx, -lim, lim); G.x = damp(G.x, G.tx, 8, dt);
    if (G.z < -lv.L) startFinale();
  }
  // the crew: each pirate runs to its slot, arms and legs swinging
  const herdList = [];
  G.crew.forEach((q, i) => {
    if (q.st === 'run') { q.x = damp(q.x, G.x + q.ox, 7, dt); q.z = damp(q.z, G.z + q.oz, 7, dt); q.ph += dt * (11 + Math.random()); q.y = Math.abs(Math.sin(q.ph)) * 0.12; herdList.push({ x: q.x, y: q.y, z: q.z, ry: (G.tx - G.x) * -0.08, rx: -0.12, vest: q.vest, skin: q.skin, hair: q.hair, run: q.ph, face: q.shout && Math.sin(G.t * 2 + q.ph) > 0.3 ? 'open' : 'smile', s: 1 }); }
    else if (q.st === 'charge' || q.st === 'wait' || q.st === 'party' || q.st === 'dizzy') herdList.push({ x: q.x, y: q.y, z: q.z, ry: q.ry || 0, rx: q.rx || 0, rz: q.rz || 0, vest: q.vest, skin: q.skin, hair: q.hair, run: q.st === 'charge' ? q.ct * 25 : q.st === 'wait' ? q.ph : undefined, cheer: q.st === 'party' && G.finale && G.finale.win, attack: q.st === 'charge', face: q.st === 'charge' ? 'open' : q.st === 'dizzy' ? 'oh' : q.st === 'party' && G.finale && G.finale.win ? (Math.sin(q.ph) > 0 ? 'open' : 'smile') : 'smile', s: 1 });
    void i;
  });
  // lost pirates tumble away
  for (let i = G.flying.length - 1; i >= 0; i--) {
    const q = G.flying[i]; q.t += dt; q.vy -= 20 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rx = (q.rx || 0) + q.spin * dt; q.rz = (q.rz || 0) + q.spin * 0.7 * dt;
    if (q.st !== 'fall' && q.y < 0 && q.t > 0.2) { q.y = 0; q.vy *= -0.4; q.vx *= 0.6; }
    herdList.push({ x: q.x, y: q.y, z: q.z, rx: q.rx, rz: q.rz, vest: q.vest, skin: q.skin, hair: q.hair, cheer: true, face: 'oh', s: Math.max(0.01, 1 - Math.max(0, q.t - 1.2)) });
    if (q.t > 2.2) G.flying.splice(i, 1);
  }
  for (const o of objs) updateObj(o, dt, herdList);
  if (G.finale) updateFinale(dt);
  crewMesh.draw(herdList);
  // Billy leads the herd from the front
  const bl = G.finale ? G.finale.billy : { x: G.x, z: G.z - herdR() - 1.1 };
  leader.visible = G.crew.length > 0 || !!G.finale;
  leader.position.set(bl.x, G.state === 'play' ? Math.abs(Math.sin(G.t * 11)) * 0.12 : leader.position.y, bl.z);
  { const U = leader.userData, run = G.state === 'play' || (G.finale && G.finale.capRun), sw = run ? Math.sin(G.t * 11) : 0;
    U.legs[0].rotation.x = -sw * 0.9; U.legs[1].rotation.x = sw * 0.9; U.arms[0].rotation.x = sw * 0.9;
    U.arms[1].rotation.x = G.finale && G.finale.win ? -2.8 + Math.sin(G.t * 9) * 0.3 : G.finale ? -2.2 + Math.sin(G.t * 6) * 0.4 : -1.2 + sw * 0.3;
    U.body.rotation.x = run ? -0.12 : 0; U.head.rotation.y = Math.sin(G.t * 0.7) * 0.25;
    const pw = U.parrot.wings, flap = G.state === 'home' ? Math.sin(G.t * 3) > 0.7 : true; pw.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (flap ? 0.4 + Math.sin(G.t * 30) * 0.6 : 0.1); });
    animateFace(leader, dt); if (G.state === 'play' && Math.random() < dt * 0.15) sfxT('squawk', 4); }
  if (!G.finale || !G.finale.capRun) leader.rotation.y = (G.state === 'play' ? (G.tx - G.x) * -0.1 : 0);
  if (castle) castle.update(dt);
  updateFx(dt);
  // wolves
  const wl = []; for (const o of objs) if (o.t === 'wolves') for (const w of o.list) if (!w.gone) wl.push({ x: w.x, y: w.y, z: w.z, ry: Math.PI, rx: w.rx || 0, rz: w.rz || 0, s: w.s ?? 1, skin: w.skin, hair: w.hair, run: G.guardFight && G.guardFight.o === o ? G.t * 14 + w.ph : undefined, face: w.fly ? 'oh' : o.z - G.z > -25 ? 'open' : 'smile', attack: o.z - G.z > -25 && !w.fly });
  guardMesh.draw(wl);
  // the herd counter over the herd
  const [hx, hy, ok] = project(_p.set(G.x, 3.2 + herdR() * 0.3, G.z));
  const hc = $('herdN'); hc.style.display = ok && (G.state === 'play') ? 'block' : 'none'; hc.style.transform = `translate(${hx}px,${hy}px) translate(-50%,-100%)`; const tx = '🏴‍☠️ ' + (G.crew.length + 1); if (hc.textContent !== tx) { hc.textContent = tx; hc.classList.remove('bump'); void hc.offsetWidth; hc.classList.add('bump'); }
  $('progFill').style.width = clamp(-G.z / lv.L, 0, 1) * 100 + '%';
}
function near(q, x, z, rx, rz) { return Math.abs(q.x - x) < rx && Math.abs(q.z - z) < rz; }
function updateObj(o, dt, herdList) {
  const dz = o.z - G.z;
  if (o.t === 'gate') {
    if (!o.done && G.state === 'play' && dz > 0) {   // the herd's centre is past the gate
      o.done = true; const side = G.x >= 0 ? 1 : 0, op = o.ops[side], pl = o['p' + side]; const before = G.crew.length + 1; let after = before;
      if (op[0] === '+') after = before + op[1]; else if (op[0] === 'x') after = before * op[1]; else if (op[0] === '-') after = before - op[1]; else after = Math.ceil(before / op[1]);
      after = Math.max(after, Math.ceil(before / 2));   // a red gate never takes more than half the crew
      after = Math.min(after, 240);
      const diff = after - before, good = diff >= 0;
      if (diff > 0) { for (let i = 0; i < diff; i++) addPirate(0, 0, { x: G.x + rnd(-2, 2), z: o.z - rnd(0, 1) }); sfx('gateGood'); sfx('crewCheer', 0.1); popText('+' + diff + ' PIRATES', _p.set(G.x, 3, G.z), '#bff4ff', 34); vib(25); }
      else if (diff < 0) { for (let i = 0; i < -diff && G.crew.length; i++) { const q = G.crew[G.crew.length - 1]; G.crew.pop(); puff(_p.set(q.x, 0.8, q.z), 2, 0xffffff); } G.lost -= diff; sfx('gateBad'); popText(diff + ' PIRATES', _p.set(G.x, 3, G.z), '#ff8a8a', 34); vib(60); if (!G.crew.length && !leaderAlone()) setTimeout(() => fail('Oops — that gate sank the whole crew!'), 500); }
      reslot(); pl.userData.pop = 0.001; void good;
    }
    for (const k of ['p0', 'p1']) { const pl = o[k]; if (pl.userData.pop) { pl.userData.pop += dt; pl.scale.setScalar(1 + pl.userData.pop * 3); pl.material.opacity = Math.max(0, 1 - pl.userData.pop * 3); } }
  } else if (o.t === 'strays') {
    for (const q of o.list) { if (q.st === 'idle') { q.ph += dt * 2; q.y = Math.abs(Math.sin(q.ph)) * 0.05; herdList.push({ x: q.x, y: q.y, z: q.z, ry: Math.PI + Math.sin(q.ph * 0.5) * 0.4, vest: q.vest, skin: q.skin, hair: q.hair, cheer: Math.sin(q.ph) > 0, face: Math.sin(q.ph) > 0 ? 'open' : 'smile', s: 1 }); } }
    if (!o.done && G.state === 'play' && Math.abs(dz) < 2 + herdR() && Math.abs(o.x - G.x) < herdR() + 2.5) {
      o.done = true; o.list.forEach(q => { q.st = 'gone'; addPirate(0, 0, q); }); reslot(); sfx('ahoy'); sfx('crewCheer', 0.1); popText('+' + o.n + ' CASTAWAYS!', _p.set(o.x, 3, o.z), '#c8ffb0', 28); puff(_p.set(o.x, 1, o.z), 10, 0xffffff, { star: true, cols: [0xffd23f, 0xffffff] });
    }
  } else if (o.t === 'apples') {
    for (const a of o.list) { if (!a.visible) continue; a.rotation.y += dt * 4; a.position.y = 0.6 + Math.sin(G.t * 4 + a.position.z) * 0.12; const ax = a.position.x, az = o.z + a.position.z; if (G.state === 'play' && Math.abs(az - G.z) < herdR() * 0.85 + 0.6 && Math.abs(ax - G.x) < herdR() + 0.5) { a.visible = false; G.apples += Math.round(1 + PF.up.apples * 0.2); $('appleN').textContent = G.apples; sfxT('coin', 0.04); } }
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
    if (G.state === 'play' && dz > -o.len - 1 && dz < 1) for (const q of [...G.crew]) if (q.z < o.z && q.z > o.z - o.len && Math.abs(q.x) > o.w / 2) { losePirate(q, 'fall', Math.sign(q.x)); q.vy = 1; sfxT('splash', 0.12); puff(_p.set(q.x, 0.3, q.z), 4, 0x9ad8ff); }
  } else if (o.t === 'wolves') {
    for (const w of o.list) if (!w.gone) { w.ph += dt * 3; w.y = Math.abs(Math.sin(w.ph)) * 0.08; if (w.fly) { w.fly.t += dt; w.x += w.fly.vx * dt; w.y = Math.max(0, w.fly.vy * w.fly.t - 10 * w.fly.t * w.fly.t); w.rz = (w.rz || 0) + dt * 10; w.s = Math.max(0.01, 1 - w.fly.t); if (w.fly.t > 1) w.gone = true; } }
    if (!o.said && G.state === 'play' && dz > -26) { o.said = true; sfx('halt'); }
    if (!o.done && G.state === 'play' && dz > -(herdR() + 2.5)) { o.done = true; G.guardFight = { o, t: 0 }; sfx('halt'); sfx('charge', 0.25); }
    if (G.guardFight && G.guardFight.o === o) {   // pirates and guards knock each other away, one for one
      const F = G.guardFight; F.t += dt;
      if (F.t > 0.06) {
        F.t = 0; const w = o.list.find(q => !q.gone && !q.fly);
        if (!w) { G.guardFight = null; banner('GUARDS SENT FLYING!', '', 0.9); sfx('crewCheer'); return; }
        if (!G.crew.length) { G.guardFight = null; fail('Too many navy guards!'); return; }
        const q = G.crew[G.crew.length - 1]; losePirate(q, 'hit', Math.sign(q.x - w.x) || 1);
        w.fly = { t: 0, vx: (w.x - G.x >= 0 ? 1 : -1) * rnd(3, 6), vy: rnd(5, 8) }; sfxT('oof', 0.12); sfxT('bonk', 0.05); puff(_p.set(w.x, 1, w.z), 3, 0xffffff, { star: true, cols: [0xffffff, 0xffd23f] }); G.shake = 0.15;
      }
    }
  }
}
const leaderAlone = () => false;

// ---------------- the finale: storm the Admiral's fort ----------------
// The crew lines up in front of the fort. TAP to send pirates charging (they also go by themselves, slower). Every
// charge knocks bricks out. The Admiral paces the wall shouting "FIRE!" and his cannons lob cannonballs at the crew
// (a red circle shows where). When the fort falls, the Admiral tumbles into the sea and rows away in a tiny boat,
// Captain Goldtooth plants the pirate flag on the rubble and the treasure chest bursts open.
const WALL_TOP = 9 * 0.55 + 0.35;
let cannons = [], boat = null, flag = null, chest = null;
const jollyTex = canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 38, 20, 0, 7); c.fill(); c.fillRect(w / 2 - 12, 50, 24, 12); c.fillStyle = '#111'; c.beginPath(); c.arc(w / 2 - 8, 36, 6, 0, 7); c.arc(w / 2 + 8, 36, 6, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2 - 34, 66); c.lineTo(w / 2 + 34, 90); c.moveTo(w / 2 + 34, 66); c.lineTo(w / 2 - 34, 90); c.stroke(); });
function fortExtras() {
  cannons.forEach(c => scene.remove(c.obj)); cannons = [];
  for (const x of [-4, 4]) {
    const o = new THREE.Group(); o.position.set(x, WALL_TOP - 0.1, castle.z + 0.2); scene.add(o);
    const brl = mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.35 }), 0, 0.35, 0.3, o); brl.rotation.x = PI / 2 - 0.35;
    mesh(new THREE.TorusGeometry(0.25, 0.06, 6, 14), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.35 }), 0, 0.6, 0.95, o).rotation.x = 0.35;
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), flat(0x6a4020), s * 0.3, 0.12, 0, o).rotation.z = PI / 2;
    cannons.push({ obj: o, brl, x, t: 1.5 + Math.random() * 1.5 });
  }
  if (boat) { scene.remove(boat); boat = null; } if (flag) { scene.remove(flag); flag = null; } if (chest) { scene.remove(chest); chest = null; }
}
function startFinale() {
  G.state = 'finale'; music('fight');
  const F = G.finale = { t: 0, next: 0.9, hits: 0, billy: { x: G.x, z: G.z - 2 }, done: false, line: castle.z + 11, tapCD: 0, shots: [], ad: { x: 0, dir: 1, shoutT: 0, fallen: false }, capRun: false };
  G.crew.forEach(q => { q.st = 'wait'; q.ry = 0; });
  banner('CHAAARGE!', 'TAP TAP TAP to storm the fort!', 1.8); sfx('capCharge'); sfx('crewCheer', 0.4); sfx('adStop', 1.0);
  $('hint').innerHTML = '<span class="hand">👆</span><br>TAP TAP TAP!'; $('hint').classList.remove('hidden');
  $('castleHP').classList.remove('hidden'); updateHP();
}
function updateHP() { $('hpN').textContent = Math.max(0, castle.hp); $('hpFill').style.width = Math.max(0, castle.hp / castle.max * 100) + '%'; }
function sendPirate() {
  const F = G.finale; if (!F || F.done) return false;
  const q = G.crew.find(g => g.st === 'wait'); if (!q) return false;
  q.st = 'charge'; q.ct = 0; q.T = 0.5; q.sx = q.x; q.sz = q.z; q.hx = rnd(-5, 5); q.hy = rnd(0.6, 4.2); if (Math.random() < 0.15) sfxT('arr', 0.3);
  return true;
}
function updateFinale(dt) {
  const F = G.finale; F.t += dt; F.tapCD -= dt;
  for (const c of cannons) { const v = c.obj.userData.v; if (v) { v.y -= 20 * dt; c.obj.position.addScaledVector(v, dt); c.obj.rotation.x += dt * 3; if (c.obj.position.y < 0.3) { c.obj.position.y = 0.3; v.set(0, 0, 0); c.obj.userData.v = null; } } }
  G.z = damp(G.z, F.line, 2, dt); G.x = damp(G.x, 0, 2, dt);
  if (!F.capRun) { F.billy.x = damp(F.billy.x, -3, 3, dt); F.billy.z = damp(F.billy.z, F.line - 2, 3, dt); leader.position.y = 0; leader.rotation.y = 0; }
  for (const q of G.crew) {
    if (q.st === 'wait') { q.x = damp(q.x, G.x + q.ox * 1.4, 4, dt); q.z = damp(q.z, G.z + q.oz * 1.2 + 2, 4, dt); q.ph += dt * 10; q.y = Math.abs(Math.sin(q.ph)) * 0.15; q.ry = 0; }
    else if (q.st === 'charge') {   // run, leap, BONK
      q.ct += dt; const k = Math.min(1, q.ct / q.T); q.x = q.sx + (q.hx - q.sx) * k; q.z = q.sz + (castle.z + 0.6 - q.sz) * k; q.y = Math.sin(k * PI) * 1.6 + (q.hy - 0.5) * k; q.rx = -0.5;
      if (k >= 1) {
        castle.impact(q.hx, q.hy, 1); castle.hp--; updateHP(); F.hits++;
        sfxT('brick', 0.03); sfxT('bonk', 0.07); G.shake = Math.max(G.shake, 0.12); vib(8);
        puff(_p.set(q.hx, q.hy, castle.z + 0.8), 3, 0xd8d2c4, { size: 0.9 });
        if (F.hits % 7 === 0) popText(pick(['BONK!', 'CRACK!', 'ARRR!', 'TAKE THAT!', 'YO-HO!']), _p.set(q.hx, q.hy + 1.5, castle.z + 1), '#fff', 30, 0.7);
        q.st = 'dizzy'; q.vx = rnd(-2, 2); q.vy = 5; q.vz = rnd(4, 7); q.dt = 0;
        if (castle.hp <= 0 && !F.done) castleDown();
      }
    } else if (q.st === 'dizzy') { q.dt += dt; q.vy -= 20 * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.y = Math.max(0, q.y + q.vy * dt); q.rz = Math.sin(q.dt * 20) * 0.4; if (q.y <= 0) { q.vx *= 0.8; q.vz *= 0.8; } if (q.dt > 1.3) { q.st = 'party'; q.ph = Math.random() * 6; } }
    else if (q.st === 'party') { q.ph += dt * 8; q.y = F.win ? Math.abs(Math.sin(q.ph)) * 0.7 : 0; q.ry = F.win ? Math.sin(q.ph * 0.5) * 0.6 : PI; q.rz = 0; q.rx = 0; }
  }
  // pirates also go by themselves (slower than tapping)
  F.next -= dt;
  if (!F.done && F.next <= 0) { F.next = 0.45; if (!sendPirate() && !G.crew.some(g => g.st === 'charge') && F.t > 1) { F.done = true; $('hint').classList.add('hidden'); setTimeout(() => fail('The fort is still standing!', true), 900); } }
  // the Admiral: paces, shouts, shakes his fist, and fires the cannons
  const A = F.ad, U = king.userData;
  if (!A.fallen) {
    A.shoutT -= dt;
    A.x += A.dir * dt * 1.6; if (Math.abs(A.x) > 3) A.dir *= -1;
    king.position.set(A.x, WALL_TOP, castle.z - 0.4); king.rotation.y = PI + Math.sin(G.t * 1.3) * 0.2;
    const sw = Math.sin(G.t * 6);
    U.legs[0].rotation.x = sw * 0.4; U.legs[1].rotation.x = -sw * 0.4;
    U.arms[0].rotation.x = -2.3 + Math.sin(G.t * 14) * 0.35;   // shaking his fist
    U.arms[1].rotation.x = A.shoutT > 0 ? -1.5 : -0.3 + sw * 0.1;   // points with the telescope when he shouts
    U.body.rotation.z = Math.sin(G.t * 6) * 0.05; U.head.rotation.z = Math.sin(G.t * 3) * 0.1;
    setFace(king, A.shoutT > 0 || castle.hp < castle.max * 0.35 ? (castle.hp < castle.max * 0.35 ? 'oh' : 'open') : 'smile');
    A.stopT = (A.stopT || 0) - dt; if (castle.hp < castle.max * 0.35 && A.stopT <= 0) { A.stopT = 3; sfx('adStop'); popText('STOP THEM!', _p.set(A.x, WALL_TOP + 5, castle.z), '#bfe4ff', 24, 0.9); }
    animateFace(king, dt);
    for (const c of cannons) {
      c.t -= dt; c.brl.position.z = damp(c.brl.position.z, 0.3, 6, dt);
      if (!F.done && c.t <= 0 && G.crew.length) {
        c.t = Math.max(1.3, 2.4 - lv.n * 0.03) + Math.random();
        const tq = pick(G.crew), tx = tq.x + rnd(-0.5, 0.5), tz = tq.z + rnd(-0.5, 0.5);
        const ring = mesh(new THREE.RingGeometry(1.1, 1.5, 28), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }), tx, 0.08, tz); ring.rotation.x = -PI / 2; scene.add(ring); ring.castShadow = false;
        const ball = mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.4 }), c.x, WALL_TOP + 0.8, castle.z + 1.2); scene.add(ball);
        F.shots.push({ ring, ball, t: 0, T: 1.1, x0: c.x, y0: WALL_TOP + 0.8, z0: castle.z + 1.2, tx, tz });
        c.brl.position.z = -0.25; puff(_p.set(c.x, WALL_TOP + 0.8, castle.z + 1.3), 8, 0xdddddd, { size: 1.2, speed: 3, life: 0.8, grav: -0.5 }); puff(_p.set(c.x, WALL_TOP + 0.8, castle.z + 1.3), 4, 0xffa83a, { size: 0.8, speed: 4, life: 0.25 });
        sfx('cannon'); sfx('whistleDown', 0.15); A.shoutT = 0.6; sfxT('adFire', 1.2); G.shake = Math.max(G.shake, 0.2);
        if (castle.hp >= castle.max * 0.35) popText('FIRE!', _p.set(A.x, WALL_TOP + 5.2, castle.z), '#ffd23f', 30, 0.8);
      }
    }
  } else if (boat) {   // he rows away, shaking his fist
    boat.position.x += dt * 1.2; boat.position.y = -0.9 + Math.sin(G.t * 2) * 0.12; boat.rotation.z = Math.sin(G.t * 2) * 0.08;
    king.position.set(boat.position.x, boat.position.y + 0.35, boat.position.z); king.rotation.y = PI; U.arms[0].rotation.x = -2.6 + Math.sin(G.t * 12) * 0.4; U.arms[1].rotation.x = -1.2 + Math.sin(G.t * 4) * 0.8; setFace(king, Math.sin(G.t * 3) > 0 ? 'open' : 'smile'); animateFace(king, dt);
  }
  // cannonballs in the air: land on the red circle, send pirates flying
  for (let i = F.shots.length - 1; i >= 0; i--) {
    const S = F.shots[i]; S.t += dt; const k = Math.min(1, S.t / S.T);
    S.ball.position.set(S.x0 + (S.tx - S.x0) * k, S.y0 + (0.3 - S.y0) * k + Math.sin(k * PI) * 6, S.z0 + (S.tz - S.z0) * k); S.ring.material.opacity = 0.5 + Math.sin(S.t * 25) * 0.3;
    if (k >= 1) {
      scene.remove(S.ring); scene.remove(S.ball); F.shots.splice(i, 1);
      puff(_p.set(S.tx, 0.5, S.tz), 12, 0xd8c8a8, { size: 1.4, speed: 5, life: 0.7 }); sfx('boing'); G.shake = Math.max(G.shake, 0.3);
      let n = 0; for (const q of [...G.crew]) if (q.st === 'wait' && Math.hypot(q.x - S.tx, q.z - S.tz) < 1.6) { losePirate(q, 'hit', Math.sign(q.x - S.tx) || 1); n++; }
      if (n) popText(n > 1 ? 'BOOM! -' + n : 'WHOOPS!', _p.set(S.tx, 2.5, S.tz), '#ff8a8a', 26, 0.8);
    }
  }
  // the victory: the Captain runs up the rubble and raises the flag
  if (F.win) {
    const W2 = F.t - F.winT;
    if (W2 > 1.6 && !F.capRun) { F.capRun = true; sfx('ahoy'); }
    if (F.capRun) {
      const tz = castle.z + 1.5, k = Math.min(1, (W2 - 1.6) / 1.4);
      F.billy.x = damp(F.billy.x, 0, 3, dt); F.billy.z = F.line - 2 + (tz - (F.line - 2)) * k; leader.position.y = Math.sin(k * PI) * 1.2 + k * 1.2; leader.rotation.y = 0;
      if (k >= 1 && !flag) {
        F.capRun = false; leader.position.y = 1.2; leader.rotation.y = PI; setFace(leader, 'open'); sfx('capArr'); sfx('squawk', 0.4); sfx('hooray', 0.3); sfx('bell', 0.2);
        flag = new THREE.Group(); flag.position.set(0.9, 1.2, tz); scene.add(flag);
        mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8), flat(0x5a3a1a), 0, 2.25, 0, flag);
        const cloth = mesh(new THREE.PlaneGeometry(1.8, 1.3, 8, 4), new THREE.MeshStandardMaterial({ map: jollyTex, side: THREE.DoubleSide, roughness: 0.8 }), 0.9, 0.6, 0, flag); flag.userData.cloth = cloth;
        chest = new THREE.Group(); chest.position.set(-1.6, 1.0, tz + 1.2); scene.add(chest);
        mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), flat(0x8a4a1a), 0, 0.35, 0, chest); const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4); chest.add(lid);
        mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, PI), flat(0x9a5a2a), 0, 0, 0.4, lid).rotation.z = PI / 2; chest.userData.lid = lid;
        for (let i = 0; i < 40; i++) { const c = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.7, roughness: 0.25 }), -1.6, 1.6, tz + 1.2); scene.add(c); fx.push({ s: c, v: new THREE.Vector3(rnd(-3, 3), rnd(6, 11), rnd(-1, 4)), life: 2.2, t: 0, sz: 1, g: 14, coin: true }); }
        sfx('coins', 0.3); sfx('coins', 0.7);
      }
    }
    if (flag) { const c = flag.userData.cloth; c.position.y = Math.min(3.6, c.position.y + dt * 2.5); c.rotation.y = Math.sin(G.t * 5) * 0.15; if (chest) chest.userData.lid.rotation.x = Math.max(-1.9, chest.userData.lid.rotation.x - dt * 4); leader.userData.arms[1].rotation.x = -2.9; }
    if (Math.random() < dt * 2.5) { puff(_p.set(rnd(-10, 10), rnd(9, 15), castle.z + rnd(-6, 4)), 22, 0xffffff, { star: true, cols: [0xff4f6a, 0xffd23f, 0x3fcf6e, 0x2f8cf0, 0xff4fa8], speed: 6, life: 1.4, size: 0.5, grav: 3 }); sfxT('firework', 0.4); }
    if (Math.random() < dt * 0.8) sfxT('crewCheer', 1.2);
    if (W2 > 7 && G.state === 'finale') { G.state = 'win'; results(); }
  }
  // the Admiral falls into the sea
  if (F.adFall) {
    const K = F.adFall; K.t += dt;
    king.position.set(K.x0 + K.t * 1.5, Math.max(-1.6, K.y0 + 6 * K.t - 14 * K.t * K.t), castle.z - 0.4 - K.t * 5); king.rotation.x = -K.t * 4; king.userData.arms.forEach((a, i) => { a.rotation.x = -2.8 + Math.sin(G.t * 25 + i) * 0.6; }); king.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(G.t * 25 + i * 3) * 0.8; });
    if (king.position.y <= -1.5 && !K.splash) {
      K.splash = true; sfx('bigSplash'); puff(_p.set(king.position.x, -0.5, king.position.z), 26, 0xbfe8ff, { size: 1.6, speed: 7, life: 1, grav: 6 }); king.visible = false;
      setTimeout(() => {   // ... and pops up in a tiny rowboat
        boat = new THREE.Group(); boat.position.set(-8, -0.9, castle.z - 14); scene.add(boat);
        const hull = mesh(new THREE.SphereGeometry(1.4, 14, 8, 0, PI * 2, PI / 2, PI / 2), flat(0x8a5a2a), 0, 0.6, 0, boat); hull.scale.set(0.7, 0.6, 1.4);
        for (const s of [-1, 1]) { const oar = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), flat(0xc8a070), s * 1.2, 0.5, 0, boat); oar.rotation.z = s * 1.1; }
        king.visible = true; king.rotation.set(0, PI, 0); king.scale.setScalar(1.3); F.adFall = null; sfx('adNooo');
        popText('I\'LL BE BAAACK!', _p.set(-8, 4, castle.z - 14), '#bfe4ff', 24, 2);
      }, 1300);
    }
  }
}
function castleDown() {
  const F = G.finale; F.done = true; F.win = true; F.winT = F.t; castle.collapse(); G.slow = 0.35; setTimeout(() => { G.slow = 1; }, 1300); G.shake = 1;
  $('hint').classList.add('hidden'); F.shots.forEach(S => { scene.remove(S.ring); scene.remove(S.ball); }); F.shots.length = 0;
  sfx('crumble'); sfx('adMama', 0.2); sfx('adNooo', 0.9); sfx('fanfare', 1.6); vib(300); flash('#fff'); music('win');
  banner('FORT CRASHED!', '🏴‍☠️ The pirates win!', 2.4);
  F.ad.fallen = true; F.adFall = { t: 0, x0: king.position.x, y0: king.position.y }; setFace(king, 'oh');
  cannons.forEach(c => { c.obj.userData.v = new THREE.Vector3(rnd(-2, 2), 4, -2); });
  G.crew.forEach(q => { if (q.st === 'wait') { q.st = 'party'; q.ph = Math.random() * 6; } });
  for (let i = 0; i < 6; i++) setTimeout(() => puff(_p.set(rnd(-8, 8), rnd(1, 6), castle.z + rnd(-3, 2)), 14, 0xd8d2c4, { size: 2.2, speed: 4, life: 1.4, grav: -0.5 }), i * 200);
}

// ---------------- ads (AdMob through the app): optional rewarded ads, and a short ad every few levels ----------------
const NATIVE = window.BashNative, adCbs = {};
window.onAdDone = (tag, ok) => { const f = adCbs[tag]; delete adCbs[tag]; if (PF.set.music && lv) music(G.state === 'win' ? 'win' : lv.world.music); if (f) f(ok); };
const adReady = () => { try { return !!(NATIVE && NATIVE.adReady && NATIVE.adReady()); } catch (e) { return false; } };
function rewardAd(tag, cb) { if (!adReady()) { cb(false); return; } adCbs[tag] = cb; Music.stop(); NATIVE.showRewarded(tag); }
let sinceAd = 0;
function betweenLevels(next) { sinceAd++; if (NATIVE && NATIVE.showInterstitial && sinceAd >= 3 && PF.level > 4) { sinceAd = 0; adCbs.inter = () => next(); Music.stop(); NATIVE.showInterstitial(); } else next(); }
// back in the game after a rewarded ad: fresh pirates join and the run goes on
function revive(n) {
  closeModal(); for (let i = 0; i < n; i++) addPirate(0, 0, { x: G.x + rnd(-2, 2), z: G.z + rnd(0, 2) });
  reslot(); sfx('crewCheer'); banner('⚓ MORE PIRATES!', '+' + n + ' crew', 1.2);
  if (G.finale) { G.crew.forEach(q => { if (q.st === 'run') { q.st = 'wait'; q.ph = Math.random() * 6; } }); G.finale.done = false; G.finale.next = 0.4; G.state = 'finale'; $('castleHP').classList.remove('hidden'); music('fight'); }
  else { G.state = 'play'; music(lv.world.music); }
}

// ---------------- results & fail ----------------
function results() {
  const left = G.crew.length, stars = left >= Math.max(3, lv.hp * 0.6) ? 3 : left >= lv.hp * 0.25 ? 2 : 1;
  const bonus = left * 2, total = G.apples + bonus + 10 + lv.n * 2;
  PF.apples += total; PF.level = Math.max(PF.level, lv.n + 1); PF.best = Math.max(PF.best, crewCount()); save();
  music('win');
  $('castleHP').classList.add('hidden');
  openModal(`<h2>FORT CRASHED!</h2><div class="stars">${[0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">⭐</i>`).join('')}</div>
    <div class="stat"><span>🪙 Gold coins</span><b>${G.apples}</b></div><div class="stat"><span>🏴‍☠️ Pirates left × 2</span><b>${bonus}</b></div><div class="stat"><span>🏁 Level bonus</span><b>${10 + lv.n * 2}</b></div>
    <div class="big" id="totalB">+${total} 🪙</div>
    ${adReady() ? '<div class="row"><button class="btn blue" id="dblB">📺 WATCH AD: DOUBLE COINS</button></div>' : ''}
    <div class="row"><button class="btn big green" id="nextB">NEXT LEVEL ▶</button></div><div class="row"><button class="btn small" id="homeB">HOME</button></div>`);
  if ($('dblB')) $('dblB').onclick = () => { click(); rewardAd('double', ok => { if (!ok) return; PF.apples += total; save(); $('totalB').textContent = '+' + (total * 2) + ' 🪙'; $('dblB').disabled = true; $('dblB').textContent = 'DOUBLED! ✔'; sfx('fanfare'); }); };
  $('nextB').onclick = () => { click(); closeModal(); betweenLevels(() => play(lv.n + 1)); };
  $('homeB').onclick = () => { click(); goHome(); };
}
const crewCount = () => G.crew.length + 1;
function fail(msg, atCastle) {
  if (G.state !== 'play' && G.state !== 'finale') return;
  G.state = 'fail'; sfx('sad'); vib(200); Music.stop(); $('castleHP').classList.add('hidden');
  setTimeout(() => {
    openModal(`<h2>OH NO!</h2><p style="font-size:50px;margin:4px">${atCastle ? '🏰' : '🐺'}</p><p>${msg}</p><p class="tip">${atCastle ? 'Pick the bigger gates to grow a bigger crew!' : 'Steer around the barrels and keep away from the edges.'}</p>
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
  $('homeLevel').innerHTML = `LEVEL ${PF.level}<small>${w.name}${PF.level % 5 === 0 ? ' · ⚓ The Admiral' : ''}</small>`;
  const g = giftState(); $('giftB').classList.toggle('dot', g.can);
}
const UPS = [{ id: 'start', icon: '🏴‍☠️', name: 'Bigger Crew', desc: 'Start every level with +1 pirate', max: 20, base: 60 }, { id: 'apples', icon: '🪙', name: 'Treasure Hunter', desc: '+20% gold coins', max: 10, base: 90 }];
const upCost = u => Math.round(u.base * Math.pow(1.45, PF.up[u.id]) / 5) * 5;
function shop() {
  openModal(`<h2>PIRATE SHOP</h2><p>🪙 <b>${PF.apples}</b></p><h3>Upgrades</h3><div class="list">${UPS.map(u => { const l = PF.up[u.id], c = upCost(u), mx = l >= u.max; return `<div class="item"><div class="ico">${u.icon}</div><div class="txt"><b>${u.name} <small>${l}/${u.max}</small></b><span>${u.desc}</span></div><button class="btn small ${mx ? '' : 'green'}" data-u="${u.id}" ${mx || PF.apples < c ? 'disabled' : ''}>${mx ? 'MAX' : c + ' 🍏'}</button></div>`; }).join('')}</div>
    <h3>Crew hats</h3><div class="list">${Object.entries(HATS).map(([k, h]) => { const own = PF.hats.includes(k), on = PF.hat === k; return `<div class="item"><div class="ico">${h.icon}</div><div class="txt"><b>${h.name}</b><span>${on ? 'Wearing' : own ? 'Owned' : 'Every pirate wears one!'}</span></div><button class="btn small ${on ? '' : own ? 'blue' : 'green'}" data-h="${k}" ${on || (!own && PF.apples < h.price) ? 'disabled' : ''}>${on ? 'ON' : own ? 'WEAR' : h.price + ' 🍏'}</button></div>`; }).join('')}</div>
    <div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = UPS.find(q => q.id === b.dataset.u), c = upCost(u); if (PF.apples < c) return; PF.apples -= c; PF.up[u.id]++; save(); sfx('gateGood'); shop(); refreshHome(); });
  document.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const k = b.dataset.h; if (!PF.hats.includes(k)) { if (PF.apples < HATS[k].price) return; PF.apples -= HATS[k].price; PF.hats.push(k); } PF.hat = k; save(); sfx('arr'); crewMesh.setHat(k); shop(); refreshHome(); });
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
    <p class="tip">Buccaneer Bash · made by BajrangVerse Studios<br>Free to play with optional ads (Google AdMob) · no accounts · your progress stays on your phone</p><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s; PF.set[k] = !PF.set[k]; save(); b.classList.toggle('on', PF.set[k]); click(); if (k === 'music') { if (PF.set.music) music(G.state === 'home' ? 'title' : lv.world.music); else Music.stop(); } if (k === 'hi') resize(); });
  $('closeB').onclick = () => { click(); closeModal(); if (G.state === 'pause') resume(); };
}
function pause() { if (G.state !== 'play') return; G.state = 'pause'; Music.stop(); openModal(`<h2>PAUSED</h2><div class="row"><button class="btn big green" id="resB">RESUME</button></div><div class="row"><button class="btn small" id="setB2">SETTINGS</button><button class="btn small" id="homeB">HOME</button></div>`); $('resB').onclick = () => { click(); closeModal(); resume(); }; $('setB2').onclick = settings; $('homeB').onclick = () => { click(); goHome(); }; }
function resume() { G.state = 'play'; if (PF.set.music) music(lv.world.music); }
window.onAppPause = () => { pause(); if (Audio.suspend) Audio.suspend(); };
window.onAppResume = () => Audio.resume();
window.onBack = () => { if (!$('modal').classList.contains('hidden')) { if (G.state === 'pause') { closeModal(); resume(); } else if (G.state === 'home') closeModal(); return 'stay'; } if (G.state === 'play') { pause(); return 'stay'; } return G.state === 'home' ? 'exit' : 'stay'; };

// ---------------- input: drag to steer the herd ----------------
let drag = null;
$('gl').addEventListener('pointerdown', e => { Audio.resume(); if (G.state === 'finale' && G.finale && !G.finale.done && G.finale.tapCD <= 0) { G.finale.tapCD = 0.05; if (sendPirate()) vib(6); } drag = { x: e.clientX, tx: G.tx }; $('hint').classList.add('hidden'); });
addEventListener('pointermove', e => { if (!drag || G.state !== 'play') return; G.tx = drag.tx + (e.clientX - drag.x) / Math.min(innerWidth, 500) * 14; });
addEventListener('pointerup', () => { drag = null; });
const keys = {}; addEventListener('keydown', e => { keys[e.key] = true; }); addEventListener('keyup', e => { keys[e.key] = false; });
$('playB').onclick = () => { Audio.resume(); click(); play(); };
$('shopB').onclick = () => { click(); shop(); };
$('giftB').onclick = () => { click(); gift(); };
$('setB').onclick = () => { click(); settings(); };
$('pauseB').onclick = () => { click(); pause(); };
document.addEventListener('pointerdown', () => Audio.resume(), { once: true });

// ---------------- camera & loop ----------------
const camP = new THREE.Vector3(0, 12, 14), camL = new THREE.Vector3(), tmp = new THREE.Vector3();
function updateCamera(dt) {
  let p, l;
  if (G.state === 'home') { const a = Math.sin(G.t * 0.3) * 0.5; p = tmp.set(Math.sin(a) * 9, 4.5, G.z + 9); l = new THREE.Vector3(0, 1, G.z - 2); camP.lerp(p, 1 - Math.exp(-3 * dt)); camL.lerp(l, 1 - Math.exp(-3 * dt)); }
  else if (G.finale && G.finale.win && G.finale.t - G.finale.winT > 2.6) { const a = (G.finale.t - G.finale.winT) * 0.35; p = tmp.set(Math.sin(a) * 9, 5.5, castle.z + 1.5 + Math.cos(a) * 9); l = new THREE.Vector3(0, 2.5, castle.z + 1.5); camP.lerp(p, 1 - Math.exp(-2 * dt)); camL.lerp(l, 1 - Math.exp(-3 * dt)); }
  else if (G.finale) { p = tmp.set(10, 9, castle.z + 22); l = new THREE.Vector3(0, 3.5, castle.z + 2); camP.lerp(p, 1 - Math.exp(-2 * dt)); camL.lerp(l, 1 - Math.exp(-2.5 * dt)); }
  else { const zoom = 1 + Math.min(0.9, G.crew.length / 120); p = tmp.set(G.x * 0.5, 9.5 * zoom, G.z + 11 * zoom); l = new THREE.Vector3(G.x * 0.7, 0, G.z - 6); camP.lerp(p, 1 - Math.exp(-5 * dt)); camL.lerp(l, 1 - Math.exp(-6 * dt)); }
  bendPoint(camP, cam.position); if (G.shake > 0) { G.shake -= dt; cam.position.x += rnd(-1, 1) * G.shake * 0.5; cam.position.y += rnd(-1, 1) * G.shake * 0.5; }
  cam.lookAt(bendPoint(camL, tmp));
  if (W) W.sky.position.copy(cam.position);
  const sp = bendPoint(_p.set(G.x, 0, G.z - 4)); sun.target.position.copy(sp); sun.position.copy(sp).add(tmp.set(-8, 22, 10));
}
let lastT = performance.now();
const WARP = +(new URLSearchParams(location.search).get('warp') || 1);
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (G.state === 'load' || G.state === 'pause' || G.state === 'icon') { renderer.render(scene, cam); return; }
  if (G.state === 'play') { if (keys.ArrowLeft) G.tx -= 10 * dt; if (keys.ArrowRight) G.tx += 10 * dt; }
  dt *= G.slow;
  for (let i = 0; i < WARP; i++) update(WARP > 1 ? 0.05 * G.slow : dt);
  updatePops(dt); updateCamera(WARP > 1 ? 0.05 : dt);
  renderer.render(scene, cam);
}
// ---------------- boot ----------------
{ const q = new URLSearchParams(location.search); if (q.get('level')) PF.level = +q.get('level'); }
startLevel(PF.level, false); setScreen('home'); refreshHome(); $('loading').classList.add('hidden'); G.state = 'home';
if (new URLSearchParams(location.search).get('play')) play();
if (new URLSearchParams(location.search).get('lineup')) {   // test view: every character side by side, close up
  G.state = 'icon'; $('home').classList.add('hidden');
  const L = [{ x: -1.6, z: 0 }, { x: -0.8, z: 0 }].map((p, i) => ({ x: p.x, y: 0, z: p.z, ry: Math.PI, vest: VESTS[i * 3], skin: SKINS[i * 2], hair: HAIRS[i], face: i ? 'open' : 'smile', s: 1 }));
  crewMesh.draw(L); guardMesh.draw([{ x: 1.0, y: 0, z: 0, ry: Math.PI, skin: SKINS[0], hair: HAIRS[2], face: 'open', attack: true, s: 1 }]);
  leader.position.set(0.05, 0, 0); leader.rotation.y = Math.PI; leader.scale.setScalar(1.1);
  king.position.set(2.4, 0, -0.6); king.rotation.y = Math.PI - 0.3; king.scale.setScalar(1.25); setFace(king, 'open'); king.userData.arms[0].rotation.x = -2.4;
  cam.fov = 40; cam.updateProjectionMatrix(); bendPoint(camP.set(0.3, 1.7, 5.2), cam.position); cam.lookAt(0.3, 1.2, 0);
}
if (new URLSearchParams(location.search).get('icon')) {   // used once to render the app icon
  G.state = 'icon'; $('home').classList.add('hidden'); crewMesh.draw([]); guardMesh.draw([]); king.visible = false; leader.position.set(0, 0, 0); leader.rotation.y = 0.25; leader.scale.setScalar(1.25);
  leader.userData.arms[1].rotation.x = -2.5; leader.userData.parrot.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * 0.9; }); setFace(leader, 'smile');
  cam.fov = 26; cam.aspect = 1; cam.updateProjectionMatrix(); bendPoint(camP.set(0.55, 2.0, -3.3), cam.position); cam.lookAt(0.12, 1.68, 0);
}
requestAnimationFrame(frame);
window.__G = G; window.__play = play; window.__castle = () => castle; window.__end = () => { G.z = -lv.L + 3; return lv.L; }; window.__tris = () => { let t = 0; scene.traverse(o => { if (o.isInstancedMesh && o.count) t += (o.geometry.attributes.position.count / 3) * o.count; }); return Math.round(t); };
