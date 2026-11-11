// Builds the BajrangVerse driving games: `node build.mjs [splash|taxi]` → www-<game>/ (and copies it into the
// Android app). PROTECT=1 obfuscates game.js (always for release builds); DEV=1 keeps it readable.
import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import { protect } from './tools/protect.mjs';
import { seal, writeK } from './tools/seal.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const GAMES = {
  splash: { people: 'people-splash.bin', extra: [], music: ['bv_title', 'bv_win', 'duck', 'gameshow', 'wallpaper', 'snitch', 'carefree', 'hyperfun'], app: '../splashapp' },
  taxi: { people: 'people-taxi.bin', extra: ['cow.glb', 'pug.glb', 'horse.glb'], music: ['bv_title', 'bv_win', 'riley', 'polka', 'monkeys', 'fuzzball', 'merry_go'], app: '../taxiapp', pkg: 'com.bajrangverse.madtaxi' },
};
for (const id of (process.argv[2] ? [process.argv[2]] : Object.keys(GAMES))) {
  const C = GAMES[id], www = path.join(here, 'www-' + id);
  fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(path.join(www, 'fonts'), { recursive: true }); fs.mkdirSync(path.join(www, 'music'));
  for (const w of [600, 700]) fs.copyFileSync(path.join(here, `node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`), path.join(www, `fonts/fredoka-${w}.woff2`));
  const css = fs.readFileSync(path.join(here, 'html/base.css'), 'utf8');
  fs.writeFileSync(path.join(www, 'index.html'), fs.readFileSync(path.join(here, `html/${id}.html`), 'utf8').replace('/*BASE*/', css));
  const pb = fs.existsSync(path.join(here, 'assets', C.people)) ? C.people : 'people-all.bin';
  fs.copyFileSync(path.join(here, 'assets', pb), path.join(www, 'people.bin'));
  for (const f of ['kit.glb', 'nature.glb', 'logo.jpg', ...C.extra]) fs.copyFileSync(path.join(here, 'assets', f), path.join(www, f));
  for (const m of C.music) fs.copyFileSync(path.join(here, 'assets/music', m + '.ogg'), path.join(www, 'music', m + '.ogg'));
  await esbuild.build({ entryPoints: [path.join(here, `src/${id}/main.js`)], bundle: true, minify: !process.env.DEV, format: 'iife', target: 'es2020', outfile: path.join(www, 'game.js'), logLevel: 'warning' });
  if (process.env.PROTECT) protect(path.join(www, 'game.js'));
  console.log('built', 'www-' + id, (fs.statSync(path.join(www, 'game.js')).size / 1e6).toFixed(2) + ' MB game.js', pb);
  const assets = path.join(here, C.app, 'src/main/assets');
  if (fs.existsSync(path.dirname(assets))) { fs.rmSync(assets, { recursive: true, force: true }); fs.cpSync(www, assets, { recursive: true }); console.log('copied to', assets); }
  if (C.pkg && fs.existsSync(path.dirname(assets))) {   // the app gets the sealed (encrypted) game in release builds
    const jd = path.join(here, C.app, 'src/main/java', ...C.pkg.split('.'));
    if (process.env.PROTECT) seal(assets, jd, C.pkg); else writeK(jd, C.pkg, null);
  }
}
