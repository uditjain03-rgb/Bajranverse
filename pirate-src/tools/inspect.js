import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
window.go = async (b64) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const o = new FBXLoader().parse(bin.buffer, ""); const out = { anims: o.animations.map(a => a.name + ':' + a.duration.toFixed(2)), meshes: [], bones: [] };
  o.traverse(q => { if (q.isMesh) { const m = Array.isArray(q.material) ? q.material : [q.material]; out.meshes.push({ name: q.name, skinned: !!q.isSkinnedMesh, verts: q.geometry.attributes.position.count, groups: q.geometry.groups.length, mats: m.map(x => x.name + '#' + x.color.getHexString() + (x.map ? '+map' : '')), vc: !!q.geometry.attributes.color }); } if (q.isBone) out.bones.push(q.name); });
  const b = new THREE.Box3().setFromObject(o); out.size = b.getSize(new THREE.Vector3()).toArray().map(v => +v.toFixed(1));
  return out;
};
window.ready = true;
