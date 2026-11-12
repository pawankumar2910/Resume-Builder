import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { securityHeaders } from '../server.mjs';
const html = await readFile('dist/index.html', 'utf8');
assert.ok(html.includes('Content-Security-Policy'), 'Missing document policy');
assert.ok(/<noscript\s*>/.test(html), 'Missing no-script fallback');
for (const match of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) await stat(join('dist', match[1]));
for (const path of [
  'assets/parse-worker.js',
  'assets/pdf.worker.min.mjs',
  'fonts/noto-serif-400.ttf',
  'fonts/ibm-plex-mono-400.ttf',
  '_headers',
])
  await stat(join('dist', path));
const headers = await readFile('dist/_headers', 'utf8');
assert.ok(
  headers.includes(securityHeaders['Content-Security-Policy']),
  'Host policy differs from tested local policy',
);
let initialBytes = 0;
for (const file of (await readdir('dist/assets')).filter((name) =>
  /^(main\.(js|css)|chunk-.*\.js)$/.test(name),
))
  initialBytes += gzipSync(await readFile('dist/assets/' + file)).byteLength;
assert.ok(
  initialBytes < 160 * 1024,
  `Initial shared JavaScript/CSS exceeds the 160 KiB gzip budget: ${initialBytes}`,
);
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    assert.ok(
      !['.env', '.git', 'test-output', 'node_modules'].includes(item.name),
      'Private/development file in distribution',
    );
    if (item.isDirectory()) await scan(join(directory, item.name));
  }
}
await scan('dist');
console.log(`Build verified. Initial shared JS/CSS: ${(initialBytes / 1024).toFixed(1)} KiB gzip.`);
