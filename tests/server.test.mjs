import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createStaticServer } from '../server.mjs';
test('static server sends protection headers, supports HEAD and rejects writes and hidden paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'folio-server-test-'));
  await writeFile(join(dir, 'index.html'), '<h1>Folio</h1>');
  const server = createStaticServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(response.headers.get('content-security-policy').includes("object-src 'none'"));
    assert.equal(await response.text(), '<h1>Folio</h1>');
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    assert.equal(await (await fetch(url, { method: 'HEAD' })).text(), '');
    assert.equal((await fetch(url + '/.env')).status, 403);
    assert.equal((await fetch(url + '/missing')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    const target = resolve(dir);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.includes('folio-server-test-'))
      throw new Error('Invalid cleanup target');
    await rm(target, { recursive: true, force: true });
  }
});
