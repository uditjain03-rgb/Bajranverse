// node test/perf.mjs <level> [cpuThrottle] : average game-logic time, draw calls and triangles per frame in several moments
import { createRequire } from 'module'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 360, height: 640 } }); p.on('pageerror', e => console.log('ERR', e.stack));
await p.goto('file://' + path.join(here, '../www/index.html') + '?fast=1&level=' + (process.argv[2] || 5));
await p.waitForFunction(() => window.__G && __G.state === 'home', null, { timeout: 90000 });
const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.argv[3] || 4) });
const measure = async (label, ms = 3000) => { await p.evaluate(() => __perf.reset()); await p.waitForTimeout(ms); console.log(label.padEnd(10), JSON.stringify(await p.evaluate(() => ({ updMs: +(__perf.upd / __perf.n).toFixed(1), renMs: +(__perf.ren / __perf.n).toFixed(1), frames: __perf.n, calls: __perf.calls, tris: __perf.tris, crew: __G.crew.length, fx: __perf.fx, obj: __calls() })))); };
await measure('home');
await p.evaluate(() => __play()); await measure('start');
await p.evaluate(() => { const G = __G; for (let i = 0; i < 70; i++) G.crew.push({ ...G.crew[0], kind: ['pirate', 'pirate2', 'pirate3', 'pirateF', 'pirateF2'][i % 5], x: 0, z: G.z + 2 }); });
await measure('crew75');
await p.evaluate(() => __goto('kraken') || __goto('cannons')); await measure('hazard');
await p.evaluate(() => __end()); await p.waitForTimeout(2000); await measure('finale');
for (let i = 0; i < 20; i++) { await p.evaluate(() => __tap()); await p.waitForTimeout(100); } await measure('tapping', 2000);
await b.close();
