// preview of baked people (tools/bake.mjs --view)
import * as THREE from 'three';
import { loadPeople, Actor } from '../src/people.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1400, 600); document.body.appendChild(r.domElement);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9ad4f0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.5)); const d = new THREE.DirectionalLight(0xfff0e0, 2.2); d.position.set(-3, 5, -4); scene.add(d);
const cam = new THREE.PerspectiveCamera(30, 1400 / 600, 0.1, 100);
window.view = (b64, items, camp) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const P = loadPeople(bin.buffer);
  for (const o of scene.children.filter(o => o.isMesh)) scene.remove(o);
  for (const it of items) { const a = new Actor(P[it.id], it.cols || {}); a.pose(it.clip, it.t); a.position.set(it.x, 0, it.z || 0); a.rotation.y = it.ry ?? Math.PI; a.scale.setScalar(it.s || 1); scene.add(a); }
  cam.position.set(...camp.p); cam.lookAt(...camp.l);
  r.render(scene, cam); return r.domElement.toDataURL('image/png');
};
window.ready = true;
