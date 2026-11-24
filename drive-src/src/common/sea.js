// Splash Racer's living things and the things on the water, made in code with smooth rounded shapes, soft colour
// gradients (darker backs, light bellies, wet waterlines, mossy tops) and glossy eyes with a highlight, so nothing looks
// like a box toy: the stranded animals (with a life jacket for the ride home), dolphins, the whale, the shark, crocodiles,
// rocks, logs, barrels, icebergs and ice floes, the river boat and the harbour ferry, seagulls, jumping fish, treasure
// chests, geysers and slalom hoops; and for the banks: palms, hills, reeds, lily pads. Every model is a few merged meshes
// (vertex colours), so a whole animal or ferry costs one or two draw calls on a phone.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex } from './gfx.js';
const PI = Math.PI;
const clamp01 = v => Math.max(0, Math.min(1, v)), sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
let seed = 11; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
// ---------------- materials: everything is vertex coloured ----------------
export const MAT = {
  soft: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 }),    // fur, wood, rock
  gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22 }),   // eyes, noses, wet skin, paint
  wet: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }),      // dolphins, whales, crocodiles
  two: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }),   // leaves, sails, fins
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),                         // lamps, lit windows, eye sparkle
};
// ---------------- geometry helpers ----------------
const CC = new Map(); const C = h => { let c = CC.get(h); if (!c) { c = new THREE.Color(h); CC.set(h, c); } return c; };
const _m = new THREE.Color();
const mix = (a, b, k) => _m.copy(C(a)).lerp(C(b), clamp01(k));
function prep(g) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.index) g = mergeVertices(g, 1e-5); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
// colour every vertex: a colour, or f(x, y, z, nx, ny, nz) → colour (positions after the part is placed)
function paint(g, c) {
  g = prep(g); const p = g.attributes.position, n = g.attributes.normal, a = new Float32Array(p.count * 3), _c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { _c.set(typeof c === 'function' ? c(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)) : c); a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
// place a geometry: scale, rotate, move
function T(g, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) { g.scale(sx, sy, sz); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return g; }
const S = (r, seg = 18) => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
const Cy = (rt, rb, h, seg = 14, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const Co = (r, h, seg = 12) => new THREE.ConeGeometry(r, h, seg);
const To = (R0, r, rs = 8, ts = 20, arc = PI * 2) => new THREE.TorusGeometry(R0, r, rs, ts, arc);
const Bx = (w, h, d, a = 1, b = 1, c = 1) => new THREE.BoxGeometry(w, h, d, a, b, c);
function bake(parts, mat = MAT.soft) { const m = new THREE.Mesh(mergeGeometries(parts.filter(Boolean)), mat); m.frustumCulled = false; return m; }
// a smooth body along z: stations [z, half width, half height, centre y]; ends closed. Used for fish, dolphins, whales,
// sharks, crocodiles, birds, logs, hulls.
function loft(st, seg = 16, bot = 1, top = 1) {
  const pos = [], idx = [], n = st.length;
  for (const [z, rx, ry, yc] of st) for (let j = 0; j < seg; j++) { const a = j / seg * PI * 2; let y = Math.cos(a) * ry; y *= y < 0 ? bot : top; pos.push(Math.sin(a) * rx, yc + y, z); }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const c0 = pos.length / 3; pos.push(0, st[0][3], st[0][0] - 0.001); const c1 = c0 + 1; pos.push(0, st[n - 1][3], st[n - 1][0] + 0.001);
  for (let j = 0; j < seg; j++) { idx.push(c0, j, (j + 1) % seg); idx.push(c1, (n - 1) * seg + (j + 1) % seg, (n - 1) * seg + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// bump a geometry along its normals with a smooth pseudo-noise (rocks, ice, hills)
function noisy(g, amt, f = 1, s = 0) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);   // weld the seams first, so the bumps never tear the surface open
  g = mergeVertices(g.index ? g : g, 1e-4); g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = amt * (Math.sin(x * 1.7 * f + s) * Math.sin(y * 2.1 * f + 1.3 + s) * Math.sin(z * 1.9 * f + 2.1) + 0.5 * Math.sin(x * 4.3 * f + z * 3.1 * f + s * 2) * Math.sin(y * 3.7 * f + 0.7)); p.setXYZ(i, x + n.getX(i) * k, y + n.getY(i) * k, z + n.getZ(i) * k); }
  g.computeVertexNormals(); return g;
}
const n3 = (x, y, z) => Math.sin(x * 2.3 + y * 1.1) * Math.sin(z * 2.9 + x * 0.7) * Math.sin(y * 3.1 + z * 1.3);   // speckles
// eyes: a white with a big dark iris and a sparkle (the sparkle glows, so the eyes always look alive)
function eye(parts, glow, x, y, z, r = 0.09, iris = 0x2a1a10, look = -1) {
  parts.push(paint(T(S(r, 14), x, y, z, 1, 1.08, 0.75), 0xffffff));
  parts.push(paint(T(S(r * 0.72, 12), x + Math.sign(x) * 0.004, y - r * 0.05, z + look * r * 0.45, 1, 1.1, 0.6), iris));
  parts.push(paint(T(S(r * 0.38, 10), x + Math.sign(x) * 0.004, y - r * 0.05, z + look * r * 0.66, 1, 1, 0.5), 0x0a0a0c));
  glow.push(paint(T(S(r * 0.2, 8), x - Math.sign(x) * r * 0.25, y + r * 0.35, z + look * r * 0.78), 0xffffff));
}

// ---------------- the animals waiting to be rescued ----------------
// Each sits facing -z, about 1.45 tall. Returns a group with userData { arm, s, ph, k, vest }: s bobs, arm waves
// (arm.rotation.z: -0.25 hangs down, -2.5 is held up high), vest is the life jacket (shown once aboard).
export const ANIMALS = {
  puppy: { body: 0xc8884a, back: 0x9a5e2a, belly: 0xf6e4c4, ear: 0x6a3a18, muzzle: 0xf6e4c4, nose: 0x1a1210, ears: 'flop', tail: 'wag' },
  kitten: { body: 0xf0a848, back: 0xd07a20, belly: 0xfff6ea, ear: 0xf0a848, muzzle: 0xfff6ea, nose: 0xff8aa0, ears: 'tri', tail: 'up', stripes: 1, whiskers: 1 },
  monkey: { body: 0x7a4a2a, back: 0x5a3018, belly: 0xe8c49a, ear: 0xe8c49a, muzzle: 0xf0d0a8, nose: 0x3a2014, ears: 'side', tail: 'curl', face: 1 },
  bunny: { body: 0xf4f2ee, back: 0xd8d0c8, belly: 0xffffff, ear: 0xf4f2ee, muzzle: 0xffffff, nose: 0xff8aa8, ears: 'long', tail: 'puff', teeth: 1 },
  cub: { body: 0xf4f0e4, back: 0xe0d8c4, belly: 0xffffff, ear: 0xf4f0e4, muzzle: 0xfffaf0, nose: 0x1a1a1e, ears: 'round', tail: 'puff' },
};
export function makeAnimal(k) {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s); seed = 1 + Math.floor(Math.random() * 1e6);
  const parts = [], glow = [], gl = [], armP = []; let armAt = [-0.36, 0.72, -0.05], vest = { r: 0.45, y: 0.52, h: 0.42 };
  if (k === 'penguin') { penguinParts(parts, gl, glow, armP); armAt = [-0.36, 0.82, 0]; vest = { r: 0.4, y: 0.55, h: 0.4 }; }
  else if (k === 'duckling') { ducklingParts(parts, gl, glow, armP); armAt = [-0.34, 0.55, 0]; vest = { r: 0.42, y: 0.42, h: 0.34 }; }
  else if (k === 'turtle') { turtleParts(parts, gl, glow, armP); armAt = [-0.55, 0.22, -0.4]; vest = null; }
  else {
    const A = ANIMALS[k], fur = (top, bot) => (x, y, z, nx, ny, nz) => { const c = mix(bot, top, sstep(-0.6, 0.5, ny * 0.6 + nz * 0.8)); if (A.stripes && nz > 0.1 && Math.sin(y * 18 + x * 3) > 0.55) c.lerp(C(0xa85a10), 0.55); return c; };
    // body, belly, haunches and feet
    parts.push(paint(T(S(0.42, 22), 0, 0.47, 0.02, 1, 1.12, 0.95), fur(A.back, A.body)));
    parts.push(paint(T(S(0.31, 18), 0, 0.44, -0.19, 1, 1.08, 0.7), A.belly));
    for (const sd of [-1, 1]) {
      parts.push(paint(T(S(0.21, 14), sd * 0.27, 0.2, 0.06, 0.9, 0.85, 1.3), fur(A.back, A.body)));
      parts.push(paint(T(S(0.11, 12), sd * 0.24, 0.06, -0.2, 1, 0.65, 1.5), A.muzzle));
      for (let t = -1; t <= 1; t++) parts.push(paint(T(S(0.03, 6), sd * 0.24 + t * 0.045, 0.05, -0.36), 0xffb0b8));   // toe beans
    }
    // the front leg that does not wave
    parts.push(paint(T(Cy(0.075, 0.085, 0.42, 10), 0.16, 0.26, -0.25), A.body), paint(T(S(0.095, 10), 0.16, 0.06, -0.29, 1, 0.75, 1.25), A.muzzle));
    // head
    const hy = 1.06, hz = -0.07;
    parts.push(paint(T(S(0.37, 24), 0, hy, hz, 1.04, 0.96, 1), (x, y, z, nx, ny, nz) => { const c = fur(A.back, A.body)(x, y, z, nx, ny, nz); if (A.face && nz < -0.2 && y < hy + 0.16) c.lerp(C(A.belly), 0.9); if (k === 'puppy' && x > 0.05 && y > hy - 0.02 && nz < 0) c.lerp(C(0x6a3a18), sstep(0.05, 0.12, x) * 0.85); return c; }));
    parts.push(paint(T(S(0.18, 16), 0, hy - 0.1, hz - 0.3, 1.3, 0.86, 1), A.muzzle));
    parts.push(paint(T(S(0.07, 10), 0, hy - 0.03, hz - 0.47, 1.35, 0.9, 1), A.nose));
    glow.push(paint(T(S(0.02, 6), -0.025, hy - 0.005, hz - 0.53), 0xffffff));
    parts.push(paint(T(To(0.07, 0.013, 5, 12, PI), 0, hy - 0.16, hz - 0.43, 1, 1, 1, 0, 0, PI), 0x3a1a14));   // smile
    parts.push(paint(T(S(0.05, 8), 0, hy - 0.2, hz - 0.4, 1, 0.6, 0.6), 0xff6a7a));   // tongue
    for (const sd of [-1, 1]) {
      eye(parts, glow, sd * 0.145, hy + 0.09, hz - 0.27, 0.098, k === 'kitten' ? 0x4a8a3a : 0x3a2414);
      parts.push(paint(T(S(0.065, 8), sd * 0.235, hy - 0.06, hz - 0.25, 1, 0.6, 0.4), 0xff9aa0));   // pink cheeks
      if (A.ears === 'flop') parts.push(paint(T(S(0.13, 12), sd * 0.34, hy - 0.02, hz + 0.02, 0.55, 1.65, 0.95, 0, 0, sd * 0.25), A.ear));
      if (A.ears === 'tri') { parts.push(paint(T(Co(0.14, 0.32, 10), sd * 0.21, hy + 0.34, hz + 0.02, 1, 1, 0.6, 0, 0, -sd * 0.32), A.ear)); parts.push(paint(T(Co(0.08, 0.2, 8), sd * 0.205, hy + 0.32, hz - 0.03, 1, 1, 0.4, 0, 0, -sd * 0.32), 0xffa8b8)); }
      if (A.ears === 'round') { parts.push(paint(T(S(0.12, 12), sd * 0.27, hy + 0.27, hz + 0.02, 1, 1, 0.55), A.ear)); parts.push(paint(T(S(0.07, 10), sd * 0.27, hy + 0.27, hz - 0.03, 1, 1, 0.4), 0xffd0c8)); }
      if (A.ears === 'side') { parts.push(paint(T(S(0.13, 12), sd * 0.38, hy + 0.02, hz + 0.02, 0.5, 1, 1), A.back)); parts.push(paint(T(S(0.085, 10), sd * 0.4, hy + 0.02, hz - 0.01, 0.4, 0.9, 0.9), A.ear)); }
      if (A.ears === 'long') { parts.push(paint(T(S(0.1, 12), sd * 0.13, hy + 0.55, hz + 0.04, 0.85, 3.2, 0.55, 0, 0, -sd * 0.14), A.ear)); parts.push(paint(T(S(0.06, 10), sd * 0.135, hy + 0.55, hz, 0.75, 2.7, 0.4, 0, 0, -sd * 0.14), 0xffb4c8)); }
      if (A.whiskers) for (const t of [-0.04, 0.02]) parts.push(paint(T(Cy(0.005, 0.005, 0.36, 4), sd * 0.24, hy - 0.08 + t, hz - 0.36, 1, 1, 1, 0, 0, PI / 2 + sd * t * 3), 0xffffff));
    }
    if (A.teeth) parts.push(paint(T(Bx(0.09, 0.07, 0.03), 0, hy - 0.19, hz - 0.44), 0xffffff));
    // tails
    if (A.tail === 'wag' || A.tail === 'up' || A.tail === 'curl') {
      const pts = A.tail === 'curl' ? [[0, 0.3, 0.38], [0.15, 0.35, 0.7], [0.1, 0.75, 0.85], [-0.12, 0.85, 0.62], [-0.05, 0.62, 0.55]] : A.tail === 'up' ? [[0, 0.3, 0.36], [0, 0.45, 0.62], [0.05, 0.8, 0.7], [0.1, 1.0, 0.62]] : [[0, 0.32, 0.36], [0, 0.45, 0.6], [0.06, 0.68, 0.72]];
      const tub = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 16, A.tail === 'wag' ? 0.07 : 0.06, 8);
      parts.push(paint(tub, (x, y, z) => A.stripes && Math.sin(y * 22) > 0.3 ? 0xb06418 : A.tail === 'wag' && y > 0.62 ? 0xf6e4c4 : A.body));
    }
    if (A.tail === 'puff') parts.push(paint(T(S(0.13, 12), 0, 0.3, 0.42), 0xffffff));
    if (k === 'puppy') { parts.push(paint(T(To(0.25, 0.04, 6, 24), 0, hy - 0.33, hz + 0.02, 1, 1, 1, PI / 2 + 0.25), 0xe8202a)); gl.push(paint(T(Cy(0.06, 0.06, 0.02, 12), 0, hy - 0.42, hz - 0.24, 1, 1, 1, PI / 2 - 0.2), 0xffc21a)); }
    // the waving arm hangs along -y from the shoulder
    armP.push(paint(T(Cy(0.075, 0.09, 0.42, 10), 0, -0.2, 0), A.body), paint(T(S(0.1, 12), 0, -0.43, 0, 1, 0.9, 1), A.muzzle));
  }
  s.add(bake(parts)); if (gl.length) s.add(bake(gl, MAT.gloss)); if (glow.length) s.add(bake(glow, MAT.glow));
  const arm = new THREE.Group(); arm.position.set(...armAt); arm.add(bake(armP)); s.add(arm); arm.rotation.z = -0.25;
  // the life jacket (orange, white reflective bands, a buckle), shown when the animal is safely on a boat
  let vj = null;
  if (vest) {
    const vp = [paint(T(Cy(vest.r, vest.r * 1.06, vest.h, 20, true), 0, vest.y, 0.02), (x, y) => Math.abs(y - vest.y) < vest.h * 0.12 ? 0xf4f4f4 : 0xff6a10)];
    vp.push(paint(T(To(vest.r * 0.98, 0.04, 6, 22), 0, vest.y + vest.h / 2, 0.02, 1, 1, 1, PI / 2), 0xff8a2a), paint(T(To(vest.r * 1.04, 0.04, 6, 22), 0, vest.y - vest.h / 2, 0.02, 1, 1, 1, PI / 2), 0xe85a10));
    vp.push(paint(T(Bx(0.1, 0.1, 0.04), 0, vest.y - 0.02, -vest.r - 0.01), 0x1a1a1e));
    vj = bake(vp, MAT.gloss); vj.material = MAT.two; vj.visible = false; s.add(vj);
  }
  g.userData = { arm, s, ph: Math.random() * 6, k, vest: vj }; return g;
}
function penguinParts(parts, gl, glow, armP) {
  const tux = (x, y, z, nx, ny, nz) => mix(0x1a1c26, 0xffffff, sstep(-0.35, -0.65, nz) * sstep(1.25, 0.95, y));
  parts.push(paint(T(S(0.42, 24), 0, 0.6, 0, 1, 1.4, 0.95), tux));
  parts.push(paint(T(S(0.3, 20), 0, 1.22, -0.02, 1, 0.98, 0.96), (x, y, z, nx, ny, nz) => nz < -0.55 && y < 1.3 && Math.abs(x) < 0.17 ? 0xf8f8f8 : 0x1a1c26));
  parts.push(paint(T(Co(0.07, 0.2, 10), 0, 1.15, -0.37, 1, 1, 1, -PI / 2), 0xff9a1a));
  for (const sd of [-1, 1]) { eye(parts, glow, sd * 0.11, 1.28, -0.24, 0.07); parts.push(paint(T(S(0.12, 10), sd * 0.13, 0.04, -0.14, 1, 0.3, 1.5), 0xff9a1a)); parts.push(paint(T(S(0.05, 8), sd * 0.2, 1.16, -0.24, 1, 0.6, 0.4), 0xff9aa8)); }
  parts.push(paint(T(S(0.12, 10), 0.38, 0.62, 0, 0.35, 1.4, 0.8, 0, 0, -0.2), 0x1a1c26));
  armP.push(paint(T(S(0.12, 10), 0, -0.2, 0, 0.35, 1.5, 0.8), 0x1a1c26));
}
function ducklingParts(parts, gl, glow, armP) {
  const fluff = (x, y, z, nx, ny) => mix(0xffb80a, 0xffe46a, sstep(-0.5, 0.7, ny));
  parts.push(paint(T(S(0.42, 22), 0, 0.42, 0.04, 1, 0.86, 1.15), fluff), paint(T(S(0.3, 20), 0, 0.98, -0.18), fluff));
  parts.push(paint(T(Co(0.12, 0.25, 10), 0, 0.68, 0.5, 1, 1, 0.6, PI / 2 + 0.6), 0xffd23a));   // tail tuft
  parts.push(paint(T(S(0.13, 12), 0, 0.93, -0.46, 1.25, 0.42, 1.15), 0xff8a1a));   // bill
  for (let i = 0; i < 3; i++) parts.push(paint(T(Co(0.05, 0.18, 6), (i - 1) * 0.06, 1.3, -0.16, 1, 1, 1, 0, 0, (i - 1) * 0.4), 0xffd23a));   // fluffy top
  for (const sd of [-1, 1]) { eye(parts, glow, sd * 0.13, 1.05, -0.39, 0.07); parts.push(paint(T(S(0.11, 10), sd * 0.17, 0.04, -0.12, 1, 0.3, 1.5), 0xff8a1a)); parts.push(paint(T(S(0.045, 8), sd * 0.2, 0.92, -0.38, 1, 0.6, 0.4), 0xff8a6a)); }
  parts.push(paint(T(S(0.16, 12), 0.36, 0.5, 0.05, 0.4, 0.9, 1.3), 0xffc21a));
  armP.push(paint(T(S(0.15, 12), 0, -0.16, 0, 0.4, 1.3, 1.2), 0xffc21a));
}
function turtleParts(parts, gl, glow, armP) {
  // the shell: a dome with plates (hexagon pattern in the colours), a pale rim
  const shell = (x, y, z) => { const a = Math.atan2(x, z), r = Math.hypot(x, z), cell = Math.floor(a / (PI / 3) + 6) + Math.floor(r * 3.2) * 7; const k = (Math.sin(cell * 12.9898) * 43758.5453) % 1; const edge = Math.abs(((a / (PI / 3)) % 1 + 1) % 1 - 0.5) > 0.44 || Math.abs((r * 3.2) % 1 - 0.5) > 0.42; return edge ? 0x2a4a1a : mix(0x4a7a2a, 0x7aa83a, Math.abs(k)); };
  parts.push(paint(T(S(0.62, 26), 0, 0.28, 0, 1, 0.62, 1.15), shell));
  parts.push(paint(T(Cy(0.66, 0.6, 0.08, 26), 0, 0.22, 0, 1, 1, 1.15), 0xd8c88a));
  const skin = (x, y, z, nx, ny) => mix(0x7aa84a, 0xc8d890, sstep(0.3, -0.6, ny));
  parts.push(paint(T(S(0.24, 18), 0, 0.42, -0.78, 1, 0.9, 1.15), skin), paint(T(Cy(0.13, 0.15, 0.3, 12), 0, 0.33, -0.6, 1, 1, 1, -1.2), skin));
  parts.push(paint(T(To(0.08, 0.012, 5, 12, PI), 0, 0.34, -1.02, 1, 1, 1, -0.3, 0, PI), 0x2a3a14));
  for (const sd of [-1, 1]) { eye(parts, glow, sd * 0.12, 0.52, -0.92, 0.075); parts.push(paint(T(S(0.15, 12), sd * 0.52, 0.12, 0.5, 1, 0.45, 1.5, 0, sd * 0.5), skin)); }
  parts.push(paint(T(S(0.15, 12), 0.55, 0.15, -0.42, 1.5, 0.45, 0.9, 0, 0.4), skin));
  armP.push(paint(T(S(0.14, 12), 0, -0.18, 0, 0.9, 1.6, 0.6), skin));
}

// ---------------- what the animals float on ----------------
const plankTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#c0884a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { c.fillStyle = ['#b07a40', '#c8925a', '#a87038', '#c08448'][i]; c.fillRect(0, i * 32 + 1, w, 30); for (let k = 0; k < 14; k++) { c.strokeStyle = 'rgba(70,40,15,.35)'; c.lineWidth = 1; c.beginPath(); const y = i * 32 + 3 + Math.random() * 26; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + Math.random() * 4 - 2, w * 0.6, y + Math.random() * 4 - 2, w, y); c.stroke(); } c.fillStyle = '#5a3418'; c.fillRect(0, i * 32, w, 2); } c.fillStyle = '#3a2410'; for (const [x, y] of [[10, 16], [118, 16], [10, 80], [118, 80], [10, 48], [118, 112]]) { c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill(); } });
const crateMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.85 });
export function makeRaft(t) {
  const g = new THREE.Group(); seed = 7 + Math.floor(Math.random() * 1e5);
  if (t === 'ring') { const m = bake([paint(T(To(1.0, 0.36, 16, 32), 0, 0, 0, 1, 1, 1, PI / 2), (x, y, z) => (Math.floor((Math.atan2(z, x) / PI + 1) * 4) % 2 ? 0xff5aa8 : 0xffffff))], MAT.gloss); g.add(m); }
  if (t === 'log') g.add(logMesh(3.4, 0.58, 0));
  if (t === 'floe') g.add(floeMesh(1.7));
  if (t === 'crate') { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), crateMat); b.position.y = 0.3; g.add(b); g.add(bake([paint(T(Bx(1.56, 0.12, 0.12), 0, 0.8, 0.72), 0x5a3418), paint(T(Bx(1.56, 0.12, 0.12), 0, 0.8, -0.72), 0x5a3418), paint(T(Bx(0.12, 0.12, 1.56), 0.72, 0.8, 0), 0x5a3418), paint(T(Bx(0.12, 0.12, 1.56), -0.72, 0.8, 0), 0x5a3418)])); }
  if (t === 'tyre') g.add(bake([paint(T(To(0.85, 0.36, 12, 28), 0, 0, 0, 1, 1, 1, PI / 2), (x, y, z) => (Math.sin(Math.atan2(z, x) * 40) > 0.6 && Math.abs(y) < 0.2 ? 0x101012 : 0x26262a))], MAT.soft));
  if (t === 'buoy') g.add(bake([paint(T(To(0.72, 0.22, 12, 28), 0, 0, 0, 1, 1, 1, PI / 2), (x, y, z) => (Math.floor((Math.atan2(z, x) / PI + 1) * 4) % 2 ? 0xff3a2a : 0xffffff))], MAT.gloss));
  return g;
}
export const RAFT_TOP = { ring: 0.25, log: 0.5, floe: 0.34, crate: 0.85, tyre: 0.3, buoy: 0.2 };

// ---------------- dangers on the water ----------------
export function rockMesh(r, world) {
  seed = 3 + Math.floor(Math.random() * 1e5);
  const base = { canyon: [0xa8502a, 0xc8703a], volcano: [0x2a2624, 0x3e3632], arctic: [0x6a7078, 0xa8b0b8], storm: [0x4a4a4c, 0x6a6a66] }[world] || [0x5a564e, 0x8a8478];
  const moss = world === 'jungle' || world === 'lagoon' || world === 'ghats';
  const g = noisy(T(new THREE.IcosahedronGeometry(r, 3), 0, 0, 0, rnd(0.9, 1.3), rnd(0.6, 0.85), rnd(0.9, 1.2)), r * 0.16, 1.4 / r, R() * 9);
  return bake([paint(g, (x, y, z, nx, ny) => { const c = mix(base[0], base[1], 0.5 + n3(x * 2, y * 2, z * 2) * 0.8); if (y < r * 0.12) c.lerp(C(0x1e2226), 0.55 * sstep(r * 0.12, -r * 0.2, y)); if (moss && ny > 0.55) c.lerp(C(0x4a8a2a), sstep(0.55, 0.85, ny) * 0.8); if (world === 'arctic' && ny > 0.6) c.lerp(C(0xffffff), 0.9); return c; })], MAT.wet);
}
export function logMesh(len, r, moss = 1) {
  const g = noisy(new THREE.CylinderGeometry(r * 0.92, r, len, 16, 10), r * 0.06, 3);
  const parts = [paint(g, (x, y, z, nx, ny, nz) => { if (Math.abs(ny) > 0.9) { const d = Math.hypot(x, z) / r; return mix(0xe8c48a, 0x8a5a2a, d * d + Math.sin(d * 18) * 0.12); } const a = Math.atan2(x, z); const c = mix(0x4a2e18, 0x7a5232, 0.5 + 0.5 * Math.sin(a * 9 + Math.sin(y * 1.3) * 2)); if (moss && nx > 0.5 && Math.sin(y * 2.1) > 0) c.lerp(C(0x5a8a2a), 0.6); return c; })];
  for (const [y, a] of [[len * 0.2, 0.6], [-len * 0.25, 2.4]]) parts.push(paint(T(Cy(r * 0.25, r * 0.32, r * 1.2, 8), Math.sin(a) * r * 1.1, y, Math.cos(a) * r * 1.1, 1, 1, 1, Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2), 0x5a3a20));
  const m = bake(parts); m.rotation.z = PI / 2; const o = new THREE.Group(); o.add(m); return o;
}
export function barrelMesh(kind) {
  const parts = [];
  if (kind === 'wood') {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.5 + Math.sin(t * PI) * 0.12, t * 1.4 - 0.7)); }
    parts.push(paint(new THREE.LatheGeometry(pts, 20), (x, y, z) => mix(0x7a4a22, 0xa8703a, 0.5 + 0.5 * Math.sin(Math.atan2(x, z) * 10))));
    for (const y of [-0.5, -0.2, 0.2, 0.5]) parts.push(paint(T(To(0.5 + Math.sin((y / 1.4 + 0.5) * PI) * 0.12 + 0.01, 0.025, 4, 22), 0, y, 0, 1, 1, 1, PI / 2), 0x2a2a2e));
    parts.push(paint(T(Cy(0.5, 0.5, 0.02, 20), 0, 0.69, 0), 0x8a5a2a));
  } else {
    const col = kind === 'red' ? 0xd8302a : kind === 'blue' ? 0x2a6ad8 : 0xffb21a;
    parts.push(paint(Cy(0.55, 0.55, 1.3, 22), (x, y) => mix(col, 0x5a2a14, sstep(0.3, 0.6, n3(x * 4, y * 4, 1)) * 0.6)));
    for (const y of [-0.22, 0.22, -0.64, 0.64]) parts.push(paint(T(To(0.56, 0.03, 4, 22), 0, y, 0, 1, 1, 1, PI / 2), col));
    parts.push(paint(T(Cy(0.08, 0.08, 0.06, 8), 0.25, 0.66, 0), 0x2a2a2e));
    if (kind === 'yellow') parts.push(paint(T(Bx(0.5, 0.4, 0.02), 0, 0, -0.55), 0x1a1a1a));
  }
  return bake(parts, MAT.gloss);
}
export function icebergMesh(sz = 1) {
  seed = 5 + Math.floor(Math.random() * 1e5);
  const parts = [paint(noisy(T(new THREE.IcosahedronGeometry(3.4 * sz, 3), 0, 1.0, 0, 1.3, 0.85, 1), 0.45 * sz, 0.5, R() * 9), (x, y, z, nx, ny) => { const c = mix(0x6ad0f0, 0xffffff, sstep(-0.2, 0.7, ny) * 0.8 + sstep(0, 2.5, y) * 0.4); return c; })];
  parts.push(paint(noisy(T(Co(2.1 * sz, 3.8 * sz, 9), 0.6, 3.6 * sz, 0.2), 0.3, 0.8), (x, y, z, nx, ny) => mix(0x9ae0f8, 0xffffff, sstep(-0.3, 0.6, ny))));
  return bake(parts, MAT.gloss);
}
export function floeMesh(r) {
  const g = new THREE.CylinderGeometry(r, r * 1.08, 0.55, 14, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 5 + r) * 0.12 + Math.sin(a * 11) * 0.06; p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals();
  return bake([paint(g, (x, y, z, nx, ny) => ny > 0.5 ? mix(0xeaf6ff, 0xffffff, 0.5 + n3(x, 0, z) * 0.6) : 0x7acce8)], MAT.gloss);
}
// a crocodile: knobbly back, pale belly, a big snout; userData.jaw is the upper jaw (rotation.x > 0 opens it)
export function crocMesh() {
  const skin = (x, y, z, nx, ny) => { const c = mix(0xc8c88a, 0x3e5a24, sstep(-0.5, 0.2, ny)); if (ny > 0.2) c.lerp(C(0x22361a), sstep(0.3, 0.7, Math.sin(x * 9) * Math.sin(z * 7)) * 0.6); return c; };
  const body = loft([[-1.5, 0.36, 0.2, 0.12], [-1.1, 0.52, 0.27, 0.1], [-0.5, 0.66, 0.31, 0.06], [0.3, 0.68, 0.3, 0.05], [1.0, 0.5, 0.26, 0.04], [1.7, 0.3, 0.2, 0.03], [2.5, 0.17, 0.15, 0.03], [3.3, 0.07, 0.1, 0.02], [3.8, 0.02, 0.03, 0.02]], 16, 0.6);
  const parts = [paint(body, skin)];
  for (let i = 0; i < 16; i++) { const z = -1.0 + i * 0.3, w = Math.max(0.05, 0.3 - Math.max(0, z) * 0.08); for (const sd of (z < 1.6 ? [-1, 1] : [0])) parts.push(paint(T(Co(0.06, 0.16, 5), sd * w, 0.36 - Math.max(0, z) * 0.07, z), 0x2a3e18)); }
  for (const [x, z, a] of [[-0.68, -0.85, -0.5], [0.68, -0.85, 0.5], [-0.62, 0.75, -0.9], [0.62, 0.75, 0.9]]) parts.push(paint(T(S(0.17, 10), x, -0.02, z, 1.9, 0.5, 0.75, 0, a), skin));
  parts.push(paint(T(loft([[-2.75, 0.12, 0.05, 0], [-2.4, 0.18, 0.07, 0], [-1.8, 0.24, 0.08, 0], [-1.35, 0.32, 0.1, 0.02]], 12, 1), 0, -0.02, 0), 0xd8d8a0));   // lower jaw
  const m = bake(parts, MAT.wet), c = new THREE.Group(); c.add(m);
  const jp = [paint(loft([[-1.3, 0.13, 0.08, 0.02], [-1.0, 0.2, 0.1, 0.04], [-0.5, 0.25, 0.12, 0.05], [-0.15, 0.34, 0.15, 0.07], [0.15, 0.36, 0.14, 0.05]], 12, 0.3), skin)];
  for (let i = 0; i < 7; i++) for (const sd of [-1, 1]) jp.push(paint(T(Co(0.025, 0.09, 4), sd * (0.11 + i * 0.022), -0.05, -1.2 + i * 0.16, 1, 1, 1, PI), 0xfffff0));
  for (const sd of [-1, 1]) { jp.push(paint(T(S(0.11, 10), sd * 0.18, 0.2, 0.02, 1, 0.8, 1), skin)); jp.push(paint(T(S(0.075, 10), sd * 0.19, 0.25, -0.02), 0xe8d040), paint(T(S(0.07, 8), sd * 0.19, 0.25, -0.06, 0.25, 1, 0.6), 0x101010)); jp.push(paint(T(S(0.04, 6), sd * 0.06, 0.12, -1.22), 0x2a3e18)); }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.08, -1.45); jaw.add(bake(jp, MAT.wet)); c.add(jaw); c.userData.jaw = jaw;
  return c;
}

// ---------------- sea creatures ----------------
const grey = (top, bot) => (x, y, z, nx, ny) => mix(bot, top, sstep(-0.45, 0.05, ny));
function finShape(w, h, sweep) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.quadraticCurveTo(-w * 0.1 + sweep * 0.3, h * 0.6, sweep, h); s.quadraticCurveTo(w * 0.2 + sweep * 0.3, h * 0.4, w / 2, 0); s.lineTo(-w / 2, 0); return s; }
function fin(w, h, sweep, t = 0.06) { const g = new THREE.ExtrudeGeometry(finShape(w, h, sweep), { depth: t, bevelEnabled: true, bevelThickness: t * 0.4, bevelSize: t * 0.4, bevelSegments: 1, curveSegments: 8 }); g.translate(0, 0, -t / 2); g.rotateY(-PI / 2); return g; }   // in the y-z plane, base along z
export function dolphinMesh() {
  const col = grey(0x56728c, 0xeef2f6), parts = [paint(loft([[-1.95, 0.04, 0.04, -0.02], [-1.82, 0.08, 0.07, -0.02], [-1.6, 0.11, 0.1, -0.01], [-1.4, 0.25, 0.27, 0.08], [-1.05, 0.38, 0.4, 0.08], [-0.45, 0.47, 0.47, 0.04], [0.2, 0.42, 0.42, 0.02], [0.8, 0.27, 0.27, 0.01], [1.3, 0.14, 0.15, 0], [1.6, 0.07, 0.08, 0], [1.75, 0.04, 0.04, 0]], 18), col)];
  parts.push(paint(T(fin(0.75, 0.62, 0.38, 0.08), 0, 0.42, -0.05), 0x4a647c));
  for (const sd of [-1, 1]) { parts.push(paint(T(S(0.3, 10), sd * 0.45, -0.2, -0.7, 1.4, 0.12, 0.5, 0, sd * 0.6, sd * 0.5), 0x5a7690)); parts.push(paint(T(S(0.34, 10), sd * 0.34, 0, 1.8, 1.4, 0.09, 0.55, 0, -sd * 0.55), 0x4a647c)); }
  for (const sd of [-1, 1]) { parts.push(paint(T(S(0.05, 8), sd * 0.24, 0.09, -1.28), 0x0a0a10)); }
  parts.push(paint(T(To(0.15, 0.012, 4, 10, PI * 0.8), 0, -0.04, -1.68, 1, 1, 1.8, PI / 2, 0, PI * 1.1), 0x2a3a4a));
  const m = bake(parts, MAT.wet), d = new THREE.Group(); d.add(m); d.visible = false; return d;
}
export function whaleMesh() {
  const col = (x, y, z, nx, ny) => { const c = mix(0xdfe6ee, 0x2a4a6e, sstep(-0.55, -0.05, ny)); if (ny < -0.3 && z < 1 && Math.sin(x * 14) > 0.4) c.lerp(C(0x8aa0b8), 0.6); if (ny > 0 && n3(x * 1.5, y, z * 1.5) > 0.4) c.lerp(C(0x9ab0c8), 0.5); return c; };
  const parts = [paint(loft([[-5.0, 0.6, 0.4, -0.4], [-4.5, 1.5, 0.95, -0.25], [-3.5, 2.05, 1.2, -0.25], [-2.0, 2.3, 1.25, -0.3], [-0.5, 2.25, 1.2, -0.3], [1.2, 1.8, 1.0, -0.3], [2.8, 1.1, 0.7, -0.25], [4.2, 0.5, 0.4, -0.15], [5.2, 0.25, 0.2, -0.05], [5.6, 0.08, 0.06, 0]], 20), col)];
  for (const sd of [-1, 1]) { parts.push(paint(T(S(1, 12), sd * 2.3, -0.75, -1.8, 1.9, 0.14, 0.55, 0, sd * 0.5, sd * 0.35), 0x3a5a7e)); parts.push(paint(T(S(1, 12), sd * 1.05, 0.12, 6.1, 1.25, 0.1, 0.62, -0.25, -sd * 0.45), 0x2a4a6e)); }
  for (const sd of [-1, 1]) { parts.push(paint(T(S(0.2, 12), sd * 1.95, 0.0, -3.1), 0xffffff), paint(T(S(0.12, 10), sd * 2.06, 0.0, -3.15), 0x0a0a12)); parts.push(paint(T(S(0.12, 8), sd * 1.9, -0.32, -3.3, 1, 0.6, 1.4), 0x2a4a6e)); }
  parts.push(paint(T(fin(1.0, 0.55, 0.4, 0.12), 0, 0.85, 2.2), 0x2a4a6e));
  parts.push(paint(T(To(1.85, 0.05, 4, 20, PI * 0.5), 0, -0.25, -3.6, 1, 0.7, 1, PI / 2, 0, PI * 1.25), 0x1a2a3e));   // smile
  parts.push(paint(T(Cy(0.22, 0.3, 0.2, 12), 0, 0.92, -1.6), 0x1a3050));   // blowhole
  return bake(parts, MAT.wet);
}
export function sharkMesh() {
  const col = (x, y, z, nx, ny) => mix(0xf0f2f4, 0x6a7a8a, sstep(-0.5, -0.05, ny));
  const parts = [paint(loft([[-1.9, 0.05, 0.05, 0], [-1.7, 0.22, 0.2, 0.02], [-1.3, 0.4, 0.38, 0.02], [-0.5, 0.52, 0.5, 0.02], [0.4, 0.44, 0.42, 0.01], [1.2, 0.24, 0.24, 0], [1.75, 0.1, 0.12, 0], [2.0, 0.06, 0.07, 0]], 18), col)];
  parts.push(paint(T(fin(1.1, 1.25, 0.6, 0.1), 0, 0.42, -0.55), 0x5a6a7a));
  parts.push(paint(T(fin(0.7, 1.2, 0.5, 0.08), 0, 0.02, 1.95, 1, 1, 1, -0.3), 0x5a6a7a), paint(T(fin(0.5, 0.7, 0.3, 0.07), 0, 0.02, 1.95, 1, 1, 1, PI + 0.5), 0x5a6a7a));
  for (const sd of [-1, 1]) { parts.push(paint(T(S(0.45, 10), sd * 0.6, -0.25, -0.5, 1.5, 0.1, 0.55, 0, sd * 0.4, sd * 0.4), 0x5a6a7a)); parts.push(paint(T(S(0.06, 8), sd * 0.27, 0.13, -1.35), 0x050508)); for (let i = 0; i < 4; i++) parts.push(paint(T(Bx(0.015, 0.2, 0.03), sd * 0.43, 0.02, -1.0 + i * 0.09), 0x4a5a6a)); }
  for (let i = 0; i < 9; i++) parts.push(paint(T(Co(0.03, 0.08, 4), (i - 4) * 0.05, -0.1, -1.72 + Math.abs(i - 4) * 0.03, 1, 1, 1, PI), 0xffffff));
  return bake(parts, MAT.wet);
}
// a small jumping fish (silver, orange or blue)
export function fishMesh(col = 0xc8d4e0) {
  const parts = [paint(loft([[-0.5, 0.02, 0.03, 0], [-0.4, 0.09, 0.13, 0], [-0.1, 0.12, 0.2, 0], [0.2, 0.08, 0.14, 0], [0.42, 0.03, 0.05, 0]], 12), (x, y, z, nx, ny) => mix(0xffffff, col, sstep(-0.6, 0.3, ny)))];
  parts.push(paint(T(S(0.12, 8), 0, 0, 0.55, 0.15, 1.3, 0.8), col), paint(T(S(0.1, 8), 0, 0.2, -0.05, 0.12, 0.8, 1.6), col));
  for (const sd of [-1, 1]) parts.push(paint(T(S(0.035, 6), sd * 0.08, 0.04, -0.36), 0x101010));
  return bake(parts, MAT.gloss);
}
// a seagull: body, head, beak; wings in their own pivots so they flap (userData.wings)
export function gullMesh() {
  const g = new THREE.Group(), parts = [paint(loft([[-0.4, 0.03, 0.03, 0.05], [-0.3, 0.1, 0.1, 0.06], [-0.1, 0.14, 0.14, 0], [0.25, 0.1, 0.1, 0], [0.5, 0.03, 0.03, 0.02]], 10), (x, y, z, nx, ny) => mix(0xd8dde4, 0xffffff, sstep(-0.3, 0.6, ny)))];
  parts.push(paint(T(Co(0.035, 0.18, 6), 0, 0.05, -0.48, 1, 1, 1, -PI / 2), 0xffb21a), paint(T(Bx(0.18, 0.02, 0.16), 0, 0.02, 0.52), 0x3a3a40));
  for (const sd of [-1, 1]) parts.push(paint(T(S(0.02, 6), sd * 0.07, 0.1, -0.33), 0x101010));
  g.add(bake(parts, MAT.soft)); const wings = [];
  for (const sd of [-1, 1]) { const w = new THREE.Group(), ws = new THREE.Shape(); ws.moveTo(0, -0.12); ws.lineTo(0.55, -0.05); ws.lineTo(0.95, 0.08); ws.lineTo(0.5, 0.16); ws.lineTo(0, 0.16); const wg = new THREE.ShapeGeometry(ws); wg.rotateX(-PI / 2); if (sd < 0) wg.scale(-1, 1, 1); w.add(bake([paint(wg, (x) => Math.abs(x) > 0.75 ? 0x2a2a30 : 0xc8ced6)], MAT.two)); w.position.set(sd * 0.08, 0.06, 0); g.add(w); wings.push(w); }
  g.userData.wings = wings; return g;
}

// ---------------- boats that cross the river ----------------
const winTex = (night) => canvasTex(256, 32, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let x = 6; x < w; x += 22) { const lit = night && Math.random() < 0.8; c.fillStyle = lit ? (Math.random() < 0.8 ? '#ffd88a' : '#8ae8ff') : '#1e3a52'; c.beginPath(); c.roundRect(x, 7, 15, 18, 4); c.fill(); if (!lit) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 2, 9, 4, 14); } } });
const nameTex = canvasTex(256, 48, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a3a6a'; c.font = 'bold 30px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SEA PRINCESS', w / 2, h / 2 + 2); });
// built facing -z, length along z; the game turns it to sail across the river
export function ferryMesh(kind, night) {
  const o = new THREE.Group();
  if (kind === 'riverboat') {   // the ghats: a long wooden passenger boat with a bamboo canopy, painted bands, oars, a flag, passengers
    const L = 12, parts = [];
    const hull = loft([[-6.0, 0.08, 0.3, 1.35], [-5.4, 0.7, 0.62, 1.05], [-4.2, 1.35, 0.78, 0.85], [-2, 1.6, 0.82, 0.75], [2, 1.6, 0.82, 0.75], [4.2, 1.35, 0.78, 0.85], [5.4, 0.7, 0.62, 1.05], [6.0, 0.08, 0.3, 1.35]], 18, 1, 0.03);
    parts.push(paint(hull, (x, y, z, nx, ny) => ny > 0.8 ? mix(0x8a5a2a, 0xa8703a, 0.5 + 0.5 * Math.sin(x * 12)) : y > 0.62 ? 0x1aa89a : y > 0.5 ? 0xff7a1a : y > 0.42 ? 0xffffff : mix(0x5a3418, 0x8a5a2a, 0.5 + 0.5 * Math.sin(y * 30))));
    // the canopy: a half barrel of woven bamboo on poles
    const can = new THREE.CylinderGeometry(1.6, 1.6, 5.6, 18, 4, true, -PI / 2, PI); can.rotateX(-PI / 2); can.translate(0, 2.3, 0.4);
    parts.push(paint(can, (x, y, z) => mix(0xb08a4a, 0xd8b070, 0.5 + 0.5 * Math.sin(z * 14) * Math.sin(Math.atan2(y - 2.3, x) * 20))));
    for (const z of [-2.2, 0.4, 3.0]) for (const sd of [-1, 1]) parts.push(paint(T(Cy(0.06, 0.06, 1.8, 6), sd * 1.55, 1.6, z), 0x5a3418));
    parts.push(paint(T(Cy(0.04, 0.04, 2.6, 5), 0, 2.0, -5.0), 0x5a3418), paint(T(Bx(0.04, 0.6, 0.9), 0, 3.0, -5.45), 0xff7a1a));
    for (const sd of [-1, 1]) parts.push(paint(T(Cy(0.05, 0.05, 3.4, 5), sd * 1.9, 0.6, 4.2, 1, 1, 1, 0.9, 0, sd * 0.6), 0x8a5a2a));
    // passengers: colourful kurtas and saris, heads, a few turbans
    const cloth = [0xff4a6a, 0xffc21a, 0x2a8ad8, 0x3fcf6e, 0xff8a1a, 0xffffff, 0xa05ad8];
    for (let i = 0; i < 8; i++) { const x = (i % 2 ? 0.75 : -0.75), z = -1.9 + Math.floor(i / 2) * 1.35; parts.push(paint(T(S(0.32, 12), x, 1.12, z, 1, 1.25, 0.9), pick(cloth)), paint(T(S(0.2, 12), x, 1.68, z), pick([0x8d5524, 0xc68642, 0xa86b3c])), paint(T(S(0.21, 12), x, 1.76, z + 0.02, 1, 0.6, 1), R() < 0.3 ? pick([0xff8a1a, 0xffffff, 0xe8202a]) : 0x1a1210)); }
    const m = bake(parts, MAT.two); m.position.y = -0.4; o.add(m);
    o.userData = { L, W: 3.3 };
  } else {   // the harbour ferry: navy hull, white decks, window bands, the bridge, a red funnel, lifeboats, railings
    const L = 16, parts = [], lamps = [];
    const hull = loft([[-8.0, 0.1, 1.0, 1.9], [-7.2, 1.3, 1.4, 1.65], [-5.5, 2.3, 1.55, 1.4], [0, 2.5, 1.6, 1.3], [5.5, 2.5, 1.6, 1.3], [7.6, 2.4, 1.5, 1.35], [8.0, 2.2, 1.4, 1.4]], 20, 1, 0.02);
    parts.push(paint(hull, (x, y, z, nx, ny) => ny > 0.8 ? 0xc8ccd0 : y < 0.05 ? 0xb8202a : y < 0.3 ? 0xffffff : 0x0e2a52));
    parts.push(paint(T(Bx(4.5, 1.6, 10.5), 0, 2.1, 0.9), 0xf6f6f6), paint(T(Bx(4.0, 1.4, 7.0), 0, 3.6, 1.6), 0xf6f6f6), paint(T(Bx(3.2, 1.1, 2.4), 0, 4.85, -0.6), 0xf6f6f6));
    parts.push(paint(T(Bx(4.6, 0.12, 10.6), 0, 2.95, 0.9), 0x2a6ab0), paint(T(Bx(4.1, 0.1, 7.1), 0, 4.32, 1.6), 0x2a6ab0));
    parts.push(paint(T(Cy(0.55, 0.65, 2.0, 16), 0, 5.5, 3.4), (x, y) => y > 6.0 ? 0x1a1a1a : y > 5.5 ? 0xffc21a : 0xd8202a));
    for (const sd of [-1, 1]) { parts.push(paint(T(S(0.5, 12), sd * 2.35, 3.9, 0.6, 0.9, 0.7, 3.2), 0xff6a10), paint(T(Bx(0.04, 0.5, 0.04), sd * 2.15, 4.5, 0.0), 0x8a9098), paint(T(Bx(0.04, 0.5, 0.04), sd * 2.15, 4.5, 1.2), 0x8a9098)); for (let z = -6; z <= 6.5; z += 0.9) parts.push(paint(T(Bx(0.04, 0.6, 0.04), sd * 2.45, 1.65, z), 0xffffff)); parts.push(paint(T(Bx(0.05, 0.05, 13), sd * 2.45, 1.95, 0.25), 0xffffff)); }
    parts.push(paint(T(Cy(0.05, 0.05, 2.4, 5), 0, 6.6, -0.6), 0xd8dde2), paint(T(Bx(1.4, 0.06, 0.06), 0, 7.3, -0.6), 0xd8dde2));
    lamps.push(paint(T(S(0.12, 8), 0, 7.9, -0.6), 0xffffff), paint(T(S(0.1, 8), -2.4, 2.2, -5.0), 0xff2a2a), paint(T(S(0.1, 8), 2.4, 2.2, -5.0), 0x2aff4a));
    o.add(bake(parts, MAT.gloss)); o.add(bake(lamps, MAT.glow));
    // window bands and the name, on both sides
    const wm = new THREE.MeshStandardMaterial({ map: winTex(night), roughness: 0.3 }), wm2 = new THREE.MeshStandardMaterial({ map: winTex(night), roughness: 0.3 }), nm = new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.5 });
    if (night) { wm.emissive.set(0xffffff); wm.emissiveMap = wm.map; wm2.emissive.set(0xffffff); wm2.emissiveMap = wm2.map; }
    for (const sd of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 1.0), wm); a.position.set(sd * 2.26, 2.25, 0.9); a.rotation.y = sd * PI / 2; o.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.9), wm2); b.position.set(sd * 2.01, 3.7, 1.6); b.rotation.y = sd * PI / 2; o.add(b);
      const n = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.42), nm); n.position.set(sd * 2.47, 1.0, -3.6); n.rotation.y = sd * PI / 2; o.add(n);
    }
    const br = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5), wm); br.position.set(0, 5.0, -1.81); br.rotation.y = PI; o.add(br);
    o.children.forEach(q => { q.position.y -= 0.25; }); o.userData = { L, W: 5.2 };
  }
  o.traverse(q => { q.frustumCulled = false; }); return o;
}

// ---------------- fun things ----------------
// a floating treasure chest: lid (userData.lid) opens when you drive through
export function chestMesh() {
  const o = new THREE.Group(), gold = 0xffc21a, wood = (x, y, z) => mix(0x6a3a18, 0x9a5a28, 0.5 + 0.5 * Math.sin(y * 26));
  const parts = [paint(T(Bx(1.6, 0.9, 1.1), 0, 0.45, 0), wood)];
  for (const x of [-0.6, 0, 0.6]) parts.push(paint(T(Bx(0.12, 0.94, 1.14), x, 0.45, 0), gold));
  parts.push(paint(T(Bx(0.26, 0.3, 0.06), 0, 0.72, -0.58), gold), paint(T(S(0.06, 8), 0, 0.68, -0.62), 0x2a1a0a));
  // gold coins piled up inside
  for (let i = 0; i < 14; i++) parts.push(paint(T(Cy(0.13, 0.13, 0.04, 12), rnd(-0.55, 0.55), 0.9 + rnd(0, 0.15), rnd(-0.32, 0.32), 1, 1, 1, rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4)), gold));
  parts.push(paint(T(S(0.62, 14), 0, 0.88, 0, 1.25, 0.25, 0.85), 0xffb21a));
  o.add(bake(parts, MAT.gloss));
  const lid = new THREE.Group(), lg = new THREE.CylinderGeometry(0.55, 0.55, 1.6, 16, 1, false, 0, PI); lg.rotateZ(PI / 2); lg.translate(0, 0, 0.55);
  const lp = [paint(lg, (x, y, z) => Math.abs(x) > 0.66 || Math.abs(x) < 0.06 ? gold : wood(x, y * 0.5 + z, z))];
  lid.add(bake(lp, MAT.gloss)); lid.position.set(0, 0.9, -0.55); lid.rotation.x = -0.35; o.add(lid); o.userData.lid = lid;
  const raft = bake([paint(T(Bx(2.2, 0.22, 1.7), 0, -0.05, 0), (x) => mix(0x8a5a2a, 0xb07a40, 0.5 + 0.5 * Math.sin(x * 9)))]); o.add(raft);
  return o;
}
// a slalom hoop: a gold ring standing in the water, with buoy floats (userData.ring can be re-coloured)
export function hoopMesh(r = 2.4) {
  const o = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 10, 36), new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0x6a4a00, roughness: 0.25 }));
  ring.position.y = r * 0.72; o.add(ring);
  for (const sd of [-1, 1]) o.add(bake([paint(T(S(0.45, 12), sd * r * 0.72, 0.1, 0, 1, 0.7, 1), 0xff3a2a), paint(T(Cy(0.46, 0.46, 0.12, 14), sd * r * 0.72, 0.15, 0), 0xffffff)], MAT.gloss));
  o.userData.ring = ring; return o;
}
// a geyser: a foaming ring on the water and a column of water that shoots up (userData.col, scale.y 0…1)
const geyTex = canvasTex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(200,240,255,.2)'); g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(200,240,255,.2)'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 10 + Math.random() * 30); } });
geyTex.wrapT = THREE.RepeatWrapping;
export function geyserMesh() {
  const o = new THREE.Group(), cg = new THREE.CylinderGeometry(0.8, 1.6, 12, 16, 1, true); cg.translate(0, 6, 0);
  const col = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: geyTex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); col.scale.y = 0.05; o.add(col);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), new THREE.MeshBasicMaterial({ color: 0xf4fcff, transparent: true, opacity: 0.8, depthWrite: false })); top.scale.set(1, 0.6, 1); col.add(top); top.position.y = 12;
  const foam = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ map: geyTex, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })); foam.rotation.x = -PI / 2; foam.position.y = 0.25; o.add(foam);
  o.userData = { col, top, foam }; return o;
}

// ---------------- nature for the banks ----------------
// a coconut palm: a curved ringed trunk, drooping folded fronds, coconuts
export function palmTree(h = 6) {
  const parts = [], lean = rnd(-0.6, 0.6), bend = rnd(0.5, 1.4), N = 9; let top = null;
  for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, p0 = new THREE.Vector3(Math.sin(lean) * bend * t0 * t0 * h * 0.3, t0 * h, Math.cos(lean) * bend * t0 * t0 * h * 0.3), p1 = new THREE.Vector3(Math.sin(lean) * bend * t1 * t1 * h * 0.3, t1 * h, Math.cos(lean) * bend * t1 * t1 * h * 0.3); const d = p1.clone().sub(p0), g = new THREE.CylinderGeometry(0.2 - t1 * 0.06, 0.24 - t0 * 0.06, d.length() + 0.04, 8, 2); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))); g.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); parts.push(paint(g, (x, y) => mix(0x7a5a3a, 0xa8865a, 0.5 + 0.5 * Math.sin(y * 9)))); top = p1; }
  const leaves = [];
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * PI * 2 + rnd(-0.2, 0.2), len = rnd(2.6, 3.4), droop = rnd(1.2, 2.0), g = new THREE.PlaneGeometry(1, 1, 2, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), t = p.getY(i) + 0.5, w = 0.55 * Math.sin(Math.min(1, t * 1.25) * PI) + 0.05, r = t * len; p.setXYZ(i, u * w * 1.4, r * 0.45 - t * t * droop, r + Math.abs(u) * -0.0); p.setY(i, p.getY(i) - Math.abs(u) * w * 0.5); }
    g.computeVertexNormals(); g.rotateY(a); g.translate(top.x, top.y, top.z); leaves.push(paint(g, (x, y) => mix(0x2a6a1a, 0x6ab83a, sstep(top.y - 2, top.y + 0.5, y))));
  }
  for (let i = 0; i < 4; i++) parts.push(paint(T(S(0.2, 10), top.x + Math.cos(i * 1.7) * 0.25, top.y - 0.25, top.z + Math.sin(i * 1.7) * 0.25), 0x5a4020));
  const o = new THREE.Group(); o.add(bake(parts)); o.add(bake(leaves, MAT.two)); return o;
}
// a hill or mountain: smooth noise, coloured by height (and snow on top where it is cold)
const HILLS = { lagoon: [0x3a8a3a, 0x5aa84a, 0x8a9a6a, null], jungle: [0x1e5a2a, 0x2a7a32, 0x4a8a3a, null], canyon: [0xa84a2a, 0xc8643a, 0xe0905a, null], arctic: [0x5a6a7a, 0x8a9aaa, 0xe8f0f8, 0xffffff], ghats: [0x6a7a3a, 0x8a8a4a, 0xb89a6a, null], harbour: [0x14142a, 0x1c1c34, 0x24243e, null], storm: [0x3a4a3a, 0x4a5a4a, 0x6a6e6a, 0xd8dde2], volcano: [0x1e1a18, 0x2a2420, 0x3a302a, null] };
export function hillMesh(world, w, h) {
  seed = 9 + Math.floor(Math.random() * 1e5); const P = HILLS[world] || HILLS.lagoon;
  const g = noisy(new THREE.IcosahedronGeometry(1, 4), 0.14, 1.3, R() * 20), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let y = p.getY(i); y = y < 0 ? y * 0.05 : y; p.setXYZ(i, p.getX(i) * w, y * h, p.getZ(i) * w * rnd(0.98, 1.02)); }
  g.computeVertexNormals();
  return bake([paint(g, (x, y, z, nx, ny) => { const k = y / h; let c = k < 0.35 ? mix(P[0], P[1], k / 0.35) : mix(P[1], P[2], (k - 0.35) / 0.65); if (ny < 0.6 && k > 0.2) c = mix(c.getHex(), world === 'canyon' ? 0x8a3a1a : 0x6a6660, (0.6 - ny) * 0.8); if (P[3] && k > 0.62 && ny > 0.35) c = mix(c.getHex(), P[3], sstep(0.62, 0.75, k)); return c; })]);
}
export function reeds() { const parts = []; for (let i = 0; i < 9; i++) { const x = rnd(-1, 1), z = rnd(-1, 1), h = rnd(1.2, 2.2); parts.push(paint(T(Cy(0.015, 0.03, h, 4), x, h / 2, z, 1, 1, 1, rnd(-0.15, 0.15), 0, rnd(-0.15, 0.15)), 0x5a8a2a)); if (R() < 0.5) parts.push(paint(T(Cy(0.05, 0.05, 0.3, 6), x, h - 0.1, z), 0x6a3a18)); } return bake(parts); }
export function lilyPads(n = 5) { const parts = []; for (let i = 0; i < n; i++) { const g = new THREE.CircleGeometry(rnd(0.4, 0.8), 14, 0.3, PI * 2 - 0.3); g.rotateX(-PI / 2); g.translate(rnd(-2, 2), 0, rnd(-2, 2)); parts.push(paint(g, (x, y, z) => mix(0x2a7a2a, 0x5aa83a, 0.5 + n3(x * 3, 0, z * 3)))); if (R() < 0.4) { const f = T(S(0.15, 8), g.attributes.position.getX(0), 0.08, g.attributes.position.getZ(0), 1, 0.6, 1); parts.push(paint(f, 0xffa8d0)); } } return bake(parts, MAT.two); }
export function shoreRocks(world) { const o = new THREE.Group(); for (let i = 0; i < 3; i++) { const r = rockMesh(rnd(0.5, 1.3), world); r.position.set(rnd(-1.5, 1.5), 0, rnd(-1.5, 1.5)); o.add(r); } return o; }
// soft round clouds (a sprite texture), drawn in the sky
export const cloudTex = canvasTex(256, 128, (c, w, h) => { for (let i = 0; i < 22; i++) { const x = w * 0.2 + Math.random() * w * 0.6, y = h * 0.45 + Math.random() * h * 0.25, r = 18 + Math.random() * 30; const g = c.createRadialGradient(x, y - r * 0.3, 2, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.65, 'rgba(250,252,255,0.75)'); g.addColorStop(1, 'rgba(230,240,250,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } const s = c.createLinearGradient(0, 0, 0, h); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(120,140,170,0.25)'); c.globalCompositeOperation = 'source-atop'; c.fillStyle = s; c.fillRect(0, 0, w, h); });
export const sunTex = canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.18, 'rgba(255,250,220,1)'); g.addColorStop(0.3, 'rgba(255,200,140,.5)'); g.addColorStop(1, 'rgba(255,160,90,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
// a cliff / rock wall for the banks: a tall knobbly block, smooth, in rock layers (canyon), ice (fjord) or dark lava rock
const CLIFF = { canyon: [0xa8482a, 0xd0783e, 0xe8b07a, 0x8a3a22], arctic: [0xc8e4f8, 0xeef8ff, 0x9ad0f0, 0xffffff], dark: [0x262220, 0x3a322c, 0x4a4038, 0x1a1614] };
export function cliffMesh(kind, w, h, d) {
  seed = 13 + Math.floor(Math.random() * 1e5); const P = CLIFF[kind];
  const g = noisy(new THREE.BoxGeometry(w, h, d, Math.max(2, Math.round(w / 1.5)), Math.max(3, Math.round(h / 1.5)), Math.max(2, Math.round(d / 1.5))), Math.min(w, d) * 0.12, 1.1 / Math.max(1, Math.min(w, d) * 0.3), R() * 9);
  const s = rnd(0, 6);
  return bake([paint(g, (x, y, z, nx, ny) => { const band = Math.sin((y + h / 2) * 1.4 + s + Math.sin(x * 0.5 + z * 0.4) * 0.8); let c = kind === 'arctic' ? mix(P[2], P[1], sstep(-0.4, 0.6, ny) * 0.7 + 0.3 + band * 0.1) : mix(P[0], P[1], 0.5 + band * 0.45); if (kind !== 'arctic' && band > 0.75) c.lerp(C(P[2]), 0.45); if (ny > 0.75) c.lerp(C(kind === 'canyon' ? 0xd89a5a : P[3]), 0.5); if (y < -h / 2 + 1.2) c.lerp(C(kind === 'arctic' ? 0x6ab8e0 : 0x1a1210), 0.35); return c; })]);
}
// the ANIMAL HOME at a dock: a cottage with a gabled roof, a door and windows facing the river (-x), flower boxes, a
// chimney and a paw sign; and a planked pier
export function animalHome() {
  const parts = [], glow = [], cream = (x, y) => mix(0xf4e4c4, 0xffffff, 0.5 + 0.5 * Math.sin(y * 9));
  parts.push(paint(T(Bx(5.8, 0.45, 5.8), 0, 0.22, 0), (x, y, z) => mix(0x8a8478, 0xa8a090, 0.5 + 0.5 * n3(x * 2, y, z * 2))));
  parts.push(paint(T(Bx(5, 3.2, 5), 0, 2.05, 0), cream));
  const gs = new THREE.Shape(); gs.moveTo(-2.5, 0); gs.lineTo(2.5, 0); gs.lineTo(0, 2.0); gs.lineTo(-2.5, 0);
  for (const x of [-2.5, 2.5]) { const g = new THREE.ShapeGeometry(gs); g.rotateY(x < 0 ? -PI / 2 : PI / 2); g.translate(x, 3.65, 0); parts.push(paint(g, cream)); }
  const ang = Math.atan2(2.0, 2.5), len = Math.hypot(2.5, 2.0) + 0.45;
  for (const sd of [-1, 1]) parts.push(paint(T(Bx(6.0, 0.22, len), 0, 3.65 + 1.0 + 0.1, sd * 1.25, 1, 1, 1, sd * ang, 0, 0), (x, y, z) => mix(0xc83a3a, 0xe85a4a, 0.5 + 0.5 * Math.sin((y * 3 + Math.abs(z) * 2.4) * 4))));
  parts.push(paint(T(Bx(6.1, 0.18, 0.3), 0, 5.72, 0), 0xa82a2a), paint(T(Bx(0.7, 1.4, 0.7), 1.4, 5.2, 1.3), 0xa8706a));
  // the front (towards the river): door, round window, two windows with flower boxes
  parts.push(paint(T(Bx(0.08, 1.9, 1.2), -2.52, 1.4, 0), 0x7a4a22), paint(T(S(0.07, 8), -2.58, 1.4, 0.4), 0xffc21a));
  parts.push(paint(T(Cy(0.45, 0.45, 0.08, 16), -2.53, 4.15, 0, 1, 1, 1, 0, 0, PI / 2), 0xffffff), paint(T(Cy(0.36, 0.36, 0.1, 16), -2.54, 4.15, 0, 1, 1, 1, 0, 0, PI / 2), 0x6ac0f0));
  for (const z of [-1.6, 1.6]) { parts.push(paint(T(Bx(0.08, 1.0, 1.0), -2.53, 2.3, z), 0xffffff), paint(T(Bx(0.1, 0.8, 0.8), -2.55, 2.3, z), 0x6ac0f0), paint(T(Bx(0.3, 0.25, 1.1), -2.65, 1.68, z), 0x7a4a22)); for (let i = 0; i < 4; i++) parts.push(paint(T(S(0.13, 8), -2.68, 1.88, z - 0.4 + i * 0.27), [0xff4a6a, 0xffd23f, 0xff8ad8, 0xffffff][i])); }
  // the paw sign over the door
  parts.push(paint(T(Cy(0.55, 0.55, 0.1, 20), -2.62, 3.05, 0, 1, 1, 1, 0, 0, PI / 2), 0x18b84a));
  for (const [dz, dy, r] of [[0, -0.1, 0.18], [-0.2, 0.12, 0.08], [-0.07, 0.2, 0.08], [0.07, 0.2, 0.08], [0.2, 0.12, 0.08]]) parts.push(paint(T(S(r, 10), -2.68, 3.05 + dy, dz, 0.4, 1, 1), 0xffffff));
  const o = new THREE.Group(); o.add(bake(parts)); return o;
}
export function pierDeck(w, d) { return bake([paint(new THREE.BoxGeometry(w, 0.35, d, 1, 1, Math.round(d * 2)), (x, y, z) => { const k = Math.floor(z * 2.2 + 100); return mix(0xa8703a, 0xc8925a, ((k * 7919) % 13) / 13 * 0.8 + (Math.abs(z * 2.2 % 1) < 0.08 ? -0.5 : 0)); })]); }
