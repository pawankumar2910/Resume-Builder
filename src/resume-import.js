import { freshResume, entry } from './model.js';
import { validateResume } from './draft.js';

const sections = {
  summary: /^(profile|summary|professional summary|career objective|objective|about me)$/i,
  experience:
    /^(experience|work experience|professional experience|employment|employment history|internships)$/i,
  education: /^(education|academic background|academic qualifications|qualifications)$/i,
  projects: /^(projects|personal projects|selected projects|academic projects)$/i,
  skills: /^(skills|technical skills|core competencies|key skills|technologies)$/i,
  certificates:
    /^(certifications?|certificates?|courses|training|licenses? and certifications?|courses & certifications)$/i,
  languages: /^(languages|language proficiency)$/i,
};
const compactHeadings = {
  summary: ['profile', 'summary', 'professionalsummary', 'objective'],
  experience: ['experience', 'workexperience', 'professionalexperience'],
  education: ['education', 'academicbackground'],
  projects: ['projects', 'selectedprojects'],
  skills: ['skills', 'technicalskills'],
  certificates: ['certifications', 'certificates', 'courses&certifications'],
  languages: ['languages'],
};
const label = (s) => s.replace(/[:：]\s*$/, '').trim();

// Conservative extraction: retain all unmatched lines; never invent employers or dates.
export function importResumeText(raw) {
  if (typeof raw !== 'string' || raw.length > 200000)
    throw new Error('Use a resume with fewer than 200,000 characters.');
  if (!raw.trim())
    throw new Error(
      'No selectable text was found. Paste a transcription, or use PDF layout editing.',
    );
  const r = freshResume();
  const evidence = [];
  const blocks = {};
  const header = [];
  let section = '';
  for (const original of raw.replace(/\r/g, '').split('\n')) {
    const line = original.trim();
    const found = Object.keys(sections).find(
      (key) =>
        sections[key].test(label(line)) ||
        compactHeadings[key].includes(label(line).toLowerCase().replace(/\s/g, '')),
    );
    if (found) {
      section = found;
      r.headings[found] = sections[found].test(label(line)) ? label(line) : r.headings[found];
      blocks[found] ||= [];
    } else if (section) blocks[section].push(line);
    else header.push(line);
  }
  const capture = (key, value, source) => {
    if (!value || r.personal[key]) return;
    r.personal[key] = value;
    evidence.push({ field: key, source });
  };
  const unused = [];
  for (const line of header.filter(Boolean)) {
    let rest = line;
    const email = rest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    if (email && !r.personal.email) {
      capture('email', email, line);
      rest = rest.replace(email, '').replace(/e-?mail\s*:/i, '');
    }
    const phone = rest.match(/\+?\d[\d ().-]{7,22}\d/)?.[0];
    if (
      phone &&
      !r.personal.phone &&
      phone.replace(/\D/g, '').length >= 10 &&
      phone.replace(/\D/g, '').length <= 15
    ) {
      capture('phone', phone, line);
      rest = rest.replace(phone, '').replace(/(?:phone|mobile|tel)\s*:/i, '');
    }
    const website = rest.match(
      /(?:https?:\/\/|www\.|linkedin\.com\/|github\.com\/|[a-z0-9-]+\.(?:com|org|net|design|dev|io|me|in|co)\b)[^\s|<>]*/i,
    )?.[0];
    if (website && !r.personal.website) {
      capture('website', website, line);
      rest = rest.replace(website, '').replace(/(?:website|portfolio|linkedin)\s*:/i, '');
    }
    rest = rest.replace(/^[\s|·,;]+|[\s|·,;]+$/g, '');
    const explicit = rest.match(/^(?:full )?(name|title|location)\s*[:：]\s*(.+)$/i);
    if (explicit && !r.personal[explicit[1].toLowerCase()])
      capture(explicit[1].toLowerCase(), explicit[2], line);
    else if (rest && !/^(resume|curriculum vitae|cv)$/i.test(rest)) unused.push(rest);
  }
  // Only propose a name from a short, letter-only first header line.
  if (
    !r.personal.name &&
    unused[0] &&
    /^[\p{L}\p{M}.'’ -]{2,80}$/u.test(unused[0]) &&
    unused[0].split(/\s+/).length <= 6
  ) {
    capture('name', unused.shift(), header.find(Boolean));
  }
  if (!r.personal.title) {
    const index = unused.findIndex(
      (line) =>
        line.length < 120 &&
        /\b(designer|engineer|developer|manager|analyst|consultant|architect|specialist|scientist|student|director|intern|accountant|writer|researcher|nurse|teacher)\b/i.test(
          line,
        ),
    );
    if (index >= 0) capture('title', unused.splice(index, 1)[0], header.join('\n'));
  }
  for (const [key, lines] of Object.entries(blocks)) {
    const value = lines.join('\n').trim();
    if (!value) continue;
    if (['summary', 'skills', 'languages'].includes(key)) r[key] = value;
    else {
      // Blank paragraphs delimit entries. Ambiguous groups stay together for review.
      let groups = value.split(/\n\s*\n/).filter(Boolean);
      // Word exports often put a blank line after every paragraph, not every job.
      if (groups.some((group) => !group.includes('\n'))) groups = [groups.join('\n')];
      const datedTitle =
        /^(.{3,}?)\s+(?:[|·]\s*)?((?:19|20)\d{2}\s*[–—-]\s*(?:(?:19|20)\d{2}|present|current))$/i;
      if (groups.length === 1) {
        const split = [];
        for (const line of groups[0].split('\n')) {
          if (datedTitle.test(line) || !split.length) split.push(line);
          else split[split.length - 1] += '\n' + line;
        }
        groups = split;
      }
      r[key] = groups.map((group) => {
        const [title, ...body] = group.split('\n');
        const dated = title.match(datedTitle);
        return {
          ...entry(key),
          title: dated ? dated[1] : title,
          ...(dated ? { [key === 'certificates' ? 'date' : 'dates']: dated[2] } : {}),
          description: body.join('\n'),
        };
      });
    }
  }
  r.custom = unused.join('\n');
  if (r.custom) r.headings.custom = 'Imported text to review';
  return {
    resume: validateResume(r),
    evidence,
    raw,
    notices: [
      'Review every section before downloading. Contact details and headings are matched by rules.',
      'Employers, dates, and roles are kept together when their structure is unclear. Split entries in the editor.',
      ...(r.custom ? ['Unclassified header text is saved under “Imported text to review”.'] : []),
    ],
  };
}
