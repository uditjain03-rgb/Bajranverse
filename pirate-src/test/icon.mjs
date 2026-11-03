// node pirate-src/test/icon.mjs <out.png> : renders Billy for the launcher icon (512 × 512)
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const www = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../www/index.html');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
await p.goto('file://' + www + '?icon=1'); await p.waitForTimeout(6000);
await p.screenshot({ path: process.argv[2] }); await b.close();
