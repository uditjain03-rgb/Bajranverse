// The water courses of Splash Racer: a winding river / sea channel with real moving waves (the boats ride the same
// waves the player sees), foam along the banks, sun glitter, waterfalls that drop the whole race to a lower level,
// and eight different worlds along the banks: a tropical lagoon, a jungle river, a red canyon, an icy fjord, the
// ghats of an Indian river city at sunset, a harbour at night, a stormy sea and a volcano island.
import * as THREE from 'three';
import { canvasTex, flat, mesh, lumpy, mergeStatic, mergeGeometries, CHUNK } from './gfx.js';
import { kit, nat, palm, NT, PINE, BUSH, ROCK, FLOW } from './track.js';
const PI = Math.PI;
let seed = 1; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
export const HW = 17;          // half the width of the race water
export const DROP = 7;         // how far a waterfall drops
export const WORLDS = {
  lagoon: { name: 'Tropical Lagoon', sky: ['#1aa8ff', '#c8f4ff'], fog: 0xc8f0ff, deep: 0x0a8ab8, shallow: 0x3ae0d0, bank: 0xf2dca0, bank2: 0xe2c47e, amp: 0.28, sun: 1, hemi: 2.6, light: 3.0 },
  jungle: { name: 'Jungle River', sky: ['#3ab8a0', '#e4fff0'], fog: 0xcfeedd, deep: 0x1a6a4a, shallow: 0x4aa878, bank: 0x4a9a32, bank2: 0x3a7a2a, amp: 0.22, hemi: 2.4, light: 2.7, falls: 2 },
  canyon: { name: 'Red Canyon Rapids', sky: ['#3a8ae8', '#ffe8c8'], fog: 0xf0d8b8, deep: 0x1a6a8a, shallow: 0x4ab0c0, bank: 0xc8643a, bank2: 0xa84a2a, amp: 0.4, hemi: 2.5, light: 3.1, falls: 2 },
  arctic: { name: 'Frozen Fjord', sky: ['#5a9ae8', '#f0f8ff'], fog: 0xe8f2ff, deep: 0x1a5a8a, shallow: 0x6ab8d8, bank: 0xf4f8ff, bank2: 0xd0e0f0, amp: 0.25, hemi: 2.6, light: 2.6, falls: 1 },
  ghats: { name: 'Ghats at Sunset', sky: ['#ff6a4a', '#ffd89a'], fog: 0xffc898, deep: 0x2a6a7a, shallow: 0x5a9a9a, bank: 0xd8b07a, bank2: 0xc89a62, amp: 0.2, hemi: 2.2, light: 2.4, warm: 1 },
  harbour: { name: 'Neon Harbour', sky: ['#0a0a2a', '#3a2a6a'], fog: 0x2a2050, deep: 0x061a3a, shallow: 0x1a3a6a, bank: 0x5a5a68, bank2: 0x4a4a58, amp: 0.25, hemi: 1.1, light: 0.9, night: 1 },
  storm: { name: 'Stormy Sea', sky: ['#3a4250', '#8a96a4'], fog: 0x7a8694, deep: 0x1a3a4a, shallow: 0x3a6a7a, bank: 0x6a6a64, bank2: 0x55554f, amp: 0.85, hemi: 1.9, light: 1.6 },
  volcano: { name: 'Volcano Island', sky: ['#4a1a1a', '#ff8a4a'], fog: 0x8a4a3a, deep: 0x1a2a3a, shallow: 0x3a5060, bank: 0x2a2624, bank2: 0x1e1a18, amp: 0.3, hemi: 1.7, light: 2.0, lava: 1 },
};
// ---------------- the water: one shader shared by every piece of water ----------------
const foamTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 9; c.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`; c.beginPath(); c.ellipse(x, y, r * 2.2, r, 0, 0, 7); c.fill(); } c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); const y = Math.random() * h; c.moveTo(0, y); for (let x = 0; x < w; x += 16) c.lineTo(x, y + Math.sin(x * 0.08 + i) * 6); c.stroke(); } });
foamTex.colorSpace = THREE.NoColorSpace; foamTex.wrapS = foamTex.wrapT = THREE.RepeatWrapping;
export const WATER = { uT: { value: 0 }, uAmp: { value: 0.3 }, uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(-0.35, 0.8, 0.45).normalize() }, uSunC: { value: new THREE.Color(1, 0.95, 0.85) }, uFoam: { value: foamTex }, uHW: { value: HW }, uNight: { value: 0 }, uInv: { value: 0 } };
// the waves (also used on the CPU, so the boats float on exactly this surface)
export function wave(x, z, t, amp) {
  const a = amp;
  const h = a * (0.55 * Math.sin(x * 0.31 + t * 1.3) + 0.75 * Math.sin(z * 0.19 - t * 1.6) + 0.3 * Math.sin((x + z) * 0.57 + t * 2.4) + 0.18 * Math.sin((x * 0.7 - z) * 0.9 + t * 3.1));
  const dx = a * (0.55 * 0.31 * Math.cos(x * 0.31 + t * 1.3) + 0.3 * 0.57 * Math.cos((x + z) * 0.57 + t * 2.4) + 0.18 * 0.63 * Math.cos((x * 0.7 - z) * 0.9 + t * 3.1));
  const dz = a * (0.75 * 0.19 * Math.cos(z * 0.19 - t * 1.6) + 0.3 * 0.57 * Math.cos((x + z) * 0.57 + t * 2.4) - 0.18 * 0.9 * Math.cos((x * 0.7 - z) * 0.9 + t * 3.1));
  return { h, dx, dz };
}
const WAVE_GLSL = `
uniform float uT; uniform float uAmp;
vec3 waveH(vec2 p, float a) {
  float h = a * (0.55 * sin(p.x * 0.31 + uT * 1.3) + 0.75 * sin(p.y * 0.19 - uT * 1.6) + 0.3 * sin((p.x + p.y) * 0.57 + uT * 2.4) + 0.18 * sin((p.x * 0.7 - p.y) * 0.9 + uT * 3.1));
  float dx = a * (0.1705 * cos(p.x * 0.31 + uT * 1.3) + 0.171 * cos((p.x + p.y) * 0.57 + uT * 2.4) + 0.1134 * cos((p.x * 0.7 - p.y) * 0.9 + uT * 3.1));
  float dz = a * (0.1425 * cos(p.y * 0.19 - uT * 1.6) + 0.171 * cos((p.x + p.y) * 0.57 + uT * 2.4) - 0.162 * cos((p.x * 0.7 - p.y) * 0.9 + uT * 3.1));
  return vec3(h, dx, dz);
}`;
export const waterMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), fog: true,
  vertexShader: `#include <common>
${WAVE_GLSL}
uniform float uHW; uniform float uInv; varying vec3 vW; varying vec3 vN; varying float vEdge; varying float vCrest;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float edge = smoothstep(uHW + 6.0, uHW - 2.0, abs(w.x)); edge = mix(edge, smoothstep(uHW, uHW + 14.0, abs(w.x)), uInv); vec3 H = waveH(w.xz, uAmp * (0.35 + 0.65 * edge));
  w.y += H.x; vN = normalize(vec3(-H.y, 1.0, -H.z)); vW = w.xyz; vEdge = abs(w.x); vCrest = H.x / max(0.05, uAmp);
  w.xyz = goatBend(w.xyz);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
  fragmentShader: `#include <common>
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSun; uniform vec3 uSunC; uniform sampler2D uFoam; uniform float uT; uniform float uHW; uniform float uNight; uniform float uInv;
varying vec3 vW; varying vec3 vN; varying float vEdge; varying float vCrest;
#include <fog_pars_fragment>
void main() {
  vec2 f1 = vW.xz * vec2(0.045, 0.03) + vec2(0.0, uT * 0.05), f2 = vW.xz * vec2(0.07, 0.05) - vec2(uT * 0.02, uT * 0.08);
  float n1 = texture2D(uFoam, f1).r, n2 = texture2D(uFoam, f2).r;
  vec3 N = normalize(vN + vec3(n1 - 0.5, 0.0, n2 - 0.5) * 0.18);
  vec3 V = normalize(cameraPosition - vW);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
  float shore = mix(smoothstep(uHW - 6.0, uHW + 1.0, vEdge), 1.0 - smoothstep(uHW, uHW + 12.0, vEdge), uInv);
  vec3 col = mix(uDeep, uShallow, clamp(shore * 0.9 + vCrest * 0.12 + 0.15, 0.0, 1.0));
  col *= 0.75 + 0.35 * max(dot(N, uSun), 0.0);
  col = mix(col, uSky, fres * 0.7);
  vec3 Hh = normalize(uSun + V); float sp = pow(max(dot(N, Hh), 0.0), 140.0) * 2.2 + pow(max(dot(N, Hh), 0.0), 18.0) * 0.12;
  col += uSunC * sp;
  float foam = smoothstep(0.35, 0.9, n1 * n2 * 2.2) * (shore * 1.4 + smoothstep(0.55, 1.1, vCrest) * 0.8);
  foam += mix(smoothstep(uHW - 0.8, uHW + 0.6, vEdge), 1.0 - smoothstep(uHW + 0.2, uHW + 2.5, vEdge), uInv) * (0.5 + 0.5 * n2);
  col = mix(col, vec3(0.96, 0.99, 1.0) * (uNight > 0.5 ? 0.6 : 1.0), clamp(foam, 0.0, 0.85));
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`,
});
Object.assign(waterMat.uniforms, WATER);
// a sheet of falling water (waterfalls), scrolling down
const fallTex = canvasTex(128, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e8f8ff'); g.addColorStop(1, '#a8d8f0'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 20 + Math.random() * 60); } });
fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
// lit windows for the harbour towers at night
const nightWin = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#141a2a'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) { const r = Math.random(); c.fillStyle = r < 0.45 ? '#ffd88a' : r < 0.55 ? '#8ae8ff' : r < 0.6 ? '#ff7ad8' : '#22283a'; c.fillRect(x, y, 6, 6); } });
nightWin.wrapS = nightWin.wrapT = THREE.RepeatWrapping;
const sandTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(0,0,0,.06)'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 12, 5, Math.random() * 3, 0, 7); c.fill(); } });
sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;

// ---------------- the course ----------------
export function buildCourse(T, scene) {
  seed = T.seed || 7; const W = WORLDS[T.world], g = new THREE.Group(), L = T.L, zEnd = -L - 160, z0 = 40; scene.add(g);
  const falls = (T.falls || []).slice().sort((a, b) => b - a);
  const level = z => { let y = 0; for (const f of falls) if (z < f) y -= DROP; return y; };
  // water in pieces (each piece one level; split at the falls and every CHUNK so far pieces can be hidden)
  const cuts = [z0]; for (let z = z0 - CHUNK; z > zEnd; z -= CHUNK) cuts.push(z); for (const f of falls) cuts.push(f); cuts.push(zEnd); cuts.sort((a, b) => b - a);
  const waters = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1]; if (a - b < 0.5) continue;
    const geo = new THREE.PlaneGeometry(2 * HW + 30, a - b, 24, Math.ceil((a - b) / 2.5)); geo.rotateX(-PI / 2);
    const m = new THREE.Mesh(geo, waterMat); m.position.set(0, level((a + b) / 2), (a + b) / 2); m.frustumCulled = false; m.userData.z0 = a; m.userData.z1 = b; g.add(m); waters.push(m);
  }
  // the banks: a sloping strip each side, per piece, at that piece's level
  const bankMat = new THREE.MeshStandardMaterial({ color: W.bank, map: sandTex, roughness: 1 }); sandTex.repeat.set(4, 20);
  const banks = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1]; if (a - b < 0.5) continue; const y = level((a + b) / 2);
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(70, a - b, 10, Math.ceil((a - b) / 6)); geo.rotateX(-PI / 2); const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k) + 35, h = x < 3 ? -1.2 + x * 0.6 : 0.6 + Math.min(1, (x - 3) / 25) * (W.lava ? 4 : 2.5) + Math.sin(p.getZ(k) * 0.07 + x) * 0.5; p.setXYZ(k, s * (HW - 2 + x), y + h, p.getZ(k)); }
      if (s < 0) geo.index.array.reverse(); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, bankMat); m.position.z = (a + b) / 2; m.userData.z0 = a; m.userData.z1 = b; m.frustumCulled = false; g.add(m); banks.push(m);
    }
  }
  // waterfalls: a falling sheet, cliffs either side, a rainbow, mist
  const fallSheets = [];
  for (const f of falls) {
    const top = level(f + 1), bot = level(f - 1);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 8, top - bot + 1, 12, 4), new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.92 })); sh.material.map = fallTex.clone(); sh.material.map.needsUpdate = true; sh.material.map.repeat.set(4, 1);
    sh.position.set(0, (top + bot) / 2, f - 0.8); sh.rotation.x = -0.12; sh.userData.dynamic = true; g.add(sh); fallSheets.push(sh);
    for (const s of [-1, 1]) { const c = mesh(lumpy(new THREE.BoxGeometry(14, top - bot + 6, 10, 3, 3, 2), 0.8), flat(W.bank2), s * (HW + 6), (top + bot) / 2 + 1, f, g); void c; }
    const rb = new THREE.Mesh(new THREE.TorusGeometry(HW + 4, 0.9, 6, 32, PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, vertexColors: true, depthWrite: false }));
    { const pc = rb.geometry.attributes.position, cc = new Float32Array(pc.count * 3), RB = [0xff4040, 0xffa020, 0xffff40, 0x40ff60, 0x4080ff, 0xa040ff]; for (let k = 0; k < pc.count; k++) { const r = Math.hypot(pc.getX(k), pc.getY(k)), q = Math.min(5, Math.max(0, Math.floor((r - HW - 3.1) / 0.3))); const cl = new THREE.Color(RB[q]); cc.set([cl.r, cl.g, cl.b], k * 3); } rb.geometry.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
    rb.position.set(0, bot, f - 12); rb.userData.dynamic = true; if (!W.night) g.add(rb);
  }
  // ---------------- scenery along the banks (per world) ----------------
  const side = HW + 2, free = z => !falls.some(f => Math.abs(z - f) < 9);
  const P = SCENE[T.world];
  for (let z = 20; z > zEnd + 20; z -= P.step()) for (const s of [-1, 1]) { if (!free(z)) continue; const o = P.near(s, W); if (!o) continue; o.position.x += s * (side + (o.userData.gap ?? rnd(1, 6))); o.position.y += level(z) + (o.userData.dy ?? 0.4); o.position.z += z; g.add(o); }
  for (let z = 20; z > zEnd + 20; z -= rnd(9, 16)) for (const s of [-1, 1]) { if (!free(z) || R() < 0.35) continue; const o = P.far(s, W); if (!o) continue; o.position.x += s * rnd(side + 22, side + 60); o.position.y += level(z) + 1.5; o.position.z += z; g.add(o); }
  // mountains / cliffs far away
  for (let i = 0; i < 24; i++) { const s = i % 2 ? 1 : -1, m = new THREE.Group(), c = W.night ? 0x1a1a3a : W.lava ? 0x2a2020 : T.world === 'arctic' ? 0xdce8f4 : T.world === 'canyon' ? 0xb85a32 : 0x4a8a5a; mesh(lumpy(new THREE.ConeGeometry(22, 40, 7, 3), 2), flat(c), 0, 16, 0, m); if (T.world === 'arctic' || T.world === 'storm') mesh(new THREE.ConeGeometry(8, 12, 7), flat(0xffffff), 0, 31, 0, m); m.position.set(s * rnd(120, 200), level(-i * L / 24) - 4, 20 - i * (L + 160) / 24); m.scale.setScalar(rnd(0.8, 1.6)); g.add(m); }
  if (W.lava) { const v = new THREE.Group(); mesh(lumpy(new THREE.ConeGeometry(70, 80, 9, 3), 3), flat(0x2a2220), 0, 36, 0, v); const crater = new THREE.Mesh(new THREE.CylinderGeometry(14, 20, 6, 9), glow(0xff6a1a)); crater.position.y = 75; v.add(crater); v.position.set(-60, -6, -L * 0.6); g.add(v); }
  // the sky
  const skyG = new THREE.SphereGeometry(400, 24, 12), top = new THREE.Color(W.sky[0]), low = new THREE.Color(W.sky[1]), sp = skyG.attributes.position, sc = new Float32Array(sp.count * 3), _sc = new THREE.Color();
  for (let i = 0; i < sp.count; i++) { const v = 1 - (Math.asin(Math.max(-1, Math.min(1, sp.getY(i) / 400))) / PI + 0.5), k = Math.min(1, v / 0.6); _sc.copy(top).lerp(low, k); sc.set([_sc.r, _sc.g, _sc.b], i * 3); }
  skyG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const skyM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); skyM.userData.flat = true;
  const sky = new THREE.Mesh(skyG, skyM); sky.renderOrder = -1; sky.userData.dynamic = true; g.add(sky);
  { const parts = []; const n = T.world === 'storm' ? 30 : W.night ? 0 : 12; for (let i = 0; i < n; i++) { const cx = rnd(-250, 250), cy = rnd(60, 130), cz = rnd(-300, 60); for (let j = 0; j < 5; j++) { const q = new THREE.IcosahedronGeometry(rnd(7, 13), 1); q.translate(cx + j * 8 - 16, cy + rnd(-2, 2), cz + rnd(-3, 3)); parts.push(q); } }
    if (parts.length) { const cm = new THREE.MeshBasicMaterial({ color: T.world === 'storm' ? 0x5a6470 : W.warm ? 0xffd0b0 : W.lava ? 0x5a3a3a : 0xffffff, fog: false }); cm.userData.flat = true; sky.add(new THREE.Mesh(mergeGeometries(parts), cm)); } }
  if (W.night) { const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd(0, PI * 2), e = rnd(0.15, 1.3); pos[i * 3] = Math.cos(a) * Math.cos(e) * 380; pos[i * 3 + 1] = Math.sin(e) * 380; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 380; } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pm = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }); pm.userData.flat = true; sky.add(new THREE.Points(sg, pm)); }
  scene.fog = new THREE.Fog(W.fog, W.night ? 60 : 80, T.world === 'storm' ? 190 : 260);
  // the water colours of this world
  WATER.uDeep.value.set(W.deep); WATER.uShallow.value.set(W.shallow); WATER.uSky.value.set(W.sky[1]).lerp(new THREE.Color(W.sky[0]), 0.3); WATER.uAmp.value = W.amp; WATER.uNight.value = W.night ? 1 : 0; WATER.uInv.value = 0; WATER.uHW.value = HW;
  WATER.uSunC.value.set(W.night ? 0xb8a8ff : W.warm || W.lava ? 0xffb070 : 0xfff0d8);
  g.traverse(o => { o.frustumCulled = false; });
  const chunks = mergeStatic(g);
  return {
    group: g, sky, world: W, level, falls, amp: W.amp,
    surface(x, z, t) { const w = wave(x, z, t, W.amp * (Math.abs(x) < HW - 2 ? 1 : 0.4)); w.h += level(z); return w; },
    update(dt, t) { WATER.uT.value = t; for (const s of fallSheets) s.material.map.offset.y = t * 1.6; },
    cull(z) { const vis = q => q.userData.z0 > z - 260 && q.userData.z1 < z + 50; for (const c of chunks) c.visible = vis(c); for (const w of waters) w.visible = vis(w); for (const b of banks) b.visible = vis(b); },
    cullAll() { for (const c of chunks) c.visible = true; for (const w of waters) w.visible = true; for (const b of banks) b.visible = true; },
    dispose() { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
// ---------------- what stands on the banks of each world ----------------
const grp = () => new THREE.Group();
const glowC = {}; const glow = c => glowC[c] || (glowC[c] = new THREE.MeshBasicMaterial({ color: c }));
function hut() { const o = grp(); mesh(new THREE.BoxGeometry(3, 2.2, 3), flat(0xc89a5a), 0, 1.5, 0, o); mesh(new THREE.ConeGeometry(2.8, 1.8, 4), flat(0xe8c87a), 0, 3.5, 0, o).rotation.y = PI / 4; for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 5), flat(0x8a6a3a), x, 0.2, z, o); return o; }
function umbrella() { const o = grp(), c = pick([0xff4a6a, 0x2ab8ff, 0xffd23f, 0x3fcf6e, 0xff8a1a]); mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), flat(0xffffff), 0, 1.3, 0, o); mesh(new THREE.ConeGeometry(1.6, 0.6, 8), flat(c), 0, 2.6, 0, o); mesh(new THREE.BoxGeometry(1.6, 0.15, 0.7), flat(0xffffff), 0.9, 0.3, 0.6, o); return o; }
function rockArch() { const o = grp(), c = flat(pick([0xc8643a, 0xb85432, 0xd8784a])); mesh(lumpy(new THREE.BoxGeometry(rnd(6, 12), rnd(10, 26), rnd(6, 12), 3, 4, 3), 0.9), c, 0, 6, 0, o); if (R() < 0.5) mesh(lumpy(new THREE.BoxGeometry(5, rnd(6, 12), 5, 2, 3, 2), 0.6), flat(0xa84a2a), rnd(-4, 4), 4, rnd(-4, 4), o); o.userData.gap = rnd(0, 3); o.userData.dy = -1; return o; }
function iceCliff() { const o = grp(); mesh(lumpy(new THREE.BoxGeometry(rnd(6, 10), rnd(5, 14), rnd(6, 10), 3, 3, 3), 0.8), flat(pick([0xe8f4ff, 0xcfe8ff, 0xb8dcf8])), 0, 3, 0, o); o.userData.gap = rnd(0, 4); o.userData.dy = -0.8; return o; }
function snowPine() { const o = grp(), h = rnd(5, 9); mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6), flat(0x5a3a2a), 0, 0.75, 0, o); for (let i = 0; i < 3; i++) { mesh(new THREE.ConeGeometry(2.2 - i * 0.6, h / 3 + 0.6, 7), flat(0x2a5a3a), 0, 1.5 + i * h / 4, 0, o); mesh(new THREE.ConeGeometry(1.6 - i * 0.5, 0.5, 7), flat(0xffffff), 0, 1.5 + i * h / 4 + h / 7, 0, o); } return o; }
function steps(s) { const o = grp(), c = flat(pick([0xd8b07a, 0xe8c48a, 0xc89a62])); for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(2.4 + i * 1.6, 0.6, 12), c, s * (1.2 + i * 0.8), -0.6 + i * 0.6, 0, o); o.userData.gap = -2; o.userData.dy = -0.3; return o; }
function temple(s) { const o = grp(), base = flat(0xe8c88a), saf = flat(0xff8a1a); mesh(new THREE.BoxGeometry(6, 5, 6), base, 0, 2.5, 0, o); for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(2.6 - i * 0.6, 3 - i * 0.6, 1.8, 8), base, 0, 5.9 + i * 1.7, 0, o); mesh(new THREE.ConeGeometry(0.6, 1.4, 8), flat(0xffc21a), 0, 13, 0, o); mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 4), flat(0x5a3a1a), 0.8, 14, 0, o); const fl = mesh(new THREE.BoxGeometry(0.05, 0.8, 1.2), saf, 0.8, 15, 0.6, o); void fl; mesh(new THREE.BoxGeometry(2, 3, 0.2), flat(0x5a2a1a), s * -3.05, 1.5, 0, o).rotation.y = PI / 2; o.userData.gap = rnd(10, 14); o.userData.dy = 3; return o; }
function ghatHouse(s) { const o = grp(), h = rnd(8, 16), c = flat(pick([0xffb0a0, 0xa0d8ff, 0xffe08a, 0xb8f0b0, 0xffc8e8, 0xf4f0e8])); mesh(new THREE.BoxGeometry(7, h, 7), c, 0, h / 2, 0, o); for (let y = 2; y < h - 1; y += 3) { mesh(new THREE.BoxGeometry(0.2, 1.4, 5), flat(0x3a2a2a), s * -3.55, y, 0, o); mesh(new THREE.BoxGeometry(1, 0.15, 5.5), flat(0xffffff), s * -3.9, y - 0.8, 0, o); } mesh(new THREE.BoxGeometry(7.4, 0.5, 7.4), flat(0xffffff), 0, h, 0, o); o.userData.gap = rnd(11, 16); o.userData.dy = 3; return o; }
const NIGHTM = new THREE.MeshBasicMaterial({ map: nightWin });
function tower() { const o = grp(), h = rnd(25, 70), w = rnd(8, 14); const bg = new THREE.BoxGeometry(w, h, w), uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i) * h / 12); mesh(bg, NIGHTM, 0, h / 2 - 2, 0, o); mesh(new THREE.BoxGeometry(w * 0.9, 1, w * 0.9), glow(pick([0xff3ad8, 0x3ae8ff, 0xffe03a])), 0, h - 1.5, 0, o); o.userData.gap = rnd(8, 20); return o; }
function crane() { const o = grp(), c = flat(0xff8a1a); mesh(new THREE.BoxGeometry(1.2, 22, 1.2), c, 0, 11, 0, o); mesh(new THREE.BoxGeometry(1, 1, 20), c, 0, 22, -6, o); mesh(new THREE.BoxGeometry(2, 2, 3), flat(0x2a2a2a), 0, 21, 4, o); o.userData.gap = rnd(4, 8); return o; }
function lamp() { const o = grp(); mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), flat(0x2a2a30), 0, 2.5, 0, o); const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), glow(pick([0xffe08a, 0xff6ad8, 0x6ae8ff]))); b.position.y = 5.1; o.add(b); o.userData.gap = 0.5; return o; }
function lighthouse() { const o = grp(); for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(2 - i * 0.18, 2.1 - i * 0.18, 3, 12), flat(i % 2 ? 0xd83a2a : 0xf4f4f4), 0, 1.5 + i * 3, 0, o); const l = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 10), glow(0xfff2a0)); l.position.y = 19; o.add(l); mesh(new THREE.ConeGeometry(1.5, 1.6, 10), flat(0x2a2a2a), 0, 20.6, 0, o); o.userData.gap = rnd(6, 12); return o; }
function blackRock() { const o = grp(); mesh(lumpy(new THREE.DodecahedronGeometry(rnd(2, 5), 1), 0.6), flat(pick([0x2a2624, 0x342e2a, 0x1e1a18])), 0, 1, 0, o); if (R() < 0.35) { const l = new THREE.Mesh(new THREE.BoxGeometry(rnd(1, 2), 0.2, rnd(6, 14)), glow(0xff5a1a)); l.position.set(rnd(-2, 2), 0.2, 0); o.add(l); } o.userData.gap = rnd(0, 6); o.userData.dy = -0.2; return o; }
function ruin() { const o = grp(), c = flat(0x8a8a6a); for (let i = 0; i < 3; i++) mesh(lumpy(new THREE.BoxGeometry(rnd(2, 4), rnd(1.5, 3), rnd(2, 4)), 0.2), c, rnd(-2, 2), 1 + i * 2, rnd(-2, 2), o); const t = nat(NT, 1.2, 1.8); if (t) { t.position.x = 3; o.add(t); } o.userData.gap = rnd(3, 8); return o; }
const SCENE = {
  lagoon: { step: () => rnd(6, 11), near: () => { const r = R(); const o = r < 0.45 ? palm() : r < 0.62 ? umbrella() : r < 0.75 ? hut() : nat(BUSH, 1.2, 1.8); if (o) o.userData.gap = o.userData.gap ?? rnd(1, 12); return o; }, far: () => R() < 0.7 ? palm() : nat(ROCK, 2, 3) },
  jungle: { step: () => rnd(3.5, 6), near: () => { const r = R(); const o = r < 0.55 ? nat(NT, 1.3, 2.2) : r < 0.85 ? nat([...BUSH, ...FLOW], 1.4, 2.4) : ruin(); if (o && o.userData.gap === undefined) o.userData.gap = rnd(0, 9); return o; }, far: () => nat(NT, 1.6, 2.6) },
  canyon: { step: () => rnd(6, 10), near: () => rockArch(), far: () => rockArch() },
  arctic: { step: () => rnd(6, 10), near: () => R() < 0.5 ? iceCliff() : snowPine(), far: () => R() < 0.6 ? snowPine() : iceCliff() },
  ghats: { step: () => rnd(11, 15), near: s => { const r = R(); return r < 0.4 ? steps(s) : r < 0.65 ? temple(s) : ghatHouse(s); }, far: s => ghatHouse(s) },
  harbour: { step: () => rnd(10, 14), near: () => { const r = R(); const o = r < 0.45 ? tower() : r < 0.65 ? crane() : r < 0.85 ? kit('cargo-container-a', 3) : lamp(); if (o && o.userData.gap === undefined) o.userData.gap = rnd(2, 6); return o; }, far: () => tower() },
  storm: { step: () => rnd(7, 11), near: () => R() < 0.12 ? lighthouse() : blackRock(), far: () => blackRock() },
  volcano: { step: () => rnd(5, 8), near: () => blackRock(), far: () => R() < 0.3 ? nat(PINE, 1.2, 1.8) : blackRock() },
};
