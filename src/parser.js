import { analyzeText } from './rules.js';
import { MAX_FILE_SIZE, MAX_TEXT_LENGTH, validateFileBytes } from './file-safety.js';
export async function extractDocument(file) {
  if (file.size > MAX_FILE_SIZE)
    throw new Error('This file exceeds 15 MB. Please use a smaller file.');
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp'].includes(ext))
    throw new Error('Use a PDF, DOCX, TXT, PNG, JPG, or WebP file.');
  const buffer = await file.arrayBuffer();
  validateFileBytes(new Uint8Array(buffer), ext);
  let text = '';
  if (ext === 'txt') text = await file.text();
  else if (ext === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: buffer });
    text = result.value;
  } else if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    // Pass an explicit port so PDF.js does not inspect window/document in this worker.
    const port = new Worker('/assets/pdf.worker.min.mjs', { type: 'module' });
    const worker = new pdfjs.PDFWorker({ port });
    const task = pdfjs.getDocument({
      worker,
      useWorkerFetch: true,
      data: new Uint8Array(buffer),
      cMapUrl: '/assets/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/assets/standard_fonts/',
      wasmUrl: '/assets/wasm/',
      isEvalSupported: false,
      enableXfa: false,
    });
    let doc;
    try {
      doc = await task.promise;
      if (doc.numPages > 75)
        throw new Error('Please split this document into files of 75 pages or fewer.');
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        let y = null;
        text += `\n`;
        for (const item of content.items) {
          if (!('str' in item)) continue;
          if (y !== null && Math.abs(item.transform[5] - y) > 4) text += '\n';
          text += item.str + (item.hasEOL ? '\n' : ' ');
          y = item.transform[5];
        }
        page.cleanup();
        if (text.length > MAX_TEXT_LENGTH)
          throw new Error('This document contains too much text. Upload just the relevant pages.');
      }
    } finally {
      await task.destroy();
      worker.destroy();
      port.terminate();
    }
  } else if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext))
    throw new Error('Use a PDF, DOCX, TXT, PNG, JPG, or WebP file.');
  if (text.length > MAX_TEXT_LENGTH)
    throw new Error('This document contains too much text. Please upload just the relevant pages.');
  return analyzeText(text, file.name);
}
export async function parseFile(file, { signal } = {}) {
  const result = await new Promise((resolve, reject) => {
    const worker = new Worker('/assets/parse-worker.js', { type: 'module' });
    const finish = (error, value) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      error ? reject(error) : resolve(value);
    };
    const abort = () => finish(new DOMException('Document reading cancelled.', 'AbortError'));
    const timer = setTimeout(
      () =>
        finish(
          new Error('Reading took too long. Use a smaller document or enter its details manually.'),
        ),
      45000,
    );
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.result);
    worker.onerror = () =>
      finish(new Error('The document reader could not start. Reload and try again.'));
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    worker.postMessage({ file });
  });
  const ext = file.name.split('.').pop().toLowerCase();
  const imageUrl = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? URL.createObjectURL(file) : '';
  return {
    ...result,
    id: crypto.randomUUID(),
    imageUrl,
    fileUrl: imageUrl || URL.createObjectURL(file),
    type: file.type,
  };
}
