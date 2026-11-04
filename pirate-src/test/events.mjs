// node test/events.mjs <level> : jumps to each kind of obstacle and saves a screenshot of it (test/out/ev-*.png)
import { createRequire } from 'module'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 405, height: 720 } }); p.on('pageerror', e => console.log('ERR', e.stack));
await p.goto('file://' + path.join(here, '../www/index.html') + '?fast=1&level=' + (process.argv[2] || 7));
await p.waitForFunction(() => window.__G && __G.state === 'home', null, { timeout: 90000 });
await p.evaluate(() => { __play(); for (let i = 0; i < 40; i++) __G.crew.length < 40 && 0; });
await p.waitForTimeout(800);
await p.evaluate(() => { const G = __G; for (let i = 0; i < 35; i++) G.crew.push({ ...G.crew[0], kind: ['pirate', 'pirate2', 'pirate3', 'pirateF', 'pirateF2'][i % 5], tint: [0x2b6fd0, 0x2ba060, 0xe0a020, 0x8a3ab0, 0xd0602b][i % 5], x: 0, z: G.z + 2 }); });
for (const [t, wait] of (process.argv[3] ? process.argv[3].split(',').map(x => [x, 1600]) : [['wolves', 1700], ['cannons', 1500], ['kraken', 1800], ['ramp', 1500], ['powder', 1200], ['hay', 1000]])) {
  const ok = await p.evaluate(t => __goto(t), t); if (!ok) { console.log('no', t); continue; }
  await p.waitForTimeout(wait); await p.screenshot({ path: path.join(here, 'out/ev-' + t + '.png') });
  console.log(t, JSON.stringify(await p.evaluate(() => ({ st: __G.state, crew: __G.crew.length, tris: __tris() }))));
  if (await p.evaluate(() => __G.state !== 'play')) break;
}
await b.close();
