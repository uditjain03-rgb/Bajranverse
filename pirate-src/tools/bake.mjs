// node tools/bake.mjs : builds assets/people.bin from the CC0 Quaternius characters (see tools/people.json for the
// source files, colours, weapons and animations).  node tools/bake.mjs --view out.png view.json : renders a check.
import path from 'path'; import { createRequire } from 'module'; import fs from 'fs';
const here = path.dirname(new URL(import.meta.url).pathname), req = createRequire(path.join(here, '../package.json'));
const SRC = process.env.PEOPLE_SRC;   // folder holding the downloaded packs (UACP FBX + Pirate Pack FBX)
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 600 } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => console.log('log:', m.text()));
const page = async (name) => {
  await req('esbuild').build({ entryPoints: [path.join(here, name + '.js')], bundle: true, format: 'iife', outfile: path.join(here, name + '.bundle.js'), logLevel: 'error' });
  fs.writeFileSync(path.join(here, name + '.html'), `<!doctype html><body style="margin:0"><script src="${name}.bundle.js"></script></body>`);
  await p.goto('file://' + path.join(here, name + '.html')); await p.waitForFunction(() => window.ready);
};
const bin = path.join(here, '../assets/people.bin');
if (process.argv[2] === '--view') {
  await page('bakeview');
  const v = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  for (const [i, shot] of v.entries()) { const u = await p.evaluate(([b, it, c]) => window.view(b, it, c), [fs.readFileSync(bin).toString('base64'), shot.items, shot.cam]); fs.writeFileSync(process.argv[3].replace('.png', i + '.png'), Buffer.from(u.split(',')[1], 'base64')); }
} else {
  await page('bake');
  const spec = JSON.parse(fs.readFileSync(path.join(here, 'people.json'), 'utf8'));
  const rd = f => fs.readFileSync(path.join(SRC, f)).toString('base64');
  for (const s of spec) { s.file = rd(s.file); if (s.weapon) s.weapon.file = rd(s.weapon.file); }
  const out = await p.evaluate(s => window.bake(s), spec);
  fs.mkdirSync(path.dirname(bin), { recursive: true }); fs.writeFileSync(bin, Buffer.from(out.b64, 'base64'));
  console.log(JSON.stringify(out.info, null, 1), (out.size / 1e6).toFixed(2) + ' MB');
}
await b.close();
