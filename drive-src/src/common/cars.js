// Real-looking vehicles, made in code (no toy models): bodies with true car proportions, rounded edges, glossy paint,
// tinted glass with sky reflections, chrome, rubber tyres, glowing lamps. Indian traffic: the kaali-peeli taxi, the
// cool-cab, hatchbacks, sedans, SUVs, the auto-rickshaw, the red double-decker bus, the painted "Horn OK Please" truck,
// the police Gypsy. And boats for Splash Racer: speedboats, the racing "cigarette" boat, the airboat, the jet ski.
// Each vehicle is a body mesh (paint + glass + trim in one draw call, vertex colours + a gloss value per vertex), a lamp
// mesh, and wheels. Vehicles face -z (the way the games drive). makeCar returns { obj, model, wheels, front, size, r }.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex } from './gfx.js';
const PI = Math.PI;
const _c = new THREE.Color();
const BODY = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32 });
const LAMP = new THREE.MeshBasicMaterial({ vertexColors: true });
const BOATM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, side: THREE.DoubleSide });
// ---------------- geometry helpers ----------------
// paint a geometry: colour and gloss (0 matte … 1 mirror) on every vertex; non-indexed so everything merges
function part(geo, col, gloss = 0.5, smooth = false) {
  let g = geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (smooth) { g = mergeVertices(g.index ? g.toNonIndexed() : g, 1e-4); g.computeVertexNormals(); }
  if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count, c = new Float32Array(n * 3), s = new Float32Array(n); _c.set(col);
  for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; s[i] = gloss; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('gloss', new THREE.BufferAttribute(s, 1)); return g;
}
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return g; };
const rbox = (w, h, d, r, x, y, z) => { const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b); s.quadraticCurveTo(w / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b); s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r * 0.6, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.3, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -(d - 2 * r * 0.6) / 2); g.translate(x, y, z); return g; };
const cyl = (r1, r2, h, seg, x, y, z, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); return g; };
// a thin bar between two points (pillars, trims, rails)
function beam(a, b, t, tz = t) { const d = new THREE.Vector3().subVectors(b, a), g = new THREE.BoxGeometry(t, d.length(), tz); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// a side profile (s along the car, + = front; y up) extruded across the width, turned so the front faces -z,
// with rounded edges, the top pulled in (tumblehome) and the corners rounded in plan view
function extrudeSide(shape, W, o = {}) {
  const bv = o.bevel ?? 0.07;
  const g = new THREE.ExtrudeGeometry(shape, { depth: W - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * 0.7, bevelSegments: 3, curveSegments: o.seg || 10 });
  g.translate(0, 0, -(W - 2 * bv) / 2); g.rotateY(PI / 2);   // shape x (s) → -z, extrusion → x
  const p = g.attributes.position, L2 = o.L / 2;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); const y = p.getY(i), z = p.getZ(i);
    if (o.tumble) { const k = Math.min(1, Math.max(0, (y - o.tumble[0]) / (o.tumble[1] - o.tumble[0]))); x *= 1 - o.tumble[2] * k; }
    if (o.round) { const e = Math.abs(z) - (L2 - o.round[0]); if (e > 0) x *= 1 - o.round[1] * (e / o.round[0]) ** 2; }
    p.setX(i, x);
  }
  g.deleteAttribute('uv'); return g;
}
// ---------------- wheels ----------------
const wheelCache = {};
function wheelGeo(R, w, kind) {
  const k = R.toFixed(2) + w + kind; if (wheelCache[k]) return wheelCache[k];
  const parts = [part(cyl(R, R, w, 22, 0, 0, 0, 0, PI / 2), 0x1c1c1e, 0.08), part(cyl(R * 0.94, R * 0.94, w + 0.01, 22, 0, 0, 0, 0, PI / 2), 0x2a2a2c, 0.05)];
  if (kind === 'offroad') for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; parts.push(part(box(w + 0.03, 0.07, R * 0.22, 0, Math.cos(a) * R, Math.sin(a) * R, a, 0, 0), 0x18181a, 0.05)); }
  const rimC = { chrome: 0xe8eef4, black: 0x2a2a30, gold: 0xffc21a, sport: 0x1a1a1e, steel: 0x8a9098, offroad: 0x3a3a40 }[kind] ?? 0xb8bec6;
  if (kind === 'sport') for (const s of [-1, 1]) { const t = new THREE.TorusGeometry(R * 0.66, 0.012, 4, 24); t.rotateY(PI / 2); t.translate(s * (w / 2 + 0.012), 0, 0); parts.push(part(t, 0xe8202a, 0.6)); }
  for (const s of [-1, 1]) {
    parts.push(part(cyl(R * 0.62, R * 0.62, 0.02, 16, s * (w / 2 + 0.005), 0, 0, 0, PI / 2), rimC, 0.9));
    parts.push(part(cyl(R * 0.2, R * 0.24, 0.05, 10, s * (w / 2 + 0.02), 0, 0, 0, PI / 2), kind === 'chrome' ? 0xffffff : 0x8a9098, 0.9));
    const ns = kind === 'sport' ? 10 : kind === 'gold' ? 7 : kind === 'steel' ? 0 : 5; if (kind !== 'chrome') for (let i = 0; i < ns; i++) { const a = i / ns * PI * 2; parts.push(part(box(0.03, R * 0.42, kind === 'sport' ? 0.04 : 0.07, s * (w / 2 + 0.015), Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38, a, 0, 0), kind === 'gold' ? 0xffd84a : kind === 'sport' ? 0x3a3a40 : 0x6a7078, 0.7)); }
  }
  return (wheelCache[k] = mergeGeometries(parts));
}
// ---------------- the car types (real dimensions in metres) ----------------
// L length, W width, H height, wb wheelbase, R wheel radius, clr ground clearance, belt (window line), hood/trunk
// heights, ws/rw: where the windscreen / rear window meet the body (s), rake: how far the roof starts behind them
export const CARS = {
  padmini: { L: 4.0, W: 1.6, H: 1.48, wb: 2.4, R: 0.31, clr: 0.22, belt: 0.92, hoodF: 0.78, trunk: 0.86, ws: 0.62, wsTop: 0.08, rw: -1.38, rwTop: -1.02, trunkEnd: -1.95, tumble: 0.16, wheel: 'chrome', box: 1, grille: 'chrome', round: [0.45, 0.1] },
  sedan: { L: 4.45, W: 1.75, H: 1.47, wb: 2.6, R: 0.33, clr: 0.17, belt: 0.95, hoodF: 0.74, trunk: 0.93, ws: 0.78, wsTop: -0.08, rw: -1.6, rwTop: -1.12, trunkEnd: -2.15, tumble: 0.2, wheel: 'alloy', grille: 'black', round: [0.5, 0.12] },
  hatch: { L: 3.85, W: 1.7, H: 1.52, wb: 2.45, R: 0.31, clr: 0.17, belt: 0.95, hoodF: 0.76, trunk: 0.98, ws: 0.75, wsTop: -0.02, rw: -1.8, rwTop: -1.48, trunkEnd: -1.9, tumble: 0.2, wheel: 'alloy', grille: 'black', round: [0.45, 0.12] },
  suv: { L: 4.55, W: 1.85, H: 1.9, wb: 2.7, R: 0.38, clr: 0.28, belt: 1.18, hoodF: 1.02, trunk: 1.2, ws: 0.82, wsTop: 0.25, rw: -2.18, rwTop: -2.08, trunkEnd: -2.26, tumble: 0.1, wheel: 'black', grille: 'chrome', boxy: 1, round: [0.35, 0.08] },
  sports: { L: 4.5, W: 1.92, H: 1.2, wb: 2.65, R: 0.34, clr: 0.12, belt: 0.78, hoodF: 0.58, trunk: 0.8, ws: 0.55, wsTop: -0.32, rw: -1.7, rwTop: -1.02, trunkEnd: -2.2, tumble: 0.26, wheel: 'black', grille: 'black', round: [0.6, 0.16] },
  // the player's cars
  supercar: { L: 4.55, W: 1.98, H: 1.17, wb: 2.68, R: 0.35, clr: 0.11, belt: 0.76, hoodF: 0.55, trunk: 0.8, ws: 0.5, wsTop: -0.42, rw: -1.5, rwTop: -0.98, trunkEnd: -2.2, tumble: 0.22, wheel: 'sport', grille: 'black', round: [0.7, 0.2], intakes: 1, diffuser: 1, quadEx: 1, tw: 0.27 },
  muscle: { L: 4.85, W: 1.95, H: 1.36, wb: 2.85, R: 0.36, clr: 0.14, belt: 0.9, hoodF: 0.8, trunk: 0.92, ws: 0.6, wsTop: -0.12, rw: -1.42, rwTop: -1.02, trunkEnd: -2.3, tumble: 0.16, wheel: 'alloy', grille: 'black', round: [0.35, 0.06], scoop: 1, quad: 1, tw: 0.26 },
  thar: { L: 3.99, W: 1.82, H: 1.93, wb: 2.45, R: 0.4, clr: 0.3, belt: 1.15, hoodF: 1.08, trunk: 1.15, ws: 0.78, wsTop: 0.68, rw: -1.93, rwTop: -1.93, trunkEnd: -1.96, tumble: 0.02, wheel: 'offroad', grille: 'black', boxy: 1, box: 1, round: [0.12, 0.02], roof: 0x16161a, flares: 1, spare: 1, slots: 1, step: 1, tw: 0.27 },
  creta: { L: 4.3, W: 1.79, H: 1.64, wb: 2.61, R: 0.36, clr: 0.2, belt: 1.04, hoodF: 0.95, trunk: 1.08, ws: 0.86, wsTop: 0.02, rw: -1.86, rwTop: -1.6, trunkEnd: -2.1, tumble: 0.13, wheel: 'alloy', grille: 'chrome', round: [0.4, 0.1], rails: 1, cladding: 1, drl: 1, tw: 0.23 },
  monster: { L: 4.4, W: 2.1, H: 2.42, wb: 2.75, R: 0.62, clr: 0.72, belt: 1.62, hoodF: 1.52, trunk: 1.62, ws: 0.9, wsTop: 0.74, rw: -2.0, rwTop: -2.0, trunkEnd: -2.15, tumble: 0.03, wheel: 'offroad', grille: 'black', boxy: 1, box: 1, round: [0.15, 0.03], roof: 0x16161a, flares: 1, lightbar: 1, step: 1, tw: 0.42 },
  // more traffic: a small van (also the ambulance), a pickup with its load
  van: { L: 3.75, W: 1.5, H: 1.86, wb: 2.35, R: 0.29, clr: 0.18, belt: 1.02, hoodF: 0.92, trunk: 1.02, ws: 1.45, wsTop: 1.08, rw: -1.82, rwTop: -1.82, trunkEnd: -1.86, tumble: 0.05, wheel: 'steel', grille: 'black', boxy: 1, round: [0.25, 0.06] },
  pickup: { L: 4.95, W: 1.78, H: 1.82, wb: 3.0, R: 0.37, clr: 0.26, belt: 1.1, hoodF: 1.02, trunk: 1.1, ws: 1.05, wsTop: 0.68, rw: -0.32, rwTop: -0.28, trunkEnd: -2.4, tumble: 0.06, wheel: 'black', grille: 'chrome', boxy: 1, round: [0.2, 0.04], bed: 1, tw: 0.24 },
  gypsy: { L: 4.0, W: 1.6, H: 1.85, wb: 2.37, R: 0.36, clr: 0.3, belt: 1.12, hoodF: 1.02, trunk: 1.12, ws: 0.62, wsTop: 0.56, rw: -1.95, rwTop: -1.95, trunkEnd: -1.98, tumble: 0.03, wheel: 'black', grille: 'black', boxy: 1, round: [0.2, 0.04] },
};
// colours of the standard liveries
export const LIVERY = {
  kaalipeeli: { body: 0x16161a, roof: 0xffc61a, sign: 1 }, coolcab: { body: 0x4aa8e8, roof: 0x4aa8e8, sign: 1, stripe: 0xffffff }, ecab: { body: 0xf4f6f8, roof: 0x2ecc71, sign: 1, stripe: 0x2ecc71 },
  police: { body: 0xf4f6f8, roof: 0xf4f6f8, stripe: 0x2a4ab0, siren: 1 },
  ambulance: { body: 0xf8f8f8, roof: 0xf8f8f8, stripe: 0xe8202a, siren: 1 },
};
// build a car
// cars are made once per kind and colour and then copied (they share their meshes): no lag when a ride starts
const carCache = {};
export function makeCar(type, col = 0xc8302a, o = {}) {
  if (o.spin) return buildCar(type, col, o);
  const k = type + '|' + col + '|' + JSON.stringify(o);
  const T = carCache[k] || (carCache[k] = buildCar(type, col, o)), obj = T.obj.clone(true);
  return { ...T, obj, model: obj.children[0], wheels: [], front: [], size: T.size.clone() };
}
function buildCar(type, col = 0xc8302a, o = {}) {
  if (type === 'auto') return makeAuto(col, o); if (type === 'bus') return makeBus(col, o); if (type === 'truck') return makeTruck(col, o); if (type === 'tractor') return makeTractor(col, o); if (type === 'erick') return makeERick(col, o); if (type === 'tempo') return makeTempo(col, o); if (type === 'scooter' || type === 'cycle') return makeTwoWheeler(type, col, o); if (type === 'bullcart') return makeBullCart(col, o); if (type === 'handcart') return makeHandCart(col, o);
  const C = CARS[type] || CARS.sedan, L = C.L, W = C.W, L2 = L / 2, body = [], lamps = [];
  const liv = o.livery ? LIVERY[o.livery] : null, paint = liv ? liv.body : col, roofC = liv ? liv.roof : o.roofCol ?? C.roof ?? col, glass = o.tint ?? 0x0e1620;
  const sR = -C.wb / 2 + (C.L / 2 - C.wb / 2 - 0.85 > 0 ? -0.05 : 0), sF = C.wb / 2 - 0.02, aR = C.R + 0.07, y0 = C.clr + 0.05;
  // the lower body: bumpers, wheel arches, hood, the beltline, the boot
  const s = new THREE.Shape(); const B = 0.06;
  s.moveTo(-L2 + 0.12, y0);
  for (const wc of [sR, sF]) { const pts = []; for (let i = 0; i <= 12; i++) { const a = PI - i / 12 * PI, y = C.R + 0.02 + Math.sin(a) * aR; if (y > y0 + 0.01) pts.push([wc + Math.cos(a) * aR, y]); } if (pts.length) { s.lineTo(pts[0][0], y0); pts.forEach(q => s.lineTo(q[0], q[1])); s.lineTo(pts[pts.length - 1][0], y0); } }
  s.lineTo(L2 - 0.18, y0); s.quadraticCurveTo(L2 - B, y0, L2 - B, y0 + 0.16);
  s.lineTo(L2 - B, C.hoodF - 0.08); s.quadraticCurveTo(L2 - B, C.hoodF, L2 - 0.2, C.hoodF + 0.02);
  s.quadraticCurveTo(C.ws + (L2 - C.ws) * 0.4, C.belt - 0.02, C.ws, C.belt);
  s.lineTo(C.rw, C.belt);
  if (C.boxy || C.trunkEnd - C.rw > -0.3) { s.lineTo(-L2 + B, C.belt); } else { s.quadraticCurveTo(C.rw - 0.3, C.trunk + 0.02, C.trunkEnd, C.trunk); s.quadraticCurveTo(-L2 + B, C.trunk, -L2 + B, C.trunk - 0.1); }
  s.lineTo(-L2 + B, y0 + 0.16); s.quadraticCurveTo(-L2 + B, y0, -L2 + 0.12, y0);
  body.push(part(extrudeSide(s, W, { L, round: C.round, tumble: [C.belt - 0.25, C.belt, 0.03] }), paint, liv && liv.body === 0x16161a ? 0.75 : 0.62, true));
  // the cabin (glass all round) and the roof on top
  const c = new THREE.Shape(), rf = C.belt + (C.H - C.belt) - 0.02;
  c.moveTo(C.rw, C.belt - 0.01); c.lineTo(C.ws, C.belt - 0.01); c.lineTo(C.wsTop, rf - 0.05); c.quadraticCurveTo(C.wsTop - 0.08, rf, C.wsTop - 0.25, rf);
  c.lineTo(C.rwTop + 0.2, rf); c.quadraticCurveTo(C.rwTop + 0.05, rf, C.rwTop, rf - 0.05); c.lineTo(C.rw, C.belt - 0.01);
  const Wc = W - 0.1, cab = extrudeSide(c, Wc, { L, bevel: 0.05, seg: 6, tumble: [C.belt, rf, C.tumble] });
  body.push(part(cab, glass, 1.0, true));
  // the roof panel (body colour) just above the glass, slightly smaller
  const rs = new THREE.Shape(); rs.moveTo(C.rwTop + 0.12, rf - 0.07); rs.lineTo(C.wsTop - 0.17, rf - 0.07); rs.quadraticCurveTo(C.wsTop - 0.1, rf + 0.012, C.wsTop - 0.25, rf + 0.012); rs.lineTo(C.rwTop + 0.22, rf + 0.012); rs.quadraticCurveTo(C.rwTop + 0.08, rf + 0.012, C.rwTop + 0.12, rf - 0.07);
  body.push(part(extrudeSide(rs, Wc * (1 - C.tumble) + 0.02, { L, bevel: 0.04, seg: 4 }), roofC, 0.6, true));
  if (o.stripe) for (const sx of [-0.2, 0.2]) {
    const g = extrudeSide(s, 0.26, { L, bevel: 0.02, seg: 8 }); g.scale(1, (C.H + 0.05) / C.H, (L / 2 + 0.045) / (L / 2)); g.translate(sx, 0.035 - y0 * 0.05 / C.H, 0); body.push(part(g, o.stripe, 0.6, true));   // the body's bevel is 3.5 cm thicker
    const r = extrudeSide(rs, 0.26, { L, bevel: 0.02, seg: 4 }); r.translate(sx, 0.024, 0); body.push(part(r, o.stripe, 0.6, true));
  }
  // pillars (A, B, C) in body colour over the glass
  const xr = (y) => (Wc / 2) * (1 - C.tumble * Math.min(1, Math.max(0, (y - C.belt) / (rf - C.belt)))) + 0.012;
  for (const sd of [-1, 1]) {
    const A0 = V(sd * xr(C.belt), C.belt, -C.ws), A1 = V(sd * xr(rf - 0.04), rf - 0.04, -(C.wsTop - 0.02)); body.push(part(beam(A0, A1, 0.05, 0.09), paint, 0.6));
    const bS = (C.ws + C.rw) / 2 + 0.05, B0 = V(sd * xr(C.belt), C.belt, -bS), B1 = V(sd * xr(rf - 0.05), rf - 0.05, -(C.wsTop + C.rwTop) / 2 - 0.02); body.push(part(beam(B0, B1, 0.05, 0.1), C.boxy ? paint : 0x15151a, 0.5));
    const C0 = V(sd * xr(C.belt), C.belt, -C.rw), C1 = V(sd * xr(rf - 0.05), rf - 0.05, -(C.rwTop + 0.05)); body.push(part(beam(C0, C1, 0.05, C.boxy ? 0.12 : 0.14), paint, 0.6));
    // door lines, handles, mirrors, a chrome or black strip under the windows
    const xs = sd * (W / 2 - 0.035);
    body.push(part(box(0.012, C.belt - y0 - 0.2, 0.012, xs, (C.belt + y0) / 2, -C.ws + 0.1), 0x0a0a0a, 0)); body.push(part(box(0.012, C.belt - y0 - 0.2, 0.012, xs, (C.belt + y0) / 2, -bS), 0x0a0a0a, 0));
    if (!C.boxy || type === 'suv') body.push(part(box(0.012, C.belt - y0 - 0.25, 0.012, xs, (C.belt + y0) / 2 + 0.03, -C.rw - 0.15), 0x0a0a0a, 0));
    for (const hz of [-C.ws + 0.3, -bS + 0.3]) body.push(part(box(0.03, 0.03, 0.14, sd * (W / 2 - 0.01), C.belt - 0.12, hz), 0xd8dde4, 0.9));
    body.push(part(box(0.02, 0.025, C.ws - C.rw, sd * (xr(C.belt) - 0.0), C.belt + 0.005, -(C.ws + C.rw) / 2), C.grille === 'chrome' ? 0xe0e6ee : 0x18181c, 0.9));
    body.push(part(rbox(0.12, 0.09, 0.15, 0.02, sd * (W / 2 + 0.06), C.belt + 0.06, -C.ws + 0.12), paint, 0.6)); body.push(part(box(0.1, 0.05, 0.02, sd * (W / 2 + 0.06), C.belt + 0.06, -C.ws + 0.05), 0x5a6a7a, 1));
    // a stripe along the side (police, cool-cab)
    if (liv && liv.stripe) body.push(part(box(0.012, 0.12, L - 0.6, sd * (W / 2 - 0.02), C.belt - 0.28, 0), liv.stripe, 0.5));
  }
  for (const sd of [-1, 1]) {
    if (C.flares) for (const wc of [sR, sF]) for (let i = 0; i < 7; i++) { const a = PI * (0.08 + i / 6 * 0.84), x = wc + Math.cos(a) * (aR + 0.04), y = C.R + 0.02 + Math.sin(a) * (aR + 0.04); if (y > y0) body.push(part(box(0.14, 0.08, aR * 0.62, sd * (W / 2 + 0.03), y, -x, a - PI / 2), 0x18181a, 0.15)); }
    if (C.cladding) { body.push(part(box(0.03, 0.14, L - 1.1, sd * (W / 2 - 0.005), y0 + 0.1, 0), 0x202024, 0.15)); }
    if (C.step) body.push(part(box(0.18, 0.05, C.wb - 2 * aR - 0.1, sd * (W / 2 + 0.05), y0 + 0.02, -(sR + sF) / 2), 0x2a2a2e, 0.6));
    if (C.intakes) body.push(part(box(0.03, 0.18, 0.55, sd * (W / 2 - 0.01), C.belt - 0.28, -sR + aR + 0.35), 0x0a0a0c, 0.2));
  }
  if (C.scoop) body.push(part(rbox(0.6, 0.12, 0.7, 0.05, 0, C.hoodF + 0.08, -L2 + 0.95), paint, 0.6), part(box(0.5, 0.07, 0.02, 0, C.hoodF + 0.1, -L2 + 0.6), 0x0a0a0c, 0.2));
  // bumpers, grille, plates, lamps
  const fz = -L2 + 0.02, rz = L2 - 0.02, bc = C.grille === 'chrome' ? 0xdfe5ec : 0x202024;
  body.push(part(rbox(W - 0.08, 0.16, 0.16, 0.05, 0, y0 + 0.1, fz + 0.04), bc, 0.8)); body.push(part(rbox(W - 0.08, 0.16, 0.16, 0.05, 0, y0 + 0.1, rz - 0.04), bc, 0.8));
  body.push(part(box(W * 0.45, (C.hoodF - y0) * 0.38, 0.03, 0, y0 + (C.hoodF - y0) * 0.62, fz), 0x0c0c0e, 0.3));
  if (C.slots) for (let i = -3; i <= 3; i++) body.push(part(box(0.05, (C.hoodF - y0) * 0.3, 0.035, i * 0.11, y0 + (C.hoodF - y0) * 0.62, fz - 0.006), 0x3a3a40, 0.6));
  if (C.grille === 'chrome' && !C.slots) for (let i = 0; i < 4; i++) body.push(part(box(W * 0.45, 0.012, 0.035, 0, y0 + (C.hoodF - y0) * (0.48 + i * 0.09), fz - 0.005), 0xe8eef4, 1));
  const plate = o.taxi ? 0xffd21a : 0xf4f4f0;
  body.push(part(box(0.5, 0.12, 0.02, 0, y0 + 0.22, fz - 0.01), plate, 0.3)); body.push(part(box(0.5, 0.12, 0.02, 0, y0 + 0.24, rz + 0.01), plate, 0.3));
  for (const sd of [-1, 1]) {
    if (C.box) { const lx = sd * (W / 2 - (C.slots ? 0.3 : 0.22)); lamps.push(part(cyl(0.1, 0.1, 0.04, 16, lx, C.hoodF - 0.15, fz - 0.005, PI / 2), 0xfff6d8)); body.push(part(cyl(0.12, 0.12, 0.03, 16, lx, C.hoodF - 0.15, fz + 0.01, PI / 2), 0x2a2a2e, 1)); }
    else if (C.quad) for (const k of [0.2, 0.42]) { lamps.push(part(cyl(0.07, 0.07, 0.04, 14, sd * (W / 2 - k), C.hoodF - 0.12, fz - 0.005, PI / 2), 0xfff6d8)); body.push(part(cyl(0.085, 0.085, 0.03, 14, sd * (W / 2 - k), C.hoodF - 0.12, fz + 0.01, PI / 2), 0xd8dde4, 1)); }
    else lamps.push(part(box(0.32, 0.09, 0.03, sd * (W / 2 - 0.25), C.hoodF - 0.1, fz - 0.005), 0xfff4e0));
    lamps.push(part(box(0.06, 0.04, 0.02, sd * (W / 2 - 0.12), y0 + 0.2, fz - 0.03), 0xffa21a));
    if (C.drl) lamps.push(part(box(0.42, 0.025, 0.02, sd * (W / 2 - 0.3), C.hoodF - 0.02, fz - 0.01), 0xf4fbff));
    lamps.push(part(box(C.boxy ? 0.12 : 0.28, C.boxy ? 0.22 : 0.1, 0.03, sd * (W / 2 - (C.boxy ? 0.1 : 0.22)), (C.boxy ? C.belt - 0.15 : Math.min(C.trunk, C.belt) - 0.12), rz + 0.005), 0xff2a1a));
  }
  if (C.diffuser) { body.push(part(box(W - 0.5, 0.12, 0.25, 0, y0 + 0.02, rz - 0.06), 0x111114, 0.3)); lamps.push(part(box(W - 0.4, 0.04, 0.02, 0, C.trunk - 0.1, rz + 0.012), 0xff2a1a)); }
  const exY = y0 + 0.07, exs = C.quadEx ? [-0.42, -0.3, 0.3, 0.42] : C.boxy ? [0.5] : [-0.38, 0.38];
  for (const x of exs) body.push(part(cyl(0.045, 0.05, 0.22, 10, x, exY, rz - 0.02, PI / 2), 0xc8ced6, 1));
  // taxi roof sign, police lights, roof rails (SUV)
  const roofItem = o.roofItem ?? ((liv && liv.sign) || o.taxi ? 'sign' : C.lightbar ? 'lightbar' : null), rcx = -(C.wsTop + C.rwTop) / 2, rlen = Math.max(0.6, C.wsTop - C.rwTop - 0.4), rw2 = Wc * (1 - C.tumble) - 0.2;
  addRoof(roofItem, body, lamps, rf, roofItem === 'sign' ? -0.05 : rcx, rlen, rw2);
  if (liv && liv.siren) { body.push(part(box(0.9, 0.06, 0.25, 0, rf + 0.05, -0.1), 0x1a1a1a, 0.5)); lamps.push(part(box(0.38, 0.1, 0.22, -0.23, rf + 0.12, -0.1), 0xff2a2a)); lamps.push(part(box(0.38, 0.1, 0.22, 0.23, rf + 0.12, -0.1), 0x2a6aff)); }
  if ((type === 'suv' || type === 'gypsy' || C.rails) && roofItem !== 'rack') for (const sd of [-1, 1]) body.push(part(box(0.04, 0.04, (C.wsTop - C.rwTop) * 0.9, sd * (Wc / 2 * (1 - C.tumble) - 0.05), rf + 0.06, -(C.wsTop + C.rwTop) / 2), 0x2a2a30, 0.7));
  if (type === 'suv' || type === 'gypsy' || C.spare) body.push(part(cyl(C.R * 0.95, C.R * 0.95, 0.24, 16, 0, C.belt - 0.15, rz + 0.12, PI / 2), 0x1c1c1e, 0.1));
  if (o.wing) { const wy = C.boxy ? rf + 0.12 : C.trunk + 0.3, wz = C.boxy ? -C.rwTop - 0.05 : rz - 0.22; body.push(part(rbox(W - 0.15, 0.05, 0.3, 0.02, 0, wy, wz), o.wingCol ?? 0x111114, 0.7)); for (const sd of [-1, 1]) body.push(part(box(0.05, 0.3, 0.12, sd * (W / 2 - 0.4), wy - 0.16, wz), 0x111114, 0.5)); }
  else if (type === 'sports') body.push(part(box(W - 0.2, 0.03, 0.22, 0, C.trunk + 0.16, rz - 0.15), paint, 0.6), part(box(0.05, 0.14, 0.05, -W / 2 + 0.35, C.trunk + 0.08, rz - 0.15), 0x1a1a1a), part(box(0.05, 0.14, 0.05, W / 2 - 0.35, C.trunk + 0.08, rz - 0.15), 0x1a1a1a));
  if (C.bed) { const bz = (C.rw - L2) / 2, bl = -C.rw - L2 + 0.2 + L; void bl; body.push(part(box(W - 0.24, 0.06, L2 + C.rw - 0.2, 0, C.belt - 0.02, -bz), 0x1a1a1c, 0.2));
    const load = o.load ?? rpick(['sacks', 'tank', 'crates']);
    if (load === 'tank') { body.push(part(cyl(0.55, 0.55, 1.1, 16, 0, C.belt + 0.55, -bz), 0x2a6ad8, 0.5)); body.push(part(cyl(0.18, 0.18, 0.1, 10, 0, C.belt + 1.12, -bz), 0x1a1a1a, 0.4)); }
    else for (let i = 0; i < 4; i++) body.push(part(load === 'sacks' ? rbox(0.65, 0.32, 0.55, 0.12, (i % 2 ? 0.34 : -0.34), C.belt + 0.18, -bz - 0.35 + Math.floor(i / 2) * 0.7) : box(0.62, 0.4, 0.55, (i % 2 ? 0.34 : -0.34), C.belt + 0.22, -bz - 0.35 + Math.floor(i / 2) * 0.7), load === 'sacks' ? 0xd8c8a0 : 0xa8783a, 0.05, load === 'sacks')); }
  // under the car: dark
  body.push(part(box(W - 0.2, 0.06, L - 0.6, 0, C.clr + 0.02, 0), 0x101012, 0));
  const extra = [...(o.extra || [])]; if (o.decal) extra.push(...sideDecals(o.decal, W, L * 0.62, (C.belt - y0) * 0.62, y0 + (C.belt - y0) * 0.45, -0.05)); if (o.neon) extra.push(neonPlane(o.neon, W, L));
  const car = assemble(body, lamps, [[sR, C.R, W / 2 - (C.tw || 0.21) * 0.57, 0], [sF, C.R, W / 2 - (C.tw || 0.21) * 0.57, 1]], C.R, C.tw || 0.21, o.rims || C.wheel, { ...o, extra }, { x: W, y: C.H + (roofItem ? 0.2 : 0), z: L });
  car.exhaust = exs.map(x => [x, exY, rz + 0.1]); car.roofY = rf; return car;
}
// put a vehicle together: one body mesh, one lamp mesh, wheels (spinning ones as separate meshes when asked)
function assemble(body, lamps, axles, R, tw, kind, o, size) {
  const holder = new THREE.Group(), model = new THREE.Group(); holder.add(model);
  const wheels = [], front = [], still = [];
  for (const [s, r, x, isFront, aw] of axles) for (const sd of (x === 0 ? [0] : [-1, 1])) {
    const wg = wheelGeo(r, aw || tw, kind);
    if (o.spin) { const w = new THREE.Mesh(wg, BODY); w.userData.r = r; const pivot = new THREE.Group(); pivot.position.set(sd * x, r, -s); pivot.add(w); model.add(pivot); w.name = 'wheel'; wheels.push(w); if (isFront) front.push(pivot); }
    else { const g = wg.clone(); g.translate(sd * x, r, -s); still.push(g); }
  }
  const m = new THREE.Mesh(mergeGeometries([...body, ...still]), o.mat || BODY); model.add(m);
  if (lamps.length) model.add(new THREE.Mesh(mergeGeometries(lamps), LAMP));
  if (o.extra) for (const e of o.extra) model.add(e);
  holder.traverse(q => { q.frustumCulled = false; });
  return { obj: holder, model, wheels, front, size: new THREE.Vector3(size.x, size.y, size.z), r: R, steer: 0 };
}
// ---------------- the auto-rickshaw ----------------
function makeAuto(col = 0x2a9a3a, o = {}) {
  const body = [], lamps = [], top = o.top ?? 0xffd21a, W = 1.32, L = 2.65;
  const s = new THREE.Shape(); s.moveTo(-1.3, 0.3); s.lineTo(0.95, 0.3); s.quadraticCurveTo(1.32, 0.32, 1.3, 0.75); s.lineTo(1.22, 1.05); s.lineTo(0.85, 1.08); s.lineTo(0.62, 0.62); s.lineTo(-0.5, 0.62); s.lineTo(-0.55, 0.95); s.lineTo(-1.3, 0.95); s.lineTo(-1.3, 0.3);
  body.push(part(extrudeSide(s, W, { L, bevel: 0.06, round: [0.5, 0.35] }), col, 0.6, true));
  // windscreen and the canopy (rexine roof) on its frame
  body.push(part(box(W * 0.62, 0.55, 0.03, 0, 1.33, -0.9, -0.12), o.tint ?? 0x0e1620, 1));
  const cs = new THREE.Shape(); cs.moveTo(-1.32, 1.7); cs.quadraticCurveTo(-1.35, 1.95, -0.9, 1.97); cs.lineTo(0.75, 1.97); cs.quadraticCurveTo(1.05, 1.95, 1.0, 1.62); cs.lineTo(0.92, 1.62); cs.lineTo(-1.25, 1.7);
  body.push(part(extrudeSide(cs, W + 0.06, { L, bevel: 0.05, seg: 6 }), top, 0.35, true));
  body.push(part(box(W + 0.02, 0.1, 1.6, 0, 1.08, 0.15), 0x161616, 0.3));
  for (const sd of [-1, 1]) { body.push(part(beam(V(sd * 0.62, 1.05, -0.86), V(sd * 0.64, 1.66, -0.98), 0.04), 0x222222, 0.5)); body.push(part(beam(V(sd * 0.63, 0.95, 0.5), V(sd * 0.64, 1.7, 0.55), 0.04), 0x222222, 0.5)); body.push(part(beam(V(sd * 0.63, 0.95, 1.28), V(sd * 0.64, 1.7, 1.3), 0.04), 0x222222, 0.5)); }
  body.push(part(rbox(W - 0.15, 0.32, 0.5, 0.06, 0, 0.82, 0.6), 0x1a1a1a, 0.3)); body.push(part(rbox(W - 0.15, 0.5, 0.12, 0.05, 0, 1.12, 0.92), 0x1a1a1a, 0.3));
  body.push(part(rbox(0.36, 0.1, 0.36, 0.04, 0, 0.82, -0.35), 0x1a1a1a, 0.3)); body.push(part(cyl(0.02, 0.02, 0.6, 6, 0, 1.0, -0.75, 0, PI / 2), 0xc0c6ce, 0.9));
  lamps.push(part(cyl(0.08, 0.08, 0.04, 12, 0, 0.8, -1.33, PI / 2), 0xfff6d8)); lamps.push(part(box(0.18, 0.08, 0.02, -0.45, 0.6, 1.33), 0xff2a1a), part(box(0.18, 0.08, 0.02, 0.45, 0.6, 1.33), 0xff2a1a));
  body.push(part(box(0.38, 0.12, 0.02, 0, 0.45, 1.33), 0xffd21a, 0.3));
  body.push(part(box(W - 0.3, 0.06, L - 0.5, 0, 0.26, 0.1), 0x101012, 0));
  if (o.stripe) body.push(part(box(0.25, 0.012, 1.0, 0, 1.98, -0.1), o.stripe, 0.5), part(box(W + 0.02, 0.1, 0.012, 0, 0.75, -1.25), o.stripe, 0.5));
  if (o.roofItem === 'rack') addRoof('rack', body, lamps, 1.97, 0, 1.2, W - 0.2); else if (o.roofItem === 'lightbar') addRoof('lightbar', body, lamps, 1.97, -0.6, 0.5, W - 0.2); else if (o.roofItem === 'sign') addRoof('sign', body, lamps, 1.97, -0.4, 0.6, W - 0.3);
  if (o.wing) body.push(part(rbox(W - 0.1, 0.04, 0.25, 0.02, 0, 2.06, 1.15), 0x111114, 0.6));
  const extra = [...(o.extra || [])]; if (o.decal) extra.push(...sideDecals(o.decal, W + 0.02, 1.6, 0.36, 0.5, 0.1)); if (o.neon) extra.push(neonPlane(o.neon, W, L));
  const car = assemble(body, lamps, [[-0.95, 0.22, 0, 1], [0.85, 0.22, W / 2 - 0.08, 0]], 0.22, 0.14, o.rims || 'black', { ...o, extra }, { x: W, y: 2.0, z: L });
  car.exhaust = [[0.35, 0.28, 1.35]]; car.roofY = 1.97; return car;
}
// ---------------- the red double-decker bus ----------------
const busTexs = {};
const busTex = (text, bg, fg) => busTexs[text] || (busTexs[text] = canvasTex(256, 64, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 2); }));
const busSide = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#c8202a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('B.E.S.T.', w / 2, h / 2 + 2); });
function makeBus(col = 0xc8202a, o = {}) {
  const body = [], lamps = [], W = 2.5, L = 9.8, H = 4.3;
  body.push(part(rbox(W, H - 0.4, L, 0.22, 0, 0.4 + (H - 0.4) / 2, 0), col, 0.55, true));
  for (const y of [1.55, 3.35]) { body.push(part(box(W + 0.16, 0.85, L - 1.0, 0, y, 0.25), 0x0e1620, 1)); for (let i = 0; i < 7; i++) body.push(part(box(W + 0.18, 0.85, 0.08, 0, y, -L / 2 + 1.0 + i * 1.32), col, 0.5)); }
  body.push(part(box(W - 0.4, 1.2, 0.04, 0, 1.6, -L / 2 - 0.01), 0x0e1620, 1)); body.push(part(box(W - 0.3, 0.8, 0.04, 0, 3.4, -L / 2 - 0.01), 0x0e1620, 1));
  body.push(part(box(W - 0.5, 0.3, 0.05, 0, 2.55, -L / 2 - 0.02), 0x111111, 0.3)); lamps.push(part(box(W - 0.7, 0.2, 0.06, 0, 2.55, -L / 2 - 0.03), 0xffb21a));
  body.push(part(box(W + 0.17, 0.12, L - 0.4, 0, 2.5, 0), 0xf0f0f0, 0.5)); body.push(part(box(W + 0.17, 0.08, L - 0.4, 0, 0.75, 0), 0xf0f0f0, 0.5));
  body.push(part(box(W - 0.1, 0.3, 0.12, 0, 0.55, -L / 2), 0x222222, 0.4)); body.push(part(box(W - 0.1, 0.3, 0.12, 0, 0.55, L / 2), 0x222222, 0.4));
  for (const sd of [-1, 1]) { lamps.push(part(box(0.25, 0.15, 0.03, sd * 0.95, 0.85, -L / 2 - 0.02), 0xfff4e0)); lamps.push(part(box(0.18, 0.3, 0.03, sd * 1.0, 1.0, L / 2 + 0.02), 0xff2a1a)); body.push(part(box(0.06, 0.4, 0.3, sd * (W / 2 + 0.1), 1.9, -L / 2 + 0.3), 0x1a1a1a, 0.5)); }
  body.push(part(box(W - 0.2, 0.1, L - 1.5, 0, 0.32, 0), 0x101012, 0));
  const ex = []; for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: o.school ? busTex('🎒 SCHOOL BUS', '#ffc21a', '#1a1a1a') : busSide })); m.position.set(sd * (W / 2 + 0.1), 2.12, 0.5); m.rotation.y = sd * PI / 2; ex.push(m); }
  return assemble(body, lamps, [[-3.2, 0.5, W / 2 - 0.25, 1], [3.1, 0.5, W / 2 - 0.25, 0]], 0.5, 0.32, 'black', { ...o, extra: ex }, { x: W, y: H, z: L });
}
// ---------------- the painted Indian truck (Horn OK Please) ----------------
const truckBack = canvasTex(256, 192, (c, w, h) => {
  c.fillStyle = '#ffcf1a'; c.fillRect(0, 0, w, h); const cols = ['#e8202a', '#2a8ae8', '#2aa84a', '#ff6a1a', '#a02ab8'];
  for (let i = 0; i < 10; i++) { c.fillStyle = cols[i % 5]; c.beginPath(); c.arc(i * 28 + 8, 14, 11, 0, 7); c.fill(); c.beginPath(); c.arc(i * 28 + 8, h - 14, 11, 0, 7); c.fill(); }
  c.fillStyle = '#c8202a'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HORN', w / 2, 62); c.fillStyle = '#1a4ab0'; c.fillText('OK', w / 2, 100); c.fillStyle = '#1a8a2a'; c.fillText('PLEASE', w / 2, 138);
});
function makeTruck(col = 0xff7a1a, o = {}) {
  const body = [], lamps = [], W = 2.45, L = 8.2;
  // the cab (rounded, the classic bonnet nose) and the painted wooden cargo body
  const s = new THREE.Shape(); s.moveTo(1.9, 0.75); s.lineTo(4.05, 0.75); s.quadraticCurveTo(4.1, 1.5, 3.7, 1.75); s.lineTo(3.1, 1.85); s.lineTo(2.85, 3.0); s.lineTo(1.9, 3.05); s.lineTo(1.9, 0.75);
  body.push(part(extrudeSide(s, W - 0.1, { L, bevel: 0.1, round: [0.3, 0.06] }), col, 0.55, true));
  body.push(part(box(W - 0.3, 0.9, 0.04, 0, 2.4, -2.98, -0.25), 0x0e1620, 1));
  for (const sd of [-1, 1]) body.push(part(box(0.04, 0.7, 0.8, sd * (W / 2 - 0.03), 2.4, -2.3), 0x0e1620, 1));
  body.push(part(box(W - 0.2, 0.25, 0.4, 0, 3.15, -2.4), 0xffd21a, 0.4));   // the painted visor over the windscreen
  body.push(part(box(1.2, 0.5, 0.05, 0, 1.25, -4.08), 0xd8dde4, 0.9));
  if (o.tanker) {   // the water tanker: a big round tank, a ladder, "PANI" painted on it
    body.push(part(box(W - 0.3, 0.2, 5.6, 0, 1.0, 1.0), 0x2a2a2e, 0.3)); { const t = new THREE.CylinderGeometry(1.08, 1.08, 5.4, 20); t.rotateX(PI / 2); t.scale(1, 0.92, 1); t.translate(0, 2.12, 1.0); body.push(part(t, o.tanker === 'milk' ? 0xd8dde4 : 0x2a6ad8, 0.8, true)); }
    for (const z of [-1.4, 3.4]) { const r = new THREE.TorusGeometry(1.09, 0.05, 6, 20); r.scale(1, 0.92, 1); r.translate(0, 2.12, z); body.push(part(r, 0x1a1a1e, 0.6)); }
    body.push(part(cyl(0.25, 0.25, 0.2, 12, 0, 3.15, 1.0), 0x1a1a1e, 0.5)); for (let i = 0; i < 6; i++) body.push(part(box(0.5, 0.04, 0.04, 0.6, 1.2 + i * 0.3, 3.72), 0xb8bec6, 0.8));
  } else {
  body.push(part(box(W, 2.0, 5.6, 0, 2.05, 1.0), 0x8a5a2a, 0.15)); body.push(part(box(W + 0.03, 0.18, 5.6, 0, 3.0, 1.0), 0xe8202a, 0.4)); body.push(part(box(W + 0.03, 0.18, 5.6, 0, 1.3, 1.0), 0x2a8ae8, 0.4));
  for (let i = 0; i < 6; i++) body.push(part(box(W + 0.04, 1.6, 0.06, 0, 2.15, -1.7 + i * 1.08), 0x6a4018, 0.1)); }
  body.push(part(box(W - 0.2, 0.25, L - 0.8, 0, 0.75, 0), 0x1a1a1a, 0.2));
  for (const sd of [-1, 1]) { lamps.push(part(cyl(0.12, 0.12, 0.04, 12, sd * 0.85, 1.35, -4.08, PI / 2), 0xfff6d8)); lamps.push(part(box(0.2, 0.12, 0.03, sd * 0.95, 1.1, 3.82), 0xff2a1a)); body.push(part(box(0.06, 0.35, 0.25, sd * (W / 2 + 0.12), 2.4, -2.95), 0x1a1a1a, 0.5)); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, 1.75), new THREE.MeshBasicMaterial({ map: truckBack })); back.position.set(0, 2.1, 3.81); back.rotation.y = 0;
  return assemble(body, lamps, [[-3.0, 0.52, W / 2 - 0.25, 1], [2.5, 0.52, W / 2 - 0.25, 0]], 0.52, 0.34, 'black', { ...o, extra: o.tanker ? [] : [back] }, { x: W, y: 3.2, z: L });
}
export function spinWheels(V, dist, steer) { for (const w of V.wheels) w.rotation.x -= dist / (w.userData.r || V.r); for (const f of V.front) f.rotation.y = steer; }

// ---------------- boats ----------------
// a hull lofted from cross-sections: V-shaped bottom (deadrise), a raised pointed bow, a flat transom at the back
function hull(L, W, H, o = {}) {
  const n = 22, m = 7, pos = [], idx = [], dead = o.dead ?? 0.35;
  const sec = t => { // t: 0 stern … 1 bow
    const bow = Math.max(0, (t - 0.55) / 0.45), w = W / 2 * Math.sqrt(Math.max(0.0, 1 - bow ** 2.2)) * (t < 0.04 ? 0.96 : 1), keel = -H * 0.55 + bow ** 2 * H * 0.5, sheer = H * 0.45 + bow ** 1.5 * H * 0.35;
    const pts = []; for (let j = 0; j <= m; j++) { const a = j / m, x = -w + 2 * w * a, dz = Math.abs(x) / Math.max(0.001, w); pts.push([x, keel + (dz ** 1.4) * (sheer - keel) * (0.25 + dead) + dz * dz * (sheer - keel) * (0.75 - dead)]); }
    pts[0][1] = sheer; pts[m][1] = sheer; return pts;
  };
  for (let i = 0; i <= n; i++) { const t = i / n, z = L / 2 - t * L; for (const [x, y] of sec(t)) pos.push(x, y, z); }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + m + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // transom and deck
  const t0 = sec(0); const base = pos.length / 3; for (const [x, y] of t0) pos.push(x, y, L / 2); for (let j = 1; j < m; j++) idx.push(base, base + j + 1, base + j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const deck = new THREE.Shape(); for (let i = 0; i <= n; i++) { const t = i / n, s = sec(t); deck.lineTo(L / 2 - t * L, s[m][0]); } for (let i = n; i >= 0; i--) { const t = i / n, s = sec(t); deck.lineTo(L / 2 - t * L, s[0][0]); }
  const dg = new THREE.ShapeGeometry(deck); dg.rotateX(PI / 2); // shape (z, x) → x-z plane
  const p = dg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getX(i), x = p.getZ(i); const t = (L / 2 - z) / L; p.setXYZ(i, x, sec(Math.min(1, Math.max(0, t)))[m][1] - 0.01, z); } dg.computeVertexNormals();
  return { hull: g, deck: dg, sheerAt: t => sec(t)[m][1], widthAt: t => sec(t)[m][0] };
}
export const BOATS = {
  rescue: { L: 6.0, W: 2.5, H: 1.0, dead: 0.3 }, speed: { L: 5.2, W: 2.0, H: 0.9 }, cigarette: { L: 6.6, W: 1.9, H: 0.8, dead: 0.45 }, airboat: { L: 4.6, W: 2.3, H: 0.6, dead: 0.05 }, jetski: { L: 3.0, W: 1.1, H: 0.7 }, catamaran: { L: 5.4, W: 2.6, H: 0.8 },
  duck: { L: 4.2, W: 2.5, H: 0.95, dead: 0.08 }, rib: { L: 5.2, W: 2.3, H: 0.7, dead: 0.42 }, hover: { L: 4.8, W: 2.7, H: 0.55, dead: 0.04 }, pirate: { L: 6.2, W: 2.5, H: 1.2, dead: 0.22 }, dragon: { L: 7.4, W: 1.7, H: 0.7, dead: 0.3 },
};
export function makeBoat(type = 'speed', col = 0xe8302a, o = {}) {
  const paint = col; if (type === 'pirate') col = 0x7a4a26;
  if (type === 'pirate') o = { ...o, bottom: 0x5a3418, stripe: 0xd8a83a, deck: 0xb07a40 };
  if (type === 'duck') o = { ...o, bottom: col, stripe: col };
  if (type === 'dragon') o = { ...o, bottom: col, stripe: 0xffc21a, deck: 0xb07a40 };
  if (type === 'rib') o = { ...o, bottom: 0x3a3a40, stripe: 0x3a3a40, deck: 0x9aa0a8 };
  if (type === 'rescue') o = { ...o, bottom: 0x16263e, stripe: 0xffffff };
  const B = BOATS[type] || BOATS.speed, body = [], lamps = [], deckC = o.deck ?? 0xf4f2ee, trim = o.trim ?? 0x1a1a1a;
  if (type === 'catamaran') { for (const sd of [-1, 1]) { const h = hull(B.L, 0.8, B.H, { dead: 0.4 }); const hg = h.hull.clone(); hg.translate(sd * 0.95, 0, 0); body.push(part(hg, col, 0.7, true)); } body.push(part(rbox(2.4, 0.18, B.L * 0.7, 0.06, 0, B.H * 0.45, 0.4), deckC, 0.5)); body.push(part(rbox(1.6, 0.5, 1.4, 0.15, 0, B.H * 0.8, 0.6), col, 0.6)); }
  else {
    const h = hull(B.L, B.W, B.H, { dead: B.dead });
    const hg = h.hull, p = hg.attributes.position, cols = new Float32Array(p.count * 3), _a = new THREE.Color(col), _b = new THREE.Color(o.bottom ?? 0xf4f4f4), _s = new THREE.Color(o.stripe ?? 0x1a1a1a);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y < -0.05 ? _b : (y < 0.08 ? _s : _a); cols.set([k.r, k.g, k.b], i * 3); }
    let g2 = hg.toNonIndexed(); const c2 = new THREE.Float32BufferAttribute(new Float32Array(g2.attributes.position.count * 3), 3);
    { const ip = hg.index.array; for (let i = 0; i < ip.length; i++) c2.setXYZ(i, cols[ip[i] * 3], cols[ip[i] * 3 + 1], cols[ip[i] * 3 + 2]); }
    g2.setAttribute('color', c2); g2.setAttribute('gloss', new THREE.Float32BufferAttribute(new Float32Array(g2.attributes.position.count).fill(0.7), 1)); body.push(g2);
    if (type !== 'rescue') body.push(part(h.deck, deckC, 0.35));
    const sh = h.sheerAt(0.5);
    if (type === 'rescue') rescueBoat(body, lamps, h, B, col, sh, o);
    if (type === 'speed' || type === 'cigarette') {
      // windscreen, seats, dashboard, the outboard engine(s), rails
      const wz = type === 'cigarette' ? -0.3 : -0.4, ww = h.widthAt(0.55) * 1.7;
      body.push(part(box(ww, 0.38, 0.05, 0, sh + 0.2, wz, -0.55), 0x9ad0f0, 1)); body.push(part(box(ww * 0.95, 0.06, 0.4, 0, sh + 0.06, wz + 0.25), trim, 0.4));
      body.push(part(rbox(B.W * 0.75, 0.3, 1.2, 0.1, 0, sh + 0.12, wz + 1.2), o.seat ?? 0xf8f0e0, 0.3)); body.push(part(rbox(B.W * 0.75, 0.45, 0.2, 0.08, 0, sh + 0.35, wz + 1.75), o.seat ?? 0xf8f0e0, 0.3));
      const ne = type === 'cigarette' ? 2 : 1;
      for (let i = 0; i < ne; i++) { const x = ne === 1 ? 0 : (i ? 0.35 : -0.35); body.push(part(rbox(0.42, 0.65, 0.5, 0.12, x, sh + 0.2, B.L / 2 + 0.22), 0x1a1a1e, 0.8)); body.push(part(box(0.1, 0.7, 0.12, x, sh - 0.35, B.L / 2 + 0.3), 0x2a2a2e, 0.5)); body.push(part(box(0.3, 0.05, 0.06, x, sh + 0.42, B.L / 2 + 0.22), col, 0.6)); }
      for (const sd of [-1, 1]) body.push(part(beam(V(sd * h.widthAt(0.7) * 0.9, sh + 0.12, -B.L * 0.25), V(sd * h.widthAt(0.9) * 0.8, h.sheerAt(0.9) + 0.12, -B.L * 0.42), 0.03), 0xd8dde4, 1));
      lamps.push(part(box(0.06, 0.06, 0.06, h.widthAt(0.8) * 0.9, h.sheerAt(0.8) + 0.03, -B.L * 0.3), 0x2aff4a)); lamps.push(part(box(0.06, 0.06, 0.06, -h.widthAt(0.8) * 0.9, h.sheerAt(0.8) + 0.03, -B.L * 0.3), 0xff2a2a));
    }
    if (type === 'airboat') {
      body.push(part(rbox(1.2, 0.35, 1.0, 0.1, 0, sh + 0.18, 0.1), o.seat ?? 0x2a2a30, 0.3)); body.push(part(beam(V(0, sh, 0.6), V(0, sh + 1.8, 0.9), 0.08), 0x2a2a2e, 0.6));
      body.push(part(box(0.06, 1.7, 0.06, -0.7, sh + 0.85, 1.1), 0x8a9098, 0.9), part(box(0.06, 1.7, 0.06, 0.7, sh + 0.85, 1.1), 0x8a9098, 0.9)); body.push(part(rbox(0.6, 0.45, 0.5, 0.1, 0, sh + 1.6, 0.85), 0x1a1a1e, 0.7));
      const ring = new THREE.TorusGeometry(0.95, 0.04, 6, 24); ring.translate(0, sh + 1.6, 1.25); body.push(part(ring, 0xc0c6ce, 0.9)); body.push(part(box(0.08, 1.9, 0.04, 0, sh + 1.6, 1.25), 0xc0c6ce, 0.9), part(box(1.9, 0.08, 0.04, 0, sh + 1.6, 1.25), 0xc0c6ce, 0.9));
    }
    const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 16, 12); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    if (type === 'duck') {
      // a giant rubber-duck pedal boat: a round body, the neck and head at the bow with an orange beak, a perky tail, wings
      const L = B.L; body.push(part(sph(0.62, 0, sh + 1.25, -L * 0.36, 1, 1, 1.05), col, 0.75, true), part(cyl(0.42, 0.55, 1.0, 14, 0, sh + 0.55, -L * 0.33), col, 0.75, true));
      body.push(part(sph(0.3, 0, sh + 1.12, -L * 0.36 - 0.62, 1.15, 0.45, 1.2), 0xff8a1a, 0.6, true));
      for (const sd of [-1, 1]) { body.push(part(sph(0.15, sd * 0.36, sh + 1.42, -L * 0.36 - 0.42), 0xffffff, 0.9), part(sph(0.08, sd * 0.42, sh + 1.45, -L * 0.36 - 0.52), 0x111111, 0.9)); body.push(part(sph(0.5, sd * (B.W / 2 - 0.05), sh + 0.05, 0.2, 0.35, 0.55, 1.4), col, 0.7, true)); }
      body.push(part(cyl(0.02, 0.45, 0.9, 10, 0, sh + 0.45, L * 0.45, -0.7), col, 0.75, true));
      body.push(part(rbox(1.5, 0.3, 0.9, 0.1, 0, sh + 0.1, 0.35), o.seat ?? 0xffffff, 0.3), part(rbox(1.5, 0.5, 0.18, 0.08, 0, sh + 0.4, 0.85), o.seat ?? 0xffffff, 0.3));
      // the sun canopy on four poles
      for (const [x, z] of [[-0.7, -0.15], [0.7, -0.15], [-0.7, 1.0], [0.7, 1.0]]) body.push(part(cyl(0.03, 0.03, 1.4, 6, x, sh + 0.75, z), 0xf0f0f0, 0.8));
      body.push(part(rbox(1.7, 0.08, 1.5, 0.04, 0, sh + 1.47, 0.42), o.stripe === 0xffffff ? 0x2ab8ff : (o.stripe ?? 0x2ab8ff), 0.4));
    }
    if (type === 'rib') {
      // an orange rescue inflatable: fat tubes around the hull, a console with a windscreen, a light bar, an outboard
      const L = B.L, W = B.W, y = sh + 0.05, pts = [[-W / 2 + 0.2, y, L / 2 - 0.05], [-W / 2 + 0.1, y, -L * 0.05], [-W * 0.3, y + 0.1, -L * 0.36], [0, y + 0.2, -L / 2 + 0.05], [W * 0.3, y + 0.1, -L * 0.36], [W / 2 - 0.1, y, -L * 0.05], [W / 2 - 0.2, y, L / 2 - 0.05]].map(([a, b, c]) => new THREE.Vector3(a, b, c));
      body.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.34, 10), 0xff6a1a, 0.55, true));
      for (const sd of [-1, 1]) { body.push(part(sph(0.34, sd * (W / 2 - 0.2), y, L / 2 - 0.05), 0xff6a1a, 0.55)); body.push(part(box(0.04, 0.16, L * 0.55, sd * (W / 2 + 0.11), y + 0.02, 0.1), 0xffffff, 0.5)); }
      body.push(part(rbox(0.9, 0.75, 0.8, 0.1, 0, sh + 0.4, -0.2), 0xf4f4f4, 0.5), part(box(0.9, 0.42, 0.04, 0, sh + 0.98, -0.55, -0.4), 0x9ad0f0, 1));
      body.push(part(rbox(1.0, 0.32, 0.9, 0.08, 0, sh + 0.16, 0.9), 0x2a2a30, 0.3));
      body.push(part(beam(V(-0.7, sh, 1.6), V(-0.7, sh + 1.5, 1.6), 0.06), 0xd0d4d8, 0.9), part(beam(V(0.7, sh, 1.6), V(0.7, sh + 1.5, 1.6), 0.06), 0xd0d4d8, 0.9), part(box(1.5, 0.08, 0.08, 0, sh + 1.5, 1.6), 0xd0d4d8, 0.9));
      lamps.push(part(box(0.3, 0.14, 0.14, -0.35, sh + 1.6, 1.6), 0x2a6aff), part(box(0.3, 0.14, 0.14, 0.35, sh + 1.6, 1.6), 0xff2a2a));
      body.push(part(rbox(0.45, 0.7, 0.5, 0.12, 0, sh + 0.2, L / 2 + 0.2), 0x1a1a1e, 0.8));
      // a lifebuoy hung on the console
      const lb = new THREE.TorusGeometry(0.28, 0.08, 8, 18); lb.translate(0, sh + 0.45, 0.22); body.push(part(lb, 0xff3a2a, 0.5));
    }
    if (type === 'hover') {
      // a hovercraft: a black rubber skirt all round, a cabin with windows, a big ducted fan and two rudders at the back
      const sk = new THREE.TorusGeometry(1, 0.32, 10, 30); sk.rotateX(PI / 2); sk.scale(B.W / 2 * 0.95, 1, B.L / 2 * 0.92); sk.translate(0, -0.08, 0); body.push(part(sk, 0x1a1a1e, 0.25, true));
      body.push(part(rbox(1.7, 0.8, 1.8, 0.2, 0, sh + 0.4, -0.5), col, 0.7), part(box(1.6, 0.4, 0.05, 0, sh + 0.6, -1.42, -0.5), 0x9ad0f0, 1));
      for (const sd of [-1, 1]) body.push(part(box(0.04, 0.32, 1.1, sd * 0.86, sh + 0.55, -0.45), 0x9ad0f0, 1));
      body.push(part(rbox(1.5, 0.3, 0.8, 0.1, 0, sh + 0.12, 0.65), o.seat ?? 0x2a2a30, 0.3));
      const duct = new THREE.TorusGeometry(0.85, 0.12, 8, 28); duct.translate(0, sh + 1.0, B.L / 2 - 0.35); body.push(part(duct, 0xf4f4f4, 0.7));
      body.push(part(box(0.1, 1.0, 0.1, -0.75, sh + 0.5, B.L / 2 - 0.35), 0xf4f4f4, 0.7), part(box(0.1, 1.0, 0.1, 0.75, sh + 0.5, B.L / 2 - 0.35), 0xf4f4f4, 0.7));
      for (const x of [-0.35, 0.35]) body.push(part(box(0.05, 1.3, 0.45, x, sh + 1.0, B.L / 2 - 0.05), col, 0.6));
    }
    if (type === 'pirate') {
      // a little pirate ship: wooden planks, a mast with a big sail and a skull flag, a raised stern castle, two cannons
      const L = B.L, wood = 0x6a4022;
      for (let i = 0; i < 4; i++) body.push(part(box(B.W * 0.86, 0.02, 0.06, 0, sh + 0.01, -1.6 + i * 1.0), 0x4a2a14, 0.2));
      body.push(part(cyl(0.11, 0.13, 4.6, 10, 0, sh + 2.3, -0.4), wood, 0.3), part(box(2.6, 0.1, 0.1, 0, sh + 3.6, -0.4), wood, 0.3), part(box(2.0, 0.1, 0.1, 0, sh + 1.4, -0.4), wood, 0.3));
      const sail = new THREE.PlaneGeometry(2.4, 2.1, 8, 6), sp = sail.attributes.position; for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, -0.35 * (1 - (x / 1.2) ** 2) * (1 - (y / 1.05) ** 2 * 0.4)); } sail.translate(0, sh + 2.5, -0.3); body.push(part(sail, o.stripe === 0xffffff ? 0xf4ead0 : 0xf4ead0, 0.2));
      body.push(part(box(2.3, 0.35, 0.02, 0, sh + 2.9, -0.62), paint, 0.3));   // a painted band across the sail
      body.push(part(cyl(0.32, 0.28, 0.35, 10, 0, sh + 4.0, -0.4), wood, 0.3));
      body.push(part(box(0.75, 0.48, 0.02, 0.38, sh + 4.5, -0.4), 0x111111, 0.2), part(sph(0.1, 0.38, sh + 4.53, -0.38), 0xffffff, 0.3));
      body.push(part(rbox(B.W * 0.9, 0.7, 1.5, 0.08, 0, sh + 0.35, L * 0.36), wood, 0.3), part(box(B.W * 0.92, 0.12, 1.55, 0, sh + 0.74, L * 0.36), 0xd8a83a, 0.6));
      for (const sd of [-1, 1]) { body.push(part(box(0.08, 0.35, L * 0.6, sd * (h.widthAt(0.5) - 0.02), sh + 0.17, -0.3), wood, 0.3)); body.push(part(cyl(0.12, 0.15, 0.8, 10, sd * (h.widthAt(0.5) + 0.25), sh + 0.15, -0.6, 0, PI / 2), 0x1a1a1a, 0.6)); }
      body.push(part(beam(V(0, h.sheerAt(1), -L / 2), V(0, h.sheerAt(1) + 0.6, -L / 2 - 1.4), 0.1), wood, 0.3));
      body.push(part(cyl(0.45, 0.45, 0.08, 14, 0, sh + 1.15, L * 0.27, PI / 2), 0x8a5a2a, 0.3));   // the ship's wheel
      lamps.push(part(box(0.18, 0.25, 0.18, 0, sh + 1.0, L / 2 - 0.05), 0xffc23a));
    }
    if (type === 'dragon') {
      // a dragon boat: a long thin hull, a dragon head with horns and an open mouth at the bow, a curled tail, scales and a drum
      const L = B.L, gold = 0xffc21a;
      body.push(part(beam(V(0, h.sheerAt(1) - 0.1, -L / 2 + 0.2), V(0, h.sheerAt(1) + 1.0, -L / 2 - 0.4), 0.42, 0.5), col, 0.6));
      body.push(part(rbox(0.6, 0.5, 0.9, 0.12, 0, h.sheerAt(1) + 1.2, -L / 2 - 0.7), col, 0.6), part(box(0.5, 0.12, 0.7, 0, h.sheerAt(1) + 0.9, -L / 2 - 0.75, 0.25), gold, 0.6));
      for (const sd of [-1, 1]) { body.push(part(cyl(0.01, 0.08, 0.6, 6, sd * 0.2, h.sheerAt(1) + 1.6, -L / 2 - 0.45, -0.6), gold, 0.7)); body.push(part(sph(0.09, sd * 0.28, h.sheerAt(1) + 1.32, -L / 2 - 0.95), 0xffffff, 0.9), part(sph(0.05, sd * 0.31, h.sheerAt(1) + 1.33, -L / 2 - 1.0), 0x111111, 0.9)); }
      for (let i = 0; i < 7; i++) body.push(part(cyl(0.01, 0.14, 0.3, 4, 0, sh + 0.14, -L * 0.3 + i * 0.75), gold, 0.7));
      body.push(part(beam(V(0, sh, L / 2 - 0.2), V(0, sh + 0.9, L / 2 + 0.3), 0.2, 0.25), col, 0.6), part(cyl(0.01, 0.25, 0.5, 6, 0, sh + 1.0, L / 2 + 0.25, -0.8), gold, 0.7));
      for (const sd of [-1, 1]) body.push(part(box(0.03, 0.12, L * 0.8, sd * (h.widthAt(0.5) + 0.01), sh - 0.04, 0), gold, 0.7));
      body.push(part(cyl(0.35, 0.35, 0.4, 14, 0, sh + 0.2, -L * 0.25), 0xc8202a, 0.5), part(cyl(0.36, 0.36, 0.04, 14, 0, sh + 0.41, -L * 0.25), 0xf4ead0, 0.3));
      for (let i = 0; i < 3; i++) body.push(part(box(B.W * 0.8, 0.08, 0.3, 0, sh + 0.12, -0.6 + i * 1.1), 0x6a4022, 0.3));
    }
    if (type === 'jetski') { body.push(part(rbox(0.5, 0.3, 1.3, 0.12, 0, sh + 0.12, 0.3), o.seat ?? 0x1a1a1e, 0.4)); body.push(part(rbox(0.9, 0.35, 0.7, 0.15, 0, sh + 0.12, -0.55), col, 0.7)); body.push(part(box(0.75, 0.04, 0.04, 0, sh + 0.42, -0.6), 0x1a1a1e, 0.5)); }
  }
  const prop = new THREE.Group(); if (type === 'hover') { const pr = new THREE.Mesh(mergeGeometries([part(box(1.5, 0.14, 0.04, 0, 0, 0), 0x2a2a2e, 0.3), part(box(0.14, 1.5, 0.04, 0, 0, 0), 0x2a2a2e, 0.3)]), BODY); prop.add(pr); prop.position.set(0, BOATS.hover.H * 0.45 + 1.0, BOATS.hover.L / 2 - 0.35); }
  if (type === 'airboat') { const pr = new THREE.Mesh(mergeGeometries([part(box(1.8, 0.16, 0.04, 0, 0, 0), 0x3a2a1a, 0.3)]), BODY); prop.add(pr); prop.position.set(0, (BOATS.airboat.H * 0.45 + 0.25) + 1.35, 1.2); }
  const extra = [prop]; let beacons = null;
  if (type === 'rescue') { const r = rescueExtras(B, hull(B.L, B.W, B.H, { dead: B.dead })); extra.push(...r.meshes); beacons = r.beacons; }
  const V2 = assemble(body, lamps, [], 0.3, 0.2, 'black', { ...o, mat: BOATM, extra }, { x: B.W, y: B.H + 1, z: B.L }); V2.beacons = beacons; V2.prop = type === 'airboat' || type === 'hover' ? prop : null; V2.deckY = hull(B.L, B.W, B.H, { dead: B.dead }).sheerAt(0.5); return V2;
}

// ---------------- the hero rescue boat ----------------
// a lifeboat-style rescue boat: an orange fender tube all round, a foredeck with a hatch and a bow rail, a centre console
// under a T-top roof with a light bar and a searchlight, and an open passenger well sunk half a metre below the gunwale,
// with two padded benches where the rescued animals sit (they are inside the boat, only their heads and shoulders show
// above the side), twin outboards at the stern
function bands(g, c2, f) { const p = g.attributes.position, c = g.attributes.color, k = new THREE.Color(c2); for (let i = 0; i < p.count; i++) if (f(p.getX(i), p.getY(i), p.getZ(i))) c.setXYZ(i, k.r, k.g, k.b); return g; }
export const RESCUE_WELL = { tw: 0.65, drop: 0.4 };
function rescueBoat(body, lamps, h, B, col, sh, o) {
  const L = B.L, fl = sh - RESCUE_WELL.drop, tw = RESCUE_WELL.tw, zw = L / 2 - tw * L, zs = L / 2 - 0.12, wt = h.widthAt(0.3) * 0.97, wb = wt * 0.64;
  // the foredeck, at the gunwale, from the bow back to the well
  const fd = new THREE.Shape(), N = 14, tt = i => tw + (1 - tw) * i / N;
  fd.moveTo(L / 2 - tt(0) * L, h.widthAt(tt(0))); for (let i = 1; i <= N; i++) fd.lineTo(L / 2 - tt(i) * L, h.widthAt(tt(i))); for (let i = N; i >= 0; i--) fd.lineTo(L / 2 - tt(i) * L, -h.widthAt(tt(i)));
  const fg = new THREE.ShapeGeometry(fd); fg.rotateX(PI / 2);
  { const p = fg.attributes.position, n = fg.attributes.normal; for (let i = 0; i < p.count; i++) { const z = p.getX(i), x = p.getZ(i), t = (L / 2 - z) / L; p.setXYZ(i, x, h.sheerAt(Math.min(1, Math.max(0, t))) + 0.005, z); n.setXYZ(i, 0, 1, 0); } }
  body.push(part(fg, 0xf2f4f6, 0.35));
  // the well: floor, a sloping liner each side, the front and back walls
  const trap = (z, flip) => { const s = new THREE.Shape(); s.moveTo(-wb, fl); s.lineTo(wb, fl); s.lineTo(wt, sh); s.lineTo(-wt, sh); s.lineTo(-wb, fl); const g = new THREE.ShapeGeometry(s); if (flip) g.rotateY(PI); g.translate(0, 0, z); return g; };
  body.push(part(trap(zw + 0.01), 0xe4e8ec, 0.3), part(trap(zs, true), 0xe4e8ec, 0.3));
  body.push(part(box(wb * 2 + 0.06, 0.05, zs - zw, 0, fl - 0.02, (zw + zs) / 2), 0xb8c0c8, 0.2));
  for (const sd of [-1, 1]) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([sd * wb, fl, zw, sd * wt, sh, zw, sd * wb, fl, zs, sd * wt, sh, zs], 3)); g.setIndex(sd > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]); g.computeVertexNormals(); body.push(part(g, 0xe4e8ec, 0.3));
    body.push(part(box(0.26, 0.06, zs - zw + 0.1, sd * (wt - 0.08), sh + 0.03, (zw + zs) / 2), 0xf6f6f6, 0.5));   // gunwale cap
    body.push(part(rbox(0.66, 0.2, 2.3, 0.06, sd * 0.5, fl + 0.1, 1.72), 0x1e5aa8, 0.35));   // the animals' padded bench
    body.push(part(box(0.68, 0.03, 2.32, sd * 0.5, fl + 0.2, 1.72), 0xffffff, 0.3));   // white piping on the bench
  }
  // the fender tube all round at the gunwale, in the boat's colour with white bands
  const pts = []; for (let i = 0; i <= 12; i++) { const t = 0.02 + i / 12 * 0.96; pts.push(new THREE.Vector3(-(h.widthAt(t) + 0.1), h.sheerAt(t) - 0.04, L / 2 - t * L)); } for (let i = 12; i >= 0; i--) { const t = 0.02 + i / 12 * 0.96; pts.push(new THREE.Vector3(h.widthAt(t) + 0.1, h.sheerAt(t) - 0.04, L / 2 - t * L)); }
  body.push(bands(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.17, 10), col, 0.55, true), 0xffffff, (x, y, z) => Math.abs((z + 10) % 1.4 - 0.7) < 0.07));
  // the console, windscreen, steering wheel, lifebuoys
  body.push(part(rbox(1.0, 1.0, 0.7, 0.1, 0, fl + 0.5, zw + 0.45), 0xf6f6f6, 0.6), part(box(0.86, 0.04, 0.42, 0, fl + 1.02, zw + 0.5, -0.3), 0x1a1a1e, 0.6));
  body.push(part(box(1.06, 0.46, 0.04, 0, fl + 1.25, zw + 0.12, -0.45), 0x8ac8ec, 1));
  const sw = new THREE.TorusGeometry(0.15, 0.025, 6, 16); sw.rotateX(-0.9); sw.translate(0, fl + 1.12, zw + 0.78); body.push(part(sw, 0x1a1a1e, 0.6));
  for (const sd of [-1, 1]) { const lb = new THREE.TorusGeometry(0.22, 0.07, 8, 18); lb.rotateY(PI / 2); lb.translate(sd * 0.54, fl + 0.55, zw + 0.45); body.push(bands(part(lb, 0xff4a1a, 0.5), 0xffffff, (x, y, z) => Math.abs(Math.atan2(y - fl - 0.55, z - zw - 0.45)) % (PI / 2) < 0.35)); }
  // the T-top: four poles and a white roof
  for (const sd of [-1, 1]) for (const z of [zw + 0.05, zw + 0.95]) body.push(part(beam(V(sd * 0.55, fl + 0.95, z), V(sd * 0.55, fl + 2.05, z), 0.05), 0xd0d6dc, 1));
  body.push(part(rbox(1.42, 0.1, 1.15, 0.04, 0, fl + 2.08, zw + 0.5), 0xf8f8f8, 0.6), part(box(1.12, 0.12, 0.24, 0, fl + 2.2, zw + 0.3), 0x2a2a30, 0.6));
  body.push(part(cyl(0.13, 0.13, 0.26, 12, 0.5, fl + 2.3, zw + 0.25, PI / 2), 0xd0d6dc, 1), part(cyl(0.02, 0.02, 0.8, 5, -0.5, fl + 2.5, zw + 0.85), 0xd0d6dc, 1));
  lamps.push(part(cyl(0.11, 0.11, 0.02, 12, 0.5, fl + 2.3, zw + 0.11, PI / 2), 0xfff6c8));
  // the foredeck: a hatch, cleats, the bow rail; side rails at the well
  body.push(part(rbox(0.7, 0.06, 0.6, 0.05, 0, h.sheerAt(0.8) + 0.03, L / 2 - 0.8 * L), 0xd8dde2, 0.5));
  for (const sd of [-1, 1]) { body.push(part(beam(V(sd * h.widthAt(0.72) * 0.9, h.sheerAt(0.72) + 0.02, L / 2 - 0.72 * L), V(sd * h.widthAt(0.72) * 0.9, h.sheerAt(0.72) + 0.4, L / 2 - 0.72 * L), 0.035), 0xd0d6dc, 1)); body.push(part(beam(V(sd * h.widthAt(0.72) * 0.9, h.sheerAt(0.72) + 0.4, L / 2 - 0.72 * L), V(sd * 0.05, h.sheerAt(0.97) + 0.4, L / 2 - 0.97 * L), 0.035), 0xd0d6dc, 1)); }
  // twin outboards
  for (const x of [-0.42, 0.42]) { body.push(part(rbox(0.44, 0.68, 0.52, 0.13, x, sh + 0.2, L / 2 + 0.24), 0x1a1a1e, 0.8), part(box(0.1, 0.72, 0.12, x, sh - 0.36, L / 2 + 0.32), 0x2a2a2e, 0.5), part(box(0.46, 0.08, 0.54, x, sh + 0.3, L / 2 + 0.24), col, 0.7)); }
  // nav lights
  lamps.push(part(box(0.07, 0.07, 0.07, h.widthAt(0.85) + 0.05, h.sheerAt(0.85) + 0.06, L / 2 - 0.85 * L), 0x2aff4a), part(box(0.07, 0.07, 0.07, -h.widthAt(0.85) - 0.05, h.sheerAt(0.85) + 0.06, L / 2 - 0.85 * L), 0xff2a2a));
}
const rescueDecal = canvasTex(512, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = 'bold 50px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#0a2a4a'; c.strokeText('ANIMAL RESCUE', w / 2 + 24, h / 2 + 2); c.fillStyle = '#ffffff'; c.fillText('ANIMAL RESCUE', w / 2 + 24, h / 2 + 2); c.fillStyle = '#ffffff'; c.strokeStyle = '#0a2a4a'; c.lineWidth = 4; const px = 34, py = 34; for (const [dx, dy, r] of [[0, 6, 13], [-14, -9, 6], [-5, -16, 6], [6, -16, 6], [15, -9, 6]]) { c.beginPath(); c.arc(px + dx, py + dy, r, 0, 7); c.stroke(); c.fill(); } });
function rescueExtras(B, h) {
  const meshes = [], dm = new THREE.MeshStandardMaterial({ map: rescueDecal, transparent: true, roughness: 0.4, depthWrite: false });
  for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(2.7, 0.34); g.rotateY(sd * PI / 2); g.rotateZ(-sd * 0.62); if (sd < 0) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setX(i, 1 - u.getX(i)); } g.translate(sd * (h.widthAt(0.45) - 0.08), h.sheerAt(0.45) - 0.17, 0.35); const m = new THREE.Mesh(g, dm); m.renderOrder = 1; meshes.push(m); }
  // the light bar: blue and red beacons that flash (the game switches them)
  const fl = h.sheerAt(0.5) - RESCUE_WELL.drop, zw = B.L / 2 - RESCUE_WELL.tw * B.L, beacons = [];
  for (const [x, c] of [[-0.38, 0x2a6aff], [0.38, 0xff2a3a]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.26), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, fl + 2.27, zw + 0.3); meshes.push(m); beacons.push(m); }
  return { meshes, beacons };
}

// ---------------- the tractor with its trolley (full of hay) ----------------
function makeTractor(col = 0xc8202a, o = {}) {
  const body = [], lamps = [], W = 1.75;
  // bonnet and engine (front at -z), the grille, the radiator cap, the exhaust stack
  body.push(part(rbox(0.82, 0.72, 1.75, 0.12, 0, 1.2, -1.15), col, 0.6, true));
  body.push(part(box(0.7, 0.55, 0.04, 0, 1.17, -2.03), 0x1a1a1c, 0.4)); for (let i = 0; i < 6; i++) body.push(part(box(0.66, 0.025, 0.05, 0, 0.95 + i * 0.09, -2.04), 0xc8ced6, 0.9));
  body.push(part(box(0.62, 0.42, 1.4, 0, 0.72, -1.05), 0x2a2a2e, 0.5));
  body.push(part(cyl(0.06, 0.07, 0.95, 10, 0.32, 1.95, -1.35), 0x2a2a2e, 0.6), part(cyl(0.09, 0.07, 0.12, 10, 0.32, 2.42, -1.35), 0x1a1a1a, 0.6));
  if (o.stripe) body.push(part(box(0.84, 0.74, 0.1, 0, 1.2, -1.6), o.stripe, 0.5), part(box(0.84, 0.74, 0.1, 0, 1.2, -0.75), o.stripe, 0.5));
  // the driver's platform, rear mudguards over the big wheels, the seat, the steering wheel
  body.push(part(box(1.1, 0.12, 1.0, 0, 0.82, 0.25), 0x2a2a2e, 0.4));
  for (const sd of [-1, 1]) { const g = new THREE.CylinderGeometry(0.88, 0.88, 0.5, 18, 1, true, -PI / 2 - 1.15, 2.3); g.rotateZ(PI / 2); g.translate(sd * 0.82, 0.8, 0.45); body.push(part(g, col, 0.55)); body.push(part(box(0.5, 0.05, 1.2, sd * 0.82, 1.62, 0.45), col, 0.55)); }
  body.push(part(rbox(0.5, 0.12, 0.45, 0.05, 0, 1.25, 0.55), 0x1a1a1a, 0.3), part(rbox(0.5, 0.45, 0.1, 0.04, 0, 1.5, 0.8), 0x1a1a1a, 0.3));
  body.push(part(cyl(0.04, 0.04, 0.7, 6, 0, 1.45, -0.05, 0.6), 0x1a1a1a, 0.4)); { const t = new THREE.TorusGeometry(0.18, 0.025, 6, 16); t.rotateX(PI / 2 - 0.6); t.translate(0, 1.75, -0.25); body.push(part(t, 0x1a1a1a, 0.4)); }
  // a sun canopy on four poles
  if (o.roofItem !== 'none') { for (const [x, z] of [[-0.62, -0.25], [0.62, -0.25], [-0.62, 1.0], [0.62, 1.0]]) body.push(part(cyl(0.03, 0.03, 1.35, 6, x, 2.15, z), 0x2a2a2e, 0.5)); body.push(part(rbox(1.5, 0.08, 1.55, 0.04, 0, 2.86, 0.38), o.roofCol ?? 0xf4f4f0, 0.4)); }
  // the hitch and the trolley: a painted box on two wheels, piled with hay
  body.push(part(box(0.12, 0.1, 1.0, 0, 0.62, 1.4), 0x2a2a2e, 0.5));
  const tc = o.trolley ?? 0x2a6ab0, tz = 3.55;
  body.push(part(box(2.0, 0.12, 3.3, 0, 0.95, tz), 0x3a2a1a, 0.2));
  for (const sd of [-1, 1]) body.push(part(box(0.06, 0.7, 3.3, sd * 0.97, 1.36, tz), tc, 0.45));
  body.push(part(box(2.0, 0.7, 0.06, 0, 1.36, tz - 1.62), tc, 0.45), part(box(2.0, 0.7, 0.06, 0, 1.36, tz + 1.62), tc, 0.45));
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) body.push(part(box(0.065, 0.08, 0.5, sd * 0.97, 1.36, tz - 1.3 + i * 0.65), [0xffd21a, 0xe8202a, 0x2aa84a, 0xff7a1a, 0xffffff][i], 0.5));
  for (let i = 0; i < 6; i++) body.push(part(rbox(0.9, 0.5, 0.95, 0.1, (i % 2 ? 0.45 : -0.45), 1.95 + (i >= 4 ? 0.45 : 0), tz - 1.05 + (i % 3) * 1.05 - (i >= 4 ? 0.5 : 0)), 0xe8c86a, 0.05, true));
  lamps.push(part(box(0.15, 0.08, 0.02, -0.85, 1.0, tz + 1.66), 0xff2a1a), part(box(0.15, 0.08, 0.02, 0.85, 1.0, tz + 1.66), 0xff2a1a));
  for (const sd of [-1, 1]) { lamps.push(part(cyl(0.09, 0.09, 0.05, 14, sd * 0.3, 1.5, -2.05, PI / 2), 0xfff6d8)); body.push(part(cyl(0.11, 0.11, 0.04, 14, sd * 0.3, 1.5, -2.03, PI / 2), 0xc8ced6, 1)); }
  body.push(part(box(0.38, 0.12, 0.02, 0, 0.75, tz + 1.66), 0xffd21a, 0.3));
  if (o.roofItem === 'lightbar') addRoof('lightbar', body, lamps, 2.9, 0.38, 0.6, 1.3); else if (o.roofItem === 'sign') addRoof('sign', body, lamps, 2.9, 0.38, 0.6, 1.2); else if (o.roofItem === 'rack') addRoof('rack', body, lamps, 2.9, 0.38, 1.2, 1.3);
  if (o.wing) body.push(part(rbox(1.5, 0.05, 0.3, 0.02, 0, 3.05, 1.05), 0x111114, 0.6));
  const extra = [...(o.extra || [])]; if (o.decal) extra.push(...sideDecals(o.decal, 0.86, 1.5, 0.5, 1.2, -1.15)); if (o.neon) extra.push(neonPlane(o.neon, 2.0, 7.4));
  const wk = o.rims || 'offroad', car = assemble(body, lamps, [[-0.45, 0.78, 0.82, 0, 0.42], [1.15, 0.42, 0.68, 1, 0.22], [-3.55, 0.5, 1.12, 0, 0.26]], 0.78, 0.42, wk, { ...o, extra }, { x: 2.0, y: 2.95, z: 7.4 });
  car.model.position.z = -1.55;   // the whole rig is centred on the length that hits things
  car.exhaust = [[0.32, 2.5, -2.9, 1]]; car.roofY = 2.9; return car;
}
// things on the roof: the taxi sign, a rack with luggage, a light bar
function addRoof(k, body, lamps, rf, cz, len, w) {
  if (k === 'sign') { body.push(part(rbox(0.7, 0.2, 0.28, 0.04, 0, rf + 0.12, cz), 0xffd21a, 0.4)); body.push(part(box(0.62, 0.11, 0.29, 0, rf + 0.12, cz), 0x1a1a1a, 0.4)); lamps.push(part(box(0.5, 0.06, 0.295, 0, rf + 0.13, cz), 0xfff2a0)); }
  else if (k === 'rack') {
    for (const sd of [-1, 1]) body.push(part(box(0.04, 0.05, len, sd * w / 2, rf + 0.08, cz), 0x2a2a30, 0.7));
    for (let i = 0; i < 4; i++) body.push(part(box(w, 0.035, 0.04, 0, rf + 0.08, cz - len / 2 + 0.1 + i * (len - 0.2) / 3), 0x2a2a30, 0.7));
    body.push(part(rbox(0.6, 0.32, 0.45, 0.06, -w * 0.18, rf + 0.26, cz - len * 0.18), 0x8a4a1a, 0.2, true), part(rbox(0.45, 0.25, 0.4, 0.06, w * 0.2, rf + 0.22, cz + len * 0.15), 0x2a6ab0, 0.2, true), part(cyl(0.13, 0.13, 0.55, 10, w * 0.15, rf + 0.22, cz - len * 0.25, 0, PI / 2), 0xe8402a, 0.2));
  } else if (k === 'lightbar') {
    body.push(part(box(Math.min(1.4, w + 0.1), 0.12, 0.16, 0, rf + 0.1, cz - len / 2 + 0.1), 0x18181a, 0.5));
    for (let i = 0; i < 6; i++) lamps.push(part(box(0.16, 0.08, 0.02, -0.55 + i * 0.22, rf + 0.1, cz - len / 2 + 0.01), 0xfffbe8));
  }
}
// pictures on the sides: flames, a checker, tiger stripes, a lightning bolt, a racing number
const DECALS = {};
function decalTex(k) {
  return DECALS[k] || (DECALS[k] = canvasTex(512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    if (k === 'flames') { for (let i = 0; i < 9; i++) { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ffe24a'); g.addColorStop(0.5, '#ff7a1a'); g.addColorStop(1, 'rgba(232,32,42,0)'); c.fillStyle = g; c.beginPath(); const y = 18 + i * 11; c.moveTo(0, y - 8); c.quadraticCurveTo(w * 0.35, y - 30 + (i % 3) * 8, w * (0.55 + (i % 4) * 0.1), y - 4); c.quadraticCurveTo(w * 0.35, y + 10, 0, y + 10); c.fill(); } }
    else if (k === 'checker') { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) if ((x + y) % 2) { c.fillStyle = '#111'; c.fillRect(x * 32, y * 32, 32, 32); } else { c.fillStyle = '#fff'; c.fillRect(x * 32, y * 32, 32, 32); } }
    else if (k === 'tiger') { c.fillStyle = '#111'; for (let i = 0; i < 12; i++) { const x = i * 44 + 10; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 26, 0); c.lineTo(x + 6, h * 0.55); c.lineTo(x + 22, h); c.lineTo(x - 4, h); c.lineTo(x + 12, h * 0.5); c.fill(); } }
    else if (k === 'bolt') { c.fillStyle = '#ffe24a'; c.strokeStyle = '#111'; c.lineWidth = 6; c.beginPath(); c.moveTo(10, 70); c.lineTo(220, 40); c.lineTo(200, 64); c.lineTo(500, 30); c.lineTo(290, 96); c.lineTo(310, 70); c.lineTo(10, 100); c.closePath(); c.fill(); c.stroke(); }
    else if (k === 'num') { c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, 58, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#111'; c.stroke(); c.fillStyle = '#e8202a'; c.font = 'bold 92px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', w / 2, h / 2 + 6); c.fillStyle = '#111'; c.fillRect(0, h / 2 - 5, w / 2 - 66, 10); c.fillRect(w / 2 + 66, h / 2 - 5, w / 2, 10); }
  }));
}
function sideDecals(k, W, len, h, y, z) {
  const t = decalTex(k), out = [];
  for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(sd * (W / 2 + 0.012), y, z); m.rotation.y = sd * PI / 2; if (sd < 0) m.scale.x = -1; out.push(m); }
  return out;
}
let NEON = null;
function neonPlane(col, W, L) {
  NEON = NEON || canvasTex(64, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.save(); c.scale(1, 2); c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, L * 1.15), new THREE.MeshBasicMaterial({ map: NEON, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -PI / 2; m.position.y = 0.04; return m;
}

// ---------------- more Indian traffic: e-rickshaw, loading tempo, scooter, cycle, bullock cart, vendor's cart ----------------
// a simple person (riders, the cart man, the vendor) made of a few rounded parts; sitting or standing
function figure(body, o) {
  const { x = 0, y = 0, z = 0, shirt = 0x2a8ad8, pants = 0x2a2a3a, skin = 0xc68642, hat = null, sit = false, lean = 0 } = o;
  const hy = sit ? 0.55 : 0.85;
  if (sit) { for (const s of [-1, 1]) { body.push(part(box(0.13, 0.13, 0.45, x + s * 0.1, y + 0.08, z - 0.2), pants, 0.2)); body.push(part(box(0.12, 0.42, 0.13, x + s * 0.1, y - 0.15, z - 0.42), pants, 0.2)); } }
  else for (const s of [-1, 1]) body.push(part(box(0.13, 0.85, 0.14, x + s * 0.1, y + 0.42, z), pants, 0.2));
  body.push(part(rbox(0.4, 0.55, 0.24, 0.08, x, y + hy + 0.27, z + lean * 0.1), shirt, 0.25, true));
  for (const s of [-1, 1]) body.push(part(beam(V(x + s * 0.22, y + hy + 0.48, z + lean * 0.1), V(x + s * 0.2, y + hy + 0.22, z - 0.32), 0.09), shirt, 0.25));
  const head = new THREE.SphereGeometry(0.13, 12, 10); head.translate(x, y + hy + 0.7, z + lean * 0.12); body.push(part(head, skin, 0.2, true));
  if (hat === 'helmet') { const h = new THREE.SphereGeometry(0.155, 12, 8, 0, PI * 2, 0, PI * 0.55); h.translate(x, y + hy + 0.73, z + lean * 0.12); body.push(part(h, o.hatCol ?? 0xe8202a, 0.7, true)); }
  else if (hat === 'turban') { const t = new THREE.TorusGeometry(0.11, 0.06, 6, 14); t.rotateX(PI / 2); t.translate(x, y + hy + 0.79, z + lean * 0.12); body.push(part(t, o.hatCol ?? 0xff8a1a, 0.2, true)); }
  else if (hat === 'cap') body.push(part(box(0.26, 0.08, 0.3, x, y + hy + 0.81, z + lean * 0.12 - 0.04), o.hatCol ?? 0x1a4ab0, 0.2));
  else { const h = new THREE.SphereGeometry(0.135, 10, 6, 0, PI * 2, 0, PI * 0.45); h.translate(x, y + hy + 0.72, z + lean * 0.12); body.push(part(h, 0x1a1210, 0.2, true)); }
}
const SHIRTS = [0xe8402a, 0x2a8ad8, 0xffc21a, 0x3fcf6e, 0xf4f4f4, 0x8a5ad8, 0xff8ab8, 0x1a1a1a];
const rpick = a => a[Math.floor(Math.random() * a.length)];
function makeERick(col = 0x2aa84a, o = {}) {   // the battery e-rickshaw: open sides, a roof, four seats
  const body = [], lamps = [], W = 1.0, L = 2.75;
  const s = new THREE.Shape(); s.moveTo(-1.35, 0.28); s.lineTo(1.0, 0.28); s.quadraticCurveTo(1.36, 0.3, 1.32, 0.7); s.lineTo(1.22, 1.0); s.lineTo(0.95, 1.0); s.lineTo(0.8, 0.55); s.lineTo(-1.35, 0.55); s.lineTo(-1.35, 0.28);
  body.push(part(extrudeSide(s, W, { L, bevel: 0.05, round: [0.4, 0.25] }), col, 0.6, true));
  body.push(part(box(W * 0.8, 0.5, 0.03, 0, 1.3, -0.98, -0.15), o.tint ?? 0x0e1620, 1));
  body.push(part(rbox(W + 0.16, 0.08, 2.4, 0.03, 0, 1.95, 0.05), o.top ?? 0xf4f4f4, 0.5));
  for (const [x, z] of [[-0.48, -0.85], [0.48, -0.85], [-0.48, 1.2], [0.48, 1.2]]) body.push(part(cyl(0.025, 0.025, 1.4, 6, x, 1.25, z), 0xc8ced6, 0.8));
  for (const z of [-0.2, 0.75]) { body.push(part(rbox(W - 0.1, 0.12, 0.45, 0.04, 0, 0.72, z), 0x1a1a1a, 0.2)); body.push(part(rbox(W - 0.1, 0.4, 0.08, 0.03, 0, 0.98, z + 0.22), 0x1a1a1a, 0.2)); }
  figure(body, { z: -0.35, y: 0.62, sit: true, shirt: rpick(SHIRTS), hat: 'cap' });
  lamps.push(part(cyl(0.07, 0.07, 0.04, 12, 0, 0.82, -1.36, PI / 2), 0xfff6d8)); lamps.push(part(box(0.12, 0.08, 0.02, -0.38, 0.5, 1.36), 0xff2a1a), part(box(0.12, 0.08, 0.02, 0.38, 0.5, 1.36), 0xff2a1a));
  body.push(part(box(W - 0.2, 0.06, L - 0.5, 0, 0.25, 0.1), 0x101012, 0));
  return assemble(body, lamps, [[-0.95, 0.24, 0, 1], [0.85, 0.24, W / 2 - 0.06, 0]], 0.24, 0.12, 'black', o, { x: W, y: 2.0, z: L });
}
function makeTempo(col = 0x2a6ab0, o = {}) {   // the three-wheeler loader: a small cabin and a cargo bed piled high
  const body = [], lamps = [], W = 1.5, L = 3.4;
  const s = new THREE.Shape(); s.moveTo(0.35, 0.35); s.lineTo(1.35, 0.35); s.quadraticCurveTo(1.72, 0.38, 1.68, 0.85); s.lineTo(1.58, 1.75); s.lineTo(0.5, 1.8); s.lineTo(0.35, 0.35);
  body.push(part(extrudeSide(s, W - 0.1, { L, bevel: 0.06, round: [0.4, 0.2] }), col, 0.6, true));
  body.push(part(box(W - 0.4, 0.55, 0.03, 0, 1.35, -1.68, -0.08), 0x0e1620, 1));
  for (const sd of [-1, 1]) body.push(part(box(0.03, 0.45, 0.6, sd * (W / 2 - 0.04), 1.35, -1.05), 0x0e1620, 1));
  body.push(part(box(W, 0.1, 2.0, 0, 0.62, 0.65), 0x3a2a1a, 0.2));
  for (const sd of [-1, 1]) body.push(part(box(0.05, 0.45, 2.0, sd * W / 2, 0.88, 0.65), col, 0.5)); body.push(part(box(W, 0.45, 0.05, 0, 0.88, 1.63), col, 0.5));
  const load = o.load ?? rpick(['sacks', 'gas', 'veg']);
  if (load === 'sacks') for (let i = 0; i < 6; i++) body.push(part(rbox(0.6, 0.32, 0.55, 0.12, (i % 2 ? 0.33 : -0.33), 0.86 + (i >= 4 ? 0.32 : 0), 0.05 + (i % 3) * 0.6 - (i >= 4 ? 0.2 : 0)), 0xd8c8a0, 0.05, true));
  else if (load === 'gas') for (let i = 0; i < 8; i++) body.push(part(cyl(0.15, 0.15, 0.6, 10, -0.5 + (i % 4) * 0.33, 0.98, 0.2 + Math.floor(i / 4) * 0.8), 0xe8202a, 0.6));
  else for (let i = 0; i < 9; i++) body.push(part(new THREE.SphereGeometry(0.2, 8, 6).translate(-0.45 + (i % 3) * 0.45, 0.9 + (i % 2) * 0.15, 0.1 + Math.floor(i / 3) * 0.55), rpick([0x3fcf3e, 0xe8302a, 0xff9a1a]), 0.3));
  figure(body, { z: -0.95, y: 0.65, sit: true, shirt: rpick(SHIRTS), hat: rpick(['cap', null]) });
  lamps.push(part(cyl(0.08, 0.08, 0.04, 12, 0, 1.05, -1.71, PI / 2), 0xfff6d8)); lamps.push(part(box(0.15, 0.08, 0.02, -0.6, 0.75, 1.67), 0xff2a1a), part(box(0.15, 0.08, 0.02, 0.6, 0.75, 1.67), 0xff2a1a));
  body.push(part(box(0.5, 0.12, 0.02, 0, 0.62, 1.67), 0xffd21a, 0.3));
  return assemble(body, lamps, [[-1.25, 0.28, 0, 1], [0.95, 0.28, W / 2 - 0.08, 0]], 0.28, 0.16, 'black', o, { x: W, y: 2.0, z: L });
}
function makeTwoWheeler(kind, col = 0xe8202a, o = {}) {   // a scooter or a bicycle, with its rider
  const body = [], lamps = [], cyc = kind === 'cycle', R = cyc ? 0.34 : 0.26, L = cyc ? 1.75 : 1.8;
  if (cyc) {
    const c = col; body.push(part(beam(V(0, 0.34, 0.58), V(0, 0.8, -0.05), 0.04), c, 0.7), part(beam(V(0, 0.8, -0.05), V(0, 0.82, 0.45), 0.04), c, 0.7), part(beam(V(0, 0.34, 0.58), V(0, 0.34, 0.08), 0.035), c, 0.7), part(beam(V(0, 0.34, 0.08), V(0, 0.82, -0.05), 0.04), c, 0.7), part(beam(V(0, 0.34, -0.58), V(0, 0.95, -0.42), 0.04), c, 0.7));
    body.push(part(box(0.5, 0.03, 0.03, 0, 0.98, -0.45), 0x1a1a1a, 0.4), part(rbox(0.16, 0.06, 0.26, 0.03, 0, 0.92, 0.42), 0x1a1a1a, 0.2));
  } else {
    body.push(part(rbox(0.42, 0.55, 0.9, 0.18, 0, 0.6, 0.3), col, 0.65, true), part(rbox(0.36, 0.8, 0.22, 0.1, 0, 0.75, -0.5), col, 0.65, true), part(box(0.34, 0.06, 0.6, 0, 0.32, -0.12), 0x2a2a2e, 0.3));
    body.push(part(rbox(0.32, 0.1, 0.6, 0.05, 0, 0.92, 0.32), 0x1a1a1a, 0.2), part(box(0.6, 0.04, 0.04, 0, 1.18, -0.55), 0x1a1a1a, 0.4), part(rbox(0.3, 0.12, 0.12, 0.04, 0, 1.15, -0.58), col, 0.6));
    lamps.push(part(cyl(0.07, 0.07, 0.04, 10, 0, 1.12, -0.66, PI / 2), 0xfff6d8), part(box(0.12, 0.05, 0.02, 0, 0.75, 0.76), 0xff2a1a));
  }
  figure(body, { z: cyc ? 0.32 : 0.28, y: cyc ? 0.38 : 0.42, sit: true, lean: 1, shirt: rpick(SHIRTS), hat: cyc ? rpick(['cap', 'turban', null]) : 'helmet', hatCol: rpick([0xe8202a, 0xf4f4f4, 0x1a1a1a, 0xffc21a]) });
  return assemble(body, lamps, [[-0.58, R, 0, 1, cyc ? 0.04 : 0.1], [0.58, R, 0, 0, cyc ? 0.04 : 0.1]], R, cyc ? 0.04 : 0.1, cyc ? 'steel' : 'black', o, { x: 0.7, y: 1.7, z: L });
}
function makeBullCart(col = 0x8a5a2a, o = {}) {   // the bullock cart (the bulls are added by the game: they walk)
  const body = [], lamps = [], W = 1.6;
  body.push(part(box(1.5, 0.1, 2.2, 0, 0.95, 0.9), col, 0.15));
  for (const sd of [-1, 1]) { body.push(part(box(0.06, 0.4, 2.2, sd * 0.75, 1.2, 0.9), col, 0.15)); body.push(part(beam(V(sd * 0.3, 0.95, -0.2), V(sd * 0.15, 0.95, -2.4), 0.08), 0x6a4018, 0.1)); }
  body.push(part(box(1.2, 0.1, 0.1, 0, 1.05, -2.3), 0x6a4018, 0.1));
  const hay = o.load ?? true; if (hay) for (let i = 0; i < 4; i++) body.push(part(rbox(0.7, 0.45, 0.95, 0.12, (i % 2 ? 0.35 : -0.35), 1.3 + (i >= 2 ? 0.4 : 0), 0.5 + (i % 2) * 0.8), 0xe8c86a, 0.05, true));
  figure(body, { z: -0.1, y: 1.0, sit: true, shirt: 0xf4f4f4, hat: 'turban', hatCol: rpick([0xff8a1a, 0xe8202a, 0xf4f4f4]) });
  const wheels = [];
  for (const sd of [-1, 1]) { const t = new THREE.TorusGeometry(0.62, 0.05, 6, 20); t.rotateY(PI / 2); t.translate(sd * 0.82, 0.66, 1.0); wheels.push(part(t, 0x5a3a1a, 0.1)); for (let i = 0; i < 6; i++) { const a = i / 6 * PI; wheels.push(part(box(0.04, 1.22, 0.05, sd * 0.82, 0.66, 1.0, a, 0, 0), 0x6a4a2a, 0.1)); } wheels.push(part(cyl(0.1, 0.1, 0.12, 8, sd * 0.82, 0.66, 1.0, 0, PI / 2), 0x3a2a1a, 0.1)); }
  body.push(...wheels);
  lamps.push(part(box(0.2, 0.06, 0.02, 0, 0.9, 2.02), 0xff2a1a));
  const car = assemble(body, lamps, [], 0.62, 0.1, 'black', o, { x: W, y: 2.1, z: 5.2 }); car.model.position.z = 0.7; car.bulls = [[-0.45, -3.1], [0.45, -3.1]]; return car;
}
function makeHandCart(col = 0x2a8a3a, o = {}) {   // the vendor's cart (thela): fruit piled high, an umbrella, pushed by the vendor
  const body = [], lamps = [], W = 1.1;
  body.push(part(box(1.05, 0.12, 1.8, 0, 0.8, 0), col, 0.3), part(box(1.0, 0.25, 1.75, 0, 0.95, 0), 0x6a4018, 0.1));
  const C = rpick([[0xff4a2a, 0xffc21a, 0x7ad83a], [0x3fcf3e, 0xe8302a, 0x8a3ab0], [0xffd21a, 0xff9a1a]]);
  for (let i = 0; i < 14; i++) body.push(part(new THREE.SphereGeometry(0.12, 8, 6).translate(-0.4 + (i % 5) * 0.2, 1.15 + Math.floor(i / 10) * 0.18, -0.7 + (i % 7) * 0.22), C[i % C.length], 0.3));
  body.push(part(cyl(0.025, 0.025, 1.4, 6, 0, 1.75, 0), 0x6a4018, 0.2)); { const u = new THREE.ConeGeometry(0.95, 0.35, 10, 1, true); u.translate(0, 2.55, 0); body.push(part(u, rpick([0xe8202a, 0x2a8ad8, 0xffc21a]), 0.3)); }
  for (const sd of [-1, 1]) body.push(part(beam(V(sd * 0.4, 0.95, 0.9), V(sd * 0.3, 1.05, 1.35), 0.04), 0x6a4018, 0.1));
  figure(body, { z: 1.55, shirt: rpick(SHIRTS), hat: rpick(['cap', 'turban', null]) });
  return assemble(body, lamps, [[-0.55, 0.3, 0.55, 1, 0.06], [0.55, 0.3, 0.55, 0, 0.06]], 0.3, 0.06, 'steel', o, { x: W, y: 2.7, z: 2.6 });
}
