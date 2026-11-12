import { config, visibleSections, escapeHtml as e } from './model.js';
export function sectionItems(r, key) {
  if (['summary', 'skills', 'languages', 'custom'].includes(key)) return [{ body: r[key] }];
  return r[key]
    .filter((x) => Object.entries(x).some(([k, v]) => !['id', 'source'].includes(k) && v))
    .map((x) => ({
      title: x.title,
      sub: [x.organization || x.issuer, x.location].filter(Boolean).join(' · '),
      date: x.dates || x.date,
      body: x.description,
      link: x.link || x.url,
      credential: x.credential,
    }));
}
export function resumeHtml(r, { miniature = false } = {}) {
  const c = config(r);
  const p = r.personal;
  const sections = visibleSections(r);
  const contact = [p.email, p.phone, p.location, p.website].filter(Boolean);
  const section = (key) =>
    `<section class="resume-section" data-section="${key}"><h3>${e(r.headings[key])}</h3>${sectionItems(
      r,
      key,
    )
      .map(
        (x) =>
          `<div class="resume-entry">${x.title || x.date ? `<div class="entry-heading"><h4>${e(x.title)}</h4>${x.date ? `<span>${e(x.date)}</span>` : ''}</div>` : ''}${x.sub ? `<div class="entry-sub">${e(x.sub)}</div>` : ''}${x.body ? `<div class="entry-body">${e(x.body)}</div>` : ''}${x.link ? `<div class="entry-link">${e(x.link)}</div>` : ''}${x.credential ? `<div class="entry-credential">${e(x.credential)}</div>` : ''}</div>`,
      )
      .join('')}</section>`;
  const asideKeys = ['skills', 'education', 'certificates', 'languages'];
  return `<article class="resume-paper layout-${c.layout} font-${c.font} ${miniature ? 'miniature' : ''}" style="--resume-accent:${c.accent};--resume-tint:${c.tint};--resume-size:${c.size}px;--resume-leading:${c.spacing}" aria-label="Resume preview">
    <header class="resume-header">${p.photo && c.photo ? `<img class="resume-photo" src="${e(p.photo)}" alt="Profile portrait">` : ''}<div class="resume-intro"><h2>${e(p.name || 'Your name')}</h2>${p.title ? `<p class="resume-role">${e(p.title)}</p>` : ''}<div class="resume-contact">${contact.map((v) => `<span>${e(v)}</span>`).join('')}</div></div></header>
    ${
      c.columns
        ? `<div class="resume-columns"><div class="resume-primary">${sections
            .filter((k) => !asideKeys.includes(k))
            .map(section)
            .join('')}</div><aside class="resume-secondary">${sections
            .filter((k) => asideKeys.includes(k))
            .map(section)
            .join('')}</aside></div>`
        : sections.map(section).join('')
    }
    ${!sections.length && !miniature ? '<div class="resume-empty">Your story starts here.<br>Add your details to see your resume take shape.</div>' : ''}
  </article>`;
}
