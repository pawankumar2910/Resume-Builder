import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { importResumeText } from '../src/resume-import.js';
import { openOriginalDocx, wordTextParts, replaceWordText } from '../src/original-docx.js';

test('dated role lines split PDF work entries and source titles populate personal details', () => {
  const { resume } = importResumeText(
    'Alex Morgan\nProduct Designer\nalexmorgan.design\nExperience\nSenior Designer 2022 — Present\nStudio North\nBuilt tools.\nDesigner 2019 — 2022\nForma\nDesigned products.',
  );
  assert.equal(resume.personal.title, 'Product Designer');
  assert.equal(resume.personal.website, 'alexmorgan.design');
  assert.equal(resume.experience.length, 2);
  assert.equal(resume.experience[0].title, 'Senior Designer');
  assert.equal(resume.experience[0].dates, '2022 — Present');
  assert.match(resume.experience[1].description, /Forma/);
});

test('Word paragraph spacing does not turn employers and dates into separate jobs', () => {
  const { resume } = importResumeText(
    'Name: Alex Morgan\n\nExperience\n\nDesigner\n\nStudio North\n\n2022 – Present\n\nBuilt useful tools.',
  );
  assert.equal(resume.experience.length, 1);
  assert.match(resume.experience[0].description, /Studio North\n2022/);
});

test('spaced PDF headings map to resume sections', () => {
  const { resume } = importResumeText(
    'Alex Morgan\nP R O F I L E\nA thoughtful designer.\nE X P E R I E N C E\nSenior Designer\nStudio North\nC O U R S E S & C E RT I F I C AT I O N S\nUX Design',
  );
  assert.equal(resume.summary, 'A thoughtful designer.');
  assert.equal(resume.experience[0].title, 'Senior Designer');
  assert.equal(resume.certificates[0].title, 'UX Design');
});

test('resume import finds contact details and keeps ambiguous entries without inventing facts', () => {
  const result = importResumeText(
    'Name: Maya Rao\nTitle: Engineer\nEmail: maya@example.com | +91 98765 43210\nLocation: Pune\nhttps://example.com\nSummary\nBuilds accessible tools.\nExperience\nEngineer\nExample Studio\n2022 – Present\nBuilt a reporting tool.\n\nIntern\nOther Studio\nEducation\nBSc Computer Science\nExample College\nSkills\nJavaScript, SQL\nCertifications\nWeb Fundamentals\nProvider 2024',
  );
  assert.equal(result.resume.personal.name, 'Maya Rao');
  assert.equal(result.resume.personal.email, 'maya@example.com');
  assert.equal(result.resume.personal.phone, '+91 98765 43210');
  assert.equal(result.resume.personal.location, 'Pune');
  assert.equal(result.resume.experience.length, 2);
  assert.equal(result.resume.experience[0].organization, '');
  assert.match(result.resume.experience[0].description, /Example Studio\n2022/);
  assert.equal(result.resume.skills, 'JavaScript, SQL');
  assert.equal(result.resume.certificates[0].issuer, '');
  assert.equal(result.raw.includes('Provider 2024'), true);
});
test('unrecognized and multilingual resume content remains available for editing', () => {
  const result = importResumeText(
    'Élodie Martin\nProduct Designer\nAwards\nDesign prize 2024\nSkills\nFigma, Français',
  );
  assert.equal(result.resume.personal.name, 'Élodie Martin');
  assert.match(result.resume.custom, /Awards\nDesign prize 2024/);
  assert.equal(result.resume.personal.title, 'Product Designer');
  assert.throws(() => importResumeText('   '), /No selectable text/);
  assert.throws(() => importResumeText('a'.repeat(200001)), /200,000/);
});
test('Word text replacement preserves non-edited XML, style runs and entity escaping', () => {
  const xml =
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Maya &amp; Rao</w:t></w:r><w:r><w:t> Engineer</w:t></w:r></w:p></w:document>';
  const parts = wordTextParts(xml);
  assert.equal(parts[0].text, 'Maya & Rao');
  assert.equal(replaceWordText(xml, parts), xml);
  parts[0].text = 'Anika <Rao> & Co';
  const edited = replaceWordText(xml, parts);
  assert.match(edited, /<w:rPr><w:b\/><\/w:rPr>/);
  assert.match(edited, /Anika &lt;Rao&gt; &amp; Co/);
  assert.match(edited, /<w:t> Engineer<\/w:t>/);
  assert.throws(() => wordTextParts('<!DOCTYPE x>'), /unsupported XML/);
});
test('original Word export preserves all package parts and supports repeated edits', async () => {
  const zip = new JSZip();
  const xml =
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Original name</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', '<styles>preserve me</styles>');
  zip.file('word/media/image.png', new Uint8Array([1, 2, 3, 4]));
  const source = await zip.generateAsync({ type: 'uint8array' });
  const model = await openOriginalDocx(source);
  for (const name of ['Edited name', 'Second name']) {
    model.parts[0].text = name;
    const output = await JSZip.loadAsync(await model.export());
    assert.match(await output.file('word/document.xml').async('string'), new RegExp(name));
    assert.match(await output.file('word/document.xml').async('string'), /<w:tbl>/);
    assert.equal(
      await output.file('word/styles.xml').async('string'),
      '<styles>preserve me</styles>',
    );
    assert.deepEqual(
      await output.file('word/media/image.png').async('uint8array'),
      new Uint8Array([1, 2, 3, 4]),
    );
  }
});
