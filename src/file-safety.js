export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 200000;
const MAX_EXPANDED_BYTES = 40 * 1024 * 1024;
export function validateFileBytes(bytes, extension) {
  if (bytes.byteLength > MAX_FILE_SIZE)
    throw new Error('This file exceeds 15 MB. Please use a smaller file.');
  const starts = (...values) => values.every((b, i) => bytes[i] === b);
  if (
    extension === 'pdf' &&
    !new TextDecoder('ascii').decode(bytes.slice(0, 1024)).includes('%PDF-')
  )
    throw new Error('This file is not a valid PDF.');
  if (extension === 'png' && !starts(137, 80, 78, 71, 13, 10, 26, 10))
    throw new Error('This file is not a valid PNG image.');
  if (['jpg', 'jpeg'].includes(extension) && !starts(255, 216, 255))
    throw new Error('This file is not a valid JPEG image.');
  if (
    extension === 'webp' &&
    (!starts(82, 73, 70, 70) || new TextDecoder('ascii').decode(bytes.slice(8, 12)) !== 'WEBP')
  )
    throw new Error('This file is not a valid WebP image.');
  if (extension === 'txt' && bytes.slice(0, 8192).includes(0))
    throw new Error('Use a UTF-8 plain-text file. This file appears to be binary or UTF-16.');
  if (extension === 'docx') validateDocxArchive(bytes);
}
export function validateDocxArchive(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error('This Word file is not a readable DOCX archive.');
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    count > 1000 ||
    offset === 0xffffffff
  )
    throw new Error('This Word archive is too complex. Save a simpler DOCX or PDF.');
  let cursor = offset,
    expanded = 0,
    documentFound = false;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error('This Word file has a damaged directory.');
    const flags = view.getUint16(cursor + 8, true),
      compression = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true),
      size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true),
      extraLength = view.getUint16(cursor + 30, true),
      commentLength = view.getUint16(cursor + 32, true);
    if (flags & 1 || ![0, 8].includes(compression))
      throw new Error('Encrypted or unsupported Word files cannot be read.');
    expanded += size;
    if (
      expanded > MAX_EXPANDED_BYTES ||
      (size > 5 * 1024 * 1024 && size / Math.max(compressed, 1) > 200)
    )
      throw new Error(
        'The expanded Word document is too large. Export the relevant pages as PDF or text.',
      );
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end) throw new Error('This Word file is incomplete.');
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (name === 'word/document.xml') documentFound = true;
    cursor = next;
  }
  if (!documentFound) throw new Error('This archive does not contain a Word document.');
}
