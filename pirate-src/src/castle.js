// The Admiral's sea fort, built from a few hundred real bricks (one instanced mesh). Every goat that headbutts it
// knocks bricks flying; bricks with nothing under them fall; when its strength runs out the whole castle crumbles.
import * as THREE from 'three';
import { flat, mesh, canvasTex } from './world.js';

const PI = Math.PI, BW = 0.9, BH = 0.55, BD = 0.9, rnd = (a, b) => a + Math.random() * (b - a);
export function buildCastle(scene, T, z, hp) {
  const g = new THREE.Group(); g.position.z = z; scene.add(g);
  const bricks = [], cells = new Map();
  const key = (i, j, k) => i + ',' + j + ',' + k;
  const addBrick = (i, j, k, x, y, zz, tint = 1) => { const b = { i, j, k, x, y, z: zz, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, s: 0, delay: 0, tint }; bricks.push(b); cells.set(key(i, j, k), b); };
  // the front wall (13 wide, 9 high, 2 deep) with a gate in the middle
  for (let j = 0; j < 9; j++) for (let i = -6; i <= 6; i++) for (let k = 0; k < 2; k++) {
    if (Math.abs(i) <= 1 && j < 4) continue;
    addBrick(i, j, k, i * BW + (j % 2 ? BW * 0.25 : 0), BH / 2 + j * BH, -k * BD);
  }
  for (let i = -6; i <= 6; i += 2) addBrick(i, 9, 0, i * BW, BH / 2 + 9 * BH, 0, 0.92);   // battlements
  // two towers (a ring of bricks, 15 high) at the ends
  for (const s of [-1, 1]) for (let j = 0; j < 15; j++) for (let a = 0; a < 10; a++) {
    const ang = a / 10 * PI * 2, r = 1.6; addBrick(100 * s + a, j, 0, s * 7.4 + Math.cos(ang) * r, BH / 2 + j * BH, -0.5 + Math.sin(ang) * r, 0.95);
  }
  const geo = new THREE.BoxGeometry(BW * 0.97, BH * 0.95, BD * 0.97);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), bricks.length);
  inst.castShadow = true; inst.receiveShadow = true; inst.frustumCulled = false; g.add(inst);
  const base = new THREE.Color(T.castle[0]), c = new THREE.Color();
  bricks.forEach((b, n) => { c.copy(base).multiplyScalar(b.tint * rnd(0.82, 1.05)); inst.setColorAt(n, c); });
  // the gate door, tower roofs and the Wolf King's banners
  const door = mesh(new THREE.BoxGeometry(2.6, 2.2, 0.3), flat(0x6a4020), 0, 1.1, 0.2, g);
  const roofs = [-1, 1].map(s => { const r = mesh(new THREE.ConeGeometry(2.3, 3.2, 8), flat(T.castle[1]), s * 7.4, 15 * BH + 1.6, -0.5, g); r.userData.v = new THREE.Vector3(); return r; });
  const flagTex = canvasTex(128, 80, (cx, w, h) => { cx.fillStyle = '#1a3a8a'; cx.fillRect(0, 0, w, h); cx.font = '54px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⚓', w / 2, h / 2 + 4); });
  const flags = [-1, 1].map(s => { const f = new THREE.Group(); f.position.set(s * 7.4, 15 * BH + 3.2, -0.5); g.add(f); mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 5), flat(0x5a3a2a), 0, 1, 0, f); mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }), 0.7, 1.5, 0, f); return f; });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  const C = {
    group: g, z, hp, max: hp, down: false, front: 0.5, width: 12,
    // bricks above a hole lose their support and fall
    loosen(b) { for (let j = b.j + 1; j < 20; j++) { const q = cells.get(key(b.i, j, b.k)); if (!q || q.s) break; q.s = 1; q.delay = (j - b.j) * 0.04; q.vx = rnd(-1, 1); q.vz = rnd(-1, 1); cells.delete(key(q.i, j, q.k)); } },
    // a goat headbutt at x, y on the front face
    impact(x, y, power = 1) {
      let n = 0; const R = 0.9 + power * 0.25;
      for (const b of bricks) if (!b.s && Math.abs(b.x - x) < R && Math.abs(b.y - y) < R && b.k === 0 && b.i < 50) {
        b.s = 1; b.vx = (b.x - x) * 4 + rnd(-1, 1); b.vy = rnd(3, 7); b.vz = -rnd(2, 7); b.ax = rnd(-8, 8); b.az = rnd(-8, 8); cells.delete(key(b.i, b.j, b.k)); C.loosen(b); n++;
        if (n > 3 + power) break;
      }
      door.position.z = 0.2 - Math.random() * 0.15; door.rotation.z = rnd(-0.06, 0.06);
      return n;
    },
    // strength gone: everything comes down, tops first, in a big cloud
    collapse() {
      C.down = true;
      for (const b of bricks) if (!b.s) { b.s = 1; b.delay = Math.max(0, 0.6 - b.y * 0.05) + Math.random() * 0.5; b.vx = (b.x) * rnd(0.2, 0.7); b.vy = rnd(0, 4); b.vz = rnd(-3, 3); b.ax = rnd(-5, 5); b.az = rnd(-5, 5); }
      roofs.forEach((r, i) => { r.userData.v.set(i ? 3 : -3, 7, rnd(-2, 2)); });
      door.userData.fall = true;
    },
    update(dt) {
      for (const b of bricks) {
        if (b.s !== 1) continue;
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.vy -= 22 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.ax * dt; b.rz += b.az * dt;
        if (b.y < BH / 2) { b.y = BH / 2; b.vy *= -0.3; b.vx *= 0.55; b.vz *= 0.55; b.ax *= 0.5; b.az *= 0.5; if (Math.abs(b.vy) < 0.8 && Math.hypot(b.vx, b.vz) < 0.6) { b.s = 2; b.rx = Math.round(b.rx / (PI / 2)) * PI / 2; b.rz = Math.round(b.rz / (PI / 2)) * PI / 2; } }
      }
      bricks.forEach((b, n) => { _e.set(b.rx, b.ry, b.rz); _q.setFromEuler(_e); _m.compose(_p.set(b.x, b.y, b.z), _q, _s); inst.setMatrixAt(n, _m); });
      inst.instanceMatrix.needsUpdate = true;
      for (const r of roofs) if (r.userData.v.lengthSq() > 0) { r.userData.v.y -= 20 * dt; r.position.addScaledVector(r.userData.v, dt); r.rotation.z += dt * 3; if (r.position.y < 1) { r.position.y = 1; r.userData.v.set(0, 0, 0); } }
      if (door.userData.fall) { door.rotation.x = Math.min(PI / 2, door.rotation.x + dt * 3); door.position.y = Math.max(0.15, door.position.y - dt * 3); }
      flags.forEach((f, i) => { f.rotation.y = Math.sin(performance.now() / 300 + i) * 0.2; if (C.down) { f.rotation.z = Math.min(PI / 2.2, f.rotation.z + dt * 2) * (i ? 1 : -1) * (i ? 1 : -1); f.position.y = Math.max(1, f.position.y - dt * 4); } });
    },
    dispose() { scene.remove(g); geo.dispose(); },
  };
  C.update(0);
  return C;
}
