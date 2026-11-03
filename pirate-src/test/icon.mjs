// node test/icon.mjs out.png [size] : renders the app icon (Captain Rocky) with the game itself
import { createRequire } from 'module'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), size = +(process.argv[3] || 432);
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: size, height: size } }); p.on('pageerror', e => console.log('ERR', e.stack));
await p.goto('file://' + path.join(here, '../www/index.html') + '?fast=1&icon=1' + (process.argv[4] ? '&far=1' : ''));
await p.waitForFunction(() => window.__G && __G.state === 'icon', null, { timeout: 60000 });
await p.addStyleTag({ content: '#hud,#home,#modal,#loading,#studio{display:none!important}' });
await p.waitForTimeout(1500); await p.screenshot({ path: process.argv[2] }); await b.close();
