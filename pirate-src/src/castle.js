// Lord Lalchi's fortress, built from about 1,800 real stone blocks (one instanced mesh): a front wall with
// battlements, a tall gatehouse with an arched gate and portcullis, four round corner towers with pointed roofs,
// side walls, and a high central keep with Lalchi's gold-coin banner. Bombs blow blocks out of the front; blocks with
// nothing under them fall; when its strength runs out the whole fortress comes down.
import * as THREE from 'three';
import { flat, mesh, canvasTex } from './world.js';

const PI = Math.PI, BW = 0.9, BH = 0.55, BD = 0.9, rnd = (a, b) => a + Math.random() * (b - a);
export const WALL_TOP = 9 * BH, GATE_TOP = 13 * BH, TOWER_TOP = 16 * BH;
export function buildCastle(scene, T, z, hp) {
  const g = new THREE.Group(); g.position.z = z; scene.add(g);
  const bricks = [], cells = new Map();
  const key = (s, i, j, k) => s + ':' + i + ',' + j + ',' + k;
  const add = (s, i, j, k, x, y, zz, o = {}) => { const b = { s0: s, i, j, k, x, y, z: zz, ry: o.ry || 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, ax: 0, az: 0, st: 0, delay: 0, tint: o.tint ?? 1, front: !!o.front, sc: o.sc || 1 }; bricks.push(b); cells.set(key(s, i, j, k), b); };
  // front wall (13 wide, 9 high, 2 deep) with battlements
  for (let j = 0; j < 9; j++) for (let i = -6; i <= 6; i++) for (let k = 0; k < 2; k++) {
    if (Math.abs(i) <= 2) continue;   // the gatehouse goes here
    add('w', i, j, k, i * BW + (j % 2 ? BW * 0.25 : 0), BH / 2 + j * BH, -k * BD, { front: k === 0 });
  }
  for (let i = -6; i <= 6; i += 2) if (Math.abs(i) > 2) add('w', i, 9, 0, i * BW, BH / 2 + 9 * BH, 0, { tint: 0.92, front: true });
  // gatehouse: 5 wide, 13 high, sticking out in front of the wall, with an arched gate
  for (let j = 0; j < 13; j++) for (let i = -2; i <= 2; i++) for (let k = -1; k < 2; k++) {
    const arch = Math.abs(i) <= 1 && (j < 4 || (j === 4 && i === 0));
    if (arch) continue;
    add('g', i, j, k, i * BW + (j % 2 ? BW * 0.2 : 0), BH / 2 + j * BH, -k * BD, { front: k === -1, tint: 0.97 });
  }
  for (let i = -2; i <= 2; i += 2) add('g', i, 13, -1, i * BW, BH / 2 + 13 * BH, BD, { tint: 0.9, front: true });
  // round towers: front corners (16 high) and back corners (14 high), with crenels on top
  const tower = (s, cx, cz, h, front) => {
    for (let j = 0; j < h; j++) for (let a = 0; a < 12; a++) { const ang = (a + (j % 2) * 0.5) / 12 * PI * 2, r = 1.9; add(s, a, j, 0, cx + Math.cos(ang) * r, BH / 2 + j * BH, cz + Math.sin(ang) * r, { ry: -ang, tint: 0.95, front: front && Math.sin(ang) > -0.2 }); }
    for (let a = 0; a < 12; a += 2) { const ang = a / 12 * PI * 2, r = 1.9; add(s, a, h, 0, cx + Math.cos(ang) * r, BH / 2 + h * BH, cz + Math.sin(ang) * r, { ry: -ang, tint: 0.88, front }); }
  };
  tower('tl', -7.6, -0.4, 16, true); tower('tr', 7.6, -0.4, 16, true); tower('bl', -7.6, -10.5, 14, false); tower('br', 7.6, -10.5, 14, false);
  // side walls running back
  for (const s of [-1, 1]) for (let j = 0; j < 9; j++) for (let k = 0; k < 9; k++) add('s' + s, 0, j, k, s * 7.6, BH / 2 + j * BH, -2.4 - k * BW - (j % 2 ? 0.25 : 0), { ry: PI / 2, tint: 0.93 });
  // the keep: a tall square tower in the middle (hollow), 7 x 5 blocks, 20 high
  for (let j = 0; j < 20; j++) for (let i = -3; i <= 3; i++) for (let k = 0; k < 5; k++) {
    if (i > -3 && i < 3 && k > 0 && k < 4) continue;
    add('k', i, j, k, i * BW, BH / 2 + j * BH, -4.6 - k * BW, { tint: 1.03 });
  }
  for (let i = -3; i <= 3; i += 2) for (const k of [0, 4]) add('k', i, 20, k, i * BW, BH / 2 + 20 * BH, -4.6 - k * BW, { tint: 0.95 });
  // the blocks: one instanced mesh, each block a little different in colour
  const geo = new THREE.BoxGeometry(BW * 0.96, BH * 0.93, BD * 0.96);
  const stone = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#d8d4cc'; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const v = 170 + Math.random() * 70; c.fillStyle = `rgba(${v},${v},${v * 0.97},.5)`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 3); } c.strokeStyle = 'rgba(70,60,50,.55)'; c.lineWidth = 3; c.strokeRect(1, 1, w - 2, h - 2); });
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: stone, roughness: 0.92 }), bricks.length);
  inst.castShadow = true; inst.receiveShadow = true; inst.frustumCulled = false; g.add(inst);
  const base = new THREE.Color(T.castle[0]), c = new THREE.Color();
  bricks.forEach((b, n) => { c.copy(base).multiplyScalar(b.tint * rnd(0.8, 1.06)); inst.setColorAt(n, c); });
  // the gate (wooden doors and an iron portcullis), roofs, banners
  const doorM = flat(0x6a4020), ironM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 });
  const door = new THREE.Group(); door.position.set(0, 0, BD * 1.2); g.add(door);
  mesh(new THREE.BoxGeometry(2.6, 2.4, 0.25), doorM, 0, 1.2, 0, door);
  for (let i = -2; i <= 2; i++) mesh(new THREE.BoxGeometry(0.09, 2.6, 0.12), ironM, i * 0.55, 1.3, 0.2, door);
  for (const y of [0.6, 1.4, 2.2]) mesh(new THREE.BoxGeometry(2.7, 0.09, 0.12), ironM, 0, y, 0.2, door);
  const roofM = flat(T.castle[1]), roofs = [];
  for (const [x, zz, h] of [[-7.6, -0.4, 16], [7.6, -0.4, 16], [-7.6, -10.5, 14], [7.6, -10.5, 14]]) { const r = mesh(new THREE.ConeGeometry(2.5, 3.6, 12), roofM, x, h * BH + 2.4, zz, g); r.userData.v = new THREE.Vector3(); roofs.push(r); }
  const keepRoof = mesh(new THREE.ConeGeometry(4.6, 4.2, 4), roofM, 0, 21 * BH + 2.4, -6.4, g); keepRoof.rotation.y = PI / 4; keepRoof.userData.v = new THREE.Vector3(); roofs.push(keepRoof);
  const coinTex = canvasTex(128, 160, (cx, w, h) => { cx.fillStyle = '#7a1a8a'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#ffd23f'; cx.fillRect(0, 0, w, 10); cx.fillRect(0, h - 10, w, 10); cx.beginPath(); cx.arc(w / 2, h / 2, 40, 0, 7); cx.fill(); cx.fillStyle = '#c88a00'; cx.font = 'bold 54px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('₹', w / 2, h / 2 + 3); });
  const banner = mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshStandardMaterial({ map: coinTex, side: THREE.DoubleSide }), 0, 15 * BH, -4.6 + BD * 0.5 + 0.02, g);
  const flagTex = canvasTex(128, 80, (cx, w, h) => { cx.fillStyle = '#7a1a8a'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#ffd23f'; cx.beginPath(); cx.arc(w / 2, h / 2, 24, 0, 7); cx.fill(); });
  const flags = roofs.map(r => { const f = new THREE.Group(); f.position.set(r.position.x, r.position.y + 1.7, r.position.z); g.add(f); mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 5), flat(0x5a3a2a), 0, 1, 0, f); mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }), 0.7, 1.5, 0, f); return f; });
  // torches by the gate
  const fire = [];
  for (const s of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), flat(0x4a3020), s * 1.9, 2.8, BD * 1.6, g); const f = mesh(new THREE.ConeGeometry(0.16, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0xffa020 }), s * 1.9, 3.35, BD * 1.6, g); fire.push(f); }
  const light = new THREE.PointLight(0xffa040, 6, 9, 1.6); light.position.set(0, 3.4, 2.4); g.add(light);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  let dirty = true;
  const C = {
    group: g, z, hp, max: hp, down: false, front: BD * 1.45, width: 14,
    // blocks above a hole lose their support and fall
    loosen(b) { for (let j = b.j + 1; j < 22; j++) { const q = cells.get(key(b.s0, b.i, j, b.k)); if (!q || q.st) continue; q.st = 1; q.delay = (j - b.j) * 0.04; q.vx = rnd(-1, 1); q.vz = rnd(0, 2); cells.delete(key(q.s0, q.i, j, q.k)); } },
    // a bomb blast at x, y on the front: blocks fly out
    blast(x, y, power = 1) {
      let n = 0; const R = 0.8 + power * 0.35, max = 3 + power * 3;
      for (const b of bricks) if (!b.st && b.front && Math.abs(b.x - x) < R && Math.abs(b.y - y) < R) {
        b.st = 1; const dx = b.x - x, dy = b.y - y; b.vx = dx * 5 + rnd(-2, 2); b.vy = dy * 4 + rnd(3, 8); b.vz = rnd(3, 9); b.ax = rnd(-9, 9); b.az = rnd(-9, 9); cells.delete(key(b.s0, b.i, b.j, b.k)); C.loosen(b); n++; dirty = true;
        if (n >= max) break;
      }
      door.position.z = BD * 1.2 - Math.random() * 0.2; door.rotation.z = rnd(-0.06, 0.06);
      return n;
    },
    impact(x, y, p) { return C.blast(x, y, p); },
    // strength gone: everything comes down, tops first, in a big cloud
    collapse() {
      C.down = true; dirty = true;
      for (const b of bricks) if (!b.st) { b.st = 1; b.delay = Math.max(0, 0.7 - b.y * 0.04) + Math.random() * 0.6; b.vx = b.x * rnd(0.15, 0.5) + rnd(-1, 1); b.vy = rnd(0, 4); b.vz = rnd(-2, 4); b.ax = rnd(-5, 5); b.az = rnd(-5, 5); }
      roofs.forEach(r => { r.userData.v.set(Math.sign(r.position.x || rnd(-1, 1)) * rnd(2, 4), rnd(4, 7), -rnd(3, 6)); r.userData.sink = 0; });
      banner.userData.fall = true; door.userData.fall = true; light.intensity = 0;
    },
    update(dt) {
      let moving = false;
      for (const b of bricks) {
        if (b.st !== 1) continue; moving = true;
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.vy -= 22 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.ax * dt; b.rz += b.az * dt;
        if (b.y < BH / 2) { b.y = BH / 2; b.vy *= -0.3; b.vx *= 0.55; b.vz *= 0.55; b.ax *= 0.5; b.az *= 0.5; if (Math.abs(b.vy) < 0.8 && Math.hypot(b.vx, b.vz) < 0.6) { b.st = 2; b.rx = Math.round(b.rx / (PI / 2)) * PI / 2; b.rz = Math.round(b.rz / (PI / 2)) * PI / 2; } }
      }
      if (moving || dirty) { bricks.forEach((b, n) => { _e.set(b.rx, b.ry, b.rz); _q.setFromEuler(_e); _m.compose(_p.set(b.x, b.y, b.z), _q, _s); inst.setMatrixAt(n, _m); }); inst.instanceMatrix.needsUpdate = true; dirty = false; }
      for (const r of roofs) if (r.userData.v.lengthSq() > 0) { r.userData.v.y -= 20 * dt; r.position.addScaledVector(r.userData.v, dt); r.rotation.z += dt * 2; if (r.position.y < 1.2) { r.position.y = 1.2; r.userData.v.set(0, 0, 0); r.userData.sink = 1; } }
      for (const r of roofs) if (r.userData.sink) r.position.y = Math.max(-4, r.position.y - dt * 1.2);
      if (door.userData.fall) { door.rotation.x = Math.min(PI / 2, door.rotation.x + dt * 3); door.position.y = Math.max(0.15, door.position.y - dt * 3); }
      if (banner.userData.fall) { banner.position.y = Math.max(0.3, banner.position.y - dt * 6); banner.rotation.x = Math.min(PI / 2, banner.rotation.x + dt * 2); }
      const t = performance.now() / 1000;
      flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.25; if (C.down) { f.rotation.z = Math.min(PI / 2.2, f.rotation.z + dt * 2); f.position.y = Math.max(1, f.position.y - dt * 5); } });
      fire.forEach((f, i) => { f.scale.set(1, 0.8 + Math.sin(t * 17 + i * 2) * 0.25, 1); f.visible = !C.down; });
    },
    dispose() { scene.remove(g); geo.dispose(); },
  };
  C.update(0);
  return C;
}
