// Bundles the game into one HTML page: dist/necromancer.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sealedPath, sealedPlugin, usingStub } from './sealed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({
  entryPoints: [resolve(root, 'src/main.js')], bundle: true, format: 'iife', write: false, target: 'es2020',
  minify: process.argv.includes('--min'), legalComments: 'none', plugins: [sealedPlugin],
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = readFileSync(resolve(root, 'src/ui/page.html'), 'utf8').replace('/*BUNDLE*/', () => js);
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/necromancer.html'), page);
console.log(`dist/necromancer.html ${(page.length / 1024).toFixed(0)} KB · sealed texts from ${usingStub ? 'the stand-ins' : sealedPath}`);
