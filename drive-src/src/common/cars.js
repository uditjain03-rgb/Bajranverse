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
  gypsy: { L: 4.0, W: 1.6, H: 1.85, wb: 2.37, R: 0.36, clr: 0.3, belt: 1.12, hoodF: 1.02, trunk: 1.12, ws: 0.62, wsTop: 0.56, rw: -1.95, rwTop: -1.95, trunkEnd: -1.98, tumble: 0.03, wheel: 'black', grille: 'black', boxy: 1, round: [0.2, 0.04] },
};
// colours of the standard liveries
export const LIVERY = {
  kaalipeeli: { body: 0x16161a, roof: 0xffc61a, sign: 1 }, coolcab: { body: 0x4aa8e8, roof: 0x4aa8e8, sign: 1, stripe: 0xffffff }, ecab: { body: 0xf4f6f8, roof: 0x2ecc71, sign: 1, stripe: 0x2ecc71 },
  police: { body: 0xf4f6f8, roof: 0xf4f6f8, stripe: 0x2a4ab0, siren: 1 },
};
// build a car
// cars are made once per kind and colour and then copied (they share their meshes): no lag when a ride starts
const carCache = {};
export function makeCar(type, col = 0xc8302a, o = {}) {
  if (o.spin) return buildCar(type, col, o);
  const k = type + '|' + col + '|' + (o.livery || '') + '|' + (o.taxi ? 1 : 0) + '|' + (o.top ?? '');
  const T = carCache[k] || (carCache[k] = buildCar(type, col, o)), obj = T.obj.clone(true);
  return { ...T, obj, model: obj.children[0], wheels: [], front: [], size: T.size.clone() };
}
function buildCar(type, col = 0xc8302a, o = {}) {
  if (LOFT[type]) return loftCar(type, col, o);
  if (type === 'auto') return makeAuto(col, o); if (type === 'bus') return makeBus(col, o); if (type === 'truck') return makeTruck(col, o);
  const C = CARS[type] || CARS.sedan, L = C.L, W = C.W, L2 = L / 2, body = [], lamps = [];
  const liv = o.livery ? LIVERY[o.livery] : null, paint = liv ? liv.body : col, roofC = liv ? liv.roof : col;
  const sR = -C.wb / 2 + (C.L / 2 - C.wb / 2 - 0.85 > 0 ? -0.05 : 0), sF = C.wb / 2 - 0.02, aR = C.R + 0.07, y0 = C.clr + 0.05;
  // the lower body: bumpers, wheel arches, hood, the beltline, the boot
  const s = new THREE.Shape(); const B = 0.06;
  s.moveTo(-L2 + 0.12, y0);
  for (const wc of [sR, sF]) { s.lineTo(wc - aR, y0); for (let i = 0; i <= 10; i++) { const a = PI - i / 10 * PI; s.lineTo(wc + Math.cos(a) * aR, C.R + 0.02 + Math.sin(a) * aR); } s.lineTo(wc + aR, y0); }
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
  body.push(part(cab, 0x0e1620, 1.0, true));
  // the roof panel (body colour) just above the glass, slightly smaller
  const rs = new THREE.Shape(); rs.moveTo(C.rwTop + 0.12, rf - 0.07); rs.lineTo(C.wsTop - 0.17, rf - 0.07); rs.quadraticCurveTo(C.wsTop - 0.1, rf + 0.012, C.wsTop - 0.25, rf + 0.012); rs.lineTo(C.rwTop + 0.22, rf + 0.012); rs.quadraticCurveTo(C.rwTop + 0.08, rf + 0.012, C.rwTop + 0.12, rf - 0.07);
  body.push(part(extrudeSide(rs, Wc * (1 - C.tumble) + 0.02, { L, bevel: 0.04, seg: 4 }), roofC, 0.6, true));
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
  // bumpers, grille, plates, lamps
  const fz = -L2 + 0.02, rz = L2 - 0.02, bc = C.grille === 'chrome' ? 0xdfe5ec : 0x202024;
  body.push(part(rbox(W - 0.08, 0.16, 0.16, 0.05, 0, y0 + 0.1, fz + 0.04), bc, 0.8)); body.push(part(rbox(W - 0.08, 0.16, 0.16, 0.05, 0, y0 + 0.1, rz - 0.04), bc, 0.8));
  body.push(part(box(W * 0.45, (C.hoodF - y0) * 0.38, 0.03, 0, y0 + (C.hoodF - y0) * 0.62, fz), 0x0c0c0e, 0.3));
  if (C.grille === 'chrome') for (let i = 0; i < 4; i++) body.push(part(box(W * 0.45, 0.012, 0.035, 0, y0 + (C.hoodF - y0) * (0.48 + i * 0.09), fz - 0.005), 0xe8eef4, 1));
  const plate = o.taxi ? 0xffd21a : 0xf4f4f0;
  body.push(part(box(0.5, 0.12, 0.02, 0, y0 + 0.22, fz - 0.01), plate, 0.3)); body.push(part(box(0.5, 0.12, 0.02, 0, y0 + 0.24, rz + 0.01), plate, 0.3));
  for (const sd of [-1, 1]) {
    if (C.box) { lamps.push(part(cyl(0.085, 0.085, 0.04, 14, sd * (W / 2 - 0.22), C.hoodF - 0.13, fz - 0.005, PI / 2), 0xfff6d8)); body.push(part(cyl(0.1, 0.1, 0.03, 14, sd * (W / 2 - 0.22), C.hoodF - 0.13, fz + 0.01, PI / 2), 0xe8eef4, 1)); }
    else lamps.push(part(box(0.32, 0.09, 0.03, sd * (W / 2 - 0.25), C.hoodF - 0.1, fz - 0.005), 0xfff4e0));
    lamps.push(part(box(0.06, 0.04, 0.02, sd * (W / 2 - 0.12), y0 + 0.2, fz - 0.03), 0xffa21a));
    lamps.push(part(box(C.boxy ? 0.12 : 0.28, C.boxy ? 0.22 : 0.1, 0.03, sd * (W / 2 - (C.boxy ? 0.1 : 0.22)), (C.boxy ? C.belt - 0.15 : Math.min(C.trunk, C.belt) - 0.12), rz + 0.005), 0xff2a1a));
  }
  // taxi roof sign, police lights, roof rails (SUV)
  if ((liv && liv.sign) || o.taxi) { body.push(part(rbox(0.7, 0.2, 0.28, 0.04, 0, rf + 0.12, -0.05), 0xffd21a, 0.4)); body.push(part(box(0.62, 0.11, 0.29, 0, rf + 0.12, -0.05), 0x1a1a1a, 0.4)); lamps.push(part(box(0.5, 0.06, 0.295, 0, rf + 0.13, -0.05), 0xfff2a0)); }
  if (liv && liv.siren) { body.push(part(box(0.9, 0.06, 0.25, 0, rf + 0.05, -0.1), 0x1a1a1a, 0.5)); lamps.push(part(box(0.38, 0.1, 0.22, -0.23, rf + 0.12, -0.1), 0xff2a2a)); lamps.push(part(box(0.38, 0.1, 0.22, 0.23, rf + 0.12, -0.1), 0x2a6aff)); }
  if (type === 'suv' || type === 'gypsy') for (const sd of [-1, 1]) body.push(part(box(0.04, 0.04, (C.wsTop - C.rwTop) * 0.9, sd * (Wc / 2 * (1 - C.tumble) - 0.05), rf + 0.06, -(C.wsTop + C.rwTop) / 2), 0x2a2a30, 0.7));
  if (type === 'suv' || type === 'gypsy') body.push(part(cyl(C.R * 0.95, C.R * 0.95, 0.24, 16, 0, C.belt - 0.15, rz + 0.12, PI / 2), 0x1c1c1e, 0.1));
  if (type === 'sports') body.push(part(box(W - 0.2, 0.03, 0.22, 0, C.trunk + 0.16, rz - 0.15), paint, 0.6), part(box(0.05, 0.14, 0.05, -W / 2 + 0.35, C.trunk + 0.08, rz - 0.15), 0x1a1a1a), part(box(0.05, 0.14, 0.05, W / 2 - 0.35, C.trunk + 0.08, rz - 0.15), 0x1a1a1a));
  // under the car: dark
  body.push(part(box(W - 0.2, 0.06, L - 0.6, 0, C.clr + 0.02, 0), 0x101012, 0));
  return assemble(body, lamps, [[sR, C.R, W / 2 - 0.12, 0], [sF, C.R, W / 2 - 0.12, 1]], C.R, 0.21, C.wheel, o, { x: W, y: C.H + (liv && (liv.sign || liv.siren) ? 0.2 : 0), z: L });
}
// put a vehicle together: one body mesh, one lamp mesh, wheels (spinning ones as separate meshes when asked)
function assemble(body, lamps, axles, R, tw, kind, o, size) {
  const holder = new THREE.Group(), model = new THREE.Group(); holder.add(model);
  const wheels = [], front = [], wg = wheelGeo(R, tw, o.rims || kind), still = [];
  for (const [s, r, x, isFront] of axles) for (const sd of (x === 0 ? [0] : [-1, 1])) {
    if (o.spin) { const w = new THREE.Mesh(wg, BODY); const pivot = new THREE.Group(); pivot.position.set(sd * x, r, -s); pivot.add(w); model.add(pivot); w.name = 'wheel'; wheels.push(w); if (isFront) front.push(pivot); }
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
  body.push(part(box(W * 0.62, 0.55, 0.03, 0, 1.33, -0.9, -0.12), 0x0e1620, 1));
  const cs = new THREE.Shape(); cs.moveTo(-1.32, 1.7); cs.quadraticCurveTo(-1.35, 1.95, -0.9, 1.97); cs.lineTo(0.75, 1.97); cs.quadraticCurveTo(1.05, 1.95, 1.0, 1.62); cs.lineTo(0.92, 1.62); cs.lineTo(-1.25, 1.7);
  body.push(part(extrudeSide(cs, W + 0.06, { L, bevel: 0.05, seg: 6 }), top, 0.35, true));
  body.push(part(box(W + 0.02, 0.1, 1.6, 0, 1.08, 0.15), 0x161616, 0.3));
  for (const sd of [-1, 1]) { body.push(part(beam(V(sd * 0.62, 1.05, -0.86), V(sd * 0.64, 1.66, -0.98), 0.04), 0x222222, 0.5)); body.push(part(beam(V(sd * 0.63, 0.95, 0.5), V(sd * 0.64, 1.7, 0.55), 0.04), 0x222222, 0.5)); body.push(part(beam(V(sd * 0.63, 0.95, 1.28), V(sd * 0.64, 1.7, 1.3), 0.04), 0x222222, 0.5)); }
  body.push(part(rbox(W - 0.15, 0.32, 0.5, 0.06, 0, 0.82, 0.6), 0x1a1a1a, 0.3)); body.push(part(rbox(W - 0.15, 0.5, 0.12, 0.05, 0, 1.12, 0.92), 0x1a1a1a, 0.3));
  body.push(part(rbox(0.36, 0.1, 0.36, 0.04, 0, 0.82, -0.35), 0x1a1a1a, 0.3)); body.push(part(cyl(0.02, 0.02, 0.6, 6, 0, 1.0, -0.75, 0, PI / 2), 0xc0c6ce, 0.9));
  lamps.push(part(cyl(0.08, 0.08, 0.04, 12, 0, 0.8, -1.33, PI / 2), 0xfff6d8)); lamps.push(part(box(0.18, 0.08, 0.02, -0.45, 0.6, 1.33), 0xff2a1a), part(box(0.18, 0.08, 0.02, 0.45, 0.6, 1.33), 0xff2a1a));
  body.push(part(box(0.38, 0.12, 0.02, 0, 0.45, 1.33), 0xffd21a, 0.3));
  body.push(part(box(W - 0.3, 0.06, L - 0.5, 0, 0.26, 0.1), 0x101012, 0));
  return assemble(body, lamps, [[-0.95, 0.22, 0, 1], [0.85, 0.22, W / 2 - 0.08, 0]], 0.22, 0.14, 'black', o, { x: W, y: 2.0, z: L });
}
// ---------------- the red double-decker bus ----------------
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
  const ex = []; for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: busSide })); m.position.set(sd * (W / 2 + 0.1), 2.12, 0.5); m.rotation.y = sd * PI / 2; ex.push(m); }
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
  body.push(part(box(W, 2.0, 5.6, 0, 2.05, 1.0), 0x8a5a2a, 0.15)); body.push(part(box(W + 0.03, 0.18, 5.6, 0, 3.0, 1.0), 0xe8202a, 0.4)); body.push(part(box(W + 0.03, 0.18, 5.6, 0, 1.3, 1.0), 0x2a8ae8, 0.4));
  for (let i = 0; i < 6; i++) body.push(part(box(W + 0.04, 1.6, 0.06, 0, 2.15, -1.7 + i * 1.08), 0x6a4018, 0.1));
  body.push(part(box(W - 0.2, 0.25, L - 0.8, 0, 0.75, 0), 0x1a1a1a, 0.2));
  for (const sd of [-1, 1]) { lamps.push(part(cyl(0.12, 0.12, 0.04, 12, sd * 0.85, 1.35, -4.08, PI / 2), 0xfff6d8)); lamps.push(part(box(0.2, 0.12, 0.03, sd * 0.95, 1.1, 3.82), 0xff2a1a)); body.push(part(box(0.06, 0.35, 0.25, sd * (W / 2 + 0.12), 2.4, -2.95), 0x1a1a1a, 0.5)); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, 1.75), new THREE.MeshBasicMaterial({ map: truckBack })); back.position.set(0, 2.1, 3.81); back.rotation.y = 0;
  return assemble(body, lamps, [[-3.0, 0.52, W / 2 - 0.25, 1], [2.5, 0.52, W / 2 - 0.25, 0]], 0.52, 0.34, 'black', { ...o, extra: [back] }, { x: W, y: 3.2, z: L });
}
export function spinWheels(V, dist, steer) { for (const w of V.wheels) w.rotation.x -= dist / V.r; for (const f of V.front) f.rotation.y = steer; }

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
  speed: { L: 5.2, W: 2.0, H: 0.9 }, cigarette: { L: 6.6, W: 1.9, H: 0.8, dead: 0.45 }, airboat: { L: 4.6, W: 2.3, H: 0.6, dead: 0.05 }, jetski: { L: 3.0, W: 1.1, H: 0.7 }, catamaran: { L: 5.4, W: 2.6, H: 0.8 },
};
export function makeBoat(type = 'speed', col = 0xe8302a, o = {}) {
  const B = BOATS[type] || BOATS.speed, body = [], lamps = [], deckC = o.deck ?? 0xf4f2ee, trim = o.trim ?? 0x1a1a1a;
  if (type === 'catamaran') { for (const sd of [-1, 1]) { const h = hull(B.L, 0.8, B.H, { dead: 0.4 }); const hg = h.hull.clone(); hg.translate(sd * 0.95, 0, 0); body.push(part(hg, col, 0.7, true)); } body.push(part(rbox(2.4, 0.18, B.L * 0.7, 0.06, 0, B.H * 0.45, 0.4), deckC, 0.5)); body.push(part(rbox(1.6, 0.5, 1.4, 0.15, 0, B.H * 0.8, 0.6), col, 0.6)); }
  else {
    const h = hull(B.L, B.W, B.H, { dead: B.dead });
    const hg = h.hull, p = hg.attributes.position, cols = new Float32Array(p.count * 3), _a = new THREE.Color(col), _b = new THREE.Color(o.bottom ?? 0xf4f4f4), _s = new THREE.Color(o.stripe ?? 0x1a1a1a);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y < -0.05 ? _b : (y < 0.08 ? _s : _a); cols.set([k.r, k.g, k.b], i * 3); }
    let g2 = hg.toNonIndexed(); const c2 = new THREE.Float32BufferAttribute(new Float32Array(g2.attributes.position.count * 3), 3);
    { const ip = hg.index.array; for (let i = 0; i < ip.length; i++) c2.setXYZ(i, cols[ip[i] * 3], cols[ip[i] * 3 + 1], cols[ip[i] * 3 + 2]); }
    g2.setAttribute('color', c2); g2.setAttribute('gloss', new THREE.Float32BufferAttribute(new Float32Array(g2.attributes.position.count).fill(0.7), 1)); body.push(g2);
    body.push(part(h.deck, deckC, 0.35));
    const sh = h.sheerAt(0.5);
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
    if (type === 'jetski') { body.push(part(rbox(0.5, 0.3, 1.3, 0.12, 0, sh + 0.12, 0.3), o.seat ?? 0x1a1a1e, 0.4)); body.push(part(rbox(0.9, 0.35, 0.7, 0.15, 0, sh + 0.12, -0.55), col, 0.7)); body.push(part(box(0.75, 0.04, 0.04, 0, sh + 0.42, -0.6), 0x1a1a1e, 0.5)); }
  }
  const prop = new THREE.Group(); if (type === 'airboat') { const pr = new THREE.Mesh(mergeGeometries([part(box(1.8, 0.16, 0.04, 0, 0, 0), 0x3a2a1a, 0.3)]), BODY); prop.add(pr); prop.position.set(0, (BOATS.airboat.H * 0.45 + 0.25) + 1.35, 1.2); }
  const V2 = assemble(body, lamps, [], 0.3, 0.2, 'black', { ...o, mat: BOATM, extra: [prop] }, { x: B.W, y: B.H + 1, z: B.L }); V2.prop = type === 'airboat' ? prop : null; V2.deckY = hull(B.L, B.W, B.H, { dead: B.dead }).sheerAt(0.5); return V2;
}

// ---------------- sculpted cars (the player's taxis): a smooth body lofted through cross-sections ----------------
// Each section (along the car) is a closed outline: a flat floor, wheel wells cut into the outer strip over the wheels,
// curved sides, a narrower glass house and a rounded roof. Glass, paint, black trim and the wheel wells are vertex
// colours of the same smooth mesh, so the car is one draw call and has no box corners anywhere.
const KEYS = (k, u) => { if (u <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const a = k[i - 1], b = k[i], t = (u - a[0]) / (b[0] - a[0]), s = t * t * (3 - 2 * t); return a[1] + (b[1] - a[1]) * s; } return k[k.length - 1][1]; };
export const LOFT = {
  // u: 0 = front bumper … 1 = rear bumper. top: roof/hood line, belt: window line, hw: half width
  super: { L: 4.55, W: 1.98, wb: 2.7, R: 0.35, clr: 0.13, wheel: 'sport', top: [[0, 0.5], [0.06, 0.6], [0.3, 0.74], [0.4, 1.06], [0.52, 1.14], [0.66, 1.08], [0.84, 0.92], [0.96, 0.86], [1, 0.72]], belt: [[0, 0.5], [0.3, 0.74], [0.45, 0.8], [0.7, 0.86], [1, 0.8]], hw: [[0, 0.72], [0.08, 0.92], [0.25, 0.99], [0.55, 0.96], [0.75, 1.0], [0.93, 0.95], [1, 0.82]], ws: 0.3, rw: 0.86, tumble: 0.3, intake: 1, wing: 0, lights: 'led' },
  muscle: { L: 4.85, W: 1.94, wb: 2.85, R: 0.36, clr: 0.16, wheel: 'black', top: [[0, 0.62], [0.05, 0.74], [0.36, 0.86], [0.46, 1.3], [0.6, 1.34], [0.8, 1.04], [0.95, 0.98], [1, 0.84]], belt: [[0, 0.62], [0.36, 0.86], [0.6, 0.94], [1, 0.92]], hw: [[0, 0.8], [0.06, 0.95], [0.3, 0.97], [0.55, 0.95], [0.78, 1.0], [0.95, 0.97], [1, 0.86]], ws: 0.39, rw: 0.86, tumble: 0.22, scoop: 1, lights: 'round' },
  monster: { L: 4.6, W: 2.05, wb: 2.75, R: 0.5, clr: 0.5, wheel: 'offroad', top: [[0, 1.28], [0.06, 1.4], [0.24, 1.46], [0.32, 2.05], [0.42, 2.1], [0.92, 2.08], [1, 1.95]], belt: [[0, 1.28], [0.24, 1.46], [0.5, 1.5], [1, 1.5]], hw: [[0, 0.88], [0.05, 0.98], [0.5, 1.0], [0.95, 0.99], [1, 0.92]], ws: 0.27, rw: 0.97, tumble: 0.09, boxy: 1, lights: 'square' },
};
function loftBody(C, paint, roof) {
  const NS = 44, L = C.L, L2 = L / 2, W2 = C.W / 2, pos = [], col = [], gl = [], idx = [];
  const wz = [-C.wb / 2 - 0.05, C.wb / 2 - 0.05], Ra = C.R + 0.07, wy = C.R + (C.boxy ? 0.05 : 0.02);
  const archY = z => { let y = C.clr; for (const c of wz) { const d = Math.abs(z - c); if (d < Ra) y = Math.max(y, wy + Math.sqrt(Ra * Ra - d * d)); } return y; };
  const P = new THREE.Color(paint), Rf = new THREE.Color(roof), Gl = new THREE.Color(0x0c141e), Bk = new THREE.Color(0x111114), Tr = new THREE.Color(0x26262a);
  let ring = 0;
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, z = -L2 + u * L, hw = W2 * KEYS(C.hw, u), top = KEYS(C.top, u), belt = Math.min(top, KEYS(C.belt, u)), ay = archY(z), glassZ = u > C.ws && u < C.rw;
    const bS = Math.max(belt, ay + 0.1), gh = Math.max(0, top - bS), tw = hw * (1 - C.tumble * Math.min(1, gh / 0.4)), hood = top <= bS + 0.03;   // fenders always rise over the wheels
    const g2 = glassZ && !hood;
    const half = [   // [x, y, part] from the floor's centre round to the roof's centre
      [0, C.clr, 'b'], [hw - 0.4, C.clr, 'b'], [hw - 0.38, ay, 'w'], [hw - 0.04, ay, 'w'], [hw, ay + 0.06, 'p'],
      [hw * 1.015, ay + (bS - ay) * 0.45, 'p'], [hw * 0.995, bS - 0.03, 'p'], [hw * 0.975, bS, g2 ? 'g' : 'p'],
      hood ? [hw * 0.8, (bS + top) / 2 + 0.01, 'p'] : [tw + (hw - tw) * 0.35, bS + gh * 0.55, g2 ? 'g' : 'p'], hood ? [hw * 0.58, top + 0.005, 'p'] : [tw, top - Math.min(0.05, gh * 0.2), g2 ? 'g' : 'r'], [tw * 0.7 * (hood ? 0.8 : 1), top, 'r'], [0, top + 0.012, 'r']];
    const pts = [...half, ...half.slice(1, -1).reverse().map(([x, y, k]) => [-x, y, k])];
    for (const [x, y, k] of pts) { pos.push(x, y, z); const c = k === 'g' ? Gl : k === 'w' ? Bk : k === 'b' ? Tr : k === 'r' ? (glassZ ? Rf : P) : P; col.push(c.r, c.g, c.b); gl.push(k === 'g' ? 1 : k === 'p' || k === 'r' ? 0.78 : 0.1); }
    ring = pts.length;
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring; idx.push(a, b, c, b, d, c); }
  // close the front and the back
  for (const e of [0, NS]) { const base = e * ring, cIdx = pos.length / 3; let cx = 0, cy = 0; for (let j = 0; j < ring; j++) { cy += pos[(base + j) * 3 + 1]; } pos.push(cx, cy / ring, pos[base * 3 + 2]); col.push(P.r, P.g, P.b); gl.push(0.7); for (let j = 0; j < ring; j++) { const a = base + j, b = base + (j + 1) % ring; if (e === 0) idx.push(cIdx, a, b); else idx.push(cIdx, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('gloss', new THREE.Float32BufferAttribute(gl, 1)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
export function loftCar(type, paint, o = {}) {
  const C = LOFT[type], L2 = C.L / 2, W2 = C.W / 2, body = [loftBody(C, paint, o.roof ?? (type === 'monster' ? 0x111114 : paint))], lamps = [];
  const yF = KEYS(C.top, 0.02), yR = KEYS(C.top, 0.985), hwF = W2 * KEYS(C.hw, 0.03), hwR = W2 * KEYS(C.hw, 0.97);
  // lights: LED strips (super), round (muscle), square (monster); a full-width tail light bar
  for (const s of [-1, 1]) {
    if (C.lights === 'led') lamps.push(part(box(0.42, 0.05, 0.04, s * hwF * 0.62, yF - 0.06, -L2 + 0.12, 0, s * 0.3, 0), 0xf4f8ff));
    else if (C.lights === 'round') { lamps.push(part(cyl(0.1, 0.1, 0.04, 14, s * hwF * 0.7, yF - 0.12, -L2 + 0.05, PI / 2), 0xfff6d8)); lamps.push(part(cyl(0.08, 0.08, 0.04, 14, s * hwF * 0.42, yF - 0.12, -L2 + 0.03, PI / 2), 0xfff6d8)); }
    else lamps.push(part(box(0.3, 0.16, 0.04, s * hwF * 0.66, yF - 0.14, -L2 + 0.04), 0xfff6d8));
    body.push(part(rbox(0.16, 0.09, 0.2, 0.03, s * (W2 * 0.98 + 0.07), KEYS(C.belt, C.ws + 0.04) + 0.06, -L2 + C.L * (C.ws + 0.04)), paint, 0.7));
    body.push(part(cyl(0.05, 0.06, 0.25, 10, s * 0.32, C.clr + 0.12, L2 + 0.02, PI / 2), 0xd8dde4, 1));   // exhausts
  }
  lamps.push(part(box(hwR * 1.7, 0.06, 0.04, 0, yR - 0.1, L2 - 0.02), 0xff1a2a)); for (const s of [-1, 1]) lamps.push(part(box(0.32, 0.12, 0.05, s * hwR * 0.7, yR - 0.14, L2 - 0.03), 0xff2a1a));
  body.push(part(box(hwF * 1.1, 0.16, 0.05, 0, C.clr + 0.22, -L2 + 0.02), 0x0c0c0e, 0.3));   // grille / intake
  body.push(part(box(hwR * 1.3, 0.12, 0.2, 0, C.clr + 0.08, L2 - 0.1), 0x0c0c0e, 0.2));     // diffuser
  body.push(part(box(0.5, 0.12, 0.02, 0, C.clr + 0.32, L2 + 0.01), o.taxi ? 0xffd21a : 0xf4f4f0, 0.3));
  if (C.intake) for (const s of [-1, 1]) body.push(part(box(0.04, 0.16, 0.5, s * W2 * 0.99, KEYS(C.belt, 0.68) - 0.18, -L2 + C.L * 0.68), 0x0c0c0e, 0.2));
  if (C.scoop) body.push(part(rbox(0.6, 0.12, 0.8, 0.05, 0, KEYS(C.top, 0.2) + 0.04, -L2 + C.L * 0.2), 0x111114, 0.6));
  if (C.boxy) { body.push(part(box(W2 * 1.6, 0.06, 0.06, 0, KEYS(C.top, 0.6) + 0.1, 0), 0x2a2a30, 0.6)); for (const s of [-1, 1]) body.push(part(box(0.06, 0.06, C.L * 0.55, s * W2 * 0.75, KEYS(C.top, 0.6) + 0.08, 0.15), 0x2a2a30, 0.6)); body.push(part(box(W2 * 1.5, 0.3, 0.1, 0, C.clr + 0.45, -L2 - 0.05), 0x2a2a30, 0.7)); }
  // add-ons
  if (o.wing || C.wing) { const y = KEYS(C.top, 0.94) + 0.32; body.push(part(rbox(C.W * 0.9, 0.05, 0.32, 0.02, 0, y, L2 - 0.3), o.wingCol ?? 0x111114, 0.7)); for (const s of [-1, 1]) body.push(part(box(0.04, 0.3, 0.12, s * W2 * 0.55, y - 0.16, L2 - 0.3), 0x111114, 0.5)); }
  if (o.taxi) { const y = KEYS(C.top, 0.55); body.push(part(rbox(0.7, 0.2, 0.28, 0.04, 0, y + 0.11, 0.05), 0xffd21a, 0.4)); body.push(part(box(0.62, 0.11, 0.29, 0, y + 0.11, 0.05), 0x1a1a1a, 0.4)); lamps.push(part(box(0.5, 0.06, 0.295, 0, y + 0.12, 0.05), 0xfff2a0)); }
  const extra = [];
  if (o.neon) { const t = neonTex(); const m = new THREE.Mesh(new THREE.PlaneGeometry(C.W * 1.5, C.L * 1.15), new THREE.MeshBasicMaterial({ map: t, color: o.neon, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -PI / 2; m.position.y = 0.04; extra.push(m); }
  const V = assemble(body, lamps, [[-C.wb / 2 + 0.05, C.R, W2 - (C.boxy ? 0.08 : 0.16), 1], [C.wb / 2 - 0.05, C.R, W2 - (C.boxy ? 0.08 : 0.16), 0]], C.R, type === 'monster' ? 0.42 : 0.28, o.rims || C.wheel, { ...o, extra }, { x: C.W, y: KEYS(C.top, 0.55) + (o.taxi ? 0.2 : 0), z: C.L });
  V.exhaust = [[-0.32, C.clr + 0.12, L2 + 0.15], [0.32, C.clr + 0.12, L2 + 0.15]];
  return V;
}
let NEON = null; function neonTex() { return NEON || (NEON = canvasTex(64, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.save(); c.scale(1, 2); c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore(); })); }
