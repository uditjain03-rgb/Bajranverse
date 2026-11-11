// The streets of Mad Taxi Masti: eight Indian places, each with its own look, built in code. Buildings get painted
// facades (shop fronts with signboards, balconies, jharokha windows, glass towers) from one texture atlas, so a whole
// stretch of street is one draw call. The stages: an old bazaar, a wedding street at night, a mountain ghat highway,
// Marine Drive by the sea at sunset, a monsoon city in the rain, stadium road on match day, a glass cyber city, and a
// Holi festival street.
import * as THREE from 'three';
import { canvasTex, flat, mesh, lumpy, mergeStatic, mergeGeometries, CHUNK } from './gfx.js';
import { kit, nat, palm, NT, PINE, BUSH, roadTex, tiles, groundTex } from './track.js';
import { waterMat, WATER } from './course.js';
const PI = Math.PI;
let seed = 1; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
export const STAGES = {
  bazaar: { name: 'Old Bazaar', sky: ['#4ab0ff', '#fff0d0'], fog: 0xf0e4c8, ground: 0xc8a878, ground2: 0xb89868, hemi: 2.5, light: 3.0, palette: [0xffb0a0, 0xffe08a, 0xa0d8ff, 0xb8f0b0, 0xffc8e8, 0xf4e8d8, 0xffd0a0], kinds: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11], floors: [2, 4] },
  shaadi: { name: 'Shaadi Street', sky: ['#0a0a2a', '#4a2a6a'], fog: 0x2a1a40, ground: 0x3a3a3a, ground2: 0x2a2a2a, hemi: 1.3, light: 1.0, night: 1, palette: [0xffe0c0, 0xffd0e8, 0xfff0c0, 0xe0d8ff], kinds: [0, 1, 2, 10, 11, 12], floors: [2, 3] },
  ghat: { name: 'Mountain Ghat Road', sky: ['#3a8ae8', '#e8f4ff'], fog: 0xd8e8f0, ground: 0x5a9a3a, ground2: 0x4a8a2a, hemi: 2.6, light: 2.9, palette: [0xffffff], kinds: [], floors: [1, 1], hills: 1 },
  marine: { name: 'Marine Drive', sky: ['#ff7a5a', '#ffd8a0'], fog: 0xffc8a0, ground: 0xd8c8a8, ground2: 0xc8b898, hemi: 2.2, light: 2.4, warm: 1, palette: [0xfff0e0, 0xf4e0c8, 0xe8f0f4, 0xffe8d0], kinds: [8, 9, 8, 13], floors: [4, 6], sea: 1 },
  monsoon: { name: 'Monsoon City', sky: ['#4a5a6a', '#9aa8b4'], fog: 0x8a98a4, ground: 0x4a6a4a, ground2: 0x3a5a3a, hemi: 1.8, light: 1.3, rain: 1, palette: [0xc8d0d8, 0xd8c8b8, 0xb8c8d0, 0xe0d0c0], kinds: [0, 1, 2, 3, 4, 10, 11], floors: [3, 5] },
  stadium: { name: 'Stadium Road', sky: ['#2a9aff', '#e0f4ff'], fog: 0xd0e8ff, ground: 0x4aa83a, ground2: 0x3a982a, hemi: 2.6, light: 3.0, palette: [0xffffff, 0xd0e8ff, 0xfff0d0], kinds: [5, 6, 7, 10, 11], floors: [3, 5], fans: 1 },
  cyber: { name: 'Cyber City', sky: ['#2a7ae8', '#d8ecff'], fog: 0xc8dcf0, ground: 0x7aa86a, ground2: 0x6a985a, hemi: 2.5, light: 2.9, palette: [0x9ad0ff, 0xa8e0f0, 0xb8c8e8, 0x8ab8d8], kinds: [14, 14, 15], floors: [8, 16], glass: 1 },
  holi: { name: 'Holi Festival', sky: ['#5ab8ff', '#fff0f8'], fog: 0xffe8f4, ground: 0x6ac84a, ground2: 0x5ab83a, hemi: 2.7, light: 3.0, palette: [0xff7ad8, 0x7ae8ff, 0xffe04a, 0x8aff6a, 0xffa04a, 0xc08aff], kinds: [0, 1, 2, 3, 5, 6, 7, 10, 11], floors: [2, 3], holi: 1 },
};
// ---------------- the facade atlas (4 x 4 tiles of 256 px) ----------------
const SIGNS = ['SHARMA SWEETS', 'CHAI POINT', 'LAXMI JEWELLERS', 'MOBILE REPAIR', 'PANI PURI', 'GUPTA TAILORS', 'XEROX & PRINT', 'BOMBAY BAKERY', 'DR. VERMA CLINIC', 'KHANNA KIRANA', 'SAREE PALACE', 'DOSA CORNER'];
const SIGNC = ['#e8202a', '#1a6ad8', '#1a9a3a', '#ff8a1a', '#a02ab8', '#d81a7a', '#1a8a8a', '#c8a01a'];
const atlas = canvasTex(1024, 1024, (c) => {
  const T = 256;
  const win = (x, y, w, h, kind) => { c.fillStyle = '#2a3a4a'; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(160,210,255,.55)'; c.fillRect(x + 3, y + 3, w - 6, h * 0.45); c.strokeStyle = '#f4f4f4'; c.lineWidth = 3; c.strokeRect(x, y, w, h); if (kind === 'grill') { c.strokeStyle = '#3a3a3a'; c.lineWidth = 2; for (let i = 6; i < w; i += 7) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i, y + h); c.stroke(); } } if (kind === 'shutter') { c.fillStyle = '#5a8a6a'; c.fillRect(x - 10, y, 9, h); c.fillRect(x + w + 1, y, 9, h); } };
  const balcony = (x, y, w) => { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y + 4, w, 6); c.fillStyle = '#e8e8e8'; c.fillRect(x, y - 16, w, 4); for (let i = 0; i < w; i += 8) c.fillRect(x + i, y - 16, 2, 18); c.fillStyle = ['#e8202a', '#2a8ae8', '#ffd21a', '#3fcf6e'][Math.floor(Math.random() * 4)]; c.fillRect(x + 6, y - 30, 10, 14); c.fillRect(x + w - 22, y - 26, 12, 10); };
  for (let k = 0; k < 16; k++) {
    const x0 = (k % 4) * T, y0 = Math.floor(k / 4) * T; c.save(); c.beginPath(); c.rect(x0, y0, T, T); c.clip();
    c.fillStyle = '#ffffff'; c.fillRect(x0, y0, T, T);
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; c.fillRect(x0 + Math.random() * T, y0 + Math.random() * T, 3, 3); }
    if (k <= 7 || k === 10 || k === 11) {   // shop below, two floors of homes above
      const kind = k % 3 === 0 ? 'grill' : k % 3 === 1 ? 'shutter' : 'plain';
      for (let f = 0; f < 2; f++) { const y = y0 + 18 + f * 72; for (let i = 0; i < 3; i++) win(x0 + 22 + i * 78, y, 48, 46, kind); if ((k + f) % 2 === 0) balcony(x0 + 14, y + 62, T - 28); }
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x0, y0 + 158, T, 4);
      c.fillStyle = SIGNC[k % SIGNC.length]; c.fillRect(x0 + 8, y0 + 164, T - 16, 30); c.fillStyle = '#fff'; c.font = 'bold 21px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SIGNS[k % SIGNS.length], x0 + T / 2, y0 + 180);
      c.fillStyle = '#5a5a60'; c.fillRect(x0 + 12, y0 + 198, T - 24, 58); for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#6a6a70' : '#4a4a50'; c.fillRect(x0 + 12, y0 + 198 + i * 5, T - 24, 3); }
      if (k % 2) { c.fillStyle = '#ffe8a0'; c.fillRect(x0 + 30, y0 + 205, T - 60, 51); for (let i = 0; i < 18; i++) { c.fillStyle = ['#e8202a', '#ff8a1a', '#3fcf6e', '#ffd21a', '#8a4ad8'][i % 5]; c.fillRect(x0 + 36 + (i % 9) * 21, y0 + 210 + Math.floor(i / 9) * 22, 16, 18); } }
    } else if (k === 8 || k === 9 || k === 13) {   // art deco (Marine Drive)
      c.fillStyle = '#e8e0d0'; for (let i = 0; i < 5; i++) c.fillRect(x0 + 20 + i * 50, y0, 8, T);
      for (let f = 0; f < 4; f++) for (let i = 0; i < 4; i++) { const y = y0 + 14 + f * 60; win(x0 + 32 + i * 50, y, 34, 40, 'plain'); }
      c.fillStyle = k === 13 ? '#ff8a6a' : '#6ac8c8'; c.fillRect(x0, y0 + 240, T, 16); c.beginPath(); c.arc(x0 + T / 2, y0 + 10, 40, 0, PI); c.fill();
    } else if (k === 12) {   // a haveli: arched jharokha windows
      for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) { const x = x0 + 26 + i * 76, y = y0 + 22 + f * 78; c.fillStyle = '#3a2a2a'; c.beginPath(); c.moveTo(x, y + 50); c.lineTo(x, y + 20); c.arc(x + 24, y + 20, 24, PI, 0); c.lineTo(x + 48, y + 50); c.fill(); c.fillStyle = '#d8a050'; c.fillRect(x - 6, y + 50, 60, 8); c.fillStyle = '#ffd88a'; c.fillRect(x + 10, y + 26, 28, 22); }
    } else if (k === 14 || k === 15) {   // glass curtain wall
      c.fillStyle = k === 14 ? '#4a7aa8' : '#3a6a8a'; c.fillRect(x0, y0, T, T); const g = c.createLinearGradient(x0, y0, x0 + T, y0 + T); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.2)'); c.fillStyle = g; c.fillRect(x0, y0, T, T);
      c.strokeStyle = '#d8e8f4'; c.lineWidth = 3; for (let i = 0; i <= T; i += 32) { c.beginPath(); c.moveTo(x0 + i, y0); c.lineTo(x0 + i, y0 + T); c.stroke(); } c.lineWidth = 2; for (let i = 0; i <= T; i += 24) { c.beginPath(); c.moveTo(x0, y0 + i); c.lineTo(x0 + T, y0 + i); c.stroke(); }
    }
    c.restore();
  }
});
atlas.anisotropy = 4;
const facadeMat = new THREE.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: 0.85 });
const glassMat = new THREE.MeshPhysicalMaterial({ map: atlas, vertexColors: true, roughness: 0.15 });
// a building: a box whose road-facing side shows a facade tile (the other sides show the plain wall tile), tinted
const PLAIN = [0.03, 0.03, 0.2, 0.2];   // a clean wall region inside tile 0 (u0, v0, u1, v1)
function facadeBox(w, h, d, side, tile, tint, glass) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal, tu = (tile % 4) / 4, tv = 1 - (Math.floor(tile / 4) + 1) / 4;
  for (let i = 0; i < uv.count; i++) {
    const facing = Math.sign(n.getX(i)) === -side && Math.abs(n.getX(i)) > 0.5;   // the side that faces the road
    if (facing) uv.setXY(i, tu + uv.getX(i) * 0.25 * 0.996 + 0.0005, tv + uv.getY(i) * 0.25 * 0.996 + 0.0005); else uv.setXY(i, glass ? tu + 0.01 + uv.getX(i) * 0.2 : PLAIN[0] + uv.getX(i) * 0.02, glass ? tv + 0.01 + uv.getY(i) * 0.2 : 0.97 + uv.getY(i) * 0.02);
  }
  const col = new Float32Array(uv.count * 3), cc = new THREE.Color(tint); for (let i = 0; i < uv.count; i++) col.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (glass) g.setAttribute('gloss', new THREE.BufferAttribute(new Float32Array(uv.count).fill(0.9), 1));
  return new THREE.Mesh(g, glass ? glassMat : facadeMat);
}
const glowC = {}; export const glow = c => glowC[c] || (glowC[c] = new THREE.MeshBasicMaterial({ color: c }));
// light bulbs: one shared vertex-coloured material, so a whole street of bulbs merges into one draw call
export const bulbMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const bulbG = {}; export function bulb(c, r = 0.12) { const k = c + ':' + r; if (!bulbG[k]) { const g = new THREE.SphereGeometry(r, 5, 4), n = g.attributes.position.count, col = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) col.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); bulbG[k] = g; } return new THREE.Mesh(bulbG[k], bulbMat); }
// merge every bulb in a group into a single mesh
export function mergeBulbs(group) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), geos = [], drop = []; group.traverse(q => { if (q.isMesh && q.material === bulbMat) { const g = q.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, q.matrixWorld)); geos.push(g); drop.push(q); } }); drop.forEach(q => q.parent.remove(q)); if (geos.length) group.add(new THREE.Mesh(mergeGeometries(geos), bulbMat)); return group; }
// an Indian building with the clutter of real streets: water tank, AC boxes, dish, a hoarding, laundry
function building(S, s) {
  const o = new THREE.Group(), fl = Math.round(rnd(S.floors[0], S.floors[1])), h = S.glass ? fl * 3.4 : 3.6 + fl * 3.0 * 0.9, w = S.glass ? rnd(14, 22) : rnd(8, 11), d = S.glass ? rnd(14, 22) : rnd(9, 12);
  const tile = pick(S.kinds), m = facadeBox(d, h, w, s, tile, pick(S.palette), S.glass); m.position.y = h / 2; o.add(m);
  if (!S.glass) {
    mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), flat(0xf0ece4), 0, h + 0.17, 0, o);
    if (R() < 0.7) { mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10), flat(R() < 0.5 ? 0x1a1a1a : 0x2a5ad8), rnd(-2, 2), h + 1.0, rnd(-2, 2), o); }
    for (let i = 0; i < 2; i++) if (R() < 0.6) mesh(new THREE.BoxGeometry(0.4, 0.55, 0.8), flat(0xe8e8e8), -s * (d / 2 + 0.2), rnd(3, h - 2), rnd(-w / 2 + 1, w / 2 - 1), o);
    if (R() < 0.35) { const dish = mesh(new THREE.SphereGeometry(0.5, 8, 6, 0, PI * 2, 0, 1.0), flat(0xf4f4f4), rnd(-2, 2), h + 0.7, rnd(-2, 2), o); dish.rotation.x = -0.8; }
    if (R() < 0.3) for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.05, 0.5, 0.45), flat(pick([0xe8202a, 0x2a8ae8, 0xffd21a, 0xffffff, 0xff7ad8])), -s * (d / 2 + 0.4), h * 0.55, -1.5 + i * 0.7, o);
    // the ground-floor shop awning
    if (tile <= 7 || tile === 10 || tile === 11) { const a = mesh(new THREE.BoxGeometry(1.6, 0.08, w * 0.9), flat(pick([0xe8202a, 0x1a8a3a, 0x2a6ad8, 0xff8a1a, 0xffd21a])), -s * (d / 2 + 0.75), 3.25, 0, o); a.rotation.z = s * 0.25; }
  } else mesh(new THREE.BoxGeometry(w * 0.6, 2.5, d * 0.6), flat(0xd8dde4), 0, h + 1.25, 0, o);
  o.userData.gap = S.glass ? rnd(3, 8) : rnd(0.2, 1.2) + d / 2 - d / 2; o.userData.half = d / 2;
  return o;
}
// ---------------- stage props ----------------
function lampPost(S) { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 6), flat(0x5a5a62), 0, 3.25, 0, o); mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), flat(0x5a5a62), 0, 6.4, 0.75, o); const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), glow(S.night ? 0xfff0b0 : 0xf4f4e8)); b.position.set(0, 6.3, 1.4); o.add(b); return o; }
function cart(kind) {   // a pushcart (fruit / vegetables / coconuts / chai)
  const o = new THREE.Group(); mesh(new THREE.BoxGeometry(1.6, 0.15, 2.4), flat(0x8a5a2a), 0, 0.85, 0, o); for (const s of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12), flat(0x2a2a2a), s * 0.82, 0.4, 0, o); w.rotation.z = PI / 2; }
  const cols = kind === 'veg' ? [0x3fcf3e, 0xe8302a, 0x8a3ab0, 0xff8a1a] : kind === 'coco' ? [0x5a8a2a, 0x6a9a3a] : [0xff4a2a, 0xffc21a, 0x7ad83a, 0xff9a1a];
  for (let i = 0; i < 14; i++) mesh(new THREE.SphereGeometry(kind === 'coco' ? 0.24 : 0.17, 7, 5), flat(pick(cols)), rnd(-0.6, 0.6), 1.05 + (i > 9 ? 0.2 : 0), rnd(-1, 1), o);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), flat(0x5a3a1a), 0.7, 1.7, 1.1, o); mesh(new THREE.ConeGeometry(1.1, 0.4, 6), flat(pick([0xe8202a, 0x2a8ae8, 0xffd21a])), 0.7, 2.6, 1.1, o); return o;
}
function stringLights(z, S) {   // bulbs strung across the road (wedding street)
  const o = new THREE.Group(), n = 26; for (let i = 0; i <= n; i++) { const x = -9 + 18 * i / n, y = 7 - Math.sin(i / n * PI) * 1.4; const b = bulb(pick([0xffe04a, 0xff4a8a, 0x4ae8ff, 0x8aff4a, 0xffa04a])); b.position.set(x, y, 0); o.add(b); }
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2, 5), flat(0x3a3a3a), s * 9, 3.6, 0, o); o.position.z = z; void S; return o;
}
function marigoldArch() { const o = new THREE.Group(); for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 8), flat(0xff8a1a), s * 8.6, 3.5, 0, o); for (let i = 0; i <= 30; i++) { const a = i / 30 * PI; mesh(new THREE.SphereGeometry(0.42, 6, 5), flat(i % 2 ? 0xff8a1a : 0xffd21a), Math.cos(a) * 8.6, 7 + Math.sin(a) * 2.6, 0, o); } for (let i = 0; i < 12; i++) { const x = -7 + i * 1.3; for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(0.16, 5, 4), flat(j % 2 ? 0xff8a1a : 0xffd21a), x, 8.6 - j * 0.35 - Math.sin((x + 8.6) / 17.2 * PI) * 0, 0, o); } return o; }
function flag(c) { const o = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 4), flat(0xdddddd), 0, 2, 0, o); const f = mesh(new THREE.BoxGeometry(0.04, 0.9, 1.4), flat(c), 0, 3.5, 0.7, o); void f; return o; }
function billboard(text, c1, c2) { const t = canvasTex(512, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const L = text.split('|'); L.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (L.length - 1) / 2) * 72)); }); const o = new THREE.Group(); for (const x of [-2.5, 2.5]) mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), flat(0x5a5a62), x, 3, 0, o); const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: t })); b.position.set(0, 7.5, 0.1); o.add(b); return o; }
function guardRail(len) { const o = new THREE.Group(); mesh(new THREE.BoxGeometry(0.1, 0.35, len), flat(0xd8dde4), 0, 0.7, 0, o); for (let z = -len / 2; z <= len / 2; z += 4) mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), flat(0x8a8a90), 0, 0.4, z, o); return o; }
function tetrapods() { const o = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = mesh(new THREE.TetrahedronGeometry(0.9, 0), flat(0xb8b0a0), rnd(-1, 1.5), 0.2, rnd(-3, 3), o); t.rotation.set(rnd(0, 3), rnd(0, 3), 0); } return o; }
function mountain(S) { const m = new THREE.Group(); mesh(lumpy(new THREE.ConeGeometry(rnd(18, 30), rnd(30, 55), 7, 3), 2), flat(0x4a7a4a), 0, 14, 0, m); for (let i = 0; i < 5; i++) { const t = nat(PINE, 1.6, 2.4); if (t) { t.position.set(rnd(-12, 12), rnd(0, 4), rnd(-12, 12)); m.add(t); } } void S; return m; }
function fanStand() { const o = new THREE.Group(); for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(3, 0.5, 14), flat(i % 2 ? 0x2a5ad8 : 0x3a6ae8), i * 2.2, 0.5 + i * 1.1, 0, o); return o; }
function ferris() { const o = new THREE.Group(), R0 = 11; const ring = new THREE.TorusGeometry(R0, 0.25, 6, 40); mesh(ring, flat(0xff4a8a), 0, R0 + 3, 0, o).rotation.y = PI / 2; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; const sp = mesh(new THREE.BoxGeometry(0.15, R0 * 2, 0.15), flat(0xffffff), 0, R0 + 3, 0, o); sp.rotation.x = a; const cb = mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), flat(pick([0xffd21a, 0x2ab8ff, 0x3fcf6e, 0xff7a1a])), 0, R0 + 3 + Math.cos(a) * R0, Math.sin(a) * R0, o); void cb; } for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.4, R0 + 4, 0.4), flat(0xc8c8d0), s * 1.5, (R0 + 3) / 2, 0, o).rotation.x = 0; return o; }
// ---------------- the street ----------------
export function buildStreet(T, scene) {
  seed = T.seed || 3; const S = STAGES[T.stage], g = new THREE.Group(), L = T.L, z0 = 40, zEnd = -L - 200, RW = T.RW, len = z0 - zEnd; scene.add(g);
  const rmat = new THREE.MeshStandardMaterial({ map: roadTex(4, S.night), roughness: 0.9, color: S.rain ? 0x8a8e94 : 0xffffff });
  const rt = rmat.map.clone(); rt.needsUpdate = true; rt.repeat.set(1, len / 14); rmat.map = rt;
  const road = mesh(new THREE.PlaneGeometry(RW, len, 2, Math.ceil(len / 2)), rmat, 0, 0.02, (z0 + zEnd) / 2, g); road.rotation.x = -PI / 2;
  const walkW = 3.2;
  for (const s of [-1, 1]) {
    if (S.sea && s > 0) { mesh(new THREE.BoxGeometry(walkW + 2, 0.3, len, 1, 1, Math.ceil(len / 4)), new THREE.MeshStandardMaterial({ map: tiles }), s * (RW / 2 + walkW / 2 + 1), 0.15, (z0 + zEnd) / 2, g); mesh(new THREE.BoxGeometry(0.6, 0.9, len), flat(0xe8e0d0), s * (RW / 2 + walkW + 2.1), 0.45, (z0 + zEnd) / 2, g); continue; }
    if (S.hills) continue;
    const w = mesh(new THREE.BoxGeometry(walkW, 0.25, len, 1, 1, Math.ceil(len / 4)), new THREE.MeshStandardMaterial({ map: tiles }), s * (RW / 2 + walkW / 2), 0.12, (z0 + zEnd) / 2, g); const tt = tiles.clone(); tt.needsUpdate = true; tt.repeat.set(1, len / 3.2); w.material.map = tt;
    mesh(new THREE.BoxGeometry(0.3, 0.3, len, 1, 1, Math.ceil(len / 4)), flat(S.night ? 0x8a8a8a : 0xffd21a), s * (RW / 2 + 0.15), 0.15, (z0 + zEnd) / 2, g);
  }
  const gt = groundTex(S); gt.repeat.set(6, len / 40);
  for (const s of [-1, 1]) { if (S.sea && s > 0) continue; const m = mesh(new THREE.PlaneGeometry(120, len, 4, Math.ceil(len / 8)), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }), s * (RW / 2 + (S.hills ? 0 : walkW) + 60), -0.04, (z0 + zEnd) / 2, g); m.rotation.x = -PI / 2; }
  // the sea of Marine Drive
  const waters = [];
  if (S.sea) for (let z = z0; z > zEnd; z -= CHUNK) { const geo = new THREE.PlaneGeometry(200, CHUNK, 30, Math.ceil(CHUNK / 3)); geo.rotateX(-PI / 2); const m = new THREE.Mesh(geo, waterMat); m.position.set(RW / 2 + walkW + 2.5 + 100, -1.2, z - CHUNK / 2); m.frustumCulled = false; m.userData.z0 = z; m.userData.z1 = z - CHUNK; g.add(m); waters.push(m); }
  // buildings and props down both sides
  const side = RW / 2 + walkW;
  for (const s of [-1, 1]) {
    if (S.sea && s > 0) { for (let z = 10; z > zEnd + 30; z -= rnd(6, 10)) { const t = tetrapods(); t.position.set(RW / 2 + walkW + 3.6, -0.6, z); g.add(t); } for (let z = 6; z > zEnd + 30; z -= rnd(14, 22)) { const p = palm(); p.position.set(RW / 2 + walkW - 0.5, 0.25, z); g.add(p); } continue; }
    if (S.hills) { for (let z = 10; z > zEnd + 30; z -= rnd(5, 9)) { const t = nat(R() < 0.6 ? PINE : NT, 1.2, 2); if (t) { t.position.set(s * rnd(side + 1, side + 20), 0, z); g.add(t); } } for (let z = 0; z > zEnd + 30; z -= 40) { const gr = guardRail(40); gr.position.set(s * (RW / 2 + 0.6), 0, z - 20); g.add(gr); } for (let z = -40; z > zEnd + 60; z -= rnd(70, 110)) { const m = mountain(S); m.position.set(s * rnd(55, 110), -2, z); m.scale.setScalar(rnd(0.9, 1.6)); g.add(m); } continue; }
    for (let z = 20; z > zEnd + 30;) { const b = building(S, s); const w = b.children[0].geometry.parameters.depth; b.position.set(s * (side + b.userData.half + (S.glass ? rnd(2, 6) : 0.1)), 0, z - w / 2); g.add(b); z -= w + (S.glass ? rnd(6, 14) : rnd(0, 1.2)); }
    for (let z = 10; z > zEnd + 30; z -= rnd(30, 44)) { const l = lampPost(S); l.position.set(s * (RW / 2 + 0.6), 0.25, z); l.rotation.y = s > 0 ? PI / 2 * 0 - PI / 2 : PI / 2; g.add(l); }
    // second row of tall buildings behind
    for (let z = 0; z > zEnd + 60; z -= rnd(18, 30)) { if (R() < 0.4) continue; const b = building({ ...S, floors: [S.floors[1], S.floors[1] + 4] }, s); b.position.set(s * (side + 22 + rnd(0, 20)), 0, z); g.add(b); }
  }
  if (S.sea) for (let z = 20; z > zEnd + 30;) { const b = building(S, -1); const w = b.children[0].geometry.parameters.depth; b.position.set(-(side + b.userData.half + 0.1), 0, z - w / 2); g.add(b); z -= w + rnd(0, 1); }
  // stage dressing
  if (S.night) for (let z = -10; z > zEnd + 40; z -= 26) g.add(stringLights(z, S));
  if (T.stage === 'shaadi' || T.stage === 'holi') for (let z = -60; z > zEnd + 60; z -= 180) { const a = marigoldArch(); a.position.z = z; g.add(a); }
  if (T.stage === 'bazaar' || T.stage === 'holi' || T.stage === 'monsoon') for (const s of [-1, 1]) for (let z = -20; z > zEnd + 40; z -= rnd(24, 40)) { const c = cart(pick(['fruit', 'veg', 'fruit'])); c.position.set(s * (RW / 2 + 1.6), 0.25, z); g.add(c); }
  if (T.stage === 'stadium') for (const s of [-1, 1]) { for (let z = -8; z > zEnd + 40; z -= 14) { const f = flag(pick([0xff8a1a, 0xffffff, 0x1a8a3a, 0x2a5ad8])); f.position.set(s * (RW / 2 + 0.8), 0.25, z); g.add(f); } for (let z = -60; z > zEnd + 60; z -= 220) { const b = billboard('INDIA|JEETEGA!', '#ff8a1a', '#1a8a3a'); b.position.set(s * (side + 3), 0, z); b.rotation.y = s > 0 ? -PI / 2 : PI / 2; g.add(b); } }
  if (T.stage === 'cyber') for (let z = -30; z > zEnd + 60; z -= 26) { const p = mesh(new THREE.BoxGeometry(1.4, 9, 1.4), flat(0xc8ccd4), 0, 4.5, z, g); void p; } // metro pillars in the middle
  if (T.stage === 'cyber') { const v = mesh(new THREE.BoxGeometry(5, 1.2, len), flat(0xd8dce4), 0, 9.6, (z0 + zEnd) / 2, g); void v; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 0.8, len), flat(0xb8bcc4), s * 2.4, 10.6, (z0 + zEnd) / 2, g); }
  if (T.stage === 'marine') for (let z = -50; z > zEnd + 60; z -= 260) { const b = billboard('MARINE|DRIVE', '#ff6a8a', '#ffb04a'); b.position.set(-(side + 2), 0, z); b.rotation.y = PI / 2; g.add(b); }
  if (T.stage === 'ghat') for (let z = -80; z > zEnd + 60; z -= 300) { const b = billboard('DHABA|24 HRS', '#e8202a', '#ff8a1a'); b.position.set(-(RW / 2 + 6), 0, z); b.rotation.y = PI / 2; g.add(b); }
  // far skyline / hills
  for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; if (S.sea && s > 0) continue; const m = new THREE.Group(), c = S.night ? 0x1a1a3a : S.glass ? 0x8ab0d8 : 0x6a9a6a; if (S.glass || T.stage === 'marine' || T.stage === 'monsoon') mesh(new THREE.BoxGeometry(rnd(10, 20), rnd(30, 80), rnd(10, 20)), flat(S.night ? 0x2a2a4a : S.rain ? 0x7a8894 : 0xb8c8d8), 0, 20, 0, m); else mesh(lumpy(new THREE.ConeGeometry(18, 32, 7, 3), 1.5), flat(c), 0, 13, 0, m); m.position.set(s * rnd(110, 180), 0, 20 - i * (len) / 26); g.add(m); }
  // sky
  const skyG = new THREE.SphereGeometry(400, 24, 12), top = new THREE.Color(S.sky[0]), low = new THREE.Color(S.sky[1]), sp = skyG.attributes.position, sc = new Float32Array(sp.count * 3), _sc = new THREE.Color();
  for (let i = 0; i < sp.count; i++) { const v = 1 - (Math.asin(Math.max(-1, Math.min(1, sp.getY(i) / 400))) / PI + 0.5), k = Math.min(1, v / 0.6); _sc.copy(top).lerp(low, k); sc.set([_sc.r, _sc.g, _sc.b], i * 3); }
  skyG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const skyM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); skyM.userData.flat = true;
  const sky = new THREE.Mesh(skyG, skyM); sky.renderOrder = -1; sky.userData.dynamic = true; g.add(sky);
  { const parts = []; const n = S.rain ? 34 : S.night ? 0 : 12; for (let i = 0; i < n; i++) { const cx = rnd(-250, 250), cy = rnd(60, 130), cz = rnd(-300, 60); for (let j = 0; j < 5; j++) { const q = new THREE.IcosahedronGeometry(rnd(7, 13), 1); q.translate(cx + j * 8 - 16, cy + rnd(-2, 2), cz + rnd(-3, 3)); parts.push(q); } } if (parts.length) { const cm = new THREE.MeshBasicMaterial({ color: S.rain ? 0x6a7480 : S.warm ? 0xffd0b0 : 0xffffff, fog: false }); cm.userData.flat = true; sky.add(new THREE.Mesh(mergeGeometries(parts), cm)); } }
  if (S.night) { const n = 240, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd(0, PI * 2), e = rnd(0.15, 1.3); pos[i * 3] = Math.cos(a) * Math.cos(e) * 380; pos[i * 3 + 1] = Math.sin(e) * 380; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 380; } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pm = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }); pm.userData.flat = true; sky.add(new THREE.Points(sg, pm)); }
  scene.fog = new THREE.Fog(S.fog, S.night ? 50 : 70, S.rain ? 180 : 240);
  if (S.sea) { WATER.uDeep.value.set(0x0a4a8a); WATER.uShallow.value.set(0x2a9ac0); WATER.uSky.value.set(0x9ac0e0); WATER.uAmp.value = 0.45; WATER.uNight.value = 0; WATER.uInv.value = 1; WATER.uHW.value = RW / 2 + walkW + 2.6; WATER.uSunC.value.set(0xffb070); }
  g.traverse(o => { o.frustumCulled = false; });
  const chunks = mergeStatic(g);
  return {
    group: g, sky, stage: S,
    update(dt, t) { if (S.sea) WATER.uT.value = t; },
    cull(z) { const vis = q => q.userData.z0 > z - 260 && q.userData.z1 < z + 50; for (const c of chunks) c.visible = vis(c); for (const w of waters) w.visible = vis(w); },
    cullAll() { for (const c of chunks) c.visible = true; for (const w of waters) w.visible = true; },
    dispose() { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
export { cart, ferris, fanStand, marigoldArch, billboard };
export { oneMesh } from './gfx.js';
// one small mesh with every material the streets use: drawn once while the game loads, so no stage ever stops to
// prepare a new shader in the middle of play
export function warmMeshes() {
  const g = new THREE.BoxGeometry(1, 1, 1); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); g.setAttribute('gloss', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1));
  return [facadeMat, glassMat, waterMat, bulbMat, new THREE.MeshStandardMaterial({ map: tiles }), new THREE.MeshStandardMaterial({ map: roadTex(4, false) }), new THREE.MeshPhysicalMaterial({ color: 0x3a6a9a, roughness: 0.1 }), new THREE.MeshPhysicalMaterial({ color: 0x4a5a6a, roughness: 0.05 }), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }), new THREE.MeshBasicMaterial({ map: tiles, transparent: true, depthTest: false })].map(m => { const x = new THREE.Mesh(g, m); x.position.set(0, -50, 0); x.frustumCulled = false; return x; });
}
