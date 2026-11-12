import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText } from '../src/rules.js';
import { templates, freshResume, chooseTemplate, certificateKey, sampleResume } from '../src/model.js';
import { resumeHtml } from '../src/resume.js';
test('extracts labelled facts and their exact evidence without inventing missing fields', () => {
 const r = analyzeText('Certificate of completion\nAwarded to: Pavan Kumar\nCourse: Python for Data Analysis\nIssued by: Example University\nCompletion date: 12 November 2026\nCredential ID: ABC-123\nSkills: Python, SQL, Microsoft Excel\nhttps://example.org/verify/123');
 assert.equal(r.title, 'Python for Data Analysis'); assert.equal(r.issuer, 'Example University'); assert.equal(r.recipient, 'Pavan Kumar'); assert.equal(r.date, '12 November 2026'); assert.equal(r.credential, 'ABC-123'); assert.equal(r.url, 'https://example.org/verify/123');
 assert.deepEqual(r.skills.map(s => s.name), ['Python', 'SQL', 'Microsoft Excel', 'Data analysis']); assert.ok(r.skills.every(s => !s.selected)); assert.equal(r.evidence.title.text, 'Course: Python for Data Analysis');
});
test('does not guess an issuer, title, year or ability from unrelated prose or a filename', () => {
 const r = analyzeText('Congratulations on completing this wonderful achievement. Keep learning.', 'Python-AWS-Expert-2026.pdf');
 assert.equal(r.title, ''); assert.equal(r.issuer, ''); assert.equal(r.date, ''); assert.deepEqual(r.skills, []);
});
test('matches standalone labels and keeps ambiguous dates as source text', () => {
 const r = analyzeText('Course name\nAdvanced SQL\nIssued by\nExample College\nCompletion date: 03/04/2026');
 assert.equal(r.title, 'Advanced SQL'); assert.equal(r.issuer, 'Example College'); assert.equal(r.date, '03/04/2026');
});
test('handles unicode labels and flags multiple course titles', () => {
 const r = analyzeText('Course： Systèmes distribués\nCourse: Database Design\nIssued by: Université Exemple');
 assert.equal(r.title, 'Systèmes distribués'); assert.equal(r.titleCount, 2);
});
test('scans without text require manual input; skill matching respects word boundaries', () => {
 assert.equal(analyzeText('').status, 'manual');
 const r = analyzeText('Excellent communication and JavaScript experience. No other technologies listed.');
 assert.deepEqual(r.skills.map(s => s.name), ['JavaScript']);
});
test('60 presets have unique IDs across twelve layouts and all render', () => {
 assert.equal(templates.length, 60); assert.equal(new Set(templates.map(t => t.id)).size, 60); assert.equal(new Set(templates.map(t => t.layout)).size, 12);
 for (const t of templates) { const r = sampleResume(); chooseTemplate(r, t.id); const html = resumeHtml(r); assert.ok(html.includes('Alex Morgan')); assert.ok(html.includes('Studio North')); assert.ok(html.includes('Google UX Design')); }
});
test('renderer escapes untrusted resume content and preserves editable section labels', () => {
 const r = freshResume(); r.personal.name = '<img src=x onerror=alert(1)>'; r.summary = 'Hello <script>bad()</script>'; r.headings.summary = 'About me';
 const html = resumeHtml(r); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;img')); assert.ok(html.includes('About me'));
});
test('duplicate certificate key normalizes spaces and case while respecting credential IDs', () => {
 assert.equal(certificateKey({ title: 'Intro to SQL', issuer: 'Example', credential: 'ABC 1' }), certificateKey({ title: 'intro TO sql', issuer: 'example', credential: 'abc-1' }));
 assert.notEqual(certificateKey({ title: 'SQL', credential: '123' }), certificateKey({ title: 'SQL', credential: '456' }));
});
