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
// the music worker is bundled on its own and embedded in the game as text
const wk = await esbuild.build({ entryPoints: [path.join(here, 'src/musicworker.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false });
const workerSrc = wk.outputFiles[0].text;
await esbuild.build({
  entryPoints: [path.join(here, 'src/main.js')], bundle: true, minify: !process.env.DEV, format: 'iife', target: 'es2020', outfile: path.join(www, 'game.js'), logLevel: 'warning',
  plugins: [{ name: 'worker-src', setup(b) { b.onResolve({ filter: /^music-worker-src$/ }, () => ({ path: 'w', namespace: 'ws' })); b.onLoad({ filter: /.*/, namespace: 'ws' }, () => ({ contents: 'export default ' + JSON.stringify(workerSrc), loader: 'js' })); } }],
});
if (process.env.PROTECT) protect(path.join(www, 'game.js'));
console.log('built www/', (fs.statSync(path.join(www, 'game.js')).size / 1e6).toFixed(2) + ' MB game.js');
const assets = path.join(here, '../pirateapp/src/main/assets');
if (fs.existsSync(path.dirname(assets))) { fs.rmSync(assets, { recursive: true, force: true }); fs.cpSync(www, assets, { recursive: true }); console.log('copied to', assets); }
