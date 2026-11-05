// Runs in a headless browser (tools/kit.mjs drives it). Builds the game's ready-made 3D sets from CC0 Quaternius kits:
//  · castle.glb — Lord Lalchi's fortress from the "Medieval Village MegaKit" (stone walls, an arched gate with a big door,
//    square towers with conical tile roofs, a tall keep with a tiled roof), in sections that can fall apart separately;
//    each section's pieces are merged per material so the whole castle is only a few draw calls
//  · nature.glb — trees, bushes, flowers, grass and rocks from the "Stylized Nature MegaKit" (one mesh each)
// Textures are made smaller (JPEG) so they suit phones.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';

const L = new GLTFLoader(), cache = {};
async function model(path) { if (!cache[path]) cache[path] = (await L.loadAsync(window.BASE + path)).scene; return cache[path]; }
const MV = 'Medieval Village MegaKit[Standard]/glTF/', NK = 'glTF/', FP = 'Exports/glTF/';

// smaller textures (one per source image), shared by every material that uses them
const texMap = new Map();
function small(tex, size, normal, alpha) {
  if (!tex || !tex.image) return null; const key = (tex.name || tex.image.src || tex.uuid) + (normal ? 'n' : 'b'); if (texMap.has(key + size)) return texMap.get(key + size);
  const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(tex.image, 0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.flipY = tex.flipY; t.colorSpace = normal ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.userData.mimeType = alpha ? 'image/png' : 'image/jpeg';
  texMap.set(key + size, t); return t;
}
const matMap = new Map();
function slim(m, size) {
  if (matMap.has(m.name)) return matMap.get(m.name);
  const cut = !!(m.transparent || m.alphaTest), n = new THREE.MeshStandardMaterial({ name: m.name, color: m.color, map: small(m.map, cut ? 256 : size, false, cut), normalMap: m.normalMap && /Brick|Tiles|Rock/.test(m.name) ? small(m.normalMap, 512, true) : null, roughness: 0.85, metalness: m.name.includes('Metal') ? 0.5 : 0, transparent: m.transparent, alphaTest: m.alphaTest || (m.transparent ? 0.5 : 0), side: m.side });
  if (n.alphaTest) n.transparent = false;
  if (/Banner|Cloth/i.test(m.name)) n.color.set(0xb04ac8);
  matMap.set(m.name, n); return n;
}
// put a kit piece so its footprint centre is at (x, z), its bottom at y, turned by r
async function place(group, path, x, y, z, r = 0, s = 1) {
  const o = (await model(path)).clone(true); o.rotation.y = r; o.scale.setScalar(s); o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3());
  o.position.set(x - c.x, y - b.min.y, z - c.z); group.add(o); return o;
}
// merge a section into one mesh per material (with smaller textures)
function bake(group, name, texSize) {
  group.updateMatrixWorld(true);
  const by = new Map();
  group.traverse(o => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) { const m = slim(mats[gr.materialIndex] || mats[0], texSize); const part = new THREE.BufferGeometry(); for (const k of Object.keys(g.attributes)) { const a = g.attributes[k]; part.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); } if (!by.has(m)) by.set(m, []); by.get(m).push(part); } });
  const out = new THREE.Group(); out.name = name;
  for (const [m, list] of by) { const g = mergeVertices(mergeGeometries(list, false), 1e-4); const mesh = new THREE.Mesh(g, m); mesh.name = name + '_' + m.name; out.add(mesh); }
  return out;
}
// a stone box whose texture repeats every 2 m instead of stretching
function stoneBox(w, h, d, mat) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5 ? [d, h] : Math.abs(n.getY(i)) > 0.5 ? [w, d] : [w, h]; uv.setXY(i, uv.getX(i) * ax[0] / 2, uv.getY(i) * ax[1] / 3.12); } return new THREE.Mesh(g, mat); }
const sections = {};
const sec = n => (sections[n] = sections[n] || new THREE.Group());
function crenels(g, x0, x1, y, z, depthAxis = 'z', mat) {   // battlements: stone blocks along a wall top
  for (let x = x0; x <= x1 + 1e-6; x += 1.0) { const m = stoneBox(depthAxis === 'z' ? 0.62 : 0.5, 0.75, depthAxis === 'z' ? 0.5 : 0.62, mat); m.position.set(depthAxis === 'z' ? x : z, y + 0.37, depthAxis === 'z' ? z : x); g.add(m); }
}
window.buildCastle = async () => {
  await MeshoptSimplifier.ready;
  const W = MV + 'Wall_UnevenBrick_Straight.gltf', WD = MV + 'Wall_UnevenBrick_Door_Round.gltf', WW = MV + 'Wall_UnevenBrick_Window_Wide_Round.gltf', WT = MV + 'Wall_UnevenBrick_Window_Thin_Round.gltf';
  const H = 3.12;
  const brick = (await model(W)); let brickMat = null; brick.traverse(o => { if (o.isMesh) { const ms = [].concat(o.material); brickMat = ms.find(m => m.name.includes('UnevenBrick')) || brickMat; } });
  const trimSrc = await model(MV + 'Prop_ExteriorBorder_Straight1.gltf'); let trimMat = null; trimSrc.traverse(o => { if (o.isMesh) trimMat = [].concat(o.material)[0]; });
  // front wall: 3 modules each side of the gate, two storeys, battlements
  for (const s of [-1, 1]) { const g = sec(s < 0 ? 'wallL' : 'wallR'); for (let i = 1; i <= 3; i++) for (let k = 0; k < 2; k++) await place(g, k === 1 && i === 2 ? WW : W, s * (i * 2 + 0.4), k * H, 0, 0); crenels(g, s < 0 ? -7 : 1.5, s < 0 ? -1.5 : 7, 2 * H, 0, 'z', brickMat); for (let i = 1; i <= 3; i++) await place(g, MV + 'Prop_ExteriorBorder_Straight1.gltf', s * i * 2, 2 * H - 0.05, 0, 0); }
  // gatehouse: the arched door, a wide window above, a third storey, battlements
  { const g = sec('gate'); const big = 1.4; await place(g, WD, 0, 0, 0.3, 0, big); await place(g, MV + 'Door_8_Round.gltf', 0, 0.02, 0.5, 0, big); await place(g, WW, 0, H * big, 0.3, 0, big); for (const s of [-1, 1]) { const p = stoneBox(0.7, 2 * H * big + 0.8, 1.0, brickMat); p.position.set(s * 1.6, (2 * H * big + 0.8) / 2, 0.35); g.add(p); } crenels(g, -1.4, 1.4, 2 * H * big, 0.35, 'z', brickMat); await place(g, FP + 'Torch_Metal.gltf', -2.2, 2.0, 0.85, 0); await place(g, FP + 'Torch_Metal.gltf', 2.2, 2.0, 0.85, 0); }
  // four square towers (4 x 4 m, three storeys) with conical tile roofs
  const tower = async (name, cx, cz, front) => {
    const g = sec(name);
    for (let k = 0; k < 3; k++) {
      const m = k === 2 ? WT : W;
      for (const dx of [-1, 1]) { await place(g, m, cx + dx, k * H, cz + 2, 0); await place(g, k === 2 ? WT : W, cx + dx, k * H, cz - 2, Math.PI); }
      for (const dz of [-1, 1]) { await place(g, m, cx + 2, k * H, cz + dz, Math.PI / 2); await place(g, m, cx - 2, k * H, cz + dz, -Math.PI / 2); }
    }
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const p = stoneBox(0.6, 3 * H, 0.6, brickMat); p.position.set(cx + dx, 1.5 * H, cz + dz); g.add(p); }
    await place(g, MV + 'Roof_Tower_RoundTiles.gltf', cx, 3 * H - 0.3, cz, 0, 1.0);
    void front;
  };
  await tower('towerL', -9, -1, true); await tower('towerR', 9, -1, true); await tower('backL', -9, -13, false); await tower('backR', 9, -13, false);
  // side walls between the towers
  for (const s of [-1, 1]) { const g = sec('back'); for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) await place(g, W, s * 9, k * H, -4 - i * 2, Math.PI / 2); }
  // the keep: 6 x 6 m, four storeys, a big tiled roof
  { const g = sec('keep'), cz = -8;
    for (let k = 0; k < 4; k++) for (let i = -1; i <= 1; i++) { const m = k >= 2 ? (i === 0 ? WW : WT) : W; await place(g, m, i * 2, k * H, cz + 3, 0); await place(g, m, i * 2, k * H, cz - 3, Math.PI); await place(g, m, 3, k * H, cz + i * 2, Math.PI / 2); await place(g, m, -3, k * H, cz + i * 2, -Math.PI / 2); }
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const p = stoneBox(0.7, 4 * H, 0.7, brickMat); p.position.set(dx, 2 * H, cz + dz); g.add(p); }
    await place(g, MV + 'Roof_RoundTiles_6x6.gltf', 0, 4 * H - 0.4, cz, 0, 0.95);
    for (const s of [1, -1]) await place(g, MV + 'Roof_Front_Brick6.gltf', 0, 4 * H, cz + s * 2.85, s > 0 ? 0 : Math.PI, 1.0);
    for (const s of [-1, 1]) await place(g, FP + 'Banner_2.gltf', s * 1.6, 2.3 * H, cz + 3.35, 0, 1.6);
  }
  // vines growing on the walls
  for (const [x, z, n] of [[-4.5, 0.25, 'wallL'], [5.2, 0.25, 'wallR'], [-9, 1.1, 'towerL']]) await place(sec(n), MV + 'Prop_Vine2.gltf', x, 0.3, z, 0);
  const root = new THREE.Group(); root.name = 'castle';
  for (const [n, g] of Object.entries(sections)) root.add(bake(g, n, n === 'keep' || n.startsWith('tower') || n.startsWith('wall') || n === 'gate' ? 1024 : 512));
  return exportGLB(root, 'castle');
};
// nature props: each one merged to a single mesh per material, simplified if it is heavy
window.buildNature = async list => {
  await MeshoptSimplifier.ready;
  const root = new THREE.Group(); root.name = 'nature'; const info = [];
  for (const [file, maxTris] of list) {
    const g = new THREE.Group(); await place(g, NK + file + '.gltf', 0, 0, 0);
    const b = bake(g, file, 512);
    for (const m of b.children) { const geo = m.geometry, n = geo.index.count / 3; if (n > maxTris * 1.15) { const [sp] = MeshoptSimplifier.simplify(new Uint32Array(geo.index.array), new Float32Array(geo.attributes.position.array), 3, Math.floor(maxTris) * 3, 0.08, []); let idx = sp; if (idx.length / 3 > maxTris * 1.4) [idx] = MeshoptSimplifier.simplifySloppy(new Uint32Array(geo.index.array), new Float32Array(geo.attributes.position.array), 3, null, Math.floor(maxTris) * 3, 0.2); geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1)); } }
    root.add(b); let t = 0; b.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); info.push(file + ':' + Math.round(t));
  }
  console.log(info.join(' '));
  return exportGLB(root, 'nature');
};
async function exportGLB(root, name) {
  let tris = 0; root.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const buf = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true });
  const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), tris: Math.round(tris), size: u8.length, name };
}
// a check picture of a built set
window.view = async (b64, cam) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 700); document.body.appendChild(r.domElement); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x9ad4f0); sc.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.6)); const d = new THREE.DirectionalLight(0xfff0d8, 2.5); d.position.set(5, 10, 8); sc.add(d);
  const g = await L.parseAsync(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer, ''); sc.add(g.scene);
  const c = new THREE.PerspectiveCamera(40, 900 / 700, 0.1, 500); c.position.set(...cam.p); c.lookAt(...cam.l); r.render(sc, c);
  return r.domElement.toDataURL('image/png');
};
window.ready = true;
