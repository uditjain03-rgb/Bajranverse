// Vehicles from the Kenney kits (CC0): cars and karts with spinning, steering wheels; boats. Kenney models face +z,
// the games drive towards -z, so every vehicle sits in a holder turned around.
import * as THREE from 'three';
import { kit } from './track.js';
export const CAR_S = 1.65, BOAT_S = 1.4;
export function makeVehicle(name, s = CAR_S) {
  const holder = new THREE.Group(), o = kit(name, s); o.rotation.y = Math.PI; holder.add(o);
  const wheels = [], front = []; o.traverse(q => { if (/^wheel/.test(q.name)) { wheels.push(q); if (/front/.test(q.name)) front.push(q); } q.frustumCulled = false; });
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
  return { obj: holder, model: o, wheels, front, size, r: 0.3 * s, steer: 0 };
}
export function driveWheels(V, dist, steer) { for (const w of V.wheels) w.rotation.x += dist / V.r; for (const w of V.front) w.rotation.y = steer; }
