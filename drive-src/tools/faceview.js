// test view: every baked person close up, with each facial expression (open tools/faceview.html?bin=...)
import * as THREE from 'three';
import './../src/common/gfx.js';
import { loadPeople, Actor } from '../src/common/people.js';
const Q = new URLSearchParams(location.search);
const x = new XMLHttpRequest(); x.open('GET', Q.get('bin')); x.responseType = 'arraybuffer';
x.onload = async () => {
  const P = await loadPeople(x.response), ids = (Q.get('ids') || Object.keys(P).join(',')).split(','), ex = [0, 1, 2, 3, 4, 5];
  const W = 1200, rowH = 220, H = rowH * ids.length;
  const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; document.body.appendChild(r.domElement);
  const s = new THREE.Scene(); s.background = new THREE.Color(0xcfe6f5); s.add(new THREE.HemisphereLight(0xe4f0ff, 0x9a8a6a, 2.5)); const d = new THREE.DirectionalLight(0xffeccc, 2.9); d.position.set(2, 4, 5); s.add(d, d.target);
  r.setScissorTest(true);
  ids.forEach((id, row) => ex.forEach((e, k) => {
    const a = new Actor(P[id], { tint: 0xf0e8d8, skin: 0xc68642, hair: 0x1a1210, expr: e }); a.pose(Q.get('clip') || 'idle', 0.2); a.rotation.y = Math.PI; s.add(a);
    a.geometry.computeBoundingBox(); const top = a.geometry.boundingBox.max.y;
    const cam = new THREE.PerspectiveCamera(16, (W / 6) / rowH, 0.05, 50); const hy = top - (Q.get('full') ? top / 2 : 0.16); cam.position.set(0, hy, Q.get('full') ? 8 : 1.15); cam.lookAt(0, hy, 0);
    const vx = k * W / 6, vy = H - (row + 1) * rowH; r.setViewport(vx, vy, W / 6, rowH); r.setScissor(vx, vy, W / 6, rowH); r.render(s, cam); s.remove(a);
  }));
  window.done = true;
};
x.send();
