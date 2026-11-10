// Runs in a headless browser (tools/bake2.mjs drives it). Builds the game's people from the CC0 Quaternius
// "Universal Base Characters", "Modular Character Outfits - Fantasy" and "Universal Animation Library":
//  · an outfit + the head of a base character + hair, beard and eyebrows are put together into one person
//  · texture colours are read into vertex colours; clothes, skin and hair are marked so each person in a crowd can
//    get his own shirt, skin and hair colour
//  · each part is simplified (meshoptimizer) so a crowd of 150 runs on a phone
//  · every animation is sampled into key poses (positions only), with an optional weapon fixed in the right hand
// v3 (for the driving games): faces with expressions. Eyebrows are marked (mask 4) with their side (aux) so the
// shader can raise / knit them; three mouths (smile 5, open 6, frown 7) are made to fit each face and the shader shows
// the one the mood asks for. Accessories (glasses, turban, cap, helmet, garland, moustache, bindi) are made in code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MeshoptSimplifier } from 'meshoptimizer';

const L = new GLTFLoader(), BASE = () => window.BASE;
let anims = null;
const texCache = new Map();
function pixels(tex) {
  if (!tex || !tex.image) return null;
  if (texCache.has(tex.image)) return texCache.get(tex.image);
  const im = tex.image, w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d'); cx.drawImage(im, 0, 0); const d = { w, h, data: cx.getImageData(0, 0, w, h).data };
  texCache.set(tex.image, d); return d;
}
const col = new THREE.Color();
function sample(px, u, v) {   // average of a few texels around (u, v), as linear colour
  if (!px) return [1, 1, 1];
  let r = 0, g = 0, b = 0, n = 0;
  for (const [du, dv] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const x = Math.min(px.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * px.w) + du)), y = Math.min(px.h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * px.h) + dv)), i = (y * px.w + x) * 4;
    r += px.data[i]; g += px.data[i + 1]; b += px.data[i + 2]; n++;
  }
  col.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace); return [col.r, col.g, col.b];
}

// one part of a person: every skinned mesh in a glTF, filtered and simplified
async function loadPart(P, S) {
  const g = await L.loadAsync(BASE() + P.file), root = g.scene; root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const out = [];
  for (const m of meshes) {
    const rule = (P.meshes && (P.meshes[m.name] ?? P.meshes['*'])) ?? {};
    if (rule === false || rule.skip) continue;
    const geo = m.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, n = pos.count;
    let idx = Array.from(geo.index.array);
    // keep only the head of a full-body base character (the outfit covers the rest)
    if (P.headOnly) { const k = []; for (let i = 0; i < idx.length; i += 3) if ([0, 1, 2].every(j => pos.getY(idx[i + j]) > P.headOnly)) k.push(idx[i], idx[i + 1], idx[i + 2]); idx = k; }
    if (!idx.length) continue;
    // weld vertices that share a position (texture seams), simplify, then keep the vertices still used
    const key = new Map(), canon = new Int32Array(n);
    for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 2e3) + ',' + Math.round(pos.getY(i) * 2e3) + ',' + Math.round(pos.getZ(i) * 2e3); if (!key.has(k)) key.set(k, i); canon[i] = key.get(k); }
    let wi = idx.map(i => canon[i]); const tri = []; for (let i = 0; i < wi.length; i += 3) if (wi[i] !== wi[i + 1] && wi[i + 1] !== wi[i + 2] && wi[i] !== wi[i + 2]) tri.push(wi[i], wi[i + 1], wi[i + 2]);
    const target = Math.max(12, Math.floor(tri.length * (rule.keep ?? P.keep ?? S.keep ?? 0.25) / 3) * 3);
    let [simp] = MeshoptSimplifier.simplify(new Uint32Array(tri), new Float32Array(pos.array), 3, target, 0.5, []);
    const lo = S.id.endsWith('_lo'), feet = /Feet|Boots/.test(m.name);
    if (simp.length > target * 1.6 && (/Boots|Bracer|Belt|Pauldron/.test(m.name) || (lo && !feet))) {   // small pieces that resist (boots, straps, hair): a rougher pass, minus any stretched triangles it makes
      const P3 = i => [pos.getX(i), pos.getY(i), pos.getZ(i)], el = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      // the rough pass can overshoot to almost nothing: then ask it again for more triangles
      for (let tt = target, k = 0; k < 5; k++, tt *= 2) {
        const [sl] = MeshoptSimplifier.simplifySloppy(new Uint32Array(tri), new Float32Array(pos.array), 3, null, tt, 0.5), keep = [];
        for (let t = 0; t < sl.length; t += 3) { const a = P3(sl[t]), b = P3(sl[t + 1]), c = P3(sl[t + 2]); if (lo || Math.max(el(a, b), el(b, c), el(a, c)) < 0.12) keep.push(sl[t], sl[t + 1], sl[t + 2]); }
        if (keep.length > target * 0.4) { if (keep.length < simp.length) simp = new Uint32Array(keep); break; }
      }
    }
    if (window.DEBUG) console.log('simp', m.name, tri.length / 3, '->', simp.length / 3);
    // back from welded points to real vertices: each corner takes the copy whose texture coordinate fits its triangle
    const copies = new Map(); for (let i = 0; i < n; i++) { const c = canon[i]; if (!copies.has(c)) copies.set(c, []); copies.get(c).push(i); }
    const U = i => uv ? [uv.getX(i), uv.getY(i)] : [0, 0], d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    const cp = c => copies.get(c) || [c];
    const real = [];
    for (let t = 0; t < simp.length; t += 3) {
      let best = null, bs = 1e9;
      for (const a of cp(simp[t])) { const ua = U(a); let b = null, bd = 1e9, c = null, cd = 1e9; for (const x of cp(simp[t + 1])) { const d = d2(U(x), ua); if (d < bd) { bd = d; b = x; } } for (const x of cp(simp[t + 2])) { const d = d2(U(x), ua); if (d < cd) { cd = d; c = x; } } if (bd + cd < bs) { bs = bd + cd; best = [a, b, c]; } }
      real.push(...best);
    }
    simp = real;
    // colours from the texture (at the original vertices' uvs) and masks
    const mat = Array.isArray(m.material) ? m.material[0] : m.material, px = pixels(mat.map), used = [...new Set(simp)];
    const colours = new Map();
    for (const v of used) {
      let c = sample(px, uv ? uv.getX(v) : 0, uv ? uv.getY(v) : 0);
      if (rule.color !== undefined) { col.setHex(rule.color, THREE.SRGBColorSpace); c = [col.r, col.g, col.b]; }
      if (rule.mask && rule.gray !== false) { const l = (c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15); const k = Math.min(1.6, (rule.bright || 1) * Math.pow(l, 0.75) * 1.9); c = [k, k, k]; }
      colours.set(v, c);
    }
    out.push({ m, root, idx: simp, used, colours, mask: rule.mask || 0, map: rule.color === undefined && mat.map && mat.map.image ? mat.map : null, uv });
  }
  return { root, meshes: out, anim: new THREE.AnimationMixer(root) };
}

async function weaponGeo(W) {
  if (W.box) { const g = new THREE.BoxGeometry(...W.box).toNonIndexed(); col.setHex(W.color ?? 0x202028, THREE.SRGBColorSpace); const C = []; for (let i = 0; i < g.attributes.position.count; i++) C.push(col.r, col.g, col.b); g.translate(0, 0, W.box[2] * 0.5); return { pos: g.attributes.position.array, col: C }; }
  const o = new FBXLoader().parse(await (await fetch(BASE() + W.file)).arrayBuffer(), ''); o.updateMatrixWorld(true);
  const P = [], C = [];
  o.traverse(q => {
    if (!q.isMesh) return; const ms = Array.isArray(q.material) ? q.material : [q.material], g = q.geometry.index ? q.geometry.toNonIndexed() : q.geometry, p = g.attributes.position;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: p.count, materialIndex: 0 }];
    for (const gr of groups) { col.setHex(W.palette[ms[gr.materialIndex].name.trim()] ?? 0x888888, THREE.SRGBColorSpace); for (let i = gr.start; i < gr.start + gr.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(q.matrixWorld); P.push(v.x, v.y, v.z); C.push(col.r, col.g, col.b); } }
  });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(W.rot || [0, 0, 0]))));
  geo.computeBoundingBox(); const b = geo.boundingBox, sz = b.getSize(new THREE.Vector3()), k = W.len / sz.z, gp = W.grip || [0.5, 0.5, 0.2];
  geo.translate(-(b.min.x + sz.x * gp[0]), -(b.min.y + sz.y * gp[1]), -(b.min.z + sz.z * gp[2])); geo.scale(k, k, k);
  return { pos: geo.attributes.position.array, col: C };
}

// a hat (or bandana) taken from an older CC0 Quaternius character: the triangles of the named materials
async function hatGeo(A) {
  const o = new FBXLoader().parse(await (await fetch(BASE() + A.file)).arrayBuffer(), ''); o.updateMatrixWorld(true);
  let sk = null; o.traverse(q => { if (q.isSkinnedMesh) sk = q; });
  const ms = Array.isArray(sk.material) ? sk.material : [sk.material], g = sk.geometry.index ? sk.geometry.toNonIndexed() : sk.geometry, p = g.attributes.position;
  const P = [], C = [], v = new THREE.Vector3(), tri = [];
  for (const gr of g.groups) { const name = ms[gr.materialIndex].name.trim(); if (!(name in A.mats)) continue; for (let i = gr.start; i < gr.start + gr.count; i += 3) { const t = [0, 1, 2].map(j => v.fromBufferAttribute(p, i + j).applyMatrix4(sk.bindMatrix).clone()); tri.push({ t, name }); } }
  let maxY = -1e9; for (const T of tri) for (const q of T.t) maxY = Math.max(maxY, q.y);
  let minY = 1e9, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  const keep = tri.filter(T => T.t.every(q => q.y > maxY - A.depth * (maxY - 0) ));
  for (const T of keep) for (const q of T.t) { minY = Math.min(minY, q.y); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, q.z); }
  const k = A.width / (maxX - minX), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  for (const T of keep) { col.setHex(A.mats[T.name], THREE.SRGBColorSpace); for (const q of T.t) { P.push((q.x - cx) * k, (q.y - minY) * k, (q.z - cz) * k); C.push(col.r, col.g, col.b); } }
  return { pos: P, col: C };
}

const sv0 = new THREE.Vector3();
// where the face is (in the bind pose): eye centre, eye spacing, top of the head, the face surface, the head bone
function faceInfo(parts, S) {
  const hp = parts.find((p, i) => S.parts[i].headOnly) || parts[0]; let head = null, neck = null;
  hp.root.traverse(o => { if (o.isBone && o.name === 'Head') head = o; if (o.isBone && /^neck/i.test(o.name)) neck = o; });
  if (!head) return null;
  const skin = [], eyes = [], v = new THREE.Vector3();
  for (const M of hp.meshes) for (const q of M.used) { M.m.getVertexPosition(q, v); v.applyMatrix4(M.m.matrixWorld); (/^Eyes/i.test(M.m.name) ? eyes : /brow/i.test(M.m.name) ? [] : skin).push(v.clone()); }
  if (!eyes.length || !skin.length) return null;
  const eye = eyes.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / eyes.length);
  let ex0 = 1e9, ex1 = -1e9, top = -1e9; for (const e of eyes) { ex0 = Math.min(ex0, e.x); ex1 = Math.max(ex1, e.x); } for (const q of skin) top = Math.max(top, q.y);
  const hc = skin.filter(q => q.y > eye.y - 0.02).reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, skin.filter(q => q.y > eye.y - 0.02).length));
  const front = Math.sign(eye.z - hc.z) || 1;
  let r = 0; for (const q of skin) if (Math.abs(q.y - eye.y) < 0.03) r = Math.max(r, Math.abs(q.x - hc.x));
  // the face surface in front at (x, y): the most forward skin point nearby
  const surf = (x, y, w = 0.014) => { let best = null; for (const q of skin) if (Math.abs(q.x - x) < w && Math.abs(q.y - y) < w) { const z = q.z * front; if (best === null || z > best) best = z; } return best === null ? (w < 0.05 ? surf(x, y, w * 1.6) : eye.z) : best * front; };
  return { head, neck, eye, sep: ex1 - ex0, top, hc, front, r, surf };
}
function addGeo(rigid, geo, hex, mask, bone, fixColor) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, inv = bone.matrixWorld.clone().invert(); col.setHex(hex, THREE.SRGBColorSpace); const c = fixColor || [col.r, col.g, col.b];
  for (let i = 0; i < p.count; i++) rigid.push({ bone, local: new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(inv), c, mask });
}
// three mouths that follow the face: smile (5), open (6), frown (7)
const flip = P => { for (let i = 0; i < P.length; i += 9) for (let k = 0; k < 3; k++) { const t = P[i + 3 + k]; P[i + 3 + k] = P[i + 6 + k]; P[i + 6 + k] = t; } };   // turn triangles to face the other way
function mouths(rigid, F, S) {
  const my = F.eye.y - (F.top - F.eye.y) * (S.mouthAt || 0.6), w = F.sep * (S.mouthW || 0.4), off = 0.0065 * F.front;
  const band = (curve, lift) => { const P = []; const n = 8; for (let i = 0; i < n; i++) { const pts = [i / n, (i + 1) / n].map(t => { const x = -w + 2 * w * t, k = (x / w) ** 2, y = my + lift + curve * k; return [x + F.eye.x, y]; });
      const q = pts.map(([x, y]) => [[x, y + 0.0036, Math.max(F.surf(x, y + 0.004) * F.front, F.surf(x, y - 0.004) * F.front) * F.front + off], [x, y - 0.0036, Math.max(F.surf(x, y + 0.004) * F.front, F.surf(x, y - 0.004) * F.front) * F.front + off]]);
      P.push(...q[0][0], ...q[0][1], ...q[1][0], ...q[0][1], ...q[1][1], ...q[1][0]); }
    if (F.front < 0) flip(P);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; };
  const MC = S.mouthColor ?? 0x3a0c10;
  addGeo(rigid, band(0.011, -0.004), MC, 5, F.head);
  addGeo(rigid, band(-0.010, 0.004), MC, 7, F.head);
  const ell = (rx, ry, cy, dz, hex) => { const P = []; const n = 14, cz = F.surf(F.eye.x, cy) + off + dz; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; const pt = a => [F.eye.x + Math.cos(a) * rx, cy + Math.sin(a) * ry, F.surf(F.eye.x + Math.cos(a) * rx, cy + Math.sin(a) * ry) + off + dz]; P.push(F.eye.x, cy, cz, ...pt(a0), ...pt(a1)); } if (F.front < 0) flip(P); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); addGeo(rigid, g, hex, 6, F.head); };
  ell(w * 0.62, w * 0.55, my - 0.003, 0, 0x3a0a0e); ell(w * 0.4, w * 0.2, my - 0.003 - w * 0.3, 0.0012 * F.front, 0xc84a5a);
}
function accessory(rigid, F, A, parts) {
  const at = (geo, x, y, z) => { geo.translate(x, y, z); return geo; }, hx = F.hc.x, hz = F.hc.z, R0 = F.r, fz = F.front;
  if (A.type === 'glasses') {
    for (const s of [-1, 1]) { const g = new THREE.TorusGeometry(F.sep * 0.27, 0.0035, 6, 18); addGeo(rigid, at(g, F.eye.x + s * F.sep * 0.27, F.eye.y, F.surf(F.eye.x + s * F.sep * 0.27, F.eye.y) + 0.012 * fz), A.color ?? 0x1a1a1a, 0, F.head); const arm = new THREE.BoxGeometry(0.004, 0.004, R0 * 1.1); addGeo(rigid, at(arm, hx + s * R0 * 1.02, F.eye.y, F.eye.z - R0 * 0.5 * fz), A.color ?? 0x1a1a1a, 0, F.head); }
    addGeo(rigid, at(new THREE.BoxGeometry(F.sep * 0.12, 0.004, 0.004), F.eye.x, F.eye.y + 0.004, F.surf(F.eye.x, F.eye.y) + 0.014 * fz), A.color ?? 0x1a1a1a, 0, F.head);
  } else if (A.type === 'turban') {   // a wedding safa: stacked wraps, a gold band, a jewel and a tail
    for (let i = 0; i < 4; i++) { const g = new THREE.TorusGeometry(R0 * (1.02 - i * 0.12), R0 * 0.24, 8, 22); g.rotateX(Math.PI / 2); g.rotateZ((i % 2 ? 1 : -1) * 0.12); addGeo(rigid, at(g, hx, F.top - R0 * 0.25 + i * R0 * 0.28, hz), A.color ?? 0xd8402a, 0, F.head); }
    const b = new THREE.TorusGeometry(R0 * 1.06, R0 * 0.07, 6, 22); b.rotateX(Math.PI / 2); addGeo(rigid, at(b, hx, F.top - R0 * 0.32, hz), A.band ?? 0xf2c14e, 0, F.head);
    addGeo(rigid, at(new THREE.SphereGeometry(R0 * 0.16, 8, 6), hx, F.top + R0 * 0.1, hz + R0 * 1.0 * fz), 0xff3a5a, 0, F.head);
    const t = new THREE.BoxGeometry(R0 * 0.5, R0 * 1.6, 0.012); addGeo(rigid, at(t, hx, F.top - R0 * 1.0, hz - R0 * 1.1 * fz), A.color ?? 0xd8402a, 0, F.head);
  } else if (A.type === 'cap') {
    const g = new THREE.SphereGeometry(R0 * 1.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); addGeo(rigid, at(g, hx, F.top - R0 * 0.62, hz), A.color ?? 0x2a6ad8, A.mask ?? 0, F.head);
    const v = new THREE.CylinderGeometry(R0 * 0.95, R0 * 0.95, 0.008, 16, 1, false, -Math.PI / 2, Math.PI); v.scale(1, 1, 0.9); if (fz < 0) v.rotateY(Math.PI); addGeo(rigid, at(v, hx, F.top - R0 * 0.6, hz + R0 * 0.75 * fz), A.visor ?? A.color ?? 0x2a6ad8, A.mask ?? 0, F.head);
  } else if (A.type === 'helmet') {   // an open-face racing helmet (colour follows the "hair" tint) with goggles on top
    const cy = F.eye.y + R0 * 0.32, cz = hz - R0 * 0.12 * fz;
    const g = new THREE.SphereGeometry(R0 * 1.24, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56); addGeo(rigid, at(g, hx, cy, cz), 0xb8b8b8, 3, F.head);
    const st = new THREE.SphereGeometry(R0 * 1.26, 4, 10, -0.18, 0.36, 0, Math.PI * 0.56); if (fz < 0) st.rotateY(Math.PI); addGeo(rigid, at(st, hx, cy, cz), 0xffffff, 0, F.head);
    const band = new THREE.TorusGeometry(R0 * 1.24, R0 * 0.09, 6, 24); band.rotateX(Math.PI / 2); addGeo(rigid, at(band, hx, cy + R0 * 0.36, cz), 0x2a2a30, 0, F.head);
    for (const s of [-1, 1]) { const gl = new THREE.CylinderGeometry(R0 * 0.3, R0 * 0.3, R0 * 0.22, 14); gl.rotateX(Math.PI / 2); addGeo(rigid, at(gl, hx + s * R0 * 0.36, cy + R0 * 0.38, cz + R0 * 1.12 * fz), 0x3a3a40, 0, F.head); const ln = new THREE.CircleGeometry(R0 * 0.24, 14); if (fz < 0) ln.rotateY(Math.PI); addGeo(rigid, at(ln, hx + s * R0 * 0.36, cy + R0 * 0.38, cz + R0 * 1.24 * fz), 0x7ad8ff, 0, F.head); }
  } else if (A.type === 'garland' && F.neck) {   // a marigold garland around the neck
    const n = new THREE.Vector3().setFromMatrixPosition(F.neck.matrixWorld);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, rr = R0 * 1.25; const g = new THREE.SphereGeometry(R0 * 0.16, 6, 4); addGeo(rigid, at(g, n.x + Math.cos(a) * rr, n.y - R0 * 0.55 - Math.max(0, Math.cos(a - (fz > 0 ? Math.PI / 2 : -Math.PI / 2))) * R0 * 1.2, n.z + Math.sin(a) * rr * 0.8), i % 3 ? 0xff9a1a : 0xffffff, 0, F.neck); }
  } else if (A.type === 'moustache') {   // a big funny moustache (hair colour)
    const my = F.eye.y - (F.top - F.eye.y) * 0.44;
    for (const s of [-1, 1]) { const g = new THREE.SphereGeometry(F.sep * 0.2, 10, 6); g.scale(1, 0.38, 0.5); g.rotateZ(s * 0.35); addGeo(rigid, at(g, F.eye.x + s * F.sep * 0.24, my, F.surf(F.eye.x + s * F.sep * 0.2, my) + 0.004 * fz), 0x888888, 3, F.head); }
  } else if (A.type === 'bindi') {
    const y = F.eye.y + (F.top - F.eye.y) * 0.32, g = new THREE.CircleGeometry(F.sep * 0.06, 10); if (fz < 0) g.rotateY(Math.PI); addGeo(rigid, at(g, F.eye.x, y, F.surf(F.eye.x, y) + 0.002 * fz), 0xd8102a, 0, F.head);
  }
}

async function bakeChar(S) {
  if (!anims) anims = [...(await L.loadAsync(BASE() + 'Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb')).animations, ...(await L.loadAsync(BASE() + 'UAL2/Unreal-Godot/UAL2_Standard.glb')).animations];
  const parts = []; for (const P of S.parts) parts.push(await loadPart(P, S));
  // one vertex list for the whole person
  const verts = [], index = [];   // verts: {mesh, v, colour, mask}
  for (const p of parts) for (const M of p.meshes) { const base = verts.length, map = new Map(); M.used.forEach((v, i) => { map.set(v, base + i); verts.push({ M, v, c: M.colours.get(v), mask: M.mask, tex: M.map, uv: M.uv ? [M.uv.getX(v), M.uv.getY(v)] : [0, 0] }); }); for (const i of M.idx) index.push(map.get(i)); }
  // hats: rigid pieces that follow the head bone
  const rigid = [];
  if (S.hats) {
    const headPart = parts.find((p, i) => S.parts[i].headOnly) || parts[0]; let head = null; headPart.root.traverse(o => { if (o.isBone && o.name === 'Head') head = o; });
    let top = -1e9, cx = 0, cz = 0, n0 = 0; const v = new THREE.Vector3();
    for (const M of headPart.meshes) for (const q of M.used) { M.m.getVertexPosition(q, v); v.applyMatrix4(M.m.matrixWorld); if (v.y > top) top = v.y; }
    for (const M of headPart.meshes) for (const q of M.used) { M.m.getVertexPosition(q, v); v.applyMatrix4(M.m.matrixWorld); if (v.y > top - 0.06) { cx += v.x; cz += v.z; n0++; } }
    cx /= n0; cz /= n0; const inv = head.matrixWorld.clone().invert();
    for (const A of S.hats) { const H = await hatGeo(A); for (let i = 0; i < H.pos.length / 3; i++) { const local = new THREE.Vector3(H.pos[i * 3] + cx + (A.dx || 0), H.pos[i * 3 + 1] + top - A.sink, H.pos[i * 3 + 2] + cz + (A.dz || 0)).applyMatrix4(inv); rigid.push({ bone: head, local, c: [H.col[i * 3], H.col[i * 3 + 1], H.col[i * 3 + 2]] }); } }
  }
  // the face: where the eyes and mouth are, how big the head is; then mouths and accessories fixed to the bones
  const FI = faceInfo(parts, S);
  if (FI) { if (S.mouth !== false) mouths(rigid, FI, S); for (const A of S.acc || []) accessory(rigid, FI, A, parts); }
  for (const r of rigid) { index.push(verts.length); verts.push({ rigid: r, c: r.c, mask: r.mask || 0 }); }
  if (FI) verts.forEach(q => { if (q.mask === 4 && !q.rigid) { q.M.m.getVertexPosition(q.v, sv0); sv0.applyMatrix4(q.M.m.matrixWorld); q.aux = Math.max(-127, Math.min(127, Math.round((sv0.x - FI.eye.x) / (FI.sep * 0.95) * 127))); } });
  let W = null; if (S.weapon) W = await weaponGeo(S.weapon);
  const n = verts.length, wn = W ? W.pos.length / 3 : 0, N = n + wn;
  // one texture sheet per person: every texture it uses in a 3 x 3 grid; the last cell is plain white (for hats and weapons)
  const AT = 1024, CELL = Math.floor(AT / 3), pad = 3, imgs = [];
  for (const q of verts) if (q.tex && !imgs.includes(q.tex.image)) imgs.push(q.tex.image);
  if (imgs.length > 8) throw new Error('too many textures for ' + S.id);
  const ac = document.createElement('canvas'); ac.width = ac.height = AT; const ax = ac.getContext('2d'); ax.fillStyle = '#ffffff'; ax.fillRect(0, 0, AT, AT);
  imgs.forEach((im, k) => ax.drawImage(im, (k % 3) * CELL, Math.floor(k / 3) * CELL, CELL, CELL));
  const cellUV = (k, u, v) => { const fu = u - Math.floor(u), fv = v - Math.floor(v); return [((k % 3) * CELL + pad + fu * (CELL - 2 * pad)) / AT, (Math.floor(k / 3) * CELL + pad + fv * (CELL - 2 * pad)) / AT]; };
  const uvA = new Uint16Array(N * 2), white = cellUV(8, 0.5, 0.5);
  const color = new Uint8Array(N * 3), mask = new Uint8Array(N), aux = new Int8Array(N);
  verts.forEach((q, i) => {
    const t = q.tex ? cellUV(imgs.indexOf(q.tex.image), q.uv[0], q.uv[1]) : white; uvA[i * 2] = Math.round(t[0] * 65535); uvA[i * 2 + 1] = Math.round(t[1] * 65535);
    for (let k = 0; k < 3; k++) color[i * 3 + k] = q.tex ? 255 : Math.round(Math.min(1, q.c[k]) * 255); mask[i] = q.tex ? q.mask : (q.mask || 0); aux[i] = q.aux || 0;
  });
  for (let i = 0; i < wn; i++) { uvA[(n + i) * 2] = Math.round(white[0] * 65535); uvA[(n + i) * 2 + 1] = Math.round(white[1] * 65535); }
  const jpg = Uint8Array.from(atob(ac.toDataURL('image/jpeg', 0.86).split(',')[1]), c => c.charCodeAt(0));
  // tintable parts are stored at 1/1.6 so a tint can brighten them; the shader multiplies by 1.6 (see people.js)
  for (let i = 0; i < wn; i++) for (let k = 0; k < 3; k++) color[(n + i) * 3 + k] = Math.round(W.col[i * 3 + k] * 255);
  const idx = new Uint16Array(index.length + (W ? wn : 0)); idx.set(index); for (let i = 0; i < wn; i++) idx[index.length + i] = n + i;
  const sc = S.scale || 1, F = new THREE.Matrix4().makeRotationY(Math.PI).multiply(new THREE.Matrix4().makeScale(sc * (S.bulk || 1), sc, sc * (S.bulk || 1)));
  let hand = null, elbow = null; parts[0].root.traverse(o => { if (o.isBone && o.name === 'hand_r') hand = o; if (o.isBone && o.name === 'lowerarm_r') elbow = o; });
  const frames = [], clips = {}, sv = new THREE.Vector3(), skel = new THREE.Matrix4();
  for (const C of S.clips) {
    const clip = anims.find(a => a.name === C.src); if (!clip) throw new Error('no clip ' + C.src);
    parts.forEach(p => { p.anim.stopAllAction(); p.anim.clipAction(clip).reset().play(); });
    const t0 = C.from || 0, t1 = C.to || clip.duration, start = frames.length;
    for (let f = 0; f < C.frames; f++) {
      const t = t0 + (t1 - t0) * (C.loop ? f / C.frames : f / (C.frames - 1));
      for (const p of parts) { p.anim.setTime(t); const r = p.root.getObjectByName('root'); if (r && C.inPlace) r.position.set(0, r.position.y, 0); p.root.updateMatrixWorld(true); }
      const pos = new Float32Array(N * 3);
      verts.forEach((q, i) => { if (q.rigid) sv.copy(q.rigid.local).applyMatrix4(q.rigid.bone.matrixWorld).applyMatrix4(F); else { q.M.m.getVertexPosition(q.v, sv); sv.applyMatrix4(q.M.m.matrixWorld).applyMatrix4(F); } pos[i * 3] = sv.x; pos[i * 3 + 1] = sv.y; pos[i * 3 + 2] = sv.z; });
      if (W) {
        const a = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld).applyMatrix4(F), e = new THREE.Vector3().setFromMatrixPosition(elbow.matrixWorld).applyMatrix4(F);
        const z = a.clone().sub(e).normalize(), up = Math.abs(z.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0), x = new THREE.Vector3().crossVectors(up, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
        skel.makeBasis(x, y, z).setPosition(a.addScaledVector(z, S.weapon.out ?? 0.06));
        for (let i = 0; i < wn; i++) { sv.fromArray(W.pos, i * 3).applyMatrix4(skel); pos[(n + i) * 3] = sv.x; pos[(n + i) * 3 + 1] = sv.y; pos[(n + i) * 3 + 2] = sv.z; }
      }
      frames.push(pos);
    }
    clips[C.name] = { s: start, f: C.frames, dur: (t1 - t0) / (C.speed || 1), loop: !!C.loop };
  }
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (const p of frames) for (let i = 0; i < p.length; i++) { const k = i % 3; if (p[i] < min[k]) min[k] = p[i]; if (p[i] > max[k]) max[k] = p[i]; }
  const q = new Int16Array(frames.length * N * 3);
  frames.forEach((p, f) => { for (let i = 0; i < p.length; i++) { const k = i % 3; q[f * N * 3 + i] = Math.round((p[i] - min[k]) / (max[k] - min[k] || 1) * 65535) - 32768; } });
  return { id: S.id, N, ni: idx.length, min, max, clips, tex: true, jl: jpg.length, face: !!FI, data: [idx, color, mask, q, uvA, jpg, aux] };
}

window.bake = async specs => {
  await MeshoptSimplifier.ready;
  const chars = []; for (const s of specs) chars.push(await bakeChar(s));
  const head = { chars: chars.map(({ data, ...h }) => h) };
  let off = 0;
  chars.forEach((c, i) => { head.chars[i].o = c.data.map(a => { off = (off + 3) & ~3; const o = off; off += a.byteLength; return o; }); });
  const hj = new TextEncoder().encode(JSON.stringify(head)), base = (8 + hj.length + 3) & ~3;
  const buf = new ArrayBuffer(base + off), u8 = new Uint8Array(buf), dv = new DataView(buf);
  dv.setUint32(0, 0x4c505050, true); dv.setUint32(4, hj.length, true); u8.set(hj, 8);
  chars.forEach((c, i) => c.data.forEach((a, k) => { u8.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), base + head.chars[i].o[k]); }));
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), info: head.chars.map(h => ({ id: h.id, N: h.N, tris: h.ni / 3, clips: Object.keys(h.clips).map(k => k + h.clips[k].f).join(' ') })), size: buf.byteLength };
};
window.ready = true;
