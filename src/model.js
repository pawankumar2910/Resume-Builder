export const uid = () => globalThis.crypto.randomUUID();
export const palettes = [
  { name: 'Ink', accent: '#293430', tint: '#edf0ed' },
  { name: 'Slate', accent: '#354f65', tint: '#edf1f5' },
  { name: 'Walnut', accent: '#70594b', tint: '#f3efeb' },
  { name: 'Olive', accent: '#566044', tint: '#f0f1e9' },
  { name: 'Bordeaux', accent: '#754b55', tint: '#f6eef0' },
];
const families = [
  ['essential', 'Essential', 'Minimal', 'A confident, quietly modern classic.', 'sans'],
  ['editorial', 'Editorial', 'Creative', 'Expressive typography. Considered details.', 'serif'],
  [
    'executive',
    'Executive',
    'Professional',
    'A strong introduction, with room for depth.',
    'serif',
  ],
  ['column', 'Column', 'Professional', 'A distinctive sidebar for a clear overview.', 'sans'],
  ['atelier', 'Atelier', 'Creative', 'An open composition for creative careers.', 'serif'],
  ['scholar', 'Scholar', 'Academic', 'Traditional structure for academic work.', 'serif'],
  ['compact', 'Compact', 'Minimal', 'Everything that matters, beautifully concise.', 'sans'],
  ['modern', 'Modern', 'Professional', 'An understated banner and precise hierarchy.', 'sans'],
  ['folio', 'Portfolio', 'Creative', 'Put your projects and practice first.', 'sans'],
  ['graduate', 'Graduate', 'Academic', 'A fresh start, with education at the forefront.', 'sans'],
  ['timeline', 'Timeline', 'Professional', 'Your experience, connected with intention.', 'sans'],
  ['signature', 'Signature', 'Minimal', 'A personal touch with a centered introduction.', 'serif'],
];
export const templates = families.flatMap(([layout, name, category, description, font], i) =>
  palettes.map((p, j) => ({
    id: `${layout}-${j}`,
    layout,
    name: `${name}${j ? ' ' + p.name : ''}`,
    category,
    description,
    font,
    accent: p.accent,
    tint: p.tint,
    palette: p.name,
    number: i * 5 + j + 1,
    photo: ['column', 'atelier', 'modern', 'signature'].includes(layout),
    columns: ['column', 'atelier', 'folio'].includes(layout),
  })),
);
export const defaultHeadings = {
  summary: 'Profile',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certificates: 'Courses & certifications',
  languages: 'Languages',
  custom: 'Additional information',
};
export const defaultOrder = Object.keys(defaultHeadings);
export function freshResume() {
  return {
    personal: { name: '', title: '', email: '', phone: '', location: '', website: '', photo: '' },
    summary: '',
    experience: [],
    education: [],
    projects: [],
    skills: '',
    certificates: [],
    languages: '',
    custom: '',
    headings: { ...defaultHeadings },
    order: [...defaultOrder],
    hidden: [],
    template: 'essential-0',
    style: { accent: '', font: 'template', size: 10, spacing: 1.35, paper: 'A4', photo: true },
  };
}
export function entry(type) {
  const fields = {
    experience: { title: '', organization: '', location: '', dates: '', description: '' },
    education: { title: '', organization: '', dates: '', description: '' },
    projects: { title: '', link: '', dates: '', description: '' },
    certificates: { title: '', issuer: '', date: '', credential: '', url: '', description: '' },
  };
  return { id: uid(), ...fields[type] };
}
export function sampleResume() {
  return {
    ...freshResume(),
    personal: {
      name: 'Alex Morgan',
      title: 'Product Designer',
      email: 'alex@example.com',
      phone: '+1 (415) 555-0142',
      location: 'San Francisco, CA',
      website: 'alexmorgan.design',
      photo: '',
    },
    summary:
      'Product designer shaping thoughtful digital experiences. I bring clarity to complex problems through research, systems thinking, and an eye for the details that matter.',
    experience: [
      {
        id: 'demo-e1',
        title: 'Senior Product Designer',
        organization: 'Studio North',
        location: 'San Francisco',
        dates: '2022 — Present',
        description:
          'Led the design of a collaborative workspace from concept to launch.\nBuilt a design system that connected product, engineering, and brand.\nPartnered with researchers to turn customer insights into simpler experiences.',
      },
      {
        id: 'demo-e2',
        title: 'Product Designer',
        organization: 'Forma',
        location: 'New York',
        dates: '2019 — 2022',
        description:
          'Designed intuitive tools for an independent creative community.\nImproved core journeys through prototyping and usability testing.',
      },
    ],
    education: [
      {
        id: 'demo-ed',
        title: 'BFA, Communication Design',
        organization: 'California College of the Arts',
        dates: '2015 — 2019',
        description: 'Focus on interaction design and visual communication.',
      },
    ],
    projects: [
      {
        id: 'demo-p',
        title: 'Open Library',
        link: 'openlibrary.example',
        dates: '2024',
        description: 'An accessible reading experience for a local community.',
      },
    ],
    skills:
      'Product strategy, Interaction design, Design systems, Prototyping, Figma, User research',
    certificates: [
      {
        id: 'demo-c',
        title: 'Google UX Design',
        issuer: 'Google · Coursera',
        date: '2023',
        credential: '',
        url: '',
        description: 'User research, wireframing, prototyping, and usability testing.',
      },
    ],
    languages: 'English · Native\nFrench · Conversational',
  };
}
export const getTemplate = (id) => templates.find((t) => t.id === id) || templates[0];
export function config(resume) {
  const t = getTemplate(resume.template);
  return {
    ...t,
    ...resume.style,
    accent: resume.style.accent || t.accent,
    font: resume.style.font === 'template' ? t.font : resume.style.font,
  };
}
export function hasContent(resume, key) {
  const v = resume[key];
  return Array.isArray(v)
    ? v.some((x) => Object.entries(x).some(([k, v]) => k !== 'id' && k !== 'source' && v))
    : Boolean(v?.trim());
}
export function visibleSections(resume) {
  return resume.order.filter((k) => !resume.hidden.includes(k) && hasContent(resume, k));
}
export function chooseTemplate(resume, id) {
  resume.template = id;
  resume.style.accent = '';
  resume.style.font = 'template';
  const layout = getTemplate(id).layout;
  if (layout === 'graduate')
    resume.order = [
      'summary',
      'education',
      'projects',
      'skills',
      'experience',
      'certificates',
      'languages',
      'custom',
    ];
  else if (layout === 'folio')
    resume.order = [
      'summary',
      'projects',
      'experience',
      'education',
      'skills',
      'certificates',
      'languages',
      'custom',
    ];
}
export function certificateKey(c) {
  return [c.title, c.issuer, c.credential]
    .map((v) => (v || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
    .join('|');
}
export const escapeHtml = (v = '') =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
