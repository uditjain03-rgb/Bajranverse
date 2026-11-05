// node tools/kit.mjs castle|nature [view.png] : builds assets/castle.glb or assets/nature.glb from the CC0 Quaternius kits
// (unpacked and served at http://localhost:8765/, see tools/kit.js)
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
await req('esbuild').build({ entryPoints: [path.join(here, 'kit.js')], bundle: true, format: 'iife', outfile: path.join(here, 'kit.bundle.js'), logLevel: 'error' });
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (!/texture|404|Failed/.test(m.text())) console.log('log', m.text()); });
await p.route('http://localhost:8765/kit.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0"><script>window.BASE="http://localhost:8765/"</script><script src="/__k.js"></script></body>' }));
await p.route('http://localhost:8765/__k.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, 'kit.bundle.js'), 'utf8') }));
await p.goto('http://localhost:8765/kit.html'); await p.waitForFunction(() => window.ready);
const what = process.argv[2];
const NATURE = [['CommonTree_1', 650], ['CommonTree_2', 650], ['CommonTree_3', 650], ['Pine_1', 600], ['Pine_2', 600], ['DeadTree_2', 500], ['Bush_Common', 600], ['Bush_Common_Flowers', 700], ['Flower_3_Group', 300], ['Flower_4_Group', 300], ['Grass_Common_Tall', 200], ['Grass_Wispy_Tall', 200], ['Fern_1', 300], ['Plant_1_Big', 400], ['Plant_7_Big', 400], ['Rock_Medium_1', 400], ['Rock_Medium_2', 400], ['Rock_Medium_3', 400], ['Mushroom_Common', 200]];
const out = what === 'castle' ? await p.evaluate(() => window.buildCastle()) : await p.evaluate(n => window.buildNature(n), NATURE);
fs.writeFileSync(path.join(here, '../assets/' + out.name + '.glb'), Buffer.from(out.b64, 'base64'));
console.log(out.name, out.tris + ' tris', (out.size / 1e6).toFixed(2) + ' MB');
if (process.argv[3]) { const u = await p.evaluate(([b64, cam]) => window.view(b64, cam), [out.b64, what === 'castle' ? { p: [14, 9, 26], l: [0, 4, -4] } : { p: [0, 6, 22], l: [0, 1, 0] }]); fs.writeFileSync(process.argv[3], Buffer.from(u.split(',')[1], 'base64')); }
await b.close();
