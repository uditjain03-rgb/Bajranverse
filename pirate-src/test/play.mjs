// node test/play.mjs [level] : plays a level headlessly and saves screenshots to test/out/
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), out = path.join(here, 'out'); fs.mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.stack)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
const lvl = process.argv[2] || 3;
await p.goto('file://' + path.join(here, '../www/index.html') + '?fast=1&level=' + lvl);
await p.waitForFunction(() => window.__G && window.__G.state === 'home', null, { timeout: 60000 });
await p.waitForTimeout(1500); await p.screenshot({ path: out + '/1-home.png' });
await p.evaluate(() => window.__play());
await p.waitForTimeout(2500); await p.screenshot({ path: out + '/2-run.png' }); console.log(await p.evaluate(() => { const h = document.getElementById('herdN'); return h.style.display + ' ' + h.style.transform + ' ' + getComputedStyle(h).display + ' ' + getComputedStyle(document.getElementById('hud')).display; }));
const snap = async (n) => { await p.screenshot({ path: out + '/' + n + '.png' }); console.log(n, JSON.stringify(await p.evaluate(() => ({ st: __G.state, crew: __G.crew.length, z: Math.round(__G.z), tris: __tris() })))); };
for (let i = 0; i < 400; i++) { await p.waitForTimeout(90); const s = await p.evaluate(() => ({ st: __G.state, gf: !!__G.guardFight })); if (s.gf) { await p.waitForTimeout(300); await snap('3-fight'); break; } if (s.st !== 'play') break; }
const L = await p.evaluate(() => window.__end());
for (let i = 0; i < 30; i++) { await p.waitForTimeout(300); if (await p.evaluate(() => __G.state === 'finale')) break; }
await p.waitForTimeout(2500); await snap('4-finale');
for (let i = 0; i < 60; i++) { await p.evaluate(() => __tap()); await p.waitForTimeout(120); }
await snap('5-finale2');
for (let i = 0; i < 200; i++) { const st = await p.evaluate(() => { __tap(); return __G.state; }); if (st !== 'finale') break; await p.waitForTimeout(150); }
await p.waitForTimeout(2000); await snap('6-end');
await p.waitForTimeout(4000); await snap('7-end2');
console.log(errs.slice(0, 15).join('\n'));
await b.close();
