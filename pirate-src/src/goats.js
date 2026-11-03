// GOAT RUSH characters: the goats (a whole herd, drawn with instancing), Billy the leader goat, the wolves,
// and the Wolf King. Faceted low-poly shapes with big googly eyes; the coat colour is set per goat.
import * as THREE from 'three';
import { flat, mesh } from './world.js';

const PI = Math.PI;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
// merge geometries, each with its own colour (vertex colours)
function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(new THREE.Matrix4().compose(v(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), v(...scl)));
  const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g;
}
function merge(list) {
  let n = 0; list.forEach(g => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.computeVertexNormals(); return m;
}
const Ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d), Cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s), Cyl = (a, b, h, s = 6) => new THREE.CylinderGeometry(a, b, h, s), Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);

// ---- a goat, facing -z (the way the herd runs), ~0.9 m tall. Two parts: the coat (tinted per goat) and details.
function goatParts() {
  const W = 0xffffff, coat = [], det = [];
  coat.push(part(Ico(0.42, 1), W, [0, 0.62, 0], [0, 0, 0], [0.85, 0.78, 1.25]));            // body
  coat.push(part(Ico(0.2, 1), W, [0, 0.98, -0.42], [0, 0, 0], [0.9, 1, 1.1]));              // head
  coat.push(part(Ico(0.13, 1), W, [0, 0.9, -0.6], [0, 0, 0], [0.85, 0.8, 1.2]));            // snout
  coat.push(part(Cyl(0.08, 0.1, 0.25), W, [0, 0.82, -0.33], [0.5, 0, 0]));                  // neck
  for (const s of [-1, 1]) coat.push(part(Ico(0.08, 0), W, [s * 0.2, 1.0, -0.4], [0, 0, s * 0.6], [1.6, 0.6, 0.9]));   // ears
  coat.push(part(Cone(0.08, 0.22), W, [0, 0.72, 0.56], [-2.2, 0, 0]));                      // tail
  for (const [x, z] of [[-0.18, -0.28], [0.18, -0.28], [-0.18, 0.3], [0.18, 0.3]]) coat.push(part(Cyl(0.06, 0.05, 0.42), W, [x, 0.25, z]));   // legs
  // details (not tinted): googly eyes, horns, beard, hooves, nose, a bell
  for (const s of [-1, 1]) {
    det.push(part(Sph(0.085), 0xffffff, [s * 0.11, 1.05, -0.57], [0, 0, 0], [1, 1, 0.7]));
    det.push(part(Sph(0.045, 8, 6), 0x111111, [s * 0.12, 1.04, -0.635]));
    det.push(part(Cone(0.045, 0.32, 5), 0xd8c8a0, [s * 0.09, 1.25, -0.36], [0.6, 0, s * 0.25]));
  }
  det.push(part(Cone(0.06, 0.2, 5), 0xe8e0d0, [0, 0.72, -0.62], [PI, 0, 0]));                 // beard
  det.push(part(Ico(0.035, 0), 0x3a2a2a, [0, 0.93, -0.72]));                                  // nose
  for (const [x, z] of [[-0.18, -0.28], [0.18, -0.28], [-0.18, 0.3], [0.18, 0.3]]) det.push(part(Cyl(0.065, 0.065, 0.07), 0x3a2a1a, [x, 0.035, z]));
  det.push(part(Cyl(0.06, 0.08, 0.1, 8), 0xffc21a, [0, 0.72, -0.48]));                        // a little bell
  return [merge(coat), merge(det)];
}
export const COATS = [0xffffff, 0xf4ecd8, 0xd8b890, 0x8a6a4a, 0x4a3a34, 0xe8e8e8, 0xc89a6a];
// hats the whole herd can wear (bought in the shop)
export const HATS = {
  none: { name: 'No hat', price: 0, icon: '🐐' },
  party: { name: 'Party Hats', price: 600, icon: '🥳' },
  viking: { name: 'Viking Helmets', price: 1500, icon: '⚔️' },
  crown: { name: 'Golden Crowns', price: 3000, icon: '👑' },
  flower: { name: 'Flower Crowns', price: 1000, icon: '🌸' },
  cowboy: { name: 'Cowboy Hats', price: 2200, icon: '🤠' },
};
function hatGeo(k) {
  const P = [];
  if (k === 'party') { P.push(part(Cone(0.12, 0.3, 8), 0xff4fa8, [0, 1.33, -0.42])); P.push(part(Ico(0.04, 0), 0xffd23f, [0, 1.5, -0.42])); }
  else if (k === 'viking') { P.push(part(new THREE.SphereGeometry(0.17, 10, 6, 0, PI * 2, 0, PI / 2), 0xa8b0bc, [0, 1.13, -0.42])); for (const s of [-1, 1]) P.push(part(Cone(0.05, 0.22, 6), 0xfff2d8, [s * 0.2, 1.25, -0.42], [0, 0, -s * 0.8])); }
  else if (k === 'crown') { P.push(part(Cyl(0.14, 0.15, 0.1, 8), 0xffc21a, [0, 1.2, -0.42])); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; P.push(part(Cone(0.035, 0.1, 4), 0xffc21a, [Math.cos(a) * 0.12, 1.29, -0.42 + Math.sin(a) * 0.12])); } }
  else if (k === 'flower') for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; P.push(part(Ico(0.05, 0), [0xff4f6a, 0xffd23f, 0xffffff, 0x8a6aff][i % 4], [Math.cos(a) * 0.15, 1.14, -0.42 + Math.sin(a) * 0.15])); }
  else if (k === 'cowboy') { P.push(part(Cyl(0.28, 0.28, 0.03, 12), 0x8a5a2a, [0, 1.13, -0.42])); P.push(part(Cyl(0.13, 0.15, 0.18, 10), 0x8a5a2a, [0, 1.22, -0.42])); }
  return P.length ? merge(P) : null;
}

// ---- the herd renderer: up to CAP goats, each with a coat colour, all drawn in 2–3 draw calls ----
export class HerdMesh {
  constructor(scene, cap = 220) {
    const [coat, det] = goatParts();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 });
    this.coat = new THREE.InstancedMesh(coat, mat, cap); this.det = new THREE.InstancedMesh(det, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 }), cap);
    for (const m of [this.coat, this.det]) { m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
    this.scene = scene; this.cap = cap; this.hat = null; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(1, 1, 1); this._p = new THREE.Vector3();
  }
  setHat(k) {
    if (this.hat) { this.scene.remove(this.hat); this.hat = null; }
    const g = hatGeo(k); if (!g) return;
    this.hat = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.4, metalness: k === 'crown' ? 0.6 : 0 }), this.cap); this.hat.castShadow = true; this.hat.frustumCulled = false; this.hat.count = 0; this.scene.add(this.hat);
  }
  // list: [{x, y, z, ry, rx, rz, s, coat}]
  draw(list) {
    const n = Math.min(list.length, this.cap); const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const q = list[i]; this._e.set(q.rx || 0, q.ry || 0, q.rz || 0); this._q.setFromEuler(this._e); this._s.setScalar(q.s ?? 1);
      this._m.compose(this._p.set(q.x, q.y, q.z), this._q, this._s);
      this.coat.setMatrixAt(i, this._m); this.det.setMatrixAt(i, this._m); if (this.hat) this.hat.setMatrixAt(i, this._m);
      this.coat.setColorAt(i, c.set(q.coat));
    }
    for (const m of [this.coat, this.det, this.hat]) if (m) { m.count = n; m.instanceMatrix.needsUpdate = true; }
    if (this.coat.instanceColor) this.coat.instanceColor.needsUpdate = true;
  }
}

// ---- Billy, the leader goat: bigger, with a red bandana and a proud grin ----
export function billy() {
  const [coat, det] = goatParts(), o = new THREE.Group();
  const c = new THREE.Mesh(coat, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, color: 0xffffff }));
  const d = new THREE.Mesh(det, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 }));
  o.add(c, d);
  mesh(new THREE.TorusGeometry(0.13, 0.045, 5, 10), flat(0xe8202a), 0, 0.82, -0.36, o).rotation.x = PI / 2.6;
  mesh(new THREE.ConeGeometry(0.08, 0.2, 4), flat(0xe8202a), 0, 0.72, -0.28, o).rotation.x = -0.4;
  o.scale.setScalar(1.35); o.traverse(q => { if (q.isMesh) q.castShadow = true; });
  return o;
}

// ---- a wolf: grey, pointy ears, a big toothy grin, sitting up ----
function wolfParts() {
  const G = 0x8a8f9a, L = 0xd8dce4, P = [];
  P.push(part(Ico(0.4, 1), G, [0, 0.65, 0.05], [0, 0, 0], [0.85, 1.05, 1.0]));
  P.push(part(Ico(0.3, 1), G, [0, 1.25, -0.1], [0, 0, 0], [1, 0.95, 0.95]));
  P.push(part(Ico(0.17, 1), L, [0, 1.15, -0.38], [0, 0, 0], [0.9, 0.7, 1.3]));
  P.push(part(Ico(0.25, 1), L, [0, 0.7, -0.22], [0, 0, 0], [0.8, 1.1, 0.5]));
  for (const s of [-1, 1]) {
    P.push(part(Cone(0.11, 0.28, 4), G, [s * 0.17, 1.55, -0.08], [0, 0, s * 0.25]));
    P.push(part(Sph(0.07), 0xffffff, [s * 0.11, 1.32, -0.33], [0, 0, 0], [1, 0.8, 0.6]));
    P.push(part(Sph(0.035, 6, 4), 0xd82a2a, [s * 0.11, 1.31, -0.375]));
    P.push(part(Box(0.1, 0.025, 0.03), 0x2a2a2a, [s * 0.11, 1.41, -0.34], [0, 0, -s * 0.4]));   // angry brows
    P.push(part(Cyl(0.07, 0.06, 0.55), G, [s * 0.16, 0.28, -0.18]));
    P.push(part(Ico(0.15, 0), G, [s * 0.22, 0.25, 0.22], [0, 0, 0], [0.8, 1, 1.4]));
  }
  P.push(part(Ico(0.05, 0), 0x111111, [0, 1.2, -0.56]));
  P.push(part(Box(0.22, 0.05, 0.05), 0x5a1010, [0, 1.06, -0.48]));
  for (let i = 0; i < 4; i++) P.push(part(Cone(0.018, 0.05, 3), 0xffffff, [-0.075 + i * 0.05, 1.08, -0.5], [PI, 0, 0]));
  P.push(part(Cone(0.12, 0.6, 5), G, [0, 0.45, 0.48], [-2.0, 0, 0]));
  return merge(P);
}
export class WolfMesh {
  constructor(scene, cap = 160) { this.m = new THREE.InstancedMesh(wolfParts(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }), cap); this.m.castShadow = true; this.m.frustumCulled = false; this.m.count = 0; scene.add(this.m); this.cap = cap; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); }
  draw(list) { const n = Math.min(list.length, this.cap); for (let i = 0; i < n; i++) { const q = list[i]; this._e.set(q.rx || 0, q.ry || 0, q.rz || 0); this._q.setFromEuler(this._e); this._m.compose(this._p.set(q.x, q.y, q.z), this._q, this._s.setScalar(q.s ?? 1)); this.m.setMatrixAt(i, this._m); } this.m.count = n; this.m.instanceMatrix.needsUpdate = true; }
}
// the Wolf King: a big wolf with a crown and a red cape, who lives in the castle
export function wolfKing() {
  const o = new THREE.Group(); const b = new THREE.Mesh(wolfParts(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 })); o.add(b);
  mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 8), flat(0xffc21a, { metalness: 0.6, roughness: 0.3 }), 0, 1.6, -0.1, o);
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; mesh(new THREE.ConeGeometry(0.05, 0.14, 4), flat(0xffc21a, { metalness: 0.6, roughness: 0.3 }), Math.cos(a) * 0.17, 1.72, -0.1 + Math.sin(a) * 0.17, o); }
  mesh(new THREE.BoxGeometry(0.8, 0.9, 0.05), flat(0xc8202a), 0, 0.85, 0.42, o).rotation.x = 0.15;
  o.scale.setScalar(2.2); o.traverse(q => { if (q.isMesh) q.castShadow = true; }); return o;
}
