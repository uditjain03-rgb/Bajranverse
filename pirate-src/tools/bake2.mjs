// node tools/bake2.mjs : builds assets/people.bin (see tools/bake2.js). Needs the three Quaternius packs (CC0) unpacked
// in PEOPLE_SRC (and the Pirate Pack FBX weapons in PEOPLE_SRC/pp), served at http://localhost:8765/.
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
await req('esbuild').build({ entryPoints: [path.join(here, 'bake2.js')], bundle: true, format: 'iife', outfile: path.join(here, 'bake2.bundle.js'), logLevel: 'error' });
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (!/texture|404/.test(m.text())) console.log('log', m.text()); });
await p.route('http://localhost:8765/bake.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body><script>window.BASE="http://localhost:8765/"</script><script src="/__b.js"></script></body>' }));
await p.route('http://localhost:8765/__b.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, 'bake2.bundle.js'), 'utf8') }));
await p.goto('http://localhost:8765/bake.html'); await p.waitForFunction(() => window.ready);
const spec = JSON.parse(fs.readFileSync(path.join(here, 'people2.json'), 'utf8')).filter(s => !process.argv[2] || process.argv[2].split(',').includes(s.id));
const out = await p.evaluate(s => window.bake(s), spec);
const bin = path.join(here, '../assets/people.bin'); fs.writeFileSync(bin, Buffer.from(out.b64, 'base64'));
console.log(JSON.stringify(out.info), (out.size / 1e6).toFixed(2) + ' MB');
await b.close();
