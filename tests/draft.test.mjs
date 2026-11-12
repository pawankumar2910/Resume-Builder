import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleResume, defaultOrder } from '../src/model.js';
import { validateResume, serializeBackup, parseBackup } from '../src/draft.js';
test('portable backups preserve content, layout, hidden sections, and style', () => {
  const r = sampleResume();
  r.template = 'signature-3';
  r.style.size = 11.5;
  r.hidden = ['projects'];
  r.order = [...defaultOrder].reverse();
  r.headings.certificates = 'Learning';
  assert.deepEqual(parseBackup(serializeBackup(r)), r);
});
test('untrusted draft data cannot inject styles, image URLs, prototype keys, or arbitrary sections', () => {
  const input = JSON.parse(
    '{"personal":{"name":"Person"},"__proto__":{"polluted":true},"style":{"accent":"red; background:url(https://evil.example)","size":999,"font":"evil"},"order":["summary","__proto__","summary"],"hidden":["skills","unknown"]}',
  );
  const r = validateResume(input);
  assert.equal(r.style.accent, '');
  assert.equal(r.style.size, 13);
  assert.equal(r.style.font, 'template');
  assert.equal({}.polluted, undefined);
  assert.deepEqual(r.order, defaultOrder);
  assert.deepEqual(r.hidden, ['skills']);
  assert.throws(
    () => validateResume({ personal: { photo: 'https://example.com/tracker.png' } }),
    /PNG/,
  );
  assert.throws(
    () => validateResume({ personal: { photo: 'data:image/svg+xml,<svg onload=alert(1)>' } }),
    /PNG/,
  );
});
test('malformed backups, unsupported versions, oversized fields and invalid arrays fail explicitly', () => {
  assert.throws(() => parseBackup('not JSON'), /JSON/);
  assert.throws(() => parseBackup('{"format":"folio-resume","version":99}'), /version/);
  assert.throws(() => validateResume({ personal: {}, experience: {} }), /entries/);
  assert.throws(() => validateResume({ personal: { name: 'x'.repeat(1001) } }), /1000|1,000/);
  assert.throws(
    () => validateResume({ personal: {}, experience: Array(101).fill({}) }),
    /100 entries/,
  );
});
test('older partial drafts receive safe defaults without losing valid text', () => {
  const r = validateResume({
    personal: { name: 'José' },
    summary: 'Saved text',
    headings: { summary: 'About' },
    order: ['summary'],
    style: { spacing: null },
  });
  assert.equal(r.personal.name, 'José');
  assert.equal(r.summary, 'Saved text');
  assert.equal(r.style.spacing, 1.35);
  assert.equal(r.headings.summary, 'About');
  assert.equal(r.order.length, 8);
});
