import JSZip from 'jszip';
import { validateFileBytes } from './file-safety.js';

const decode = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, x) => {
    if (x[0] === '#')
      return String.fromCodePoint(
        x[1].toLowerCase() === 'x' ? parseInt(x.slice(2), 16) : Number(x.slice(1)),
      );
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[x];
  });
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function wordTextParts(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('This Word document contains unsupported XML declarations.');
  const prefixes = [
    ...xml.matchAll(
      /xmlns:([\w]+)=["'](?:http:\/\/schemas.openxmlformats.org\/wordprocessingml\/2006\/main|http:\/\/purl.oclc.org\/ooxml\/wordprocessingml\/main)["']/g,
    ),
  ].map((m) => m[1]);
  const parts = [];
  for (const prefix of prefixes) {
    const pattern = new RegExp(`<${prefix}:t(\\s[^>]*|)>([^<]*)<\\/${prefix}:t>`, 'g');
    for (const m of xml.matchAll(pattern)) {
      const text = decode(m[2]);
      if (text.trim())
        parts.push({
          start: m.index,
          end: m.index + m[0].length,
          prefix,
          attrs: m[1],
          original: text,
          text,
        });
    }
  }
  return parts.sort((a, b) => a.start - b.start);
}
export function replaceWordText(xml, parts) {
  for (const p of [...parts].sort((a, b) => b.start - a.start)) {
    if (p.text === p.original) continue;
    if (p.text.length > 20000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.text))
      throw new Error('A text fragment contains unsupported characters or is too long.');
    const attrs = p.attrs.replace(/\s+xml:space=["'][^"']*["']/g, '');
    xml =
      xml.slice(0, p.start) +
      `<${p.prefix}:t${attrs} xml:space="preserve">${p.text.split(/\r?\n/).map(encode).join(`</${p.prefix}:t><${p.prefix}:br/><${p.prefix}:t xml:space="preserve">`)}</${p.prefix}:t>` +
      xml.slice(p.end);
  }
  return xml;
}
export async function openOriginalDocx(bytes) {
  validateFileBytes(bytes, 'docx');
  const zip = await JSZip.loadAsync(bytes);
  const documents = [];
  for (const name of Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(name),
  )) {
    const xml = await zip.file(name).async('string');
    documents.push({ name, xml, parts: wordTextParts(xml) });
  }
  const parts = documents.flatMap((d) => d.parts.map((p) => ({ ...p, document: d.name })));
  if (!parts.length)
    throw new Error(
      'No editable Word text was found. Try importing the resume into a new template.',
    );
  if (parts.length > 3000)
    throw new Error('Use a shorter Word document with fewer than 3,000 text fragments.');
  return {
    parts,
    async export() {
      // Always work from the source bytes, so subsequent downloads cannot accumulate edits.
      const output = await JSZip.loadAsync(bytes);
      for (const d of documents)
        output.file(
          d.name,
          replaceWordText(
            d.xml,
            parts.filter((p) => p.document === d.name),
          ),
        );
      return output.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    },
  };
}
