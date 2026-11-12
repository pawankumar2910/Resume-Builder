import { build } from 'esbuild';
import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const outputPath = resolve('dist');
if (dirname(outputPath) !== process.cwd() || outputPath !== resolve(process.cwd(), 'dist'))
  throw new Error('Build output must be the project dist directory.');
await rm(outputPath, { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await build({
  entryPoints: ['src/main.js', 'src/parse-worker.js'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'dist/assets',
  loader: { '.woff': 'file', '.woff2': 'file' },
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  logLevel: 'info',
});
await copyFile('index.html', 'dist/index.html');
await cp('public', 'dist', { recursive: true });
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'dist/assets/pdf.worker.min.mjs',
);
await cp('node_modules/pdfjs-dist/cmaps', 'dist/assets/cmaps', { recursive: true });
await cp('node_modules/pdfjs-dist/standard_fonts', 'dist/assets/standard_fonts', {
  recursive: true,
});
await cp('node_modules/pdfjs-dist/wasm', 'dist/assets/wasm', { recursive: true });
