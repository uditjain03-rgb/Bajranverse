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
// Phone GPUs: every lit material is drawn with its lighting worked out per vertex (sun, sky/ground light, rim light
// and a small sun highlight), and only a texture read per pixel. Per-pixel PBR lighting cost about 10x more per frame
// and made the game drop resolution (blurry) and lag on phones.
const LIT = { MeshStandardMaterial: 1, MeshLambertMaterial: 1, MeshPhongMaterial: 1, MeshPhysicalMaterial: 1 };
function vertexLit(sh) {
  const spec = sh.shaderType === 'MeshStandardMaterial' || sh.shaderType === 'MeshPhysicalMaterial';
  sh.vertexShader = THREE.ShaderLib.basic.vertexShader
    .replace('#include <common>', '#include <common>\n#include <lights_pars_begin>\nvarying vec3 vLit; varying vec3 vSpec;' + (spec ? '\nuniform float roughness;' : ''))
    .replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )', '#if 1')
    .replace(/}\s*$/, `	vec3 N = normalize( transformedNormal ); vec3 lit = ambientLightColor; vSpec = vec3( 0.0 );
	#if NUM_HEMI_LIGHTS > 0
	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) lit += getHemisphereLightIrradiance( hemisphereLights[ i ], N );
	#endif
	#if NUM_DIR_LIGHTS > 0
	vec3 Vd = normalize( -mvPosition.xyz );
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		float d = dot( N, directionalLights[ i ].direction );
		lit += max( d, 0.0 ) * directionalLights[ i ].color;
		${spec ? 'if ( i == 0 && d > 0.0 ) { float r = clamp( roughness, 0.05, 1.0 ); vec3 H = normalize( directionalLights[ i ].direction + Vd ); vSpec = directionalLights[ i ].color * pow( max( dot( N, H ), 0.0 ), exp2( 9.0 * ( 1.0 - r ) + 1.0 ) ) * ( 1.0 - r ) * 0.35; }' : ''}
	}
	#endif
	vLit = lit * RECIPROCAL_PI;
}`);
  sh.fragmentShader = THREE.ShaderLib.basic.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLit; varying vec3 vSpec; uniform vec3 emissive;\n#include <emissivemap_pars_fragment>')
    .replace('reflectedLight.indirectDiffuse *= diffuseColor.rgb;', 'reflectedLight.indirectDiffuse *= diffuseColor.rgb * vLit;\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <emissivemap_fragment>\n\treflectedLight.indirectDiffuse += totalEmissiveRadiance + vSpec;');
}
THREE.Material.prototype.onBeforeCompile = function (sh) { if (LIT[sh.shaderType]) vertexLit(sh); sh.uniforms.uGX = U.uGX; sh.uniforms.uGY = U.uGY; sh.uniforms.uGE = this.userData.flat ? OFF : U.uGE; };
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
  pathTex.anisotropy = 8; pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping; pathTex.repeat.set(1, len / 20);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W, len, 2, Math.ceil(len / 2)), new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.95 }));
  path.rotation.x = -PI / 2; path.position.set(0, 0.02, z0 - len / 2); path.receiveShadow = true; g.add(path);
  // the ground either side: sand or grass (or snow, rock, coral) with soft bumps
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(70, len, 14, Math.ceil(len / 4)), p = geo.attributes.position, col = [];
    const c1 = new THREE.Color(T.ground), c2 = new THREE.Color(T.ground2);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), off = Math.abs(x + s * 35) ; const h = x * s > -30 ? Math.max(0, (Math.abs(x + s * 35) - 6)) * 0.08 * (1 + Math.sin(p.getY(i) * 0.05 + x) * 0.6) : 0; void off; p.setZ(i, h + Math.sin(p.getY(i) * 0.13 + x * 0.4) * 0.25); const c = c1.clone().lerp(c2, Math.random() * 0.5).lerp(new THREE.Color(1, 1, 1), 0.55); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const gt = groundTex(T); gt.anisotropy = 4;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: gt, roughness: 1 }));
    m.rotation.x = -PI / 2; m.position.set(s * (PATH_W / 2 + 35), -0.05, z0 - len / 2); m.receiveShadow = true; g.add(m);
  }
  // the sea all around the island
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, len + 400, 20, Math.ceil((len + 400) / 8)), new THREE.MeshStandardMaterial({ color: T.sea, roughness: 0.25, metalness: 0.1, emissive: T.id === 'volcano' ? 0x8a2a00 : 0x000000 }));
  sea.rotation.x = -PI / 2; sea.position.set(0, -1.2, z0 - len / 2); sea.renderOrder = 1; g.add(sea);   // drawn after the land: hidden sea pixels are skipped
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, len, 1, 1, Math.ceil(len / 4)), flat(T.ground2)); e.position.set(s * (PATH_W / 2 + 71), -1, z0 - len / 2); g.add(e); }
  // ships at sea, gulls in the sky, moving waves
  const wavesT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,40,80,.18)'; c.lineWidth = 6; for (let y = 0; y < h; y += 32) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / w * PI * 4) * 6); c.stroke(); } });
  wavesT.wrapS = wavesT.wrapT = THREE.RepeatWrapping; wavesT.repeat.set(30, (len + 400) / 24); sea.material.map = wavesT; sea.material.needsUpdate = true;
  anims.push(t => { wavesT.offset.set(t * 0.05, t * 0.08); });
  for (let i = 0; i < 5; i++) { const sh = oneMesh(ship(i % 2 === 1)), sx = (i % 2 ? 1 : -1) * rnd(80, 130), sz = z0 - rnd(40, len); sh.position.set(sx, -1.2, sz); sh.rotation.y = rnd(0, PI * 2); sh.userData.dynamic = true; g.add(sh); anims.push(t => { sh.position.y = -1.2 + Math.sin(t * 0.8 + i) * 0.3; sh.rotation.z = Math.sin(t * 0.6 + i) * 0.04; }); }
  for (let i = 0; i < 5; i++) { const gl = gull(), cx = rnd(-30, 30), cz = z0 - rnd(20, len), r = rnd(8, 18), y = rnd(10, 18), sp = rnd(0.3, 0.6), ph = rnd(0, 6); gl.userData.dynamic = true; g.add(gl); anims.push(t => { const a = t * sp + ph; gl.position.set(cx + Math.cos(a) * r, y + Math.sin(t * 1.3 + i) * 0.6, cz + Math.sin(a) * r); gl.rotation.y = -a; gl.userData.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * Math.sin(t * 9 + i) * 0.5; }); }); }
  // scenery down both sides
  const P = KIT ? KPROPS[T.props] : PROPS[T.props];
  for (let z = 10; z > zEnd + 20; z -= rnd(6, 11)) for (const s of [-1, 1]) {
    if (Math.random() < 0.75) { const o = P.near(); o.position.set(s * rnd(PATH_W / 2 + 2, PATH_W / 2 + 9), 0, z + rnd(-3, 3)); o.rotation.y = rnd(0, PI * 2); g.add(o); }
    if (Math.random() < 0.42) { const o = P.far(); o.position.set(s * rnd(PATH_W / 2 + 12, PATH_W / 2 + 40), 0, z + rnd(-4, 4)); o.rotation.y = rnd(0, PI * 2); o.scale.multiplyScalar(rnd(1, 1.8)); g.add(o); }
  }
  // grass, flowers and stones right along the edges of the path
  if (P.edge) for (let z = 10; z > zEnd + 20; z -= rnd(3.5, 6.5)) for (const s of [-1, 1]) if (Math.random() < 0.6) { const o = P.edge(); o.position.set(s * rnd(PATH_W / 2 + 0.6, PATH_W / 2 + 2.2), 0, z); o.rotation.y = rnd(0, PI * 2); g.add(o); }
  // fences along parts of the path
  for (let z = -20; z > zEnd + 40; z -= rnd(40, 90)) { const n = Math.floor(rnd(4, 9)); for (const s of [-1, 1]) g.add(fence(s * (PATH_W / 2 + 0.6), z, n, T)); z -= n * 2.5; }
  // big mountains far away
  for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1, m = mountain(T); m.position.set(s * rnd(70, 140), -2, rnd(zEnd, 40)); m.scale.setScalar(rnd(1, 2.2)); g.add(m); }
  // the sky (not bent) and fog
  // a gradient in the sphere's vertex colours (no texture to read: the cheapest possible sky)
  const skyG = new THREE.SphereGeometry(300, 24, 12), top = new THREE.Color(T.sky[0]), low = new THREE.Color(T.sky[1]), sp = skyG.attributes.position, sc = new Float32Array(sp.count * 3), _sc = new THREE.Color();
  for (let i = 0; i < sp.count; i++) { const v = 1 - (Math.asin(Math.max(-1, Math.min(1, sp.getY(i) / 300))) / PI + 0.5), k = Math.min(1, v / 0.6); _sc.copy(top).lerp(low, k); sc.set([_sc.r, _sc.g, _sc.b], i * 3); }
  skyG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const skyM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); skyM.userData.flat = true;
  const sky = new THREE.Mesh(skyG, skyM); sky.renderOrder = 2; sky.userData.dynamic = true; g.add(sky);   // drawn last: only fills what is left
  { const parts = []; for (let i = 0; i < 14; i++) { const cx = rnd(-200, 200), cy = rnd(50, 110), cz = rnd(-250, 50); for (let j = 0; j < 5; j++) { const q = new THREE.IcosahedronGeometry(rnd(5, 9), 1); q.translate(cx + j * 6 - 12, cy + rnd(-2, 2), cz + rnd(-3, 3)); parts.push(q); } }
    const cm = new THREE.MeshBasicMaterial({ color: T.night ? 0x5a5a8a : 0xffffff, fog: false }); cm.userData.flat = true; sky.add(new THREE.Mesh(mergeGeometries(parts), cm)); }   // all clouds: one draw call
  if (T.night) {   // fireflies
    const n = 160, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-25, 25); pos[i * 3 + 1] = rnd(0.5, 5); pos[i * 3 + 2] = rnd(zEnd, 20); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ff = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 0.25, transparent: true, opacity: 0.9 })); g.add(ff);
    anims.push(t => { ff.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; });
  }
  scene.fog = new THREE.Fog(T.fog, 55, 175);
  g.traverse(o => { o.frustumCulled = false; });
  const chunks = mergeStatic(g);
  return {
    group: g, sky, update(dt, t) { anims.forEach(a => a(t)); },
    // only the scenery near the camera is drawn
    cull(z, all) { for (const c of chunks) c.visible = all || (c.userData.z0 > z - 170 && c.userData.z1 < z + 30); },
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
// ready-made textured nature props (CC0 Quaternius "Stylized Nature MegaKit", built by tools/kit.mjs into nature.glb)
let KIT = null;
export function setNature(root) { KIT = {}; root.children.forEach(c => { KIT[c.name] = c; }); }
function kit(names, s0 = 1, s1 = 1.3) { const n = pick(names), src = KIT[n]; const o = src.clone(true); o.scale.setScalar(rnd(s0, s1)); o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); return o; }
const pick = a => a[Math.floor(Math.random() * a.length)];
const TREES = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3'], PINES = ['Pine_1', 'Pine_2'], ROCKS = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'];
const BUSH = ['Bush_Common', 'Bush_Common_Flowers'], FLOWERS = ['Flower_3_Group', 'Flower_4_Group', 'Bush_Common_Flowers'], PLANTS = ['Fern_1', 'Plant_1_Big', 'Plant_7_Big'], GRASS = ['Grass_Common_Tall', 'Grass_Wispy_Tall'];
const KPROPS = {
  beach: { near: () => Math.random() < 0.3 ? crab() : Math.random() < 0.3 ? barrel() : kit([...BUSH, ...ROCKS, ...GRASS], 0.8, 1.2), far: () => Math.random() < 0.6 ? palm() : kit([...TREES, ...ROCKS], 1.2, 1.8), edge: () => kit([...GRASS, ...FLOWERS], 0.8, 1.2) },
  jungle: { near: () => kit([...PLANTS, ...BUSH, ...FLOWERS], 1, 1.5), far: () => Math.random() < 0.3 ? palm() : kit(TREES, 1.1, 1.7), edge: () => kit([...GRASS, ...PLANTS, ...FLOWERS], 0.8, 1.2) },
  snow: { near: () => Math.random() < 0.3 ? barrel() : kit([...ROCKS, ...PINES], 0.6, 1), far: () => Math.random() < 0.1 ? igloo() : kit(PINES, 1.2, 1.8), edge: () => kit(ROCKS, 0.3, 0.6) },
  volcano: { near: () => Math.random() < 0.4 ? lavaPool() : kit(ROCKS, 0.8, 1.4), far: () => kit(['DeadTree_2', ...ROCKS], 1.2, 2), edge: () => kit(ROCKS, 0.3, 0.6) },
  coral: { near: () => Math.random() < 0.5 ? coral() : kit([...FLOWERS, ...BUSH], 0.9, 1.3), far: () => Math.random() < 0.5 ? palm() : kit(TREES, 1.1, 1.6), edge: () => kit([...FLOWERS, ...GRASS], 0.8, 1.2) },
  night: { near: () => kit(['Mushroom_Common', ...PLANTS, ...BUSH], 1, 1.6), far: () => kit([...TREES, ...PINES], 1.1, 1.7), edge: () => kit(['Mushroom_Common', ...GRASS], 0.8, 1.3) },
};
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
// a whole (moving) object as one mesh: its plain coloured parts merged with their colours in the vertices
function oneMesh(o) {
  o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), geos = [], rest = [];
  o.traverse(q => { if (!q.isMesh) return; const M = q.material; if (Array.isArray(M) || M.map || M.transparent || (M.emissive && M.emissive.getHex()) || !LIT[M.type]) { rest.push(q); return; } let g = q.geometry.index ? q.geometry.toNonIndexed() : q.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, q.matrixWorld)); toVC(g, M); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); geos.push(g); });
  if (geos.length < 2) return o;
  const out = new THREE.Group(); out.position.copy(o.position); out.rotation.copy(o.rotation); out.scale.copy(o.scale);
  out.add(new THREE.Mesh(mergeGeometries(geos), vcMat(THREE.FrontSide)));
  for (const q of rest) { const c = new THREE.Mesh(q.geometry, q.material); c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, q.matrixWorld)); out.add(c); }
  return out;
}
const vcMats = {};
function vcMat(side) { return vcMats[side] || (vcMats[side] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side })); }
// bake a plain material's colour into the vertices (times any vertex colours it had); faceted materials get face normals
function toVC(g, m) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3), old = m.vertexColors && g.attributes.color, col = m.color || new THREE.Color(1, 1, 1);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r * (old ? old.getX(i) : 1); c[i * 3 + 1] = col.g * (old ? old.getY(i) : 1); c[i * 3 + 2] = col.b * (old ? old.getZ(i) : 1); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (g.attributes.uv) g.deleteAttribute('uv');
  if (m.flatShading || !g.attributes.normal) g.computeVertexNormals();   // not indexed here, so these are face normals
}
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let q = o; q && q !== root; q = q.parent) if (q.userData.dynamic) return;
    if (o.geometry.attributes.position.count > 20000) return;   // big ground pieces stay as they are
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld), long = bb.max.z - bb.min.z > 25 || bb.max.x - bb.min.x > 60;   // long pieces (the path, the ground, the sea, mountains) are never hidden
    const g = o.geometry, M = o.material, z = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).z, ck = long ? 'all' : Math.floor(-z / CHUNK);
    // plain coloured pieces (no texture, not see-through, not glowing) all share one material: their colour goes into
    // the vertices, so a whole chunk of them is a single draw call
    const vc = !Array.isArray(M) && !M.map && !M.transparent && !M.alphaTest && (!M.emissive || M.emissive.getHex() === 0) && LIT[M.type];
    if (long && !vc) return;
    const sig = vc ? 'vc' + M.side : ['normal', 'uv', 'color'].filter(k => g.attributes[k]).join('');
    const key = (vc ? 'VC' : M.uuid) + '|' + sig + '|' + ck;
    if (!groups.has(key)) groups.set(key, { mat: vc ? vcMat(M.side) : M, vc, list: [], ck, cast: false, recv: o.receiveShadow });
    groups.get(key).list.push(o); drop.push(o);
  });
  const chunks = new Map();
  for (const G of groups.values()) {
    const geos = G.list.map(o => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (G.vc) toVC(g, o.material); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; });
    const m = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
    if (!m) continue;
    const mesh = new THREE.Mesh(m, G.mat); mesh.castShadow = false; mesh.receiveShadow = G.recv; mesh.frustumCulled = false;   // scenery casts no real-time shadow (much faster)
    if (G.ck === 'all') { root.add(mesh); continue; }
    if (!chunks.has(G.ck)) { const c = new THREE.Group(); c.userData.z0 = -G.ck * CHUNK; c.userData.z1 = -(G.ck + 1) * CHUNK; chunks.set(G.ck, c); root.add(c); }
    chunks.get(G.ck).add(mesh);
  }
  for (const o of drop) { o.parent.remove(o); }
  // empty groups left behind are removed too
  const empty = []; root.traverse(o => { if (o.isGroup && o !== root && !o.children.length && !o.userData.dynamic) empty.push(o); }); empty.forEach(o => o.parent && o.parent.remove(o));
  return [...chunks.values()];
}

// a detailed ground texture (grass blades, sand grains, snow sparkle, rock) so the ground isn't flat colour
const gtCache = {};
function groundTex(T) {
  if (gtCache[T.id]) return gtCache[T.id];
  const base = new THREE.Color(T.ground), dark = new THREE.Color(T.ground2), hex = c => '#' + c.getHexString();
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = hex(base); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 30; c.save(); c.translate(x, y); c.scale(r, r); g.addColorStop(0, `rgba(${dark.r * 255 | 0},${dark.g * 255 | 0},${dark.b * 255 | 0},.35)`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore(); }
    const grass = ['beach', 'coral'].includes(T.id) ? 0 : T.id === 'snow' ? 2 : T.id === 'volcano' ? 3 : 1;
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = Math.random();
      if (grass === 1) { c.strokeStyle = l < 0.5 ? `rgba(255,255,200,${0.12 + l * 0.2})` : `rgba(0,40,0,${0.1 + l * 0.15})`; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.random() * 3 - 1.5, y - 3 - Math.random() * 5); c.stroke(); }
      else { c.fillStyle = l < 0.5 ? `rgba(255,255,255,${0.1 + l * 0.25})` : `rgba(60,40,20,${0.08 + l * 0.12})`; c.fillRect(x, y, grass === 3 ? 2 + l * 3 : 1 + l * 1.5, grass === 3 ? 2 + l * 2 : 1 + l * 1.5); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 120); return (gtCache[T.id] = t);
}
