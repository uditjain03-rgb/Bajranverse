// BUCCANEER BASH: the world. Six tropical island worlds in a faceted low-poly style. The path winds left and right and
// rolls over hills; the game itself is played on a straight line along -z and every vertex is bent onto the
// winding path in the shaders (and on the CPU with bendPoint, for the camera and labels).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PI = Math.PI;
export const PATH_W = 10;
export const WORLDS = [
  { id: 'beach', name: 'Treasure Beach', sky: ['#3fb8ff', '#c8f2ff'], fog: 0xc8f0ff, ground: 0xf2dc9a, ground2: 0xe8cc80, path: '#e8c48a', pathEdge: '#c89a5a', props: 'beach', castle: [0xd8d2c4, 0x2f5ad8], music: 'beach', sea: 0x2fc8e0 },
  { id: 'jungle', name: 'Jungle Isle', sky: ['#5fc8a8', '#e0fff0'], fog: 0xd8f8e8, ground: 0x4faf3a, ground2: 0x3a9a2a, path: '#b8864a', pathEdge: '#8a5a2a', props: 'jungle', castle: [0xc8c8a8, 0x3a8a3a], music: 'jungle', sea: 0x2fb8a8 },
  { id: 'snow', name: 'Frosty Harbor', sky: ['#7ab8ff', '#eaf6ff'], fog: 0xe0f0ff, ground: 0xf4f8ff, ground2: 0xd8e8f8, path: '#a8d8f0', pathEdge: '#78b0d8', props: 'snow', castle: [0xc8d8e8, 0x5a7ad8], music: 'snow', sea: 0x4a8ad8 },
  { id: 'volcano', name: 'Volcano Isle', sky: ['#ff7a4a', '#ffd0a0'], fog: 0xffc898, ground: 0x4a3a3a, ground2: 0x3a2a2a, path: '#8a5a4a', pathEdge: '#5a3a2a', props: 'volcano', castle: [0x6a5a5a, 0xff6a1a], music: 'volcano', sea: 0xff6a1a },
  { id: 'coral', name: 'Coral Cove', sky: ['#ff9ad8', '#fff0fa'], fog: 0xffe0f4, ground: 0xffd8c0, ground2: 0xffc8b0, path: '#fff4fa', pathEdge: '#ff8ab8', props: 'coral', castle: [0xfff0f8, 0x8a4ad8], music: 'coral', sea: 0x40d8d0 },
  { id: 'night', name: 'Moonlight Bay', sky: ['#1a2a5a', '#4a3a8a'], fog: 0x3a3a6a, ground: 0x2a4a5a, ground2: 0x1f3a4a, path: '#6a5a8a', pathEdge: '#4a3a6a', props: 'night', castle: [0x8a8aa8, 0x2ad8a8], music: 'night', night: true, sea: 0x1a2a6a },
];

// ---------------- the bend (winding path, hills) ----------------
const U = { uGX: { value: new THREE.Vector4() }, uGY: { value: new THREE.Vector4() }, uGE: { value: new THREE.Vector4(-400, 0, 0, 0) } };
THREE.ShaderChunk.common += `
uniform vec4 uGX; uniform vec4 uGY; uniform vec4 uGE;
vec3 goatBend(vec3 p) {
  if (uGE.w < 0.5) return p;
  float z = p.z, w = smoothstep(0.0, -40.0, z) * smoothstep(uGE.x, uGE.x + 60.0, z);
  float X = uGX.x * sin(uGX.y * z + uGX.z) + uGX.w * sin(uGX.y * 2.3 * z);
  float Y = uGY.x * sin(uGY.y * z + uGY.z) + uGY.w * sin(uGY.y * 2.7 * z + 1.0);
  return vec3(p.x + X * w, p.y + Y * w, p.z);
}`;
THREE.ShaderChunk.project_vertex = `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelMatrix * mvPosition;
mvPosition.xyz = goatBend(mvPosition.xyz);
mvPosition = viewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
THREE.ShaderChunk.worldpos_vertex = THREE.ShaderChunk.worldpos_vertex.replace('worldPosition = modelMatrix * worldPosition;', 'worldPosition = modelMatrix * worldPosition;\n\tworldPosition.xyz = goatBend(worldPosition.xyz);');
THREE.ShaderLib.sprite.vertexShader = THREE.ShaderLib.sprite.vertexShader.replace('vec4 mvPosition = modelViewMatrix[ 3 ];', 'vec4 mvPosition = viewMatrix * vec4( goatBend( ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz ), 1.0 );');
const OFF = { value: new THREE.Vector4(-400, 0, 0, 0) };
THREE.Material.prototype.onBeforeCompile = function (sh) { sh.uniforms.uGX = U.uGX; sh.uniforms.uGY = U.uGY; sh.uniforms.uGE = this.userData.flat ? OFF : U.uGE; };
THREE.Material.prototype.customProgramCacheKey = function () { return this.userData.flat ? 'f' : 'b'; };
let B = null;
export function setBend(n, endZ) {
  const R = (k => () => ((k = (k * 48271) % 2147483647) / 2147483647))(n * 131 + 7), d = Math.min(1, n / 18);
  B = { gx: [10 + d * 10, 2 * PI / (170 + R() * 60), R() * 6, 3 + d * 3], gy: [4 + d * 5, 2 * PI / (140 + R() * 50), R() * 6, 1.5 + d * 1.5], end: endZ };
  U.uGX.value.set(...B.gx); U.uGY.value.set(...B.gy); U.uGE.value.set(endZ, 0, 0, 1);
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function bendPoint(v, out = new THREE.Vector3()) {
  if (!B) return out.copy(v);
  const z = v.z, w = sstep(0, -40, z) * sstep(B.end, B.end + 60, z), [a, k, p, a2] = B.gx, [c, m, q, c2] = B.gy;
  return out.set(v.x + (a * Math.sin(k * z + p) + a2 * Math.sin(k * 2.3 * z)) * w, v.y + (c * Math.sin(m * z + q) + c2 * Math.sin(m * 2.7 * z + 1)) * w, z);
}
// slope along the path (+ = uphill going forward)
export function slopeAt(z) { if (!B) return 0; const e = 0.5, a = bendPoint(new THREE.Vector3(0, 0, z)).y, b = bendPoint(new THREE.Vector3(0, 0, z - e)).y; return (b - a) / e; }

// ---------------- helpers ----------------
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const matCache = {};
export const flat = (c, o = {}) => { const k = c + JSON.stringify(o); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o })); };
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
const rnd = (a, b) => a + Math.random() * (b - a);
// jitter vertices for the hand-made low-poly look
export function lumpy(geo, amt = 0.08) { const p = geo.attributes.position; const seen = new Map(); for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!seen.has(k)) seen.set(k, [rnd(-amt, amt), rnd(-amt, amt), rnd(-amt, amt)]); const d = seen.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); } geo.computeVertexNormals(); return geo; }

// ---------------- the world for one level ----------------
export function buildWorld(lv, scene) {
  const T = lv.world, g = new THREE.Group(), L = lv.L, anims = [];
  scene.add(g);
  const len = L + 120, z0 = 30, zEnd = z0 - len;
  // the dirt path: a long strip, finely cut so it bends smoothly, with darker edges and wheel ruts
  const boards = T.id === 'beach' || T.id === 'snow' || T.id === 'coral';
  const pathTex = boards ? canvasTex(256, 512, (c, w, h) => {   // a wooden boardwalk: planks across the path, nails, worn edges
    const cols = T.id === 'snow' ? ['#9a8a7a', '#a89888', '#8a7a6a'] : T.id === 'coral' ? ['#e8c8a8', '#f0d4b8', '#dcb898'] : ['#b8844a', '#c8945a', '#a87438'];
    for (let y = 0; y < h; y += 32) { c.fillStyle = cols[(y / 32) % 3]; c.fillRect(0, y, w, 30); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y + 30, w, 2); for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(60,30,10,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, y + Math.random() * 30, 20 + Math.random() * 60, 1.5); } c.fillStyle = '#3a3a3a'; for (const x of [10, w - 14]) { c.fillRect(x, y + 6, 4, 4); c.fillRect(x, y + 20, 4, 4); } }
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, w, 2);
  }) : canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = T.path; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 5); }
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = T.pathEdge; c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h);
    c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(w * 0.28, 0, 18, h); c.fillRect(w * 0.68, 0, 18, h);
  });
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping; pathTex.repeat.set(1, len / 20);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W, len, 2, Math.ceil(len / 2)), new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.95 }));
  path.rotation.x = -PI / 2; path.position.set(0, 0.02, z0 - len / 2); path.receiveShadow = true; g.add(path);
  // the ground either side: sand or grass (or snow, rock, coral) with soft bumps
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(70, len, 14, Math.ceil(len / 4)), p = geo.attributes.position, col = [];
    const c1 = new THREE.Color(T.ground), c2 = new THREE.Color(T.ground2);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), off = Math.abs(x + s * 35) ; const h = x * s > -30 ? Math.max(0, (Math.abs(x + s * 35) - 6)) * 0.08 * (1 + Math.sin(p.getY(i) * 0.05 + x) * 0.6) : 0; void off; p.setZ(i, h + Math.sin(p.getY(i) * 0.13 + x * 0.4) * 0.25); const c = c1.clone().lerp(c2, Math.random()); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    m.rotation.x = -PI / 2; m.position.set(s * (PATH_W / 2 + 35), -0.05, z0 - len / 2); m.receiveShadow = true; g.add(m);
  }
  // the sea all around the island
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, len + 400, 20, Math.ceil((len + 400) / 8)), new THREE.MeshStandardMaterial({ color: T.sea, roughness: 0.25, metalness: 0.1, emissive: T.id === 'volcano' ? 0x8a2a00 : 0x000000 }));
  sea.rotation.x = -PI / 2; sea.position.set(0, -1.2, z0 - len / 2); g.add(sea);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, len, 1, 1, Math.ceil(len / 4)), flat(T.ground2)); e.position.set(s * (PATH_W / 2 + 71), -1, z0 - len / 2); g.add(e); }
  // ships at sea, gulls in the sky, moving waves
  const wavesT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,40,80,.18)'; c.lineWidth = 6; for (let y = 0; y < h; y += 32) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / w * PI * 4) * 6); c.stroke(); } });
  wavesT.wrapS = wavesT.wrapT = THREE.RepeatWrapping; wavesT.repeat.set(30, (len + 400) / 24); sea.material.map = wavesT; sea.material.needsUpdate = true;
  anims.push(t => { wavesT.offset.set(t * 0.05, t * 0.08); });
  for (let i = 0; i < 5; i++) { const sh = ship(i % 2 === 1), sx = (i % 2 ? 1 : -1) * rnd(80, 130), sz = z0 - rnd(40, len); sh.position.set(sx, -1.2, sz); sh.rotation.y = rnd(0, PI * 2); sh.userData.dynamic = true; g.add(sh); anims.push(t => { sh.position.y = -1.2 + Math.sin(t * 0.8 + i) * 0.3; sh.rotation.z = Math.sin(t * 0.6 + i) * 0.04; }); }
  for (let i = 0; i < 9; i++) { const gl = gull(), cx = rnd(-30, 30), cz = z0 - rnd(20, len), r = rnd(8, 18), y = rnd(10, 18), sp = rnd(0.3, 0.6), ph = rnd(0, 6); gl.userData.dynamic = true; g.add(gl); anims.push(t => { const a = t * sp + ph; gl.position.set(cx + Math.cos(a) * r, y + Math.sin(t * 1.3 + i) * 0.6, cz + Math.sin(a) * r); gl.rotation.y = -a; gl.userData.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * Math.sin(t * 9 + i) * 0.5; }); }); }
  // scenery down both sides
  const P = PROPS[T.props];
  for (let z = 10; z > zEnd + 20; z -= rnd(6, 11)) for (const s of [-1, 1]) {
    if (Math.random() < 0.75) { const o = P.near(); o.position.set(s * rnd(PATH_W / 2 + 2, PATH_W / 2 + 9), 0, z + rnd(-3, 3)); o.rotation.y = rnd(0, PI * 2); g.add(o); }
    if (Math.random() < 0.6) { const o = P.far(); o.position.set(s * rnd(PATH_W / 2 + 12, PATH_W / 2 + 40), 0, z + rnd(-4, 4)); o.rotation.y = rnd(0, PI * 2); o.scale.multiplyScalar(rnd(1, 1.8)); g.add(o); }
  }
  // fences along parts of the path
  for (let z = -20; z > zEnd + 40; z -= rnd(40, 90)) { const n = Math.floor(rnd(4, 9)); for (const s of [-1, 1]) g.add(fence(s * (PATH_W / 2 + 0.6), z, n, T)); z -= n * 2.5; }
  // big mountains far away
  for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1, m = mountain(T); m.position.set(s * rnd(70, 140), -2, rnd(zEnd, 40)); m.scale.setScalar(rnd(1, 2.2)); g.add(m); }
  // the sky (not bent) and fog
  const skyT = canvasTex(4, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.6, T.sky[1]); gr.addColorStop(1, T.sky[1]); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false }); skyM.userData.flat = true;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), skyM); sky.userData.dynamic = true; g.add(sky);
  for (let i = 0; i < 14; i++) { const c = cloud(T); c.position.set(rnd(-200, 200), rnd(50, 110), rnd(-250, 50)); c.userData.flatSky = true; sky.add(c); }
  if (T.night) {   // fireflies
    const n = 160, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-25, 25); pos[i * 3 + 1] = rnd(0.5, 5); pos[i * 3 + 2] = rnd(zEnd, 20); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ff = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 0.25, transparent: true, opacity: 0.9 })); g.add(ff);
    anims.push(t => { ff.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; });
  }
  scene.fog = new THREE.Fog(T.fog, 60, 210);
  g.traverse(o => { o.frustumCulled = false; });
  const chunks = mergeStatic(g);
  return {
    group: g, sky, update(dt, t) { anims.forEach(a => a(t)); },
    // only the scenery near the camera is drawn
    cull(z, all) { for (const c of chunks) c.visible = all || (c.userData.z0 > z - 230 && c.userData.z1 < z + 40); },
    dispose() { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}

// ---------------- props ----------------
function tree(trunk, leaf, h = 3) { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.15, 0.22, h * 0.4, 6), flat(trunk), 0, h * 0.2, 0, o); for (let i = 0; i < 3; i++) mesh(lumpy(new THREE.ConeGeometry(h * (0.42 - i * 0.1), h * 0.45, 7), 0.05), flat(leaf), 0, h * (0.45 + i * 0.22), 0, o); return o; }
function roundTree(trunk, leaf, h = 3) { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.15, 0.22, h * 0.5, 6), flat(trunk), 0, h * 0.25, 0, o); mesh(lumpy(new THREE.IcosahedronGeometry(h * 0.35, 0), 0.1), flat(leaf), 0, h * 0.7, 0, o); return o; }
function rock(c, s = 1) { return mesh(lumpy(new THREE.DodecahedronGeometry(s * rnd(0.4, 0.9), 0), 0.15), flat(c), 0, s * 0.2, 0); }
function flowers(cols) { const o = new THREE.Group(); for (let i = 0; i < 6; i++) { const x = rnd(-0.8, 0.8), z = rnd(-0.8, 0.8); mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), flat(0x3a8a2a), x, 0.2, z, o); mesh(new THREE.IcosahedronGeometry(0.12, 0), flat(cols[i % cols.length]), x, 0.42, z, o); } return o; }
function mountain(T) {
  const o = new THREE.Group(), c = T.id === 'volcano' ? 0x3a2a2a : T.id === 'coral' ? 0xff9ac8 : T.id === 'night' ? 0x2a2a4a : T.id === 'snow' ? 0x8a9aaa : 0x3f8a3a;
  mesh(lumpy(new THREE.ConeGeometry(18, 30, 7, 3), 1.5), flat(c), 0, 13, 0, o);
  if (T.id === 'snow') mesh(new THREE.ConeGeometry(7.2, 10, 7), flat(0xffffff), 0, 23.5, 0, o);
  if (T.id === 'volcano') mesh(new THREE.ConeGeometry(4, 4, 7), new THREE.MeshBasicMaterial({ color: 0xff6a1a }), 0, 27, 0, o);
  return o;
}
function cloud(T) { const o = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: T.night ? 0x5a5a8a : 0xffffff, fog: false }); m.userData.flat = true; for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(5, 9), 1), m); s.position.set(i * 6 - 12, rnd(-2, 2), rnd(-3, 3)); o.add(s); } return o; }
function fence(x, z, n, T) {
  if (T.id === 'beach' || T.id === 'coral' || T.id === 'night') return ropeFence(x, z, n);
  const o = new THREE.Group(), wood = flat(T.id === 'coral' ? 0xffffff : T.id === 'snow' ? 0x8a6a4a : 0xa8783a);
  for (let i = 0; i < n; i++) mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), wood, x, 0.55, z - i * 2.5, o);
  for (const y of [0.45, 0.85]) mesh(new THREE.BoxGeometry(0.1, 0.14, (n - 1) * 2.5, 1, 1, n * 2), wood, x, y, z - (n - 1) * 1.25, o);
  return o;
}
function ropeFence(x, z, n) {
  const o = new THREE.Group(), post = flat(0x8a5a2a), rope = flat(0xd8c08a);
  for (let i = 0; i < n; i++) { mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 7), post, x, 0.6, z - i * 2.5, o); mesh(new THREE.SphereGeometry(0.13, 8, 6), post, x, 1.22, z - i * 2.5, o); }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 5; k++) { const t = (k + 0.5) / 5, y = 0.95 - Math.sin(t * PI) * 0.22; mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.52, 5), rope, x, y, z - i * 2.5 - t * 2.5, o).rotation.x = PI / 2 + (t - 0.5) * 0.5; }
  return o;
}
function ship(navy) {   // a two-masted ship far out at sea
  const o = new THREE.Group(), hull = flat(navy ? 0x2a3a6a : 0x5a3418);
  const h = mesh(new THREE.BoxGeometry(4, 2, 12, 1, 1, 4), hull, 0, 0.8, 0, o); h.scale.set(1, 1, 1);
  mesh(new THREE.BoxGeometry(4.1, 0.3, 12.1), flat(navy ? 0xffc21a : 0xc89a4a), 0, 1.75, 0, o);
  mesh(new THREE.ConeGeometry(2, 4, 4), hull, 0, 0.8, -7, o).rotation.set(-PI / 2, PI / 4, 0);
  for (const zz of [-2.5, 2.5]) { mesh(new THREE.CylinderGeometry(0.15, 0.2, 10, 6), flat(0x5a3a1a), 0, 6.5, zz, o); for (const [y, w] of [[5, 5], [8.5, 3.8]]) mesh(new THREE.BoxGeometry(w, 2.6, 0.1), flat(navy ? 0xffffff : 0xf2e6c8), 0, y, zz + 0.2, o); }
  const fl = mesh(new THREE.BoxGeometry(1.4, 0.9, 0.05), flat(navy ? 0x1a4ad8 : 0x111111), 0.7, 11.6, -2.5, o); void fl;
  return o;
}
function gull() { const o = new THREE.Group(), m = flat(0xffffff); mesh(new THREE.SphereGeometry(0.25, 8, 6), m, 0, 0, 0, o).scale.set(0.8, 0.7, 1.6); const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.x = s * 0.15; o.add(w); mesh(new THREE.BoxGeometry(1.1, 0.04, 0.35), m, s * 0.55, 0, 0, w); mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), flat(0x333333), s * 1.1, 0, 0, w); return w; }); o.userData.wings = wings; return o; }
function barn() { const o = new THREE.Group(); mesh(new THREE.BoxGeometry(4, 3, 5), flat(0xc8302a), 0, 1.5, 0, o); const r = mesh(new THREE.CylinderGeometry(0.01, 3, 2, 4, 1), flat(0x5a3a2a), 0, 4, 0, o); r.rotation.y = PI / 4; r.scale.set(1, 1, 1.25); mesh(new THREE.BoxGeometry(1.4, 1.8, 0.1), flat(0xffffff), 0, 0.9, 2.52, o); return o; }
function windmill() { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.9, 1.4, 6, 8), flat(0xf2e6d0), 0, 3, 0, o); mesh(new THREE.ConeGeometry(1.2, 1.5, 8), flat(0x8a4a2a), 0, 6.7, 0, o); const b = new THREE.Group(); b.position.set(0, 5.6, 1.2); o.add(b); for (let i = 0; i < 4; i++) { const s = mesh(new THREE.BoxGeometry(0.5, 3.4, 0.08), flat(0xffffff), 0, 1.7, 0); const p = new THREE.Group(); p.rotation.z = i * PI / 2; p.add(s); b.add(p); } o.userData.spin = b; return o; }
function sunflower() { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.05, 0.06, 2, 5), flat(0x4a8a2a), 0, 1, 0, o); const h = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10), flat(0xffc81a), 0, 2, 0.1, o); h.rotation.x = PI / 2.4; mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10), flat(0x5a3a1a), 0, 2.02, 0.16, o).rotation.x = PI / 2.4; return o; }
function lollipop() { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), flat(0xffffff), 0, 1.2, 0, o); const c = [0xff4fa8, 0x40c8ff, 0xffd23f, 0x8a4ad8][Math.floor(Math.random() * 4)]; mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.25, 14), flat(c), 0, 2.8, 0, o).rotation.x = PI / 2; mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 14), flat(0xffffff), 0, 2.8, 0.13, o); return o; }
function gumdrop() { return mesh(new THREE.SphereGeometry(0.8, 8, 6, 0, PI * 2, 0, PI / 2), flat([0xff4fa8, 0x3fcf6e, 0xffd23f, 0x40c8ff][Math.floor(Math.random() * 4)])); }
function mushroom() { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.2, 0.28, 1, 7), flat(0xf2e6d0), 0, 0.5, 0, o); mesh(new THREE.SphereGeometry(0.7, 10, 6, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: 0x40e0c8, emissive: 0x20a090, emissiveIntensity: 0.8, flatShading: true }), 0, 0.95, 0, o); return o; }
function palm() { const o = new THREE.Group(); for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 6), flat(0x8a6a4a), i * 0.06, 0.35 + i * 0.65, 0, o); for (let i = 0; i < 6; i++) { const l = mesh(new THREE.BoxGeometry(0.4, 0.05, 2.2), flat(0x3a9a3a), 0.36, 4.0, 0, o); l.rotation.set(0.4, i * PI / 3, 0); l.position.set(0.36 + Math.sin(i * PI / 3) * 0.9, 3.9, Math.cos(i * PI / 3) * 0.9); } return o; }
function lavaPool() { return mesh(new THREE.CylinderGeometry(rnd(1, 2), rnd(1, 2), 0.1, 9), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); }
function igloo() { const o = new THREE.Group(); mesh(new THREE.SphereGeometry(1.4, 10, 6, 0, PI * 2, 0, PI / 2), flat(0xffffff), 0, 0, 0, o); mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8, 1, false, 0, PI), flat(0xe8f4ff), 0, 0.4, 1.3, o).rotation.x = PI / 2; return o; }
function cow() { const o = new THREE.Group(); mesh(new THREE.BoxGeometry(0.8, 0.7, 1.4), flat(0xffffff), 0, 0.9, 0, o); mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), flat(0xffffff), 0, 1.1, 0.85, o); mesh(new THREE.BoxGeometry(0.42, 0.25, 0.2), flat(0xffb0b0), 0, 0.95, 1.12, o); mesh(new THREE.BoxGeometry(0.82, 0.5, 0.5), flat(0x222222), 0, 1.0, -0.2, o); for (const [x, z] of [[-0.3, 0.5], [0.3, 0.5], [-0.3, -0.5], [0.3, -0.5]]) mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), flat(0xffffff), x, 0.3, z, o); return o; }
function barrel() { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.9, 10), flat(0x9a5a2a), 0, 0.45, 0, o); for (const y of [0.15, 0.75]) mesh(new THREE.TorusGeometry(0.39, 0.03, 4, 12), flat(0x4a4a52), 0, y, 0, o).rotation.x = PI / 2; return o; }
function chest() { const o = new THREE.Group(); mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), flat(0x8a4a1a), 0, 0.25, 0, o); mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, PI), flat(0x9a5a2a), 0, 0.5, 0, o).rotation.z = PI / 2; mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), flat(0xffc21a), 0, 0.45, 0.31, o); return o; }
function shipwreck() { const o = new THREE.Group(); const h = mesh(new THREE.BoxGeometry(2.2, 1.2, 5), flat(0x6a3a1a), 0, 0.3, 0, o); h.rotation.z = 0.35; mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), flat(0x5a3a1a), 0.3, 2.2, 0, o).rotation.z = 0.5; mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshStandardMaterial({ color: 0xf2ecd8, side: THREE.DoubleSide }), 0.9, 2.6, 0, o).rotation.z = 0.5; return o; }
function crab() { const o = new THREE.Group(); mesh(new THREE.IcosahedronGeometry(0.25, 0), flat(0xe8402a), 0, 0.2, 0, o).scale.set(1.3, 0.6, 1); for (const s of [-1, 1]) { mesh(new THREE.IcosahedronGeometry(0.1, 0), flat(0xe8402a), s * 0.32, 0.25, -0.15, o); mesh(new THREE.SphereGeometry(0.05, 6, 4), flat(0xffffff), s * 0.08, 0.34, -0.15, o); } return o; }
function coral() { const o = new THREE.Group(), c = [0xff6a8a, 0xff9a4a, 0xb86aff, 0xffd23f][Math.floor(Math.random() * 4)]; for (let i = 0; i < 5; i++) { const b = mesh(new THREE.CylinderGeometry(0.08, 0.14, rnd(0.8, 1.8), 6), flat(c), rnd(-0.3, 0.3), 0.6, rnd(-0.3, 0.3), o); b.rotation.set(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4)); } return o; }
const PROPS = {
  beach: { near: () => { const r = Math.random(); return r < 0.3 ? crab() : r < 0.55 ? barrel() : r < 0.7 ? chest() : rock(0xd8c8a8, 0.6); }, far: () => Math.random() < 0.75 ? palm() : Math.random() < 0.5 ? shipwreck() : rock(0xb8a888, 2) },
  jungle: { near: () => Math.random() < 0.5 ? flowers([0xff4f6a, 0xffd23f, 0xff8a1a]) : barrel(), far: () => Math.random() < 0.5 ? palm() : roundTree(0x6a4a2a, 0x2f8a3a, rnd(3, 6)) },
  snow: { near: () => Math.random() < 0.5 ? rock(0xe8f0ff, 0.6) : barrel(), far: () => Math.random() < 0.15 ? igloo() : tree(0x6a4a2a, 0xe8f4ff, rnd(3, 5.5)) },
  volcano: { near: () => Math.random() < 0.5 ? rock(0x2a2020, 0.8) : lavaPool(), far: () => Math.random() < 0.6 ? palm() : rock(0x3a2a2a, 2.2) },
  coral: { near: () => Math.random() < 0.6 ? coral() : crab(), far: () => Math.random() < 0.6 ? coral() : palm() },
  night: { near: () => Math.random() < 0.5 ? mushroom() : chest(), far: () => Math.random() < 0.6 ? palm() : shipwreck() },
};

// Phones slow down with many separate objects, so every still object of the world is merged into a few big meshes:
// one per material for each 60 m stretch of the path. Moving things (ships, gulls, the sky) are left alone.
const CHUNK = 60;
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let q = o; q && q !== root; q = q.parent) if (q.userData.dynamic) return;
    if (o.geometry.attributes.position.count > 20000) return;   // big ground pieces stay as they are
    const g = o.geometry, sig = ['normal', 'uv', 'color'].filter(k => g.attributes[k]).join('');
    const z = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).z, ck = Math.floor(-z / CHUNK);
    const key = o.material.uuid + '|' + sig + '|' + ck + '|' + o.castShadow + o.receiveShadow;
    if (!groups.has(key)) groups.set(key, { mat: o.material, list: [], ck, cast: o.castShadow, recv: o.receiveShadow });
    groups.get(key).list.push(o); drop.push(o);
  });
  const chunks = new Map();
  for (const G of groups.values()) {
    const geos = G.list.map(o => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; });
    const m = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
    if (!m) continue;
    const mesh = new THREE.Mesh(m, G.mat); mesh.castShadow = G.cast; mesh.receiveShadow = G.recv; mesh.frustumCulled = false;
    if (!chunks.has(G.ck)) { const c = new THREE.Group(); c.userData.z0 = -G.ck * CHUNK; c.userData.z1 = -(G.ck + 1) * CHUNK; chunks.set(G.ck, c); root.add(c); }
    chunks.get(G.ck).add(mesh);
  }
  for (const o of drop) { o.parent.remove(o); }
  // empty groups left behind are removed too
  const empty = []; root.traverse(o => { if (o.isGroup && o !== root && !o.children.length && !o.userData.dynamic) empty.push(o); }); empty.forEach(o => o.parent && o.parent.remove(o));
  return [...chunks.values()];
}
