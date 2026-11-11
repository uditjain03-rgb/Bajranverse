// The people of the game: real animated humans (CC0 characters by Quaternius), baked by tools/bake.mjs into key
// poses. A crowd draws hundreds of them with instancing: every pose of every animation is its own instanced mesh,
// and each person is put into the mesh of the pose he is in right now. Each one gets his own clothes, skin and hair
// colour. Heroes (the captain, the villain) are single meshes whose poses blend smoothly.
import * as THREE from 'three';

const PI = Math.PI;
export async function loadPeople(buf) {
  const dv = new DataView(buf), hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl))), base = (8 + hl + 3) & ~3, out = {};
  for (const h of head.chars) out[h.id] = new Person(h, buf, base);
  await Promise.all(Object.values(out).map(p => p.loadTexture()));
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
    if (h.tex) { this.uvAttr = new THREE.BufferAttribute(new Uint16Array(buf, base + h.o[4], N * 2), 2, true); this.jpg = new Uint8Array(buf, base + h.o[5], h.jl); }
    this.auxAttr = new THREE.BufferAttribute(h.o[6] !== undefined ? new Float32Array(new Int8Array(buf, base + h.o[6], N)) : new Float32Array(N), 1);
  }
  // the person's texture sheet (outfit, skin, eyes, hair in one picture)
  async loadTexture() {
    if (!this.jpg) return;
    const blob = new Blob([this.jpg], { type: 'image/jpeg' }); let img;
    try { img = await createImageBitmap(blob, { imageOrientation: 'none' }); }
    catch (e) { img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(blob); }); }
    const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; t.generateMipmaps = true; t.needsUpdate = true; this.tex = t;
  }
  positions(f) {
    if (this.cache[f]) return this.cache[f];
    const N = this.N, q = this.q, o = f * N * 3, out = new Float32Array(N * 3), mn = this.min, d = [0, 1, 2].map(k => (this.max[k] - mn[k]) / 65535);
    for (let i = 0; i < N * 3; i++) { const k = i % 3; out[i] = mn[k] + (q[o + i] + 32768) * d[k]; }
    return (this.cache[f] = out);
  }
  normals(f) {   // smooth normals of a key pose (worked out once)
    this.ncache = this.ncache || [];
    if (this.ncache[f]) return this.ncache[f];
    const g = new THREE.BufferGeometry(); g.setIndex(this.indexAttr); g.setAttribute('position', new THREE.BufferAttribute(this.positions(f), 3)); g.computeVertexNormals();
    return (this.ncache[f] = g.attributes.normal.array);
  }
  frame(clip, t) {   // which key pose (and blend to the next one) a clip is at after t seconds
    const c = this.clips[clip] || this.clips.idle || Object.values(this.clips)[0], k = Math.max(0, t) / c.dur * c.f;
    if (c.loop) { const a = Math.floor(k) % c.f; return [c.s + a, c.s + (a + 1) % c.f, k - Math.floor(k)]; }
    const a = Math.min(c.f - 1, Math.floor(k)); return [c.s + a, c.s + Math.min(c.f - 1, a + 1), a >= c.f - 1 ? 0 : k - a];
  }
  geometry(f) {
    const g = new THREE.BufferGeometry(); g.setIndex(this.indexAttr);
    g.setAttribute('position', new THREE.BufferAttribute(this.positions(f), 3)); g.setAttribute('color', this.colorAttr); g.setAttribute('mask', this.maskAttr); g.setAttribute('aux', this.auxAttr); if (this.uvAttr) g.setAttribute('uv', this.uvAttr);
    g.setAttribute('normal', new THREE.BufferAttribute(this.normals(f), 3)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3); return g;
  }
}

// the people's material: their own texture, with clothes / skin / hair recoloured per person (from the texture's
// light and shade, so all the fabric and face detail stays). Crowds take the colours per instance, heroes as uniforms.
// Expressions (EXPR): the eyebrows move (raised, knitted, worried) and one of three mouths shows (smile, open, frown).
export const EXPR = { happy: 0, laugh: 1, angry: 2, scared: 3, sad: 4, calm: 5 };
function personMaterial(person, inst, cols = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: person.tex || null, roughness: 0.78, metalness: 0.0 });
  const U = { uTint: { value: new THREE.Color(cols.tint ?? 0xffffff) }, uSkin: { value: new THREE.Color(cols.skin ?? 0xffffff) }, uHair: { value: new THREE.Color(cols.hair ?? 0xffffff) }, uExpr: { value: cols.expr ?? 0 } };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    THREE.Material.prototype.onBeforeCompile.call(m, sh); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float mask; attribute float aux; varying vec3 vTintC; varying float vM;\n' + (inst ? 'attribute vec3 iTint; attribute vec3 iSkin; attribute vec3 iHair; attribute float iExpr;' : 'uniform vec3 uTint; uniform vec3 uSkin; uniform vec3 uHair; uniform float uExpr;'))
      .replace('#include <color_vertex>', '#include <color_vertex>\nvM = mask; vTintC = ' + (inst ? 'mask < 1.5 ? iTint : mask < 2.5 ? iSkin : iHair;' : 'mask < 1.5 ? uTint : mask < 2.5 ? uSkin : uHair;'))
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float ex = ${inst ? 'iExpr' : 'uExpr'};
          if (mask > 3.5 && mask < 4.5) {   // eyebrows
            float s = aux / 127.0, inner = 1.0 - min(1.0, abs(s));
            float up = (ex > 0.5 && ex < 1.5) ? 0.011 : 0.0, ang = (ex > 1.5 && ex < 2.5) ? 1.0 : 0.0, wor = (ex > 2.5 && ex < 4.5) ? 1.0 : 0.0, calm = ex > 4.5 ? 1.0 : 0.0;
            transformed.y += up + ang * (-0.013 * inner + 0.005 * (1.0 - inner)) + wor * (0.012 * inner - 0.002) - calm * 0.004;
          }
          if (mask > 4.5) {   // mouths: 5 smile, 6 open, 7 frown
            float want = ex < 0.5 ? 0.0 : ex < 1.5 ? 1.0 : ex < 2.5 ? 2.0 : ex < 3.5 ? 1.0 : ex < 4.5 ? 2.0 : 0.0;
            if (abs(mask - 5.0 - want) > 0.5) transformed -= normalize(objectNormal) * 0.03;
          } }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTintC; varying float vM;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (vM > 0.5 && vM < 4.5) { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = vTintC * (0.3 + l * 1.45); }');
  };
  m.customProgramCacheKey = () => (inst ? 'crowd3' : 'hero3') + THREE.Material.prototype.customProgramCacheKey.call(m);
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const lin = new Map();   // colour (hex) → linear rgb, worked out once
function rgb(hex) { let v = lin.get(hex); if (!v) { _c.set(hex); v = [_c.r, _c.g, _c.b]; lin.set(hex, v); } return v; }
// a crowd of one kind of person. draw(list) every frame with {x, y, z, ry, rx, rz, s, clip, t, tint, skin, hair}
export class Crowd {
  constructor(scene, person, o = {}) {
    this.scene = scene; this.p = person; this.buckets = new Map(); this.o = o; this.mat = personMaterial(person, true);
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
    g.setAttribute('iExpr', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
    b.mesh = new THREE.InstancedMesh(g, this.mat, cap); b.mesh.frustumCulled = false; b.mesh.castShadow = !!this.o.shadow; b.mesh.count = 0;
    this.scene.add(b.mesh); b.cap = cap;
  }
  // make every pose's mesh up front (while loading) so nothing is built in the middle of the game
  prewarm(cap = 16) { for (let f = 0; f < this.p.nf; f++) { const b = this.bucket(f); if (!b.mesh) this.grow(b, cap); b.mesh.visible = false; } }
  // show every pose once (far under the ground) so the phone uploads them all while loading, not mid-game
  gpuWarm(on) { for (const b of this.buckets.values()) if (b.mesh) { b.mesh.visible = on; b.mesh.count = on ? 1 : 0; if (on) { b.mesh.setMatrixAt(0, _m.makeTranslation(0, -500, 0)); b.mesh.instanceMatrix.needsUpdate = true; } } }
  draw(list) {
    for (const b of this.used) b.n = 0;
    const used = new Set();
    for (const q of list) {
      if (q.s !== undefined && q.s <= 0.01) continue;
      const [f] = this.p.frame(q.clip || 'run', q.t || 0), b = this.bucket(f);
      if (!b.mesh || b.n >= b.cap) { const old = b.mesh, n = b.n; const keep = old ? { m: old.instanceMatrix.array.slice(0, n * 16), a: ['iTint', 'iSkin', 'iHair'].map(k => old.geometry.attributes[k].array.slice(0, n * 3)), e: old.geometry.attributes.iExpr.array.slice(0, n) } : null; this.grow(b, n + 1); if (keep) { b.mesh.instanceMatrix.array.set(keep.m); ['iTint', 'iSkin', 'iHair'].forEach((k, i) => b.mesh.geometry.attributes[k].array.set(keep.a[i])); b.mesh.geometry.attributes.iExpr.array.set(keep.e); } }
      const i = b.n++; used.add(b);
      _e.set(q.rx || 0, q.ry || 0, q.rz || 0); _q.setFromEuler(_e); _p.set(q.x, q.y || 0, q.z); _s.setScalar(q.s ?? 1);
      b.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      const A = b.mesh.geometry.attributes;
      let c = rgb(q.tint ?? 0xffffff); A.iTint.setXYZ(i, c[0], c[1], c[2]);
      c = rgb(q.skin ?? 0xffffff); A.iSkin.setXYZ(i, c[0], c[1], c[2]);
      c = rgb(q.hair ?? 0xffffff); A.iHair.setXYZ(i, c[0], c[1], c[2]); A.iExpr.setX(i, q.expr || 0);
    }
    for (const b of this.buckets.values()) {
      if (!b.mesh) continue;
      b.mesh.count = b.n; b.mesh.visible = b.n > 0;
      if (b.n) { b.mesh.instanceMatrix.needsUpdate = true; for (const k of ['iTint', 'iSkin', 'iHair', 'iExpr']) b.mesh.geometry.attributes[k].needsUpdate = true; }
    }
    this.used = [...used];
  }
  dispose() { for (const b of this.buckets.values()) if (b.mesh) { this.scene.remove(b.mesh); b.mesh.dispose(); } this.buckets.clear(); }
}

// a single, smoothly animated person (the heroes). pose(clip, t) every frame; colours are fixed when made.
export class Actor extends THREE.Mesh {
  constructor(person, cols = {}) {
    const g = new THREE.BufferGeometry(); g.setIndex(person.indexAttr);
    const N = person.N, pos = new Float32Array(N * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', person.colorAttr); g.setAttribute('mask', person.maskAttr); g.setAttribute('aux', person.auxAttr); if (person.uvAttr) g.setAttribute('uv', person.uvAttr);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3);
    super(g, personMaterial(person, false, cols));
    this.person = person; this.frustumCulled = false; this.castShadow = true; this.clip = 'idle'; this.ct = 0; this.prev = null; this.mixT = 1;
    this.pose('idle', 0);
  }
  // play a clip (blending from the last pose over 0.15 s when the clip changes)
  play(clip, restart) { if (clip !== this.clip || restart) { this.prev = this.geometry.attributes.position.array.slice(); this.prevN = this.geometry.attributes.normal.array.slice(); this.mixT = 0; this.clip = clip; this.ct = 0; } }
  update(dt, speed = 1) { this.ct += dt * speed; this.mixT += dt / 0.15; this.pose(this.clip, this.ct); }
  pose(clip, t) {
    const P = this.person, [a, b, k] = P.frame(clip, t), A = P.positions(a), B = P.positions(b), NA = P.normals(a), NB = P.normals(b);
    const out = this.geometry.attributes.position.array, on = this.geometry.attributes.normal.array;
    const s = k * k * (3 - 2 * k), pv = this.prev && this.mixT < 1 ? this.prev : null, pn = this.prevN, m = pv ? this.mixT : 1;
    if (pv) for (let i = 0; i < out.length; i++) { const v = A[i] + (B[i] - A[i]) * s, n = NA[i] + (NB[i] - NA[i]) * s; out[i] = pv[i] + (v - pv[i]) * m; on[i] = pn[i] + (n - pn[i]) * m; }
    else for (let i = 0; i < out.length; i++) { out[i] = A[i] + (B[i] - A[i]) * s; on[i] = NA[i] + (NB[i] - NA[i]) * s; }
    this.geometry.attributes.position.needsUpdate = true; this.geometry.attributes.normal.needsUpdate = true;
  }
  done() { const c = this.person.clips[this.clip]; return !c.loop && this.ct >= c.dur; }
  setLook(cols) { const U = this.material.userData.U; for (const k of ['tint', 'skin', 'hair']) if (cols[k] !== undefined) U['u' + k[0].toUpperCase() + k.slice(1)].value.set(cols[k]); if (cols.expr !== undefined) U.uExpr.value = cols.expr; }
  set expr(e) { this.material.userData.U.uExpr.value = e; }
  get expr() { return this.material.userData.U.uExpr.value; }
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
