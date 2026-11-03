// node pirate-src/test/lineup.mjs <out.png> : all the characters side by side, close up
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const www = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../www/index.html');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + www + '?lineup=1'); await p.waitForTimeout(6000);
await p.screenshot({ path: process.argv[2] }); await b.close();
