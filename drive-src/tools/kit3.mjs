// node tools/kit3.mjs : builds assets/kit.glb (and assets/<animal>.glb) from the CC0 Kenney and Quaternius models
// served at http://localhost:8766/flat/ (see tools/kit3.js)
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
await req('esbuild').build({ entryPoints: [path.join(here, 'kit3.js')], bundle: true, format: 'iife', outfile: path.join(here, 'kit3.bundle.js'), logLevel: 'error' });
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (!/texture|404/i.test(m.text())) console.log('log', m.text().slice(0, 200)); });
await p.route('http://localhost:8766/__k.html', r => r.fulfill({ contentType: 'text/html', body: '<body><script src="/__k.js"></script></body>' }));
await p.route('http://localhost:8766/__k.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, 'kit3.bundle.js'), 'utf8') }));
await p.goto('http://localhost:8766/__k.html');
const L = (kit, names) => names.map(n => [kit, n]);
const list = [
  ...L('car', ['taxi', 'sedan', 'sedan-sports', 'hatchback-sports', 'suv', 'suv-luxury', 'van', 'truck', 'truck-flat', 'delivery', 'police', 'ambulance', 'firetruck', 'garbage-truck', 'tractor', 'race', 'race-future', 'kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi', 'cone', 'box', 'debris-tire', 'debris-door', 'debris-bumper']),
  ...L('boat', ['boat-speed-a', 'boat-speed-b', 'boat-speed-c', 'boat-speed-d', 'boat-speed-e', 'boat-speed-f', 'boat-speed-g', 'boat-speed-j', 'boat-fan', 'boat-fishing-small', 'boat-row-small', 'boat-sail-a', 'boat-tug-a', 'gate', 'gate-finish', 'ramp', 'ramp-wide', 'buoy', 'buoy-flag', 'cargo-container-a', 'cargo-pile-a']),
  ...L('city', ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'detail-awning', 'detail-parasol-a']),
  ...L('sub', ['building-type-a', 'building-type-b', 'building-type-c', 'building-type-d', 'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h', 'building-type-k', 'building-type-m', 'building-type-p', 'building-type-s', 'tree-large', 'tree-small', 'fence', 'planter']),
  ...L('road', ['light-square', 'light-curved', 'traffic-light', 'construction-cone', 'construction-barrier', 'road-sign-warning', 'road-sign-stop', 'electricity-pole', 'dumpster', 'sign-highway']),
];
if (!process.env.ANIMALS_ONLY) { const out = await p.evaluate(l => window.kit(l), list);
fs.writeFileSync(path.join(here, '../assets/kit.glb'), Buffer.from(out.b64, 'base64'));
console.log(out.info.join('  ')); console.log('kit.glb', (fs.statSync(path.join(here, '../assets/kit.glb')).size / 1e6).toFixed(2), 'MB'); }
for (const [a, s] of [['Cow', 0.01], ['Pug', 0.01], ['Pig', 0.01], ['Horse', 0.01]]) { const r = await p.evaluate(([n, sc]) => window.animal(n, sc), [a, s]); fs.writeFileSync(path.join(here, '../assets/' + a.toLowerCase() + '.glb'), Buffer.from(r.b64, 'base64')); console.log(r.info); }
await b.close();
