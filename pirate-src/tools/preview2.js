// preview of the Universal Base Characters + outfits + animation library (served from a local folder)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1400, 700); document.body.appendChild(r.domElement);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9ad4f0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.6)); const d = new THREE.DirectionalLight(0xfff0e0, 2.2); d.position.set(3, 5, 6); scene.add(d);
const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
const L = new GLTFLoader(), load = u => L.loadAsync(u);
let anims = null;
window.add = async (parts, x, clip, t, opts = {}) => {
  if (!anims) anims = (await load(window.BASE + 'Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb')).animations;
  const grp = new THREE.Group(); grp.position.x = x; grp.rotation.y = opts.ry || 0; scene.add(grp);
  const info = [];
  for (const p of parts) {
    const g = await load(window.BASE + p.file); const root = g.scene; grp.add(root);
    root.traverse(o => { if (o.isMesh) { info.push(o.name + ':' + (o.geometry.index ? o.geometry.index.count / 3 : 0) + ':' + (o.material.name || '')); if (p.only && !p.only.includes(o.name)) o.visible = false; if (p.headOnly && o.isSkinnedMesh) clipHead(o, p.headOnly); } });
    const mx = new THREE.AnimationMixer(root); const a = anims.find(a => a.name === clip); if (a) { mx.clipAction(a).play(); mx.update(t); }
  }
  return info;
};
function clipHead(m, y) {   // keep only triangles above y (bind pose)
  const g = m.geometry, p = g.attributes.position, idx = g.index.array, keep = [];
  for (let i = 0; i < idx.length; i += 3) { if (p.getY(idx[i]) > y && p.getY(idx[i + 1]) > y && p.getY(idx[i + 2]) > y) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
  g.setIndex(keep);
}
window.shot = (p, l) => { cam.position.set(...p); cam.lookAt(...l); r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
window.ready = true;
