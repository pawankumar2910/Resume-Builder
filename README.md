# Folio — Resume Studio

A local-first resume builder with a calm, Apple-inspired interface. No AI models, external parsing APIs, accounts, or backend are required by the application. Hosting only serves the static app and bundled fonts and libraries.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4173. Rebuild and reload after editing source files.

## Features

- Landing page → 60 template presets → personal details → certificate review → live editor → PDF or DOCX.
- 12 layout families × 5 muted palettes. All presets support a photo; selected presets feature photo-friendly compositions.
- Editable names, contact details, headings, summary, experience, education, projects, skills, certifications, languages, and additional information.
- Add, remove, reorder, and hide sections or entries. Change fonts, color, text size, spacing, paper size, and photo visibility. Session undo.
- Browser-local PDF.js text extraction, Mammoth DOCX extraction, and plain-text parsing.
- Rule-based course/specialization, issuer, recipient, date, credential, link, and skill suggestions with source evidence. Explicit review, optional skill inclusion, and duplicate checking.
- Multiple certificates per session, manual entries, editable transcriptions, and additional courses from the same document.
- Searchable, multipage PDF generation with embedded fonts; final PDF page rendering; editable DOCX export.
- Local draft persistence. Source documents are kept in memory only. A reset action clears the saved draft; undo remains in memory until the tab closes.
- Responsive layouts, keyboard navigation, reduced-motion support, accessible input labels, and native modal focus management.

## Accuracy and format boundaries

Extraction is deterministic, not general document understanding. It recognizes labelled facts and a small set of completion phrases; ambiguous or missing fields are left for review. It does not authenticate certificates, infer proficiency, invent missing qualifications, or extract every arbitrary layout perfectly. Matching a provider name is only a suggestion and is marked as such.

PDFs must contain selectable text. Scanned PDFs and images require manual transcription because this project deliberately does not include OCR/AI models. Limits: 15 MB per certificate, 75 PDF pages, 200,000 extracted characters, 20 files per batch. Photos: 8 MB, locally center-cropped and resized.

The editor is a continuous composition preview. The PDF renderer adapts the template to print and handles final page breaks; use Preview PDF to inspect the exact exported pages. Word uses editable native text/tables and may reflow with installed fonts. Bundled print fonts primarily support Latin-script content; inspect PDF output for other scripts and use Word with an appropriate local font when needed. Multi-column PDFs may be read differently by different resume-screening tools; use a one-column layout when reading order matters.

## Verification

```sh
npm test
npm audit
node tests/create-fixtures.mjs
```

Tests cover evidence extraction, missing/ambiguous data, duplicate certificates, HTML escaping, all template renderers, PDF pagination and searchable text, and DOCX content retention. Fictional fixtures are created under ignored `test-output/` and never deployed.

## Source map

- `src/main.js`: application state, navigation, forms, review workflow, local storage.
- `src/model.js`: template catalog and resume data.
- `src/rules.js`: auditable deterministic extraction rules and skill dictionary.
- `src/parser.js`: local file readers and limits.
- `src/resume.js`: continuous preview composition.
- `src/export.js`: PDF and Word generation.
- `src/styles.css`: interface and resume layouts.

The Apple design skill from https://github.com/emilkowalski/skills guided spacing, typography, feedback, and restrained motion. No Apple branding or proprietary assets are used.
