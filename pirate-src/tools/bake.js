// Runs in a headless browser (tools/bake.mjs drives it). Turns the CC0 Quaternius animated characters (FBX) into
// the compact "people" data the game draws: each character is recoloured with our own palette, merged into one
// indexed mesh with vertex colours, and every animation is sampled into a few skinned key poses (positions only).
// Weapons from the CC0 Quaternius Pirate Pack are fixed into the right hand, so they move with the animation.
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const parse = b64 => new FBXLoader().parse(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer, '');
const col = new THREE.Color();

// geometry with per-vertex colour + mask from material groups. mask: 0 fixed colour, 1 clothes tint, 2 skin, 3 hair
function colourise(geo, mats, palette, extra) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), n = g.attributes.position.count;
  const c = new Float32Array(n * 3), m = new Float32Array(n);
  const groups = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
  for (const gr of groups) {
    const name = mats[gr.materialIndex].name.trim(); let p = palette[name];
    if (p === undefined) { console.warn('no colour for', name); p = 0xff00ff; }
    const [hex, mask] = Array.isArray(p) ? p : [p, 0];
    col.setHex(hex, THREE.SRGBColorSpace);
    for (let i = gr.start; i < gr.start + gr.count; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; m[i] = mask; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('mask', new THREE.BufferAttribute(m, 1));
  if (extra) extra(g);
  for (const k of Object.keys(g.attributes)) if (!['position', 'color', 'mask', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
  g.clearGroups();
  return g;
}

function bakeChar(S) {
  const root = parse(S.file);
  root.updateMatrixWorld(true);
  const F = new THREE.Matrix4().makeRotationY(Math.PI).multiply(new THREE.Matrix4().makeScale(S.scale, S.scale, S.scale));
  let sk = null; root.traverse(q => { if (q.isSkinnedMesh) sk = q; });
  const mats = Array.isArray(sk.material) ? sk.material : [sk.material];
  // trousers: some characters have bare skin from the hips down; give them trousers
  let geo = colourise(sk.geometry, mats, S.palette, g => {
    if (!S.pants) return; const p = g.attributes.position, c = g.attributes.color, m = g.attributes.mask, v = new THREE.Vector3();
    col.setHex(S.pants[0], THREE.SRGBColorSpace);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(sk.bindMatrix); if (m.getX(i) === 2 && v.y < S.pants[1]) { c.setXYZ(i, col.r, col.g, col.b); m.setX(i, S.pants[2] || 0); } }
  });
  geo = mergeVertices(geo, 1e-4);
  const n = geo.attributes.position.count;
  // the weapon, in the right fist's space
  let wGeo = null, wBone = null, wElbow = null;
  if (S.weapon) {
    const W = parse(S.weapon.file); const parts = [];
    W.updateMatrixWorld(true);
    W.traverse(q => { if (q.isMesh) { const ms = Array.isArray(q.material) ? q.material : [q.material]; const g = colourise(q.geometry, ms, S.weapon.palette); g.applyMatrix4(q.matrixWorld); for (const k of ['skinIndex', 'skinWeight']) if (g.attributes[k]) g.deleteAttribute(k); parts.push(g); } });
    // merge parts
    let tot = 0; parts.forEach(p => { tot += p.attributes.position.count; });
    const P = new Float32Array(tot * 3), C = new Float32Array(tot * 3), M = new Float32Array(tot); let o = 0;
    for (const p of parts) { P.set(p.attributes.position.array, o * 3); C.set(p.attributes.color.array, o * 3); M.set(p.attributes.mask.array, o); o += p.attributes.position.count; }
    wGeo = new THREE.BufferGeometry(); wGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); wGeo.setAttribute('color', new THREE.BufferAttribute(C, 3)); wGeo.setAttribute('mask', new THREE.BufferAttribute(M, 1));
    // normalise the weapon: long axis along +z (muzzle at +z), grip point at the origin, w.len metres long
    const w = S.weapon; wGeo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(w.rot || [0, 0, 0]))));
    wGeo.computeBoundingBox(); const wb = wGeo.boundingBox, sz = wb.getSize(new THREE.Vector3()), k = w.len / sz.z;
    const g = w.grip || [0.5, 0.5, 0.2]; wGeo.translate(-(wb.min.x + sz.x * g[0]), -(wb.min.y + sz.y * g[1]), -(wb.min.z + sz.z * g[2])); wGeo.scale(k, k, k);
    wGeo = mergeVertices(wGeo, 1e-4);
    root.traverse(q => { if (q.isBone && q.name === (w.bone || 'FistR')) wBone = q; if (q.isBone && q.name === (w.elbow || 'LowerArmR')) wElbow = q; });
  }
  const wn = wGeo ? wGeo.attributes.position.count : 0, N = n + wn;
  // final colours / masks / index
  const color = new Uint8Array(N * 3), mask = new Uint8Array(N);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) color[i * 3 + k] = Math.round(geo.attributes.color.array[i * 3 + k] * 255); mask[i] = geo.attributes.mask.array[i]; }
  for (let i = 0; i < wn; i++) { for (let k = 0; k < 3; k++) color[(n + i) * 3 + k] = Math.round(wGeo.attributes.color.array[i * 3 + k] * 255); mask[n + i] = wGeo.attributes.mask.array[i]; }
  const i1 = geo.index.array, i2 = wGeo ? wGeo.index.array : [];
  const index = new Uint16Array(i1.length + i2.length); index.set(i1); for (let i = 0; i < i2.length; i++) index[i1.length + i] = i2[i] + n;
  // sample the animations
  const tmpG = new THREE.BufferGeometry(); tmpG.setAttribute('position', geo.attributes.position); tmpG.setAttribute('skinIndex', geo.attributes.skinIndex); tmpG.setAttribute('skinWeight', geo.attributes.skinWeight);
  const sm = new THREE.SkinnedMesh(tmpG); sm.bind(sk.skeleton, sk.bindMatrix); sm.matrixWorld.copy(sk.matrixWorld); sm.bindMatrixInverse.copy(sk.bindMatrixInverse);
  const mixer = new THREE.AnimationMixer(root), clips = {}, frames = [];
  const rest = new Map(); root.traverse(q => { if (q.isBone) rest.set(q, q.quaternion.clone()); });
  const sv = new THREE.Vector3(), skel = new THREE.Matrix4(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  for (const C of S.clips) {
    const clip = root.animations.find(a => a.name.endsWith('|' + C.src)); if (!clip) throw new Error('no clip ' + C.src);
    mixer.stopAllAction(); const act = mixer.clipAction(clip); act.reset().play();
    const t0 = C.from || 0, t1 = C.to || clip.duration, start = frames.length;
    for (let f = 0; f < C.frames; f++) {
      const t = t0 + (t1 - t0) * (C.loop ? f / C.frames : f / (C.frames - 1));
      mixer.setTime(t);
      if (C.amp) rest.forEach((q0, b) => { if (C.ampBones && !C.ampBones.some(s => b.name.startsWith(s))) return; b.quaternion.copy(q0.clone().slerp(b.quaternion.clone(), C.amp)); });
      root.updateMatrixWorld(true); sm.bindMatrixInverse.copy(sk.bindMatrixInverse); sm.bindMatrix.copy(sk.bindMatrix);
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < n; i++) { sm.getVertexPosition(i, sv); sv.applyMatrix4(sk.matrixWorld).applyMatrix4(F); pos[i * 3] = sv.x; pos[i * 3 + 1] = sv.y; pos[i * 3 + 2] = sv.z; }
      if (wGeo) {   // the weapon sits in the fist, pointing along the forearm
        const fist = new THREE.Vector3().setFromMatrixPosition(wBone.matrixWorld).applyMatrix4(F), elb = new THREE.Vector3().setFromMatrixPosition(wElbow.matrixWorld).applyMatrix4(F);
        const z = fist.clone().sub(elb).normalize(), up = Math.abs(z.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
        const x = new THREE.Vector3().crossVectors(up, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
        const at = fist.clone().addScaledVector(z, S.weapon.out || 0.05);
        skel.makeBasis(x, y, z).setPosition(at);
        for (let i = 0; i < wn; i++) { sv.fromBufferAttribute(wGeo.attributes.position, i).applyMatrix4(skel); pos[(n + i) * 3] = sv.x; pos[(n + i) * 3 + 1] = sv.y; pos[(n + i) * 3 + 2] = sv.z; }
      }
      frames.push(pos);
    }
    clips[C.name] = { s: start, f: C.frames, dur: (t1 - t0) / (C.speed || 1), loop: !!C.loop };
  }
  // the hand position in frame 0 of each clip (for muzzle flashes)
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (const p of frames) for (let i = 0; i < p.length; i++) { const k = i % 3; if (p[i] < min[k]) min[k] = p[i]; if (p[i] > max[k]) max[k] = p[i]; }
  const q = new Int16Array(frames.length * N * 3);
  frames.forEach((p, f) => { for (let i = 0; i < p.length; i++) { const k = i % 3; q[f * N * 3 + i] = Math.round((p[i] - min[k]) / (max[k] - min[k] || 1) * 65535) - 32768; } });
  return { id: S.id, N, ni: index.length, min, max, clips, data: [index, color, mask, q] };
}

window.bake = specs => {
  // layout: 'PPPL' u32, header length u32, header JSON, then (4-aligned) each array; offsets are from the data start
  const chars = specs.map(bakeChar), head = { chars: chars.map(({ data, ...h }) => h) };
  let off = 0;
  chars.forEach((c, i) => { head.chars[i].o = c.data.map(a => { off = (off + 3) & ~3; const o = off; off += a.byteLength; return o; }); });
  const hj = new TextEncoder().encode(JSON.stringify(head)), base = (8 + hj.length + 3) & ~3;
  const buf = new ArrayBuffer(base + off), u8 = new Uint8Array(buf), dv = new DataView(buf);
  dv.setUint32(0, 0x4c505050, true); dv.setUint32(4, hj.length, true); u8.set(hj, 8);
  chars.forEach((c, i) => c.data.forEach((a, k) => { u8.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), base + head.chars[i].o[k]); }));
  const total = buf.byteLength;
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), info: head.chars.map(h => ({ id: h.id, N: h.N, tris: h.ni / 3, clips: Object.keys(h.clips).map(k => k + h.clips[k].f).join(' ') })), size: total };
};
window.ready = true;
