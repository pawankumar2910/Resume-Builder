import { config, visibleSections } from './model.js';
import { sectionItems } from './resume.js';
const sideKeys = ['skills', 'education', 'certificates', 'languages'];
export function pdfDefinition(r) {
  const c = config(r), p = r.personal;
  const serif = c.font === 'serif';
  const center = ['signature', 'scholar', 'executive'].includes(c.layout);
  const section = key => {
    const soft = ['modern', 'graduate'].includes(c.layout);
    const literary = ['editorial', 'atelier', 'signature'].includes(c.layout);
    const title = { text: literary ? r.headings[key] : r.headings[key].toUpperCase(), fontSize: c.size * (literary ? 1.2 : .9), bold: !literary, color: c.accent, characterSpacing: literary ? 0 : 1, alignment: c.layout === 'signature' ? 'center' : 'left', margin: [0, c.layout === 'compact' ? 8 : 14, 0, 6], headlineLevel: 1 };
    let label = title;
    if (soft) label = { table: { widths: ['*'], body: [[{ ...title, margin:[5,4,5,4] }]] }, layout: { fillColor: c.tint, hLineWidth:()=>0, vLineWidth:()=>0, paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0 }, margin:[0,12,0,8], headlineLevel:1 };
    if (c.layout === 'timeline') label = { ...title, text: '•  ' + r.headings[key], margin:[0,14,0,6] };
    const content = [label];
    if (['executive','scholar','folio','signature','editorial'].includes(c.layout)) content.push({ canvas:[{type:'line',x1:0,y1:0,x2:c.columns ? (sideKeys.includes(key) ? 145 : 340) : 505,y2:0,lineWidth:c.layout === 'folio' ? 1.5 : .4,lineColor:c.accent}],margin:[0,0,0,7] });
    for (const x of sectionItems(r, key)) {
      if (x.title || x.date) content.push({ columns: [{ text: x.title || '', bold: true, width: '*' }, { text: x.date || '', alignment: 'right', width: 'auto', fontSize: c.size * .85, color: '#626762' }], columnGap: 8, margin: [0, 0, 0, 3] });
      if (x.sub) content.push({ text: x.sub, color: c.accent, margin: [0, 0, 0, 4] });
      if (x.body) content.push({ text: x.body, margin: [0, 0, 0, 5] });
      if (x.link) content.push({ text: x.link, color: c.accent, fontSize: c.size * .9, ...( /^https?:\/\//i.test(x.link) ? { link: x.link } : {} ), margin: [0, 0, 0, 3] });
      if (x.credential) content.push({ text: x.credential, fontSize: c.size * .85, color: '#626762', margin: [0, 0, 0, 5] });
    }
    return content;
  };
  const heading = { stack: [{ text: p.name || 'Your name', fontSize: {editorial:36,atelier:34,signature:34,compact:25,folio:32}[c.layout] || 29, bold: !serif, color: c.accent, margin: [0, 0, 0, 5] }, { text: p.title, fontSize: c.size + 2, margin: [0, 0, 0, 10] }, { text: [p.email, p.phone, p.location, p.website].filter(Boolean).join('   ·   '), fontSize: c.size * .87, color: '#555c56' }], alignment: center ? 'center' : 'left' };
  let header = p.photo && c.photo ? { columns: [heading, { image: p.photo, width: 65, height: 65, margin: [14, 0, 0, 0] }], columnGap: 10 } : heading;
  if (['modern', 'column'].includes(c.layout)) header = { table: { widths: ['*'], body: [[header]] }, layout: { fillColor: c.tint, hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 16, paddingRight: () => 16, paddingTop: () => 16, paddingBottom: () => 16 } };
  const keys = visibleSections(r);
  return { info: { title: `${p.name || 'Resume'} — Resume`, author: p.name, creator: 'Folio Resume Studio' }, pageSize: c.paper, pageMargins: [42, 40, 42, 40], defaultStyle: { font: c.font === 'serif' ? 'NotoSerif' : c.font === 'mono' ? 'PlexMono' : 'Roboto', fontSize: c.size, lineHeight: c.spacing - .2, color: '#252b27' },
    content: [...(c.layout === 'folio' ? [{canvas:[{type:'line',x1:0,y1:0,x2:511,y2:0,lineWidth:4,lineColor:c.accent}],margin:[0,0,0,20]}] : []), header, ...(['editorial','atelier','signature','timeline','folio'].includes(c.layout) ? [] : [{ canvas: [{ type: 'line', x1: 0, y1: 12, x2: c.paper === 'LETTER' ? 528 : 511, y2: 12, lineWidth: ['executive', 'scholar'].includes(c.layout) ? 1.5 : .5, lineColor: c.accent }], margin: [0, 0, 0, 8] }]),
      ...(c.columns ? [{ columns: [{ width: '*', stack: keys.filter(k => !sideKeys.includes(k)).flatMap(section) }, { width: '30%', stack: keys.filter(k => sideKeys.includes(k)).flatMap(section) }], columnGap: 24 }] : keys.flatMap(section))],
    footer: (page, total) => total > 1 ? { text: `${p.name}  ·  ${page} / ${total}`, alignment: 'center', fontSize: 8, color: '#777777', margin: [0, 10, 0, 0] } : '',
    pageBreakBefore: (node, following) => node.headlineLevel === 1 && following.length === 0,
  };
}
export async function makePdfBlob(r) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js')]);
  pdfMake.vfs = fonts.pdfMake?.vfs || fonts;
  pdfMake.fonts = { Roboto: { normal:'Roboto-Regular.ttf',bold:'Roboto-Medium.ttf',italics:'Roboto-Italic.ttf',bolditalics:'Roboto-MediumItalic.ttf' }, ...pdfMake.fonts };
  const fontName = config(r).font;
  if (fontName !== 'sans') {
    const family = fontName === 'serif' ? 'noto-serif' : 'ibm-plex-mono';
    for (const weight of [400, 700]) {
      const key = `${family}-${weight}.ttf`;
      if (!pdfMake.vfs[key]) {
        const response = await fetch('/fonts/' + key);
        if (!response.ok) throw new Error('Could not load print font.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let raw = ''; for (const b of bytes) raw += String.fromCharCode(b);
        pdfMake.vfs[key] = btoa(raw);
      }
    }
    pdfMake.fonts = { ...pdfMake.fonts, [fontName === 'serif' ? 'NotoSerif' : 'PlexMono']: { normal: `${family}-400.ttf`, bold: `${family}-700.ttf`, italics: `${family}-400.ttf`, bolditalics: `${family}-700.ttf` } };
  }
  return new Promise((resolve, reject) => { try { pdfMake.createPdf(pdfDefinition(r)).getBlob(resolve); } catch (error) { reject(error); } });
}
export async function makeDocxBlob(r) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ImageRun, ShadingType } = await import('docx');
  const c = config(r), p = r.personal; const accent = c.accent.slice(1); const size = c.size * 2;
  const font = c.font === 'serif' ? 'Georgia' : c.font === 'mono' ? 'Consolas' : 'Calibri';
  const para = (text, props = {}) => new Paragraph({ children: [new TextRun({ text: text || '', size, font, ...props })], spacing: { after: 70, line: Math.round(c.spacing * 240) }, ...props });
  const section = key => [para(r.headings[key], { bold: true, color: accent, spacing: { before: 220, after: 100 }, keepNext: true }), ...sectionItems(r, key).flatMap(x => [
    ...(x.title || x.date ? [new Paragraph({ children: [new TextRun({ text: x.title || '', bold: true, size, font }), new TextRun({ text: x.date ? `  |  ${x.date}` : '', size: size - 2, font, color: '666666' })], keepNext: true, spacing: { after: 60 } })] : []),
    ...(x.sub ? [para(x.sub, { color: accent, keepNext: Boolean(x.body) })] : []),
    ...(x.body ? x.body.split('\n').map(line => para(line)) : []), ...(x.link ? [para(x.link, { color: accent })] : []), ...(x.credential ? [para(x.credential, { size: size - 2 })] : [])
  ])];
  const center = ['signature', 'scholar', 'executive'].includes(c.layout);
  const header = [para(p.name || 'Your name', { size: c.layout === 'editorial' ? 64 : 54, color: accent, bold: c.font !== 'serif', alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT }), para(p.title, { size: size + 4, alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT }), para([p.email, p.phone, p.location, p.website].filter(Boolean).join('  ·  '), { size: size - 2, alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT })];
  if (p.photo && c.photo) { const bytes = Uint8Array.from(atob(p.photo.split(',')[1]), v => v.charCodeAt(0)); header.unshift(new Paragraph({ children: [new ImageRun({ data: bytes, type: 'png', transformation: { width: 78, height: 78 } })], alignment: AlignmentType.RIGHT })); }
  const keys = visibleSections(r); let body = keys.flatMap(section);
  if (c.columns) {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    body = [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows: [new TableRow({ children: [new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: keys.filter(k => !sideKeys.includes(k)).flatMap(section), margins: { right: 240 } }), new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: keys.filter(k => sideKeys.includes(k)).flatMap(section), shading: { type: ShadingType.CLEAR, fill: c.tint.slice(1) }, margins: { left: 160, right: 120 } })] })] })];
  }
  const letter = c.paper === 'LETTER';
  return Packer.toBlob(new Document({ creator: 'Folio Resume Studio', title: `${p.name} — Resume`, styles: { default: { document: { run: { font, size, color: '252B27' } } } }, sections: [{ properties: { page: { size: { width: letter ? 12240 : 11906, height: letter ? 15840 : 16838 }, margin: { top: 800, bottom: 800, left: 840, right: 840 } } }, children: [...header, ...body] }] }));
}
export function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
