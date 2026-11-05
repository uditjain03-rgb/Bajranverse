// Builds ROCKY'S PIRATE ARMY into www/ (index.html, game.js, people.bin, fonts) and copies it into the Android app
// (../pirateapp/src/main/assets). PROTECT=1 also obfuscates game.js (always done for release builds).
import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import { protect } from './tools/protect.mjs';
const here = path.dirname(new URL(import.meta.url).pathname), www = path.join(here, 'www');
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
for (const w of [600, 700]) fs.copyFileSync(path.join(here, `node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`), path.join(www, `fonts/fredoka-${w}.woff2`));
fs.copyFileSync(path.join(here, 'index.html'), path.join(www, 'index.html'));
fs.copyFileSync(path.join(here, 'assets/people.bin'), path.join(www, 'people.bin'));
fs.copyFileSync(path.join(here, 'assets/logo.jpg'), path.join(www, 'logo.jpg'));
for (const f of ['castle.glb', 'nature.glb']) fs.copyFileSync(path.join(here, 'assets', f), path.join(www, f));
fs.cpSync(path.join(here, 'assets/music'), path.join(www, 'music'), { recursive: true });
await esbuild.build({
  entryPoints: [path.join(here, 'src/main.js')], bundle: true, minify: !process.env.DEV, format: 'iife', target: 'es2020', outfile: path.join(www, 'game.js'), logLevel: 'warning',
});
if (process.env.PROTECT) protect(path.join(www, 'game.js'));
console.log('built www/', (fs.statSync(path.join(www, 'game.js')).size / 1e6).toFixed(2) + ' MB game.js');
const assets = path.join(here, '../pirateapp/src/main/assets');
if (fs.existsSync(path.dirname(assets))) { fs.rmSync(assets, { recursive: true, force: true }); fs.cpSync(www, assets, { recursive: true }); console.log('copied to', assets); }
