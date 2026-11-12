import { freshResume, defaultOrder, templates, entry } from './model.js';

export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function text(value, limit = 20000) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > limit)
    throw new Error(`A text field is invalid or exceeds ${limit.toLocaleString()} characters.`);
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}
function numeric(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
// Construct a new allowlisted object: imported JSON never becomes application state directly.
export function validateResume(input) {
  if (!object(input) || !object(input.personal))
    throw new Error('This file does not contain a valid Folio resume.');
  const r = freshResume();
  for (const key of Object.keys(r.personal).filter((k) => k !== 'photo'))
    r.personal[key] = text(input.personal[key], 1000);
  const photo = text(input.personal.photo, 3 * 1024 * 1024);
  if (photo && !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))
    throw new Error('The saved photo is not a supported embedded PNG.');
  r.personal.photo = photo;
  for (const key of ['summary', 'skills', 'languages', 'custom']) r[key] = text(input[key]);
  for (const key of ['experience', 'education', 'projects', 'certificates']) {
    const list = input[key] ?? [];
    if (!Array.isArray(list) || list.length > 100)
      throw new Error('Each section supports up to 100 entries.');
    r[key] = list.map((item) => {
      if (!object(item)) throw new Error('An entry in this resume is invalid.');
      const clean = entry(key);
      for (const field of Object.keys(clean).filter((k) => k !== 'id'))
        clean[field] = text(item[field], field === 'description' ? 20000 : 2000);
      clean.id = typeof item.id === 'string' && /^[\w-]{1,80}$/.test(item.id) ? item.id : clean.id;
      return clean;
    });
  }
  if (object(input.headings))
    for (const key of defaultOrder)
      if (typeof input.headings[key] === 'string') r.headings[key] = text(input.headings[key], 150);
  const order = Array.isArray(input.order)
    ? input.order.filter((k) => defaultOrder.includes(k))
    : [];
  r.order = [...new Set([...order, ...defaultOrder])];
  r.hidden = Array.isArray(input.hidden)
    ? [...new Set(input.hidden.filter((k) => defaultOrder.includes(k)))]
    : [];
  if (templates.some((t) => t.id === input.template)) r.template = input.template;
  const style = object(input.style) ? input.style : {};
  r.style.accent =
    typeof style.accent === 'string' && /^#[\da-f]{6}$/i.test(style.accent) ? style.accent : '';
  r.style.font = ['template', 'sans', 'serif', 'mono'].includes(style.font)
    ? style.font
    : 'template';
  r.style.paper = style.paper === 'LETTER' ? 'LETTER' : 'A4';
  r.style.size = numeric(style.size, 10, 8, 13);
  r.style.spacing = numeric(style.spacing, 1.35, 1.1, 1.7);
  r.style.photo = typeof style.photo === 'boolean' ? style.photo : true;
  return r;
}
export function serializeBackup(resume) {
  return JSON.stringify(
    {
      format: 'folio-resume',
      version: 1,
      exportedAt: new Date().toISOString(),
      resume: validateResume(resume),
    },
    null,
    2,
  );
}
export function parseBackup(json) {
  if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES)
    throw new Error('Choose a Folio backup smaller than 4 MB.');
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Folio backup.');
  }
  if (data?.format !== 'folio-resume' || data.version !== 1)
    throw new Error('This backup format or version is not supported.');
  return validateResume(data.resume);
}
