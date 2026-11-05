// Lord Lalchi's castle, made from the CC0 Quaternius "Medieval Village MegaKit" (built by tools/kit.mjs into
// castle.glb): stone walls with battlements, a big arched gate, four towers with conical tile roofs and a tall keep.
// It is in sections (left wall, right wall, gate, towers, keep, back). Bomb blasts throw stone chunks and dust; as its
// strength drops whole sections crack and topple; at zero everything comes down in a huge cloud.
import * as THREE from 'three';

const PI = Math.PI, rnd = (a, b) => a + Math.random() * (b - a);
export const WALL_TOP = 6.24, GATE_TOP = 8.74, TOWER_TOP = 9.36;
let SRC = null;
export function setCastleModel(scene) { SRC = scene; }
// the order sections give way as the castle weakens (fraction of strength left)
const STAGES = [['wallL', 0.66], ['wallR', 0.4], ['towerL', 0.2], ['towerR', 0.1]];

export function buildCastle(scene, T, z, hp) {
  const g = new THREE.Group(); g.position.z = z; scene.add(g);
  const root = SRC.clone(true); g.add(root);
  // each section gets a pivot at the middle of its base, so it falls over around its own foot
  const secs = {};
  for (const c of [...root.children]) { const b = new THREE.Box3().setFromObject(c), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2; const piv = new THREE.Group(); piv.name = c.name; piv.position.set(cx, 0, cz); root.add(piv); piv.add(c); c.position.set(-cx, 0, -cz); secs[c.name] = { o: piv, st: 0, t: 0, dir: Math.sign(cx) || (Math.random() < 0.5 ? -1 : 1) }; }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  // flying stone chunks (one instanced mesh, using the wall's stone texture)
  let stoneMat = null; root.traverse(o => { if (o.isMesh && !stoneMat && /UnevenBrick/.test(o.material.name)) stoneMat = o.material; });
  const chunkGeo = new THREE.BoxGeometry(0.45, 0.32, 0.4), CAP = 220;
  const chunks = new THREE.InstancedMesh(chunkGeo, stoneMat || new THREE.MeshStandardMaterial({ color: 0x9a8a7a }), CAP); chunks.frustumCulled = false; chunks.castShadow = true; chunks.count = 0; g.add(chunks);
  const flying = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const C = {
    group: g, z, hp, max: hp, down: false, front: 1.2, width: 22,
    // a bomb blast at x, y on the front: stone chunks fly out
    blast(x, y, power = 1) {
      const n = 3 + Math.round(power * 2);
      for (let i = 0; i < n; i++) { if (flying.length >= CAP) flying.shift(); flying.push({ x: x + rnd(-0.6, 0.6), y: y + rnd(-0.5, 0.5), z: 1.0, vx: rnd(-4, 4), vy: rnd(3, 8), vz: rnd(3, 8), rx: 0, rz: 0, ax: rnd(-9, 9), az: rnd(-9, 9), s: rnd(0.6, 1.4), t: 0 }); }
      const s = secs.gate; if (s && !s.st) { s.o.position.z = -0.12; }
      // whole sections give way as the castle weakens
      for (const [n, at] of STAGES) if (secs[n] && !secs[n].st && C.hp / C.max <= at) C.topple(n, 0.9);
      return n;
    },
    impact(x, y, p) { return C.blast(x, y, p); },
    topple(n, k = 1) { const s = secs[n]; if (!s || s.st) return; s.st = 1; s.t = 0; s.k = k; C.onTopple && C.onTopple(n, s.o); },
    // strength gone: everything comes down, the outer parts first
    collapse() { C.down = true; let d = 0; for (const n of ['gate', 'wallL', 'wallR', 'towerL', 'towerR', 'keep', 'back', 'backL', 'backR']) { const s = secs[n]; if (s && !s.st) { setTimeout(() => C.topple(n), d); d += 140; } } },
    update(dt) {
      for (const s of Object.values(secs)) {
        if (s.o.position.z < 0 && !s.st) s.o.position.z = Math.min(0, s.o.position.z + dt * 0.8);
        if (!s.st) continue; s.t += dt;
        // lean over, crack, then sink into the ground in a cloud of dust
        const k = Math.min(1, s.t / 1.4), tilt = k * k * 0.5 * s.k;
        s.o.rotation.z = -s.dir * tilt; s.o.rotation.x = tilt * 0.4; s.o.position.y = -Math.max(0, s.t - 0.5) * 6 * s.k;
        if (s.o.position.y < -16) s.o.visible = false;
      }
      let n = 0;
      for (let i = flying.length - 1; i >= 0; i--) {
        const c = flying[i]; c.t += dt; c.vy -= 20 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.ax * dt; c.rz += c.az * dt;
        if (c.y < 0.15) { c.y = 0.15; c.vy *= -0.3; c.vx *= 0.6; c.vz *= 0.6; c.ax *= 0.5; c.az *= 0.5; }
        if (c.t > 5) { flying.splice(i, 1); continue; }
        _e.set(c.rx, 0, c.rz); _q.setFromEuler(_e); chunks.setMatrixAt(n++, _m.compose(_p.set(c.x, c.y, c.z), _q, _s.setScalar(c.s)));
      }
      chunks.count = n; chunks.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(g); },
  };
  return C;
}
