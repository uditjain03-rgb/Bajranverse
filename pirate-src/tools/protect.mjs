// Protects a built game bundle before it goes into an app: renames identifiers and hides strings with
// javascript-obfuscator, so the shipped code is much harder to read or reuse. (No client-side code can be made
// impossible to copy; this is the standard deterrent, together with R8 on the Android side.)
import fs from 'fs';
import { createRequire } from 'module';
const req = createRequire(new URL('../package.json', import.meta.url).pathname);
export function protect(file) {
  const JO = req('javascript-obfuscator');
  const src = fs.readFileSync(file, 'utf8'), t0 = Date.now();
  const out = JO.obfuscate(src, {
    compact: true, target: 'browser', identifierNamesGenerator: 'mangled-shuffled', renameGlobals: false,
    stringArray: true, stringArrayThreshold: 0.6, stringArrayEncoding: ['base64'], stringArrayRotate: true, stringArrayShuffle: true,
    stringArrayWrappersCount: 1, splitStrings: false, controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false,
    numbersToExpressions: false, simplify: true, transformObjectKeys: false, unicodeEscapeSequence: false, sourceMap: false,
  }).getObfuscatedCode();
  fs.writeFileSync(file, out);
  console.log('protected', file.split('/').slice(-2).join('/'), (out.length / 1e6).toFixed(1) + ' MB in', ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
