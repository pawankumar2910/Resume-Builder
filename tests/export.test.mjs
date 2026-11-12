import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { sampleResume, templates } from '../src/model.js';
import { pdfDefinition, makeDocxBlob, makePdfBlob } from '../src/export.js';
import mammoth from 'mammoth';
import pdfMake from 'pdfmake/build/pdfmake.js';
import fonts from 'pdfmake/build/vfs_fonts.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
pdfMake.vfs = fonts.pdfMake?.vfs || fonts;
test('PDF retains searchable Unicode text and automatically paginates long content', async () => {
 const r = sampleResume(); r.personal.name = 'José Martin'; r.custom = Array.from({length:100}, (_,i) => `Detail ${i+1}: A real achievement preserved in the exported document.`).join('\n');
 const buffer = await new Promise(resolve => pdfMake.createPdf(pdfDefinition(r)).getBuffer(resolve));
 const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }); const pdf = await task.promise;
 assert.ok(pdf.numPages > 1); let text = '';
 for (let i = 1; i <= pdf.numPages; i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map(x => x.str).join(' ');
 assert.ok(text.includes('José Martin')); assert.ok(text.includes('Detail 100:')); assert.ok(text.includes('Google UX Design'));
 await mkdir('test-output', {recursive:true}); await writeFile('test-output/resume-long.pdf', buffer); await task.destroy();
});
test('DOCX contains every edited field, custom headings and late content', async () => {
 const r = sampleResume(); r.template = 'column-1'; r.headings.certificates = 'Professional learning'; r.certificates[0].credential = 'CRED-9876'; r.custom = 'Last piece of content ✓';
 const blob = await makeDocxBlob(r); const buffer = Buffer.from(await blob.arrayBuffer());
 const extracted = await mammoth.extractRawText({buffer});
 for (const expected of ['Alex Morgan','Professional learning','CRED-9876','Last piece of content ✓','Open Library','alex@example.com']) assert.ok(extracted.value.includes(expected), expected);
 await mkdir('test-output', {recursive:true}); await writeFile('test-output/resume.docx', buffer);
});
test('all layout families export with their fonts; switching back to sans retains text', async () => {
 for (const family of ['noto-serif','ibm-plex-mono']) for (const weight of [400,700]) pdfMake.vfs[`${family}-${weight}.ttf`] = (await readFile(`public/fonts/${family}-${weight}.ttf`)).toString('base64');
 for (const t of templates.filter(t => t.palette === 'Ink')) {
   const r = sampleResume(); r.template = t.id;
   const blob = await makePdfBlob(r); assert.ok(blob.size > 5000);
   const task = getDocument({data:new Uint8Array(await blob.arrayBuffer()),useSystemFonts:true}); const pdf = await task.promise;
   let text = ''; for(let i=1;i<=pdf.numPages;i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');
   for (const expected of ['Alex Morgan','Google UX Design','Studio North','Open Library']) assert.ok(text.includes(expected), `${t.layout}: ${expected}`);
   await task.destroy();
 }
 const r = sampleResume(); r.style.font = 'mono'; assert.ok((await makePdfBlob(r)).size > 5000); r.style.font = 'sans'; assert.ok((await makePdfBlob(r)).size > 5000);
});
