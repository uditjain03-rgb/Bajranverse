// node tools/preview.mjs out.png spec.json : renders FBX characters side by side (for checking colours/poses)
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
await req('esbuild').build({ entryPoints: [path.join(here, 'preview.js')], bundle: true, format: 'iife', outfile: path.join(here, 'preview.bundle.js'), logLevel: 'error' });
fs.writeFileSync(path.join(here, 'preview.html'), '<!doctype html><body style="margin:0"><script src="preview.bundle.js"></script></body>');
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1200, height: 500 } }); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + path.join(here, 'preview.html')); await p.waitForFunction(() => window.ready);
const spec = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
for (const s of spec) console.log(JSON.stringify(await p.evaluate(([b, c, t, col]) => window.add(b, c, t, col), [fs.readFileSync(s.file).toString('base64'), s.clip, s.t, s.colors])));
const u = await p.evaluate(() => window.shot()); fs.writeFileSync(process.argv[2], Buffer.from(u.split(',')[1], 'base64'));
await b.close();
