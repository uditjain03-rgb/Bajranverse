// preview sheet of the vehicles: tools/carview.html?list=type:color,...
import * as THREE from 'three';
import '../src/common/gfx.js';
import { makeCar, makeBoat } from '../src/common/cars.js';
const Q = new URLSearchParams(location.search), list = (Q.get('list') || 'padmini:k,sedan:0xc8302a,hatch:0x2a6ad8,suv:0xf4f4f4,sports:0xff7a1a,gypsy:p,auto:0x2a9a3a,bus:0xc8202a,truck:0xff7a1a').split(','), cols = +(Q.get('cols') || 3), S = 300;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); const rows = Math.ceil(list.length / cols); R.setSize(cols * S, rows * S); document.body.appendChild(R.domElement); R.setScissorTest(true);
const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xe4f0ff, 0x9a8a6a, 2.5)); const sun = new THREE.DirectionalLight(0xffeccc, 2.9); sun.position.set(-8, 22, 10); scene.add(sun); const rim = new THREE.DirectionalLight(0x9ac8ff, 0.7); rim.position.set(6, 6, -10); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: Q.get('water') ? 0x2a8ad8 : 0x8a8a8e })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
scene.background = new THREE.Color(0xbfe0ff);
const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
list.forEach((it, i) => {
  const [t, c] = it.split(':'); const boat = ['speed', 'cigarette', 'airboat', 'jetski', 'catamaran'].includes(t);
  const V = boat ? makeBoat(t, +c || 0xe8302a) : makeCar(t, +c || 0xc8302a, { spin: 1, rims: Q.get('rims') || undefined, neon: Q.get('neon') ? +Q.get('neon') : undefined, wing: Q.get('wing') === '1', stripe: Q.get('stripe') ? +Q.get('stripe') : undefined, decal: Q.get('decal') || undefined, roofItem: Q.get('roof') || undefined, tint: Q.get('tint') ? +Q.get('tint') : undefined, tanker: Q.get('tanker') || undefined, school: Q.get('school') === '1', livery: c === 'a' ? 'ambulance' : c === 'k' ? 'kaalipeeli' : c === 'p' ? 'police' : c === 'c' ? 'coolcab' : c === 'e' ? 'ecab' : null, taxi: Q.get('taxi') === '1' || c === 'k' || c === 'c' || c === 'e' });
  scene.add(V.obj); if (boat) V.obj.position.y = 0.35;
  const L = Math.max(V.size.z, 3); const ang = +(Q.get('ang') || 0.75);
  cam.position.set(Math.sin(ang) * L * 1.25, L * (+(Q.get('h') || 0.55)), -Math.cos(ang) * L * 1.25); cam.lookAt(0, V.size.y * 0.35, 0);
  const x = (i % cols) * S, y = (rows - 1 - Math.floor(i / cols)) * S; R.setViewport(x, y, S, S); R.setScissor(x, y, S, S); R.render(scene, cam); scene.remove(V.obj);
});
window.done = true;
