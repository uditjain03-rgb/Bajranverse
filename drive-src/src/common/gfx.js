// Shared graphics for the BajrangVerse driving games: the road bend (curves and hills done in the vertex shader, and on
// the CPU with bendPoint), phone-friendly lighting (worked out per vertex), canvas textures and mesh helpers, and the
// merging of static scenery into a few draw calls per chunk.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { mergeGeometries };

const PI = Math.PI;
// ---------------- the bend (winding path, hills) ----------------
const U = { uGX: { value: new THREE.Vector4() }, uGY: { value: new THREE.Vector4() }, uGE: { value: new THREE.Vector4(-400, 0, 0, 0) } };
THREE.ShaderChunk.common += `
uniform vec4 uGX; uniform vec4 uGY; uniform vec4 uGE;
vec3 goatBend(vec3 p) {
  if (uGE.w < 0.5) return p;
  float z = p.z, w = smoothstep(uGE.y, uGE.y - 40.0, z) * smoothstep(uGE.x, uGE.x + 60.0, z);
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
	${sh.shaderType === 'MeshPhysicalMaterial' ? `{   // glossy paint, glass and chrome: the sky (and the ground) reflected, stronger at grazing angles (per vertex)
		vec3 Vv = normalize( -mvPosition.xyz ), Rv = reflect( -Vv, N ), Rw = ( vec4( Rv, 0.0 ) * viewMatrix ).xyz;
		float fr = 0.06 + 0.94 * pow( 1.0 - max( dot( N, Vv ), 0.0 ), 4.0 );
		vec3 env = mix( vec3( 0.16, 0.15, 0.14 ), vec3( 0.72, 0.84, 1.0 ), smoothstep( -0.15, 0.25, Rw.y ) ) + vec3( 0.5 ) * smoothstep( 0.55, 0.9, Rw.y );
		#if NUM_HEMI_LIGHTS > 0
		env *= 0.45 + 0.4 * hemisphereLights[ 0 ].skyColor;
		#endif
		vSpec += env * fr * gloss * 0.9;
	}` : ''}
}`);
  if (sh.shaderType === 'MeshPhysicalMaterial') sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float gloss;');
  sh.fragmentShader = THREE.ShaderLib.basic.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLit; varying vec3 vSpec; uniform vec3 emissive;\n#include <emissivemap_pars_fragment>')
    .replace('reflectedLight.indirectDiffuse *= diffuseColor.rgb;', 'reflectedLight.indirectDiffuse *= diffuseColor.rgb * vLit;\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <emissivemap_fragment>\n\treflectedLight.indirectDiffuse += totalEmissiveRadiance + vSpec;');
}
THREE.Material.prototype.onBeforeCompile = function (sh) { if (LIT[sh.shaderType]) vertexLit(sh); sh.uniforms.uGX = U.uGX; sh.uniforms.uGY = U.uGY; sh.uniforms.uGE = this.userData.flat ? OFF : U.uGE; };
THREE.Material.prototype.customProgramCacheKey = function () { return this.userData.flat ? 'f' : 'b'; };
let B = null;
export function setBend(n, endZ, ampX = 1, ampY = 1, start = 0) {
  const R = (k => () => ((k = (k * 48271) % 2147483647) / 2147483647))(n * 131 + 7), d = Math.min(1, n / 18);
  B = { gx: [(10 + d * 10) * ampX, 2 * PI / (170 + R() * 60), R() * 6, (3 + d * 3) * ampX], gy: [(4 + d * 5) * ampY, 2 * PI / (140 + R() * 50), R() * 6, (1.5 + d * 1.5) * ampY], end: endZ, start };
  U.uGX.value.set(...B.gx); U.uGY.value.set(...B.gy); U.uGE.value.set(endZ, start, 0, 1);
}
export function flatBend() { B = null; U.uGE.value.set(-400, 0, 0, 0); }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function bendPoint(v, out = new THREE.Vector3()) {
  if (!B) return out.copy(v);
  const z = v.z, w = sstep(B.start, B.start - 40, z) * sstep(B.end, B.end + 60, z), [a, k, p, a2] = B.gx, [c, m, q, c2] = B.gy;
  return out.set(v.x + (a * Math.sin(k * z + p) + a2 * Math.sin(k * 2.3 * z)) * w, v.y + (c * Math.sin(m * z + q) + c2 * Math.sin(m * 2.7 * z + 1)) * w, z);
}
// slope along the path (+ = uphill going forward)
export function slopeAt(z) { if (!B) return 0; const e = 0.5, a = bendPoint(new THREE.Vector3(0, 0, z)).y, b = bendPoint(new THREE.Vector3(0, 0, z - e)).y; return (b - a) / e; }

// ---------------- helpers ----------------
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const matCache = {};
export const flat = (c, o = {}) => { const k = c + JSON.stringify(o); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o })); };
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
const rnd = (a, b) => a + Math.random() * (b - a);
// jitter vertices for the hand-made low-poly look
export function lumpy(geo, amt = 0.08) { const p = geo.attributes.position; const seen = new Map(); for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!seen.has(k)) seen.set(k, [rnd(-amt, amt), rnd(-amt, amt), rnd(-amt, amt)]); const d = seen.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); } geo.computeVertexNormals(); return geo; }


export const CHUNK = 60;
// a whole (moving) object as one mesh: its plain coloured parts merged with their colours in the vertices
export function oneMesh(o) {
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
