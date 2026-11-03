// BUCCANEER BASH characters: smooth cartoon humans with real faces (eyes with irises and a shine, eyebrows, noses,
// ears, hair, beards) and expressions (a grin, a shouting open mouth, a surprised "O").
//  · the pirate crew: a whole crowd drawn with instancing, every pirate with his own vest colour, skin, hair and face;
//    arms and legs swing as they run, mouths open when they shout
//  · Captain Goldtooth, the hero: big beard, tricorn, red coat, a parrot called Biscuit
//  · the navy guards in blue coats, and Admiral Snootington, the villain, who stamps, shouts and shakes his fist
import * as THREE from 'three';

const PI = Math.PI;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// one shape, placed and coloured; keeps its own smooth normals
function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(_m.compose(v3(...pos), _q.setFromEuler(_e.set(...rot)), v3(...scl)));
  const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g;
}
function merge(list) {
  if (!list.length) return null;
  let n = 0; list.forEach(g => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); return m;
}
// detail level: crowds are built lighter (fewer segments) so 200+ of them stay fast on a phone
let DET = 1; const sg = (n, min) => Math.max(min, Math.round(n * DET));
const S = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, sg(w, 5), sg(h, 4));
const HS = (r, w = 14, h = 6, k = 0.5) => new THREE.SphereGeometry(r, sg(w, 6), sg(h, 3), 0, PI * 2, 0, PI * k);
const C = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, sg(s, 5));
const Cap = (r, l, s = 10) => new THREE.CapsuleGeometry(r, l, DET < 1 ? 2 : 3, sg(s, 5));
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const T = (r, t, s = 14, arc = PI * 2) => new THREE.TorusGeometry(r, t, DET < 1 ? 4 : 6, sg(s, 6), arc);
const Cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const W = 0xffffff;

// ---------------- the human builder ----------------
// Proportions: hips 0.72, shoulders 1.13 (±0.23), head centre 1.43, head radius 0.2 (about 1.65 m tall, cartoon style).
// Channels: tint (white, coloured per instance), skin (white, tinted to a skin tone), hair (white, tinted), fix (own
// colours), mouth.smile / mouth.open / mouth.o, armL/armR {fix, skin}, leg {fix}.
export const HEAD_Y = 1.43, HIP_Y = 0.72, SH_Y = 1.13;
function build(o) {
  const P = { tint: [], skin: [], hair: [], fix: [], smile: [], open: [], oh: [], armL: { fix: [], skin: [] }, armR: { fix: [], skin: [] }, leg: [] };
  const hy = HEAD_Y, eyeC = o.eyes || 0x3a6ab8, bw = o.bulk || 1;
  // ---- head (relative to the body; the hero builds it as a separate group) ----
  const H = o.headOffset || [0, 0, 0], h = (x, y, z) => [x + H[0], y + hy + H[1], z + H[2]];
  P.skin.push(part(S(0.2, 18, 14), W, h(0, 0.02, 0), [0, 0, 0], [0.95, 1.02, 0.98]));        // skull
  P.skin.push(part(S(0.15, 14, 10), W, h(0, -0.08, -0.04), [0, 0, 0], [1.05, 0.85, 1]));     // jaw and cheeks
  P.skin.push(part(S(0.055, 10, 8), W, h(0, -0.01, -0.2), [0, 0, 0], [0.9, 0.85, 1.1]));     // nose
  for (const s of [-1, 1]) {
    P.skin.push(part(S(0.05, 10, 8), W, h(s * 0.19, 0, 0.01), [0, 0, 0], [0.5, 1, 0.8]));    // ears
    P.fix.push(part(S(0.052, 12, 10), 0xffffff, h(s * 0.075, 0.06, -0.165), [0, 0, 0], [1, 1.1, 0.6]));   // eye whites
    if (!(o.patch && s > 0)) {
      P.fix.push(part(S(0.031, 10, 8), eyeC, h(s * 0.072, 0.055, -0.195), [0, 0, 0], [1, 1, 0.5]));   // iris
      P.fix.push(part(S(0.017, 8, 6), 0x101010, h(s * 0.072, 0.055, -0.205), [0, 0, 0], [1, 1, 0.5]));
      P.fix.push(part(S(0.008, 6, 4), 0xffffff, h(s * 0.064, 0.066, -0.212)));                  // the shine in the eye
    }
    P.hair.push(part(B(0.085, 0.022, 0.03), W, h(s * 0.077, 0.125, -0.175), [0, 0, s * (o.angry ? 0.35 : -0.12)]));   // eyebrows
  }
  if (o.patch) { P.fix.push(part(C(0.055, 0.055, 0.02, 12), 0x14141a, h(0.075, 0.06, -0.19), [PI / 2, 0, 0])); P.fix.push(part(B(0.4, 0.018, 0.012), 0x14141a, h(0.0, 0.1, -0.17), [0, 0, -0.35])); }
  // mouths: a grin with teeth, a shouting open mouth with a tongue, and a surprised "O"
  P.smile.push(part(T(0.065, 0.014, 12, PI), 0x7a1a1a, h(0, -0.085, -0.18), [0, 0, PI]));
  P.smile.push(part(B(0.08, 0.02, 0.01), 0xffffff, h(0, -0.088, -0.184)));
  if (o.goldTooth) P.smile.push(part(B(0.018, 0.02, 0.012), 0xffc21a, h(0.02, -0.088, -0.188)));
  P.open.push(part(S(0.055, 12, 8), 0x5a0a10, h(0, -0.1, -0.165), [0, 0, 0], [1.1, 0.9, 0.5]));
  P.open.push(part(B(0.085, 0.018, 0.02), 0xffffff, h(0, -0.067, -0.185)));
  P.open.push(part(S(0.03, 8, 6), 0xe8505a, h(0, -0.125, -0.175), [0, 0, 0], [1.2, 0.6, 0.6]));
  P.oh.push(part(T(0.03, 0.012, 10), 0x5a0a10, h(0, -0.1, -0.19), [0, 0, 0], [1, 1.3, 1]));
  P.oh.push(part(C(0.03, 0.03, 0.01, 10), 0x3a0508, h(0, -0.1, -0.185), [PI / 2, 0, 0], [1, 1, 1.3]));
  // hair, beard, moustache
  if (o.hair !== 'none') P.hair.push(part(HS(0.208, 16, 8, 0.45), W, h(0, 0.03, 0.01), [-0.2, 0, 0]));
  for (const s of [-1, 1]) P.hair.push(part(B(0.035, 0.1, 0.06), W, h(s * 0.185, -0.02, -0.04)));
  if (o.beard === 'full') { P.hair.push(part(S(0.16, 14, 10), W, h(0, -0.15, -0.06), [0, 0, 0], [1.05, 1.1, 0.9])); P.hair.push(part(Cone(0.1, 0.22, 10), W, h(0, -0.3, -0.08), [PI, 0, 0])); }
  else if (o.beard === 'stubble') P.hair.push(part(S(0.15, 12, 8), W, h(0, -0.1, -0.045), [0, 0, 0], [1.04, 0.85, 0.95]));
  if (o.moustache) for (const s of [-1, 1]) P.hair.push(part(Cap(0.022, 0.08, 8), W, h(s * 0.05, -0.055, -0.19), [0, 0, s * (PI / 2 - 0.35)]));
  // ---- body ----
  P.skin.push(part(C(0.07, 0.08, 0.14, 10), W, [0, 1.25, 0]));                                      // neck
  const top = o.top || 'vest';
  if (top === 'vest') {   // a white puffy shirt under a coloured vest, a red sash
    P.fix.push(part(Cap(0.2 * bw, 0.22, 12), 0xf4efe4, [0, 0.97, 0], [0, 0, 0], [1.1, 1, 0.78]));
    P.tint.push(part(Cap(0.205 * bw, 0.2, 12), W, [0, 0.96, 0.005], [0, 0, 0], [1.1, 1, 0.8]));     // vest (only its sides show: the front is open)
    P.fix.push(part(B(0.12, 0.32, 0.05), 0xf4efe4, [0, 0.98, -0.155]));
    P.fix.push(part(C(0.215 * bw, 0.215 * bw, 0.09, 14), o.sash || 0xd8202a, [0, 0.78, 0], [0, 0, 0], [1.08, 1, 0.8]));
  } else {   // a long coat with gold buttons (captain, guards, admiral)
    P.fix.push(part(Cap(0.21 * bw, 0.22, 12), o.coat, [0, 0.97, 0], [0, 0, 0], [1.12, 1, 0.82]));
    P.fix.push(part(C(0.24 * bw, 0.3 * bw, 0.4, 14), o.coat, [0, 0.62, 0.01], [0, 0, 0], [1, 1, 0.8]));
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) P.fix.push(part(S(0.018, 8, 6), 0xffc21a, [s * 0.06, 1.08 - i * 0.1, -0.17]));
    P.fix.push(part(C(0.225 * bw, 0.225 * bw, 0.06, 14), o.belt || 0x3a2210, [0, 0.8, 0], [0, 0, 0], [1.08, 1, 0.84]));
    P.fix.push(part(B(0.08, 0.06, 0.02), 0xffc21a, [0, 0.8, -0.19]));
    if (o.crossbelt) for (const s of [-1, 1]) P.fix.push(part(B(0.045, 0.52, 0.015), 0xffffff, [s * 0.04, 0.97, -0.18], [0, 0, s * 0.6]));
    if (o.epaulettes) for (const s of [-1, 1]) { P.fix.push(part(C(0.09, 0.09, 0.03, 12), 0xffc21a, [s * 0.24, 1.17, 0])); for (let i = 0; i < 6; i++) P.fix.push(part(C(0.006, 0.006, 0.06, 4), 0xffc21a, [s * 0.24 + Math.cos(i) * 0.08, 1.13, Math.sin(i) * 0.08])); }
  }
  P.fix.push(part(C(0.17 * bw, 0.18 * bw, 0.12, 12), o.pants || 0x2a3a5a, [0, HIP_Y + 0.02, 0], [0, 0, 0], [1, 1, 0.8]));   // hips
  // ---- arms (from the shoulder pivot): sleeve, cuff, hand with a thumb; the right hand may hold something ----
  const sleeve = top === 'vest' ? 0xf4efe4 : o.coat;
  for (const [A, side] of [[P.armL, -1], [P.armR, 1]]) {
    A.fix.push(part(Cap(0.06, 0.2, 10), sleeve, [0, -0.13, 0])); A.fix.push(part(Cap(0.052, 0.18, 10), sleeve, [0, -0.33, -0.02]));
    A.fix.push(part(C(0.06, 0.06, 0.05, 10), top === 'vest' ? 0xf4efe4 : 0xffffff, [0, -0.44, -0.02]));
    A.skin.push(part(S(0.058, 10, 8), W, [0, -0.5, -0.03], [0, 0, 0], [0.9, 1, 1.1]));
    A.skin.push(part(Cap(0.018, 0.04, 6), W, [side * -0.045, -0.48, -0.06], [0.4, 0, side * 0.5]));
    const held = side > 0 ? o.right : o.left;
    if (held === 'cutlass') { A.fix.push(part(B(0.035, 0.5, 0.012), 0xe8eef6, [0, -0.5, -0.32], [PI / 2 - 0.3, 0, 0])); A.fix.push(part(T(0.05, 0.012, 10, PI), 0xffc21a, [0, -0.5, -0.08], [0, PI / 2, 0])); }
    else if (held === 'musket') { A.fix.push(part(C(0.022, 0.028, 1.0, 6), 0x5a3a1a, [0, -0.15, -0.05], [0.25, 0, 0])); A.fix.push(part(Cone(0.016, 0.16, 4), 0xd8dde6, [0, 0.43, -0.2], [0.25, 0, 0])); }
    else if (held === 'telescope') { A.fix.push(part(C(0.028, 0.04, 0.42, 10), 0xffc21a, [0, -0.5, -0.2], [PI / 2, 0, 0])); }
    else if (held === 'hook') { A.fix.push(part(T(0.04, 0.01, 10, PI * 1.4), 0xd8dde6, [0, -0.58, -0.03])); }
  }
  // ---- leg (from the hip pivot): trousers, a boot with a turned-down top ----
  P.leg.push(part(Cap(0.075, 0.28, 10), o.pants || 0x2a3a5a, [0, -0.2, 0])); P.leg.push(part(Cap(0.07, 0.16, 10), o.boots || 0x2a1a10, [0, -0.5, 0]));
  P.leg.push(part(C(0.085, 0.08, 0.06, 10), o.bootTop || 0x3a2416, [0, -0.38, 0]));
  P.leg.push(part(S(0.08, 10, 8), o.boots || 0x2a1a10, [0, -0.66, -0.05], [0, 0, 0], [0.9, 0.6, 1.5]));
  // ---- hats ----
  const hat = o.hat;
  if (hat === 'bandana') { P.fix.push(part(HS(0.215, 16, 8, 0.42), o.bandana || 0xd8202a, h(0, 0.035, 0.0), [-0.15, 0, 0])); P.fix.push(part(Cone(0.04, 0.16, 6), o.bandana || 0xd8202a, h(0.04, 0.0, 0.22), [2.0, 0, 0.4])); }
  else if (hat === 'tricorn') { P.fix.push(part(C(0.36, 0.36, 0.05, 3), 0x1a1a22, h(0, 0.2, 0), [0, PI, 0])); P.fix.push(part(C(0.19, 0.22, 0.16, 14), 0x1a1a22, h(0, 0.27, 0))); P.fix.push(part(T(0.33, 0.012, 3), 0xffc21a, h(0, 0.225, 0), [PI / 2, 0, PI / 6])); P.fix.push(part(S(0.045, 8, 6), 0xffffff, h(0, 0.28, -0.2))); }
  else if (hat === 'shako') { P.fix.push(part(C(0.2, 0.18, 0.3, 14), 0x14141a, h(0, 0.27, 0))); P.fix.push(part(B(0.12, 0.08, 0.02), 0xffc21a, h(0, 0.25, -0.19))); P.fix.push(part(B(0.2, 0.03, 0.12), 0x14141a, h(0, 0.13, -0.15))); P.fix.push(part(S(0.05, 8, 6), 0xd8202a, h(0, 0.45, -0.05))); }
  else if (hat === 'bicorne') { const b = part(C(0.34, 0.34, 0.1, 3), 0x14141a, h(0, 0.26, 0), [0, PI / 2, 0], [2.1, 1, 0.55]); P.fix.push(b); P.fix.push(part(B(0.5, 0.025, 0.02), 0xffc21a, h(0, 0.22, -0.1))); P.fix.push(part(S(0.05, 8, 6), 0xd8202a, h(0, 0.33, -0.09))); }
  if (o.wig) for (let i = 0; i < 4; i++) for (const s of [-1, 1]) P.hair.push(part(Cap(0.05, 0.05, 8), W, h(s * 0.2, 0.06 - i * 0.075, 0.03), [0, 0, PI / 2]));
  return P;
}
const mergeAll = A => merge(A);

// ---------------- the crew (instanced) ----------------
export const VESTS = [0xd8202a, 0x2f6ad8, 0x2a8a3a, 0x8a4ad8, 0xff8a1a, 0x1a1a22, 0xc8a020, 0x0a8a8a];
export const SKINS = [0xf2c49a, 0xe8b07a, 0xc88a5a, 0x9a6038, 0x6a4024, 0xf8d8bc];
export const HAIRS = [0x2a1a10, 0x5a3418, 0x1a1a1a, 0xc87a2a, 0xe0c070, 0x8a8a8a];
export const HATS = {
  none: { name: 'Red Bandanas', price: 0, icon: '🏴‍☠️' },
  tricorn: { name: 'Tricorn Hats', price: 800, icon: '🎩' },
  straw: { name: 'Straw Hats', price: 1200, icon: '👒' },
  party: { name: 'Party Hats', price: 600, icon: '🥳' },
  crown: { name: 'Golden Crowns', price: 3000, icon: '👑' },
  skull: { name: 'Skull Caps', price: 2000, icon: '💀' },
};
function hatGeo(k) {
  const P = [], y = HEAD_Y + 0.2;
  if (k === 'tricorn') { P.push(part(C(0.34, 0.34, 0.05, 3), 0x1a1a22, [0, y, 0], [0, PI, 0])); P.push(part(C(0.18, 0.21, 0.15, 12), 0x1a1a22, [0, y + 0.07, 0])); }
  else if (k === 'straw') { P.push(part(C(0.38, 0.38, 0.025, 16), 0xf0d080, [0, y - 0.02, 0])); P.push(part(C(0.18, 0.21, 0.14, 14), 0xf0d080, [0, y + 0.05, 0])); P.push(part(C(0.215, 0.215, 0.04, 14), 0xd8202a, [0, y + 0.0, 0])); }
  else if (k === 'party') { P.push(part(Cone(0.13, 0.32, 12), 0xff4fa8, [0, y + 0.12, 0])); P.push(part(S(0.045, 8, 6), 0xffd23f, [0, y + 0.3, 0])); }
  else if (k === 'crown') { P.push(part(C(0.15, 0.17, 0.1, 12), 0xffc21a, [0, y + 0.02, 0])); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; P.push(part(Cone(0.035, 0.1, 4), 0xffc21a, [Math.cos(a) * 0.14, y + 0.11, Math.sin(a) * 0.14])); } }
  else if (k === 'skull') { P.push(part(HS(0.222, 16, 8, 0.44), 0x1a1a22, [0, HEAD_Y + 0.03, 0], [-0.15, 0, 0])); P.push(part(S(0.05, 8, 6), 0xffffff, [0, HEAD_Y + 0.2, -0.17])); }
  return P.length ? merge(P) : null;
}

class Crowd {
  constructor(scene, cap, P, opts = {}) {
    const mat = (r = 0.65) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r });
    const mk = (geo, m) => { if (!geo) return null; const x = new THREE.InstancedMesh(geo, m, cap); x.castShadow = true; x.frustumCulled = false; x.count = 0; scene.add(x); return x; };
    this.m = {
      tint: mk(mergeAll(P.tint), mat()), skin: mk(mergeAll(P.skin), mat(0.55)), hair: mk(mergeAll(P.hair), mat(0.9)), fix: mk(mergeAll(P.fix), mat(0.5)),
      smile: mk(mergeAll(P.smile), mat()), open: mk(mergeAll(P.open), mat()), oh: mk(mergeAll(P.oh), mat()),
      armLf: mk(mergeAll(P.armL.fix), mat()), armLs: mk(mergeAll(P.armL.skin), mat(0.55)), armRf: mk(mergeAll(P.armR.fix), mat(0.4)), armRs: mk(mergeAll(P.armR.skin), mat(0.55)),
      legL: mk(mergeAll(P.leg), mat()), legR: mk(mergeAll(P.leg), mat()),
    };
    this.scene = scene; this.cap = cap; this.hat = null; this.opts = opts;
    this.M = new THREE.Matrix4(); this.L = new THREE.Matrix4(); this.R = new THREE.Matrix4(); this.Z = new THREE.Matrix4().makeScale(0, 0, 0); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(); this.c = new THREE.Color();
  }
  setHat(k) { if (this.hat) { this.scene.remove(this.hat); this.hat = null; } const g = hatGeo(k); if (!g) return; this.hat = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: k === 'crown' ? 0.6 : 0 }), this.cap); this.hat.castShadow = true; this.hat.frustumCulled = false; this.hat.count = 0; this.scene.add(this.hat); }
  // list: [{x, y, z, ry, rx, rz, s, vest, skin, hair, run, cheer, face: 'smile'|'open'|'oh'}]
  draw(list) {
    const n = Math.min(list.length, this.cap), { M, L, R, Z, q, e, p, s, c } = this, m = this.m;
    for (let i = 0; i < n; i++) {
      const o = list[i]; e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); M.compose(p.set(o.x, o.y, o.z), q, s.setScalar(o.s ?? 1));
      for (const k of ['tint', 'skin', 'hair', 'fix']) if (m[k]) m[k].setMatrixAt(i, M);
      if (this.hat) this.hat.setMatrixAt(i, M);
      const face = o.face || 'smile';
      for (const k of ['smile', 'open', 'oh']) if (m[k]) m[k].setMatrixAt(i, k === face ? M : Z);
      if (m.tint) m.tint.setColorAt(i, c.set(o.vest ?? 0xd8202a));
      m.skin.setColorAt(i, c.set(o.skin ?? 0xf2c49a)); m.armLs.setColorAt(i, c); m.armRs.setColorAt(i, c);
      if (m.hair) m.hair.setColorAt(i, c.set(o.hair ?? 0x2a1a10));
      const sw = o.run === undefined ? 0 : Math.sin(o.run), up = o.cheer ? 2.7 + Math.sin((o.run || 0) * 2) * 0.3 : 0;
      for (const [keys, x, y, a] of [[['armLf', 'armLs'], -0.235, SH_Y, up ? -up : sw * 1.0], [['armRf', 'armRs'], 0.235, SH_Y, up ? -up : o.attack ? -2.2 : -sw * 1.0 - 0.25], [['legL'], -0.1, HIP_Y, -sw * 0.9], [['legR'], 0.1, HIP_Y, sw * 0.9]]) {
        L.makeRotationX(a); L.setPosition(x, y, 0); R.multiplyMatrices(M, L); for (const k of keys) m[k].setMatrixAt(i, R);
      }
    }
    for (const x of [...Object.values(m), this.hat]) if (x) { x.count = n; x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; }
  }
}
export class CrewMesh extends Crowd { constructor(scene, cap = 320) { DET = 0.5; const P = build({ hat: 'bandana', beard: 'stubble', moustache: true, right: 'cutlass', pants: 0x3a3a52, eyes: 0x5a3a1a }); DET = 1; super(scene, cap, P); } }
export class GuardMesh extends Crowd {
  constructor(scene, cap = 200) { DET = 0.5; const P = build({ top: 'coat', coat: 0x1f3f9a, crossbelt: true, hat: 'shako', moustache: true, right: 'musket', pants: 0xf4f4f4, boots: 0x14141a, bootTop: 0x14141a, angry: true, eyes: 0x3a6ab8 }); DET = 1; super(scene, cap, P); }
}

// ---------------- named characters: built as real groups so the head, brows, mouth, eyelids and arms move ----------------
function figure(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const head = new THREE.Group(); head.position.y = HEAD_Y; body.add(head);
  // build once with the head moved far below, so head parts and body parts can be told apart by height
  const P = build({ ...o, headOffset: [0, -HEAD_Y - 10, 0] }), P2 = P;
  const mat = (c, r = 0.6) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r, color: c ?? 0xffffff });
  const add = (geo, m, parent) => { if (!geo) return null; const x = new THREE.Mesh(geo, m); x.castShadow = true; parent.add(x); return x; };
  const yc = gg => { gg.computeBoundingBox(); return (gg.boundingBox.min.y + gg.boundingBox.max.y) / 2; };
  // sort every part into head or body BEFORE moving the head parts back up
  const sorted = new Map(); for (const k of ['skin', 'hair', 'fix', 'tint']) sorted.set(k, { head: P[k].filter(gg => yc(gg) < -5), body: P[k].filter(gg => yc(gg) >= -5) });
  sorted.forEach(v => v.head.forEach(gg => gg.translate(0, 10, 0)));
  const split = (list, isHead) => { for (const [k, v] of sorted) if (P[k] === list) return isHead ? v.head : v.body; return []; };
  add(merge(split(P.skin, true)), mat(o.skin), head); add(merge(split(P.hair, true)), mat(o.hairC, 0.9), head); add(merge(split(P.fix, true)), mat(), head);
  add(merge(split(P.skin, false)), mat(o.skin), body); add(merge(split(P.hair, false)), mat(o.hairC, 0.9), body); add(merge(split(P.fix, false)), mat(), body); add(merge(split(P.tint, false)), mat(o.vest), body);
  [P.smile, P.open, P.oh].forEach(L => L.forEach(gg => gg.translate(0, 10, 0)));
  const mouths = { smile: add(merge(P.smile), mat(), head), open: add(merge(P.open), mat(), head), oh: add(merge(P.oh), mat(), head) };
  // eyelids for blinking and a few separate brows for expressions
  const lids = [-1, 1].map(s => { const l = new THREE.Mesh(HS(0.056, 12, 6, 0.5), new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.6 })); l.position.set(s * 0.075, 0.062, -0.165); l.scale.set(1.08, 1.2, 0.66); l.rotation.x = -PI / 2; l.visible = false; head.add(l); return l; });
  const arms = [P2.armL, P2.armR].map((A, i) => { const a = new THREE.Group(); const ax = 0.235 * (o.bulk || 1) + 0.04 * ((o.bulk || 1) - 1) * 4; a.position.set(i ? ax : -ax, SH_Y, 0); body.add(a); add(merge(A.fix), mat(), a); add(merge(A.skin), mat(o.skin), a); return a; });
  const legs = [-1, 1].map(s => { const l = new THREE.Group(); l.position.set(s * 0.1, HIP_Y, 0); body.add(l); add(merge(P2.leg), mat(), l); return l; });
  g.userData = { body, head, arms, legs, mouths, lids, blinkT: 2, face: 'smile' };
  setFace(g, 'smile');
  return g;
}
export function setFace(g, f) { const U = g.userData; U.face = f; for (const k in U.mouths) if (U.mouths[k]) U.mouths[k].visible = k === f; }
// blink now and then; call every frame
export function animateFace(g, dt) { const U = g.userData; U.blinkT -= dt; const k = U.blinkT < 0.12 && U.blinkT > 0; U.lids.forEach(l => { l.visible = k; }); if (U.blinkT <= 0) U.blinkT = 2 + Math.random() * 3; }

// Captain Goldtooth: the hero
export function captain() {
  const g = figure({ top: 'coat', coat: 0xb01a24, hat: 'tricorn', beard: 'full', moustache: true, patch: true, goldTooth: true, right: 'cutlass', left: 'hook', skin: 0xf2c49a, hairC: 0x8a2a10, pants: 0x2a2a34, belt: 0x3a2210, eyes: 0x2a6a3a, bulk: 1.15 });
  // Biscuit the parrot on his shoulder
  const par = new THREE.Group(); par.position.set(0.28, 1.32, 0.03); g.userData.body.add(par);
  const pm = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
  const body = new THREE.Mesh(S(0.07, 12, 10), pm(0x2fbf3a)); body.scale.set(0.9, 1.3, 0.9); par.add(body);
  const ph = new THREE.Mesh(S(0.05, 12, 10), pm(0x2fbf3a)); ph.position.set(0, 0.1, -0.02); par.add(ph);
  const beak = new THREE.Mesh(Cone(0.022, 0.06, 8), pm(0xffc21a)); beak.position.set(0, 0.09, -0.07); beak.rotation.x = -PI / 2; par.add(beak);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(S(0.012, 6, 4), pm(0x111111)); e.position.set(s * 0.03, 0.115, -0.04); par.add(e); }
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(S(0.05, 10, 8), pm(0x1a8ad8)); w.scale.set(0.3, 1, 0.8); w.position.set(s * 0.06, 0, 0.01); par.add(w); return w; });
  const tail = new THREE.Mesh(B(0.03, 0.13, 0.06), pm(0xe8303f)); tail.position.set(0, -0.12, 0.05); tail.rotation.x = 0.4; par.add(tail);
  g.userData.parrot = { par, wings };
  g.scale.setScalar(1.25); g.traverse(q => { if (q.isMesh) q.castShadow = true; });
  return g;
}
// Admiral Snootington: the villain (white curly wig, huge bicorne, gold epaulettes, a big moustache, a telescope)
export function admiral() {
  const g = figure({ top: 'coat', coat: 0x1a3a8a, hat: 'bicorne', wig: true, hair: 'none', moustache: true, angry: true, epaulettes: true, right: 'telescope', skin: 0xf8d4c0, hairC: 0xf4f4f4, pants: 0xf4f4f4, boots: 0x14141a, bootTop: 0x14141a, eyes: 0x6a8ab8, bulk: 1.3 });
  // a big red nose
  const nose = new THREE.Mesh(S(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8706a, roughness: 0.5 })); nose.position.set(0, -0.01, -0.21); g.userData.head.add(nose);
  g.scale.setScalar(2.1); g.traverse(q => { if (q.isMesh) q.castShadow = true; });
  setFace(g, 'open');
  return g;
}
