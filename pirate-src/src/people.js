// The people of the game: real animated humans (CC0 characters by Quaternius), baked by tools/bake.mjs into key
// poses. A crowd draws hundreds of them with instancing: every pose of every animation is its own instanced mesh,
// and each person is put into the mesh of the pose he is in right now. Each one gets his own clothes, skin and hair
// colour. Heroes (the captain, the villain) are single meshes whose poses blend smoothly.
import * as THREE from 'three';

const PI = Math.PI;
export function loadPeople(buf) {
  const dv = new DataView(buf), hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl))), base = (8 + hl + 3) & ~3, out = {};
  for (const h of head.chars) out[h.id] = new Person(h, buf, base);
  return out;
}

class Person {
  constructor(h, buf, base) {
    Object.assign(this, h);
    const [oi, oc, om, oq] = h.o.map(o => base + o), N = h.N;
    this.index = new Uint16Array(buf, oi, h.ni); this.color = new Uint8Array(buf, oc, N * 3); this.mask = new Uint8Array(buf, om, N);
    const nf = Object.values(h.clips).reduce((a, c) => Math.max(a, c.s + c.f), 0);
    this.q = new Int16Array(buf, oq, nf * N * 3); this.nf = nf; this.cache = [];
    this.indexAttr = new THREE.BufferAttribute(this.index, 1);
    this.colorAttr = new THREE.BufferAttribute(this.color, 3, true);
    this.maskAttr = new THREE.BufferAttribute(new Float32Array(this.mask), 1);
  }
  positions(f) {
    if (this.cache[f]) return this.cache[f];
    const N = this.N, q = this.q, o = f * N * 3, out = new Float32Array(N * 3), mn = this.min, d = [0, 1, 2].map(k => (this.max[k] - mn[k]) / 65535);
    for (let i = 0; i < N * 3; i++) { const k = i % 3; out[i] = mn[k] + (q[o + i] + 32768) * d[k]; }
    return (this.cache[f] = out);
  }
  frame(clip, t) {   // which key pose (and blend to the next one) a clip is at after t seconds
    const c = this.clips[clip] || this.clips.idle || Object.values(this.clips)[0], k = Math.max(0, t) / c.dur * c.f;
    if (c.loop) { const a = Math.floor(k) % c.f; return [c.s + a, c.s + (a + 1) % c.f, k - Math.floor(k)]; }
    const a = Math.min(c.f - 1, Math.floor(k)); return [c.s + a, c.s + Math.min(c.f - 1, a + 1), a >= c.f - 1 ? 0 : k - a];
  }
  geometry(f) {
    const g = new THREE.BufferGeometry(); g.setIndex(this.indexAttr);
    g.setAttribute('position', new THREE.BufferAttribute(this.positions(f), 3)); g.setAttribute('color', this.colorAttr); g.setAttribute('mask', this.maskAttr);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3); return g;
  }
}

// one material for all crowds: vertex colours, flat facets, and per-person clothes / skin / hair colours
function crowdMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.0 });
  m.onBeforeCompile = sh => {
    THREE.Material.prototype.onBeforeCompile.call(m, sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float mask; attribute vec3 iTint; attribute vec3 iSkin; attribute vec3 iHair;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvColor.rgb *= mask < 0.5 ? vec3(1.0) : mask < 1.5 ? iTint : mask < 2.5 ? iSkin : iHair;');
  };
  m.customProgramCacheKey = () => 'crowd' + THREE.Material.prototype.customProgramCacheKey.call(m);
  return m;
}
let CM = null;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// a crowd of one kind of person. draw(list) every frame with {x, y, z, ry, rx, rz, s, clip, t, tint, skin, hair}
export class Crowd {
  constructor(scene, person, o = {}) {
    this.scene = scene; this.p = person; this.buckets = new Map(); this.o = o; CM = CM || crowdMaterial();
    this.used = [];
  }
  bucket(f) {
    let b = this.buckets.get(f);
    if (!b) { b = { f, mesh: null, cap: 0, n: 0 }; this.buckets.set(f, b); }
    return b;
  }
  grow(b, need) {
    let cap = Math.max(8, b.cap); while (cap < need) cap *= 2;
    if (b.mesh) { this.scene.remove(b.mesh); b.mesh.dispose(); }
    const g = this.p.geometry(b.f);
    for (const k of ['iTint', 'iSkin', 'iHair']) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3));
    b.mesh = new THREE.InstancedMesh(g, CM, cap); b.mesh.frustumCulled = false; b.mesh.castShadow = !!this.o.shadow; b.mesh.count = 0;
    this.scene.add(b.mesh); b.cap = cap;
  }
  draw(list) {
    for (const b of this.used) b.n = 0;
    const used = new Set();
    for (const q of list) {
      if (q.s !== undefined && q.s <= 0.01) continue;
      const [f] = this.p.frame(q.clip || 'run', q.t || 0), b = this.bucket(f);
      if (!b.mesh || b.n >= b.cap) { const old = b.mesh, n = b.n; const keep = old ? { m: old.instanceMatrix.array.slice(0, n * 16), a: ['iTint', 'iSkin', 'iHair'].map(k => old.geometry.attributes[k].array.slice(0, n * 3)) } : null; this.grow(b, n + 1); if (keep) { b.mesh.instanceMatrix.array.set(keep.m); ['iTint', 'iSkin', 'iHair'].forEach((k, i) => b.mesh.geometry.attributes[k].array.set(keep.a[i])); } }
      const i = b.n++; used.add(b);
      _e.set(q.rx || 0, q.ry || 0, q.rz || 0); _q.setFromEuler(_e); _p.set(q.x, q.y || 0, q.z); _s.setScalar(q.s ?? 1);
      b.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      const A = b.mesh.geometry.attributes;
      _c.set(q.tint ?? 0xffffff); A.iTint.setXYZ(i, _c.r, _c.g, _c.b);
      _c.set(q.skin ?? 0xffffff); A.iSkin.setXYZ(i, _c.r, _c.g, _c.b);
      _c.set(q.hair ?? 0xffffff); A.iHair.setXYZ(i, _c.r, _c.g, _c.b);
    }
    for (const b of this.buckets.values()) {
      if (!b.mesh) continue;
      b.mesh.count = b.n; b.mesh.visible = b.n > 0;
      if (b.n) { b.mesh.instanceMatrix.needsUpdate = true; for (const k of ['iTint', 'iSkin', 'iHair']) b.mesh.geometry.attributes[k].needsUpdate = true; }
    }
    this.used = [...used];
  }
  dispose() { for (const b of this.buckets.values()) if (b.mesh) { this.scene.remove(b.mesh); b.mesh.dispose(); } this.buckets.clear(); }
}

// a single, smoothly animated person (the heroes). pose(clip, t) every frame; colours are fixed when made.
export class Actor extends THREE.Mesh {
  constructor(person, cols = {}) {
    const g = new THREE.BufferGeometry(); g.setIndex(person.indexAttr);
    const N = person.N, pos = new Float32Array(N * 3), c = new Float32Array(N * 3);
    const T = [null, new THREE.Color(cols.tint ?? 0xffffff), new THREE.Color(cols.skin ?? 0xffffff), new THREE.Color(cols.hair ?? 0xffffff)];
    for (let i = 0; i < N; i++) { const m = person.mask[i], k = T[m]; for (let j = 0; j < 3; j++) c[i * 3 + j] = person.color[i * 3 + j] / 255 * (k ? [k.r, k.g, k.b][j] : 1); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3);
    super(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.65 }));
    this.person = person; this.frustumCulled = false; this.castShadow = true; this.clip = 'idle'; this.ct = 0; this.prev = null; this.mixT = 1;
    this.pose('idle', 0);
  }
  // play a clip (blending from the last pose over 0.15 s when the clip changes)
  play(clip, restart) { if (clip !== this.clip || restart) { this.prev = this.geometry.attributes.position.array.slice(); this.mixT = 0; this.clip = clip; this.ct = 0; } }
  update(dt, speed = 1) { this.ct += dt * speed; this.mixT += dt / 0.15; this.pose(this.clip, this.ct); }
  pose(clip, t) {
    const [a, b, k] = this.person.frame(clip, t), A = this.person.positions(a), B = this.person.positions(b), out = this.geometry.attributes.position.array;
    const s = k * k * (3 - 2 * k), pv = this.prev && this.mixT < 1 ? this.prev : null, m = pv ? this.mixT : 1;
    for (let i = 0; i < out.length; i++) { const v = A[i] + (B[i] - A[i]) * s; out[i] = pv ? pv[i] + (v - pv[i]) * m : v; }
    this.geometry.attributes.position.needsUpdate = true;
  }
  done() { const c = this.person.clips[this.clip]; return !c.loop && this.ct >= c.dur; }
}

// soft round shadows under a crowd (much cheaper than real shadows for hundreds of people)
export class Blobs {
  constructor(scene, tex, cap = 512) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI / 2);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), cap);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1; this.mesh.count = 0; scene.add(this.mesh); this.cap = cap;
  }
  draw(lists, r = 0.95) {
    let n = 0; const M = this.mesh;
    for (const list of lists) for (const q of list) { if (n >= this.cap) break; const s = (q.s ?? 1) * r * Math.max(0.4, 1 - (q.y || 0) * 0.25); if (s < 0.05) continue; _p.set(q.x, 0.06, q.z); _q.identity(); _s.set(s, 1, s); M.setMatrixAt(n++, _m.compose(_p, _q, _s)); }
    M.count = n; M.instanceMatrix.needsUpdate = true;
  }
}
