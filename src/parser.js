import { analyzeText } from './rules.js';
export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export async function parseFile(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('This file exceeds 15 MB. Please use a smaller file.');
  const ext = file.name.split('.').pop().toLowerCase();
  let text = '';
  if (ext === 'txt') text = await file.text();
  else if (ext === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() }); text = result.value;
  } else if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: '/assets/cmaps/', cMapPacked: true, standardFontDataUrl: '/assets/standard_fonts/', wasmUrl: '/assets/wasm/', isEvalSupported: false });
    let doc;
    try {
      doc = await task.promise;
      if (doc.numPages > 75) throw new Error('Please split this document into files of 75 pages or fewer.');
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p); const content = await page.getTextContent(); let y = null;
        text += `\n`;
        for (const item of content.items) {
          if (!('str' in item)) continue;
          if (y !== null && Math.abs(item.transform[5] - y) > 4) text += '\n';
          text += item.str + (item.hasEOL ? '\n' : ' '); y = item.transform[5];
        }
        page.cleanup();
      }
    } finally { await task.destroy(); }
  } else if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) throw new Error('Use a PDF, DOCX, TXT, PNG, JPG, or WebP file.');
  if (text.length > 200000) throw new Error('This document contains too much text. Please upload just the relevant pages.');
  return { ...analyzeText(text, file.name), id: crypto.randomUUID(), imageUrl: ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? URL.createObjectURL(file) : '', fileUrl: URL.createObjectURL(file), type: file.type };
}
