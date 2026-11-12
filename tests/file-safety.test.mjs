import test from 'node:test';
import assert from 'node:assert/strict';
import { Document, Packer, Paragraph } from 'docx';
import { validateDocxArchive, validateFileBytes } from '../src/file-safety.js';
test('Word archive validation accepts a real document and rejects oversized expansion before decompression', async () => {
  const bytes = new Uint8Array(
    await Packer.toBuffer(
      new Document({ sections: [{ children: [new Paragraph('Course: SQL')] }] }),
    ),
  );
  assert.doesNotThrow(() => validateDocxArchive(bytes));
  const hostile = bytes.slice();
  const view = new DataView(hostile.buffer);
  for (let i = 0; i < hostile.length - 46; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      view.setUint32(i + 24, 100 * 1024 * 1024, true);
      break;
    }
  assert.throws(() => validateDocxArchive(hostile), /too large/);
  assert.throws(() => validateDocxArchive(bytes.slice(0, 40)), /readable DOCX/);
});
test('extension alone does not make binary content a supported document', () => {
  const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
  for (const extension of ['pdf', 'docx', 'png', 'jpg', 'webp'])
    assert.throws(() => validateFileBytes(html, extension));
  assert.doesNotThrow(() => validateFileBytes(new TextEncoder().encode('%PDF-1.7\n'), 'pdf'));
  assert.throws(() => validateFileBytes(new Uint8Array([0, 1, 2, 3]), 'txt'), /UTF-8/);
  assert.throws(() => validateFileBytes(new Uint8Array(16 * 1024 * 1024), 'pdf'), /15 MB/);
});
