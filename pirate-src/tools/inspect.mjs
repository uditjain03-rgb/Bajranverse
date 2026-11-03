// node tools/inspect.mjs <file.fbx> ... : what is inside these character files (meshes, animations, bones)
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
await req('esbuild').build({ entryPoints: [path.join(here, 'inspect.js')], bundle: true, format: 'iife', outfile: path.join(here, 'inspect.bundle.js'), logLevel: 'error' });
fs.writeFileSync(path.join(here, 'inspect.html'), '<!doctype html><body><script src="inspect.bundle.js"></script></body>');
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + path.join(here, 'inspect.html')); await p.waitForFunction(() => window.ready);
for (const f of process.argv.slice(2)) console.log(path.basename(f), JSON.stringify(await p.evaluate(u => window.go(u), fs.readFileSync(f).toString('base64'))));
await b.close();
