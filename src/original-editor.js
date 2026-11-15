import { escapeHtml as e } from './model.js';
import { validateFileBytes } from './file-safety.js';

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function openOriginal(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(ext))
    throw new Error('Keep-layout editing supports PDF and DOCX. Use a new template for TXT files.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a file smaller than 15 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateFileBytes(bytes, ext);
  const model = { type: ext, name: file.name, dirty: false, index: 0, selected: 0 };
  if (ext === 'docx')
    Object.assign(model, await (await import('./original-docx.js')).openOriginalDocx(bytes));
  else {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({
      data: bytes,
      cMapUrl: '/assets/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/assets/standard_fonts/',
      wasmUrl: '/assets/wasm/',
      isEvalSupported: false,
      enableXfa: false,
    });
    model.pages = [];
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 10) throw new Error('Keep-layout editing supports up to 10 PDF pages.');
      let pixels = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const scale = 1.5;
        pixels += viewport.width * viewport.height * scale * scale;
        if (pixels > 24000000 || viewport.width > 2000 || viewport.height > 2000)
          throw new Error(
            'This PDF is too large to edit safely in the browser. Use a smaller resume.',
          );
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width * scale);
        canvas.height = Math.ceil(viewport.height * scale);
        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: page.getViewport({ scale }),
          annotationMode: 0,
        }).promise;
        const content = await page.getTextContent();
        const parts = content.items
          .filter((x) => x.str?.trim())
          .map((item) => {
            const t = pdfjs.Util.transform(viewport.transform, item.transform);
            const height = Math.hypot(t[2], t[3]);
            return {
              original: item.str,
              text: item.str,
              x: t[4],
              y: t[5] - height,
              width: item.width,
              height,
              color: '#202020',
              background: '#ffffff',
              editable: Math.abs(t[1]) < 0.01 && Math.abs(t[2]) < 0.01,
            };
          });
        if (parts.length > 2000) throw new Error('This PDF page has too many text fragments.');
        parts.forEach((p) => {
          p.initial = {
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            color: p.color,
            background: p.background,
          };
        });
        model.pages.push({ canvas, width: viewport.width, height: viewport.height, scale, parts });
        page.cleanup();
      }
    } finally {
      await task.destroy();
    }
  }
  return model;
}

export function mountOriginal(root, model, { close, toast }) {
  const isPdf = model.type === 'pdf';
  const parts = () => (isPdf ? model.pages[model.index].parts : model.parts);
  const drawPage = (canvas, page) => {
    canvas.width = page.canvas.width;
    canvas.height = page.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(page.canvas, 0, 0);
    ctx.scale(page.scale, page.scale);
    for (const p of page.parts.filter((p) => p.changed || p.text !== p.original)) {
      const box = p.initial || p;
      ctx.fillStyle = p.background;
      if (p.original) ctx.fillRect(box.x - 1, box.y - 1, box.width + 2, box.height * 1.3 + 2);
      ctx.fillStyle = p.color;
      ctx.font = `${p.height}px system-ui`;
      ctx.textBaseline = 'top';
      ctx.fillText(p.text, p.x, p.y, p.width);
    }
  };
  function preview() {
    const area = root.querySelector('.original-preview');
    if (!isPdf) {
      area.innerHTML = `<div class="word-text-preview"><h2>Document text</h2><p class="muted">Reading view. Download to inspect the preserved layout in Word.</p>${model.parts.map((p, i) => `<button class="word-fragment ${i === model.selected ? 'selected' : ''}" data-original-select="${i}">${e(p.text || '(empty)')}</button>`).join(' ')}</div>`;
      return;
    }
    area.innerHTML = '<canvas aria-label="Edited PDF page preview" role="img"></canvas>';
    drawPage(area.querySelector('canvas'), model.pages[model.index]);
  }
  function render() {
    const list = parts();
    model.selected = Math.min(model.selected, Math.max(0, list.length - 1));
    const p = list[model.selected];
    root.innerHTML = `<header class="editor-header"><button class="text-button" data-original="close">← Back to start</button><div class="editor-document-title"><strong>${e(model.name)}</strong><small>Original layout · download to save changes</small></div><button class="button primary small" data-original="download">Download ${isPdf ? 'PDF' : 'DOCX'}</button></header><main id="main" class="original-layout" tabindex="-1"><section class="original-controls"><div class="eyebrow">KEEP YOUR LAYOUT</div><h1>Edit your existing resume.</h1><p>${isPdf ? 'The original page stays in place. Edit one text fragment at a time; shorter replacements fit best.' : 'Edit text fragments while keeping the original Word styles, tables, columns, and images.'}</p><p class="review-notice">${isPdf ? 'PDF download is flattened to page images: text search, links, and accessibility tags are not retained. Changed text uses a replacement font and background color. Inspect each edit.' : 'This reading view does not reproduce Word pagination. Longer text may reflow in Word. Formatting fragments are edited separately; embedded images and links remain unchanged.'}</p>${isPdf ? `<label class="field">Page<select data-original="page">${model.pages.map((_, i) => `<option value="${i}" ${i === model.index ? 'selected' : ''}>Page ${i + 1}</option>`).join('')}</select></label>` : ''}<label class="field">Text fragment<select data-original="select">${list.map((p, i) => `<option value="${i}" ${i === model.selected ? 'selected' : ''}>${i + 1}. ${e(p.text.slice(0, 75) || '(empty)')}</option>`).join('')}</select></label>${
      p
        ? `<label class="field">Edit text<textarea data-original="text" rows="5" maxlength="${isPdf ? 500 : 20000}" ${p.editable === false ? 'disabled' : ''}>${e(p.text)}</textarea></label>${p.editable === false ? '<p>Rotated text cannot be edited here. Rebuild in a template to change it.</p>' : ''}${isPdf ? `<div class="form-grid"><label class="field">Text color<input type="color" data-original="color" value="${p.color}"></label><label class="field">Cover color<input type="color" data-original="background" value="${p.background}"></label></div>` : ''}${
            isPdf
              ? `<details><summary>Position and size</summary>${[
                  ['x', 'Left'],
                  ['y', 'Top'],
                  ['width', 'Width'],
                  ['height', 'Text size'],
                ]
                  .map(
                    ([key, label]) =>
                      `<label class="field">${label} (pt)<input type="number" data-original="${key}" value="${Math.round(p[key])}" min="${key === 'height' ? 6 : 0}" max="2000" step="1"></label>`,
                  )
                  .join('')}</details>`
              : ''
          }<button class="text-button" data-original="reset">Restore this fragment</button>`
        : '<p>No selectable text on this page. Rebuild using a pasted transcription, or add a text box below.</p>'
    }${isPdf ? '<button class="button secondary full-width" data-original="add">Add a text box</button>' : ''}<p class="helper-text">Original files and edits stay in this tab. Download before closing or reloading.</p><p class="original-status" role="status"></p></section><section class="original-preview"></section></main>`;
    preview();
  }
  root.onclick = async (event) => {
    const button = event.target.closest('[data-original],[data-original-select]');
    if (!button) return;
    if (button.dataset.originalSelect !== undefined) {
      model.selected = +button.dataset.originalSelect;
      render();
      return;
    }
    const action = button.dataset.original;
    if (action === 'close') return close();
    if (action === 'reset') {
      const p = parts()[model.selected];
      p.text = p.original;
      if (p.initial) Object.assign(p, p.initial);
      p.changed = false;
      model.dirty = true;
      render();
    }
    if (action === 'add') {
      const page = model.pages[model.index];
      page.parts.push({
        original: '',
        text: 'Your text',
        x: 36,
        y: 36,
        width: page.width - 72,
        height: 12,
        color: '#202020',
        background: '#ffffff',
        editable: true,
      });
      model.selected = page.parts.length - 1;
      model.dirty = true;
      render();
    }
    if (action === 'download') {
      button.disabled = true;
      button.textContent = 'Preparing…';
      try {
        const name = model.name.replace(/\.[^.]+$/, '') + '-edited.' + model.type;
        if (isPdf) {
          const { PDFDocument } = await import('pdf-lib');
          const output = await PDFDocument.create();
          for (const page of model.pages) {
            const canvas = document.createElement('canvas');
            drawPage(canvas, page);
            const image = await output.embedPng(canvas.toDataURL('image/png'));
            output
              .addPage([page.width, page.height])
              .drawImage(image, { x: 0, y: 0, width: page.width, height: page.height });
            canvas.width = canvas.height = 0;
          }
          download(await output.save(), name, 'application/pdf');
        } else
          download(
            await model.export(),
            name,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          );
        model.dirty = false;
        toast('Edited document downloaded.');
      } catch (error) {
        toast(error.message || 'The download could not be prepared.');
      } finally {
        button.disabled = false;
        button.textContent = `Download ${isPdf ? 'PDF' : 'DOCX'}`;
      }
    }
  };
  root.onchange = (event) => {
    const action = event.target.dataset.original;
    if (action === 'page') {
      model.index = +event.target.value;
      model.selected = 0;
      render();
    }
    if (action === 'select') {
      model.selected = +event.target.value;
      render();
    }
  };
  root.oninput = (event) => {
    const action = event.target.dataset.original;
    if (!['text', 'color', 'background', 'x', 'y', 'width', 'height'].includes(action)) return;
    parts()[model.selected].changed = true;
    parts()[model.selected][action] =
      event.target.type === 'number'
        ? Math.max(action === 'height' ? 6 : 0, Math.min(2000, Number(event.target.value) || 0))
        : event.target.value;
    model.dirty = true;
    preview();
    root.querySelector('.original-status').textContent = 'Edited · download to save';
  };
  render();
  return () => {
    root.onclick = root.onchange = root.oninput = null;
  };
}
