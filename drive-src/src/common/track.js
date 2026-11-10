// The road of a level (both driving games): asphalt with lane markings, pavements in towns, rivers with splash ramps
// (Splash Racer), and themed scenery down both sides: city towers, suburbs, beach, jungle, mountains. Everything
// static is merged per chunk (a few draw calls) and only the chunks near the camera are drawn.
import * as THREE from 'three';
import { canvasTex, flat, mesh, lumpy, mergeStatic, mergeGeometries, CHUNK } from './gfx.js';
const PI = Math.PI, rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
export const THEMES = {
  city: { sky: ['#3f9cf0', '#d8eeff'], fog: 0xd8e8f8, ground: 0x8fae5a, ground2: 0x7a9a4a, walk: true, props: 'city', water: 0x3a9ae8 },
  town: { sky: ['#4ab0ff', '#e0f4ff'], fog: 0xdcf0ff, ground: 0x6fbf4a, ground2: 0x5aa83a, walk: true, props: 'town', water: 0x3aa8e8 },
  beach: { sky: ['#2fb8ff', '#d8f6ff'], fog: 0xd0f2ff, ground: 0xf0d89a, ground2: 0xe0c47a, props: 'beach', water: 0x28c8d8 },
  jungle: { sky: ['#4ac8a8', '#e4fff0'], fog: 0xd8f8e8, ground: 0x4faf3a, ground2: 0x3a9a2a, props: 'jungle', water: 0x2fa8a0 },
  mountain: { sky: ['#6aa8ff', '#eef6ff'], fog: 0xe4eefa, ground: 0x7a9a6a, ground2: 0x6a8a5a, props: 'mountain', water: 0x4a8ad8 },
  night: { sky: ['#101a40', '#3a3a7a'], fog: 0x2a2a5a, ground: 0x2a4a3a, ground2: 0x1f3a2a, walk: true, props: 'city', water: 0x1a3a7a, night: true },
  sunset: { sky: ['#ff7a5a', '#ffd8a0'], fog: 0xffc8a0, ground: 0xc8a86a, ground2: 0xb8985a, props: 'beach', water: 0xff8a6a },
};
let KIT = null, NAT = null;
export function setKits(kit, nature) { KIT = {}; if (kit.children.length === 1 && kit.children[0].children.length > 1) kit = kit.children[0]; kit.children.forEach(c => { KIT[c.name] = c; }); NAT = {}; if (nature) nature.children.forEach(c => { NAT[c.name] = c; }); }
export const kitModel = n => KIT[n];
// a copy of a kit model (Kenney city pieces are 1 unit per tile: s scales them up)
export function kit(n, s = 1) { const src = KIT[n] || NAT[n]; const o = src.clone(true); o.scale.multiplyScalar(s); return o; }
const asphalt = {};
function roadTex(lanes, night) {
  const k = lanes + (night ? 'n' : ''); if (asphalt[k]) return asphalt[k];
  const t = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = night ? '#3a3a44' : '#5a5a62'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { const l = Math.random(); c.fillStyle = l < 0.5 ? `rgba(255,255,255,${0.04 + l * 0.06})` : `rgba(0,0,0,${0.05 + l * 0.08})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + l * 2, 1 + l * 2); }
    c.fillStyle = '#f4f4f0'; c.fillRect(6, 0, 7, h); c.fillRect(w - 13, 0, 7, h);   // edge lines
    for (let i = 1; i < lanes; i++) { const x = i / lanes * w; if (lanes === 4 && i === 2) { c.fillStyle = '#ffcc33'; c.fillRect(x - 7, 0, 5, h); c.fillRect(x + 2, 0, 5, h); c.fillStyle = '#f4f4f0'; } else for (let y = 0; y < h; y += 128) c.fillRect(x - 3, y, 6, 64); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return (asphalt[k] = t);
}
const tiles = canvasTex(128, 128, (c, w) => { c.fillStyle = '#c8c0b0'; c.fillRect(0, 0, w, w); c.strokeStyle = '#a89e8c'; c.lineWidth = 3; for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } });
tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.anisotropy = 4;
function groundTex(T) {
  const base = new THREE.Color(T.ground), dark = new THREE.Color(T.ground2), hex = c => '#' + c.getHexString();
  const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = hex(base); c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = hex(dark) + '55'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 26, 0, 7); c.fill(); } for (let i = 0; i < 2200; i++) { const l = Math.random(); c.fillStyle = l < 0.5 ? `rgba(255,255,220,${0.08 + l * 0.15})` : `rgba(0,30,0,${0.06 + l * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + l * 2, 1 + l * 2); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
export const waterTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,50,90,.14)'; c.lineWidth = 5; for (let y = 0; y < h; y += 22) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / w * PI * 4) * 5); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 50; i++) c.fillRect(Math.random() * w, Math.random() * h, 7, 2); });
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.anisotropy = 4;
// ---------------- the track ----------------
// T: { L, RW (road width), lanes, theme, water: [{ z0, z1 }] (river sections), start (z of the start line) }
export const WATER_Y = -0.7;
export function buildTrack(T, scene) {
  const TH = THEMES[T.theme] || THEMES.town, g = new THREE.Group(), anims = [], L = T.L, z0 = 30, zEnd = -L - 120, RW = T.RW, len = z0 - zEnd;
  scene.add(g);
  const water = T.water || [];
  const wetAt = z => water.find(w => z <= w.z0 && z >= w.z1);
  // road pieces between the rivers (a river cuts the road; ramps lead down into it and back up)
  const cuts = [[z0, zEnd]]; for (const w of water) { const c = cuts.pop(); cuts.push([c[0], w.z0], [w.z1, c[1]]); }
  const rmat = new THREE.MeshStandardMaterial({ map: roadTex(T.lanes || 3, TH.night), roughness: 0.9 });
  for (const [a, b] of cuts) {
    const l = a - b; if (l <= 0) continue;
    const m = mesh(new THREE.PlaneGeometry(RW, l, 2, Math.ceil(l / 2)), rmat, 0, 0.02, (a + b) / 2, g); m.rotation.x = -PI / 2;
    const tx = rmat.map.clone(); tx.needsUpdate = true; tx.repeat.set(1, l / 14); m.material = rmat.clone(); m.material.map = tx;
    if (TH.walk) for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(3.2, 0.25, l, 1, 1, Math.ceil(l / 2)), new THREE.MeshStandardMaterial({ map: tiles }), s * (RW / 2 + 1.6), 0.12, (a + b) / 2, g); const tt = tiles.clone(); tt.needsUpdate = true; tt.repeat.set(1, l / 3.2); w.material.map = tt;
      mesh(new THREE.BoxGeometry(0.3, 0.3, l, 1, 1, Math.ceil(l / 2)), flat(0xe8e2d4), s * (RW / 2 + 0.15), 0.15, (a + b) / 2, g); }
  }
  // the ground both sides (sand banks along the rivers)
  const gt = groundTex(TH); gt.repeat.set(6, len / 40);
  for (const s of [-1, 1]) { const m = mesh(new THREE.PlaneGeometry(90, len, 4, Math.ceil(len / 6)), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }), s * (RW / 2 + (TH.walk ? 3.2 : 0) + 45), -0.04, (z0 + zEnd) / 2, g); m.rotation.x = -PI / 2; }
  // rivers: water across the whole valley, sandy banks, splash ramps in and out
  for (const w of water) {
    const l = w.z0 - w.z1, wm = mesh(new THREE.PlaneGeometry(220, l + 10, 8, Math.ceil(l / 3)), new THREE.MeshStandardMaterial({ color: TH.water, map: waterTex, roughness: 0.2 }), 0, WATER_Y, (w.z0 + w.z1) / 2, g); wm.rotation.x = -PI / 2; wm.renderOrder = 1; wm.userData.dynamic = true;
    for (const [zz, dir] of [[w.z0, -1], [w.z1, 1]]) {   // a ramp: down into the water at the start, up out of it at the end
      const rp = mesh(new THREE.BoxGeometry(RW, 0.3, 7), flat(0xd8b070), 0, -0.25, zz + dir * 3.4, g); rp.rotation.x = dir * -0.12;
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.4, 0.9, 7), flat(0xff6a3a), s * RW / 2, 0.1, zz + dir * 3.4, g).rotation.x = dir * -0.12;
      const bank = mesh(new THREE.BoxGeometry(200, 1.5, 3), flat(TH.ground2), 0, -0.8, zz - dir * 0.2, g); void bank;
    }
    // the river banks far out to the sides
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(6, 1.2, l), flat(0xe8d49a), s * 34, -0.4, (w.z0 + w.z1) / 2, g);
  }
  // scenery down both sides
  const side = TH.walk ? RW / 2 + 3.2 : RW / 2;
  const free = z => !water.some(w => z < w.z0 + 6 && z > w.z1 - 6);
  const P = PROPS[TH.props];
  for (let z = 20; z > zEnd + 30; z -= P.step()) for (const s of [-1, 1]) { if (!free(z)) { if (Math.random() < 0.35) { const o = P.water(); if (o) { o.position.set(s * rnd(16, 40), WATER_Y, z); o.rotation.y = rnd(0, PI * 2); g.add(o); } } continue; } const o = P.near(s); if (o) { o.position.x += s * (side + (o.userData.gap ?? rnd(2, 5))); o.position.z += z; g.add(o); } }
  for (let z = 20; z > zEnd + 30; z -= rnd(6, 12)) for (const s of [-1, 1]) if (Math.random() < 0.5) { const o = P.far(); if (o) { o.position.set(s * rnd(side + 22, side + 70), 0, z); if (!free(z)) o.position.y = -0.3; o.rotation.y = rnd(0, PI * 2); g.add(o); } }
  if (P.lamp) for (let z = 10; z > zEnd + 30; z -= 24) if (free(z)) for (const s of [-1, 1]) { const o = P.lamp(s); o.position.set(s * (RW / 2 + 0.7), 0, z + (s > 0 ? 12 : 0)); g.add(o); }
  // mountains far away, the sky, clouds and fog
  for (let i = 0; i < 22; i++) { const s = i % 2 ? 1 : -1, m = new THREE.Group(), c = TH.props === 'mountain' ? 0x8a9aaa : TH.night ? 0x2a2a4a : 0x5a9a5a; mesh(lumpy(new THREE.ConeGeometry(18, 30, 7, 3), 1.5), flat(c), 0, 13, 0, m); if (TH.props === 'mountain') mesh(new THREE.ConeGeometry(7.2, 10, 7), flat(0xffffff), 0, 23.5, 0, m); m.position.set(s * rnd(110, 170), -2, rnd(zEnd, 40)); m.scale.setScalar(rnd(1, 2.2)); g.add(m); }
  const skyG = new THREE.SphereGeometry(400, 24, 12), top = new THREE.Color(TH.sky[0]), low = new THREE.Color(TH.sky[1]), sp = skyG.attributes.position, sc = new Float32Array(sp.count * 3), _sc = new THREE.Color();
  for (let i = 0; i < sp.count; i++) { const v = 1 - (Math.asin(Math.max(-1, Math.min(1, sp.getY(i) / 400))) / PI + 0.5), k = Math.min(1, v / 0.6); _sc.copy(top).lerp(low, k); sc.set([_sc.r, _sc.g, _sc.b], i * 3); }
  skyG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const skyM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); skyM.userData.flat = true;
  const sky = new THREE.Mesh(skyG, skyM); sky.renderOrder = 2; sky.userData.dynamic = true; g.add(sky);
  { const parts = []; for (let i = 0; i < 14; i++) { const cx = rnd(-250, 250), cy = rnd(60, 130), cz = rnd(-300, 60); for (let j = 0; j < 5; j++) { const q = new THREE.IcosahedronGeometry(rnd(6, 11), 1); q.translate(cx + j * 7 - 14, cy + rnd(-2, 2), cz + rnd(-3, 3)); parts.push(q); } }
    const cm = new THREE.MeshBasicMaterial({ color: TH.night ? 0x5a5a8a : 0xffffff, fog: false }); cm.userData.flat = true; sky.add(new THREE.Mesh(mergeGeometries(parts), cm)); }
  if (TH.night) { const n = 200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd(0, PI * 2), e = rnd(0.15, 1.3); pos[i * 3] = Math.cos(a) * Math.cos(e) * 380; pos[i * 3 + 1] = Math.sin(e) * 380; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 380; } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })); st.material.userData.flat = true; sky.add(st); }
  scene.fog = new THREE.Fog(TH.fog, 70, 230);
  g.traverse(o => { o.frustumCulled = false; });
  const chunks = mergeStatic(g);
  return {
    group: g, sky, theme: TH, wetAt,
    update(dt, t) { waterTex.offset.set(t * 0.02, t * 0.08); anims.forEach(a => a(t)); },
    cull(z) { for (const c of chunks) c.visible = c.userData.z0 > z - 220 && c.userData.z1 < z + 40; },
    cullAll() { for (const c of chunks) c.visible = true; },
    dispose() { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
// ---------------- what grows / stands beside the road ----------------
const B = 9;   // Kenney city tiles → metres
const NT = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3'], PINE = ['Pine_1', 'Pine_2', 'Pine_3'], BUSH = ['Bush_Common', 'Bush_Common_Flowers'], ROCK = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'], FLOW = ['Flower_3_Group', 'Flower_4_Group', 'Grass_Common_Tall', 'Fern_1'];
const nat = (names, s0 = 1, s1 = 1.4) => { const n = pick(names); if (!NAT[n]) return null; const o = kit(n, rnd(s0, s1)); o.rotation.y = rnd(0, PI * 2); return o; };
function palm() { const o = new THREE.Group(), h = rnd(5, 7); for (let i = 0; i < 7; i++) mesh(new THREE.CylinderGeometry(0.2, 0.25, h / 7 + 0.05, 6), flat(0x8a6a4a), i * 0.07, (i + 0.5) * h / 7, 0, o); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), flat(0x3faa4a), 0.5, h, 0, o); l.geometry.translate(0, 0, 1.2); l.rotation.set(0.5, i / 7 * PI * 2, 0); } return o; }
function building(names, s = B) { const o = kit(pick(names), s * rnd(0.95, 1.1)); o.rotation.y = rnd(0, 1) < 0.5 ? 0 : PI; o.userData.gap = rnd(3, 6); return o; }
const CITY = ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d'];
const HOUSES = ['building-type-a', 'building-type-b', 'building-type-c', 'building-type-d', 'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h', 'building-type-k', 'building-type-m', 'building-type-p', 'building-type-s'];
function faceRoad(o, s) { o.rotation.y = s > 0 ? -PI / 2 : PI / 2; return o; }
const PROPS = {
  city: { step: () => rnd(11, 15), near: s => Math.random() < 0.9 ? faceRoad(building(CITY), s) : kit('tree-large', 8), far: () => Math.random() < 0.6 ? building(CITY, B * 1.3) : null, water: () => null, lamp: s => { const o = kit(Math.random() < 0.8 ? 'light-curved' : 'traffic-light', 8); o.rotation.y = s > 0 ? PI : 0; return o; } },
  town: { step: () => rnd(12, 18), near: s => { const r = Math.random(); if (r < 0.65) { const o = faceRoad(building(HOUSES), s); return o; } const t = kit(r < 0.85 ? 'tree-large' : 'tree-small', rnd(7, 9)); t.userData.gap = rnd(1, 3); return t; }, far: () => Math.random() < 0.5 ? nat(NT, 1.2, 1.8) : null, water: () => null, lamp: s => { const o = kit('light-square', 8); o.rotation.y = s > 0 ? PI : 0; return o; } },
  beach: { step: () => rnd(6, 10), near: () => { const r = Math.random(); const o = r < 0.5 ? palm() : r < 0.75 ? nat(BUSH) : nat(FLOW, 1.2, 1.8); if (o) o.userData.gap = rnd(1, 8); return o; }, far: () => Math.random() < 0.6 ? palm() : nat(ROCK, 1.5, 2.5), water: () => Math.random() < 0.5 ? kit(pick(['boat-sail-a', 'boat-fishing-small', 'buoy-flag', 'boat-row-small']), 1.3) : null },
  jungle: { step: () => rnd(4, 7), near: () => { const o = Math.random() < 0.6 ? nat(NT, 1, 1.6) : nat([...BUSH, ...FLOW], 1.2, 2); if (o) o.userData.gap = rnd(1, 9); return o; }, far: () => nat(NT, 1.4, 2.2), water: () => Math.random() < 0.4 ? kit(pick(['boat-row-small', 'buoy', 'boat-fishing-small']), 1.3) : null },
  mountain: { step: () => rnd(5, 9), near: () => { const o = Math.random() < 0.6 ? nat(PINE, 1, 1.6) : nat(ROCK, 1, 2); if (o) o.userData.gap = rnd(1, 9); return o; }, far: () => nat(PINE, 1.4, 2.4), water: () => Math.random() < 0.3 ? kit('buoy-flag', 1.3) : null },
};
