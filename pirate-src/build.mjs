// Bundles Buccaneer Bash into www/ (game.js + fonts). The Android app (:pirateapp) loads www/ from its assets.
// It uses three.js, esbuild and the small sound/music engine from ../game-src (no characters or art are shared).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const here = path.dirname(new URL(import.meta.url).pathname), gs = path.join(here, '../game-src');
const esbuild = createRequire(path.join(gs, 'package.json'))('esbuild');
const www = path.join(here, 'www'); fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
const font = (pkg, f, out) => fs.copyFileSync(path.join(gs, 'node_modules/@fontsource', pkg, 'files', f), path.join(www, 'fonts', out));
font('fredoka', 'fredoka-latin-600-normal.woff2', 'fredoka-600.woff2');
font('fredoka', 'fredoka-latin-700-normal.woff2', 'fredoka-700.woff2');
fs.copyFileSync(path.join(here, 'index.html'), path.join(www, 'index.html'));
await esbuild.build({
  entryPoints: [path.join(here, 'src/main.js')], bundle: true, minify: !process.env.DEV, format: 'iife', target: 'es2020',
  outfile: path.join(www, 'game.js'), nodePaths: [path.join(gs, 'node_modules')], logLevel: 'warning',
});
console.log('built www/', (fs.statSync(path.join(www, 'game.js')).size / 1e6).toFixed(1) + ' MB');
const assets = path.join(here, '../pirateapp/src/main/assets');
fs.rmSync(assets, { recursive: true, force: true }); fs.cpSync(www, assets, { recursive: true });
