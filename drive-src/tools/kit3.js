// Runs in a headless browser (tools/kit3.mjs drives it): packs the CC0 Kenney models (cars, boats, city) the two
// driving games use into one glb. Every kit's models share one material and one colour-map texture (Kenney kits use a
// single palette texture), the toy driver is taken out of the karts, and each model is a named node.
// The CC0 Quaternius farm animals (with their animations) are written to their own glbs.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
const B = 'http://localhost:8766/flat/';
const toB64 = buf => { const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const exportGlb = (root, animations = []) => new Promise((ok, no) => new GLTFExporter().parse(root, ok, no, { binary: true, animations }));
window.kit = async list => {
  const L = new GLTFLoader(), root = new THREE.Group(), mats = {}, info = [];
  for (const [kit, name] of list) {
    const g = (await L.loadAsync(B + kit + '/' + name + '.glb')).scene; g.name = name;
    const drop = []; g.traverse(o => { if (o.name === 'character') drop.push(o); }); drop.forEach(o => o.parent.remove(o));
    g.traverse(o => { if (o.isMesh) { const m = o.material; if (!mats[kit]) { mats[kit] = new THREE.MeshStandardMaterial({ map: m.map, roughness: 0.6, metalness: 0 }); mats[kit].name = 'kit_' + kit; } o.material = mats[kit]; } });
    let t = 0; g.traverse(o => { if (o.isMesh) t += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
    const b = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); info.push(name + ':' + t + ':' + b.toArray().map(v => v.toFixed(2)).join('x'));
    root.add(g);
  }
  return { b64: toB64(await exportGlb(root)), info };
};
window.animal = async (name, scale) => {
  const o = await new FBXLoader().loadAsync(B + 'anim/' + name + '.fbx'); o.scale.setScalar(scale); o.name = name;
  // one draw call per animal: the material colours go into the vertices, one plain material
  o.traverse(q => {
    if (!q.isMesh) return; const ms = [].concat(q.material), g = q.geometry, n = g.attributes.position.count, col = new Float32Array(n * 3);
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : n, materialIndex: 0 }], idx = g.index;
    for (const gr of groups) { const c = ms[gr.materialIndex || 0].color || new THREE.Color(1, 1, 1); for (let i = gr.start; i < gr.start + gr.count; i++) { const v = idx ? idx.getX(i) : i; col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.clearGroups();
    q.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  });
  const clips = o.animations.map(c => c.name + ':' + c.duration.toFixed(2)), b = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  let t = 0; o.traverse(q => { if (q.isMesh) t += (q.geometry.index ? q.geometry.index.count : q.geometry.attributes.position.count) / 3; });
  return { b64: toB64(await exportGlb(o, o.animations)), info: name + ' tris ' + t + ' size ' + b.toArray().map(v => v.toFixed(2)).join('x') + ' clips ' + clips.join(' ') };
};
