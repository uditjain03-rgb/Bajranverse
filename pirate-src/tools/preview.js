import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1200, 500); document.body.appendChild(r.domElement);
r.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x87c8ee);
scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 4, 3); scene.add(d);
const cam = new THREE.PerspectiveCamera(30, 1200 / 500, 0.1, 100); cam.position.set(0, 1.6, 15); cam.lookAt(0, 1.7, 0);
let x = -4.5;
window.add = (b64, clip, t, colors) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const o = new FBXLoader().parse(bin.buffer, '');
  o.scale.setScalar(0.01); o.position.x = x; x += 1.5; scene.add(o);
  const names = [];
  o.traverse(q => { if (q.isMesh) { const ms = Array.isArray(q.material) ? q.material : [q.material]; q.material = ms.map(m => { names.push(m.name); return new THREE.MeshStandardMaterial({ color: colors[m.name] ?? 0xff00ff, roughness: 0.8 }); }); } });
  const mx = new THREE.AnimationMixer(o); const a = o.animations.find(a => a.name.endsWith(clip)); if (a) { mx.clipAction(a).play(); mx.update(t); }
  return names;
};
window.shot = () => { r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
window.ready = true;
