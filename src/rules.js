// Deterministic, evidence-first extraction. No network or learned model.
const skills = [
  ['JavaScript', /\bjavascript\b/i],
  ['TypeScript', /\btypescript\b/i],
  ['Python', /\bpython\b/i],
  ['Java', /\bjava\b/i],
  ['React', /\breact(?:\.js|js)?\b/i],
  ['Node.js', /\bnode(?:\.js|js)\b/i],
  ['SQL', /\bsql\b/i],
  ['HTML', /\bhtml5?\b/i],
  ['CSS', /\bcss3?\b/i],
  ['Microsoft Excel', /\b(?:microsoft\s+)?excel\b/i],
  ['Power BI', /\bpower\s*bi\b/i],
  ['Tableau', /\btableau\b/i],
  ['Data analysis', /\bdata analys(?:is|t|tics)\b/i],
  ['Data science', /\bdata scien(?:ce|tist)\b/i],
  ['Machine learning', /\bmachine learning\b/i],
  ['AWS', /\b(?:aws|amazon web services)\b/i],
  ['Azure', /\bazure\b/i],
  ['Google Cloud', /\bgoogle cloud\b/i],
  ['Docker', /\bdocker\b/i],
  ['Kubernetes', /\bkubernetes\b/i],
  ['Git', /\bgit\b/i],
  ['Figma', /\bfigma\b/i],
  ['UX design', /\b(?:ux design|user experience design)\b/i],
  ['User research', /\buser research\b/i],
  ['Project management', /\bproject management\b/i],
  ['Agile', /\bagile\b/i],
  ['Scrum', /\bscrum\b/i],
  ['Digital marketing', /\bdigital marketing\b/i],
  ['SEO', /\b(?:seo|search engine optimization)\b/i],
  ['Cybersecurity', /\bcyber\s?security\b/i],
  ['C++', /(?<!\w)c\+\+(?!\w)/i],
  ['C#', /(?<!\w)c#(?!\w)/i],
  ['R programming', /\br programming\b/i],
];
const labelPatterns = {
  title:
    /^(?:course(?:\s+(?:name|title))?|speciali[sz]ation(?:\s+(?:name|title))?|certification(?:\s+(?:name|title))?|program(?:me)?(?:\s+(?:name|title))?|title)\s*[:：–—]\s*(.+)$/i,
  issuer:
    /^(?:issued by|issuer|awarded by|institution|provided by|organization|university)\s*[:：–—]\s*(.+)$/i,
  date: /^(?:completion date|date of completion|issued on|issue date|date|completed on)\s*[:：–—]\s*(.+)$/i,
  credential:
    /^(?:credential(?:\s+(?:id|number))?|certificate\s+(?:id|number|no\.?)|verification\s+(?:id|code))\s*[:：–—]\s*(.+)$/i,
  recipient: /^(?:awarded to|presented to|recipient|student|learner|name)\s*[:：–—]\s*(.+)$/i,
};
export function analyzeText(raw, fileName = '') {
  const text = String(raw || '')
    .replace(/\r/g, '')
    .replace(/[\t\u00a0]+/g, ' ')
    .normalize('NFKC');
  const lines = text
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const fields = { title: '', issuer: '', date: '', credential: '', url: '', recipient: '' };
  const evidence = {};
  const set = (field, value, source, method = 'label') => {
    if (!fields[field] && value?.trim()) {
      fields[field] = value.trim();
      evidence[field] = { text: source, method };
    }
  };
  for (let i = 0; i < lines.length; i++) {
    for (const [field, pattern] of Object.entries(labelPatterns)) {
      const match = lines[i].match(pattern);
      if (match) set(field, match[1], lines[i]);
    }
    const standalone = lines[i].match(
      /^(Course(?: name| title)?|Speciali[sz]ation|Issued by|Completion date|Credential ID|Awarded to)\s*:?$/i,
    );
    if (standalone && lines[i + 1]) {
      const key = /course|special/i.test(standalone[1])
        ? 'title'
        : /issued/i.test(standalone[1])
          ? 'issuer'
          : /date/i.test(standalone[1])
            ? 'date'
            : /credential/i.test(standalone[1])
              ? 'credential'
              : 'recipient';
      set(key, lines[i + 1], lines.slice(i, i + 2).join('\n'));
    }
    const completed = lines[i].match(
      /(?:successfully\s+)?completed\s+(?:the\s+)?(?:course|speciali[sz]ation|program(?:me)?)\s*[:：–—]?\s+(.+)$/i,
    );
    if (completed) set('title', completed[1], lines[i], 'phrase');
    if (
      /(?:successfully completed|has completed|completion of)\s*$/i.test(lines[i]) &&
      lines[i + 1] &&
      !/^(the|a|an)\s*$/i.test(lines[i + 1])
    )
      set('title', lines[i + 1], lines.slice(i, i + 2).join('\n'), 'phrase');
  }
  // Provider matches are suggestions, since a platform logo can differ from the issuing institution.
  if (!fields.issuer) {
    const provider = lines.find((l) =>
      /\b(?:coursera|udemy|edx|nptel|linkedin learning|freecodecamp|microsoft|google|amazon web services|ibm|cisco)\b/i.test(
        l,
      ),
    );
    const match = provider?.match(
      /\b(coursera|udemy|edx|nptel|linkedin learning|freecodecamp|microsoft|google|amazon web services|ibm|cisco)\b/i,
    );
    if (match) set('issuer', match[0], provider, 'provider mention');
  }
  const url = text.match(/https?:\/\/[^\s<>"\]]+/i);
  if (url) set('url', url[0].replace(/[.,;)]*$/, ''), url[0], 'link');
  const foundSkills = skills
    .filter(([, pattern]) => pattern.test(text))
    .map(([name, pattern]) => ({
      name,
      evidence: lines.find((l) => pattern.test(l)) || '',
      selected: false,
    }));
  return {
    ...fields,
    evidence,
    skills: foundSkills,
    raw: text,
    fileName,
    description: '',
    titleCount: lines.filter((l) => labelPatterns.title.test(l)).length,
    status: text.trim().length < 30 ? 'manual' : 'review',
  };
}
