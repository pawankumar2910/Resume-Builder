# Folio — Resume Studio

A local-first resume builder with a calm, Apple-inspired interface. No AI models, external parsing APIs, accounts, or backend are required by the application. Hosting only serves the static app and bundled fonts and libraries.

## Run locally

Requires Node.js 24 or later. Dependencies are pinned through `package-lock.json`.

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
- Portable `.folio.json` backups with schema-validated restore. Cross-tab conflict detection prevents silent overwrites.
- Cancellable background document reading with a timeout, format checks, and Word archive expansion limits.
- Responsive layouts, keyboard navigation, reduced-motion support, accessible input labels, and native modal focus management.
- Keyboard-operated editor tabs, route focus management, clear save states, and increased secondary-text contrast.

## Accuracy and format boundaries

Extraction is deterministic, not general document understanding. It recognizes labelled facts and a small set of completion phrases; ambiguous or missing fields are left for review. It does not authenticate certificates, infer proficiency, invent missing qualifications, or extract every arbitrary layout perfectly. Matching a provider name is only a suggestion and is marked as such.

PDFs must contain selectable text. Scanned PDFs and images require manual transcription because this project deliberately does not include OCR/AI models. Limits: 15 MB per certificate, 75 PDF pages, 200,000 extracted characters, 20 files and 75 MB per batch, and 45 seconds per file. Word archives are checked against a 40 MB declared expanded-size limit before parsing. Photos: 8 MB, locally center-cropped and resized.

The editor is a continuous composition preview. The PDF renderer adapts the template to print and handles final page breaks; use Preview PDF to inspect the exact exported pages. Word uses editable native text/tables and may reflow with installed fonts. Bundled print fonts primarily support Latin-script content; inspect PDF output for other scripts and use Word with an appropriate local font when needed. Multi-column PDFs may be read differently by different resume-screening tools; use a one-column layout when reading order matters.

## Verification

```sh
npm run verify
npm audit --omit=dev --audit-level=high
node tests/create-fixtures.mjs
```

Tests cover evidence extraction, missing/ambiguous data, duplicate certificates, HTML escaping, all template renderers, PDF pagination and searchable text, DOCX content retention, backup round trips and validation, hostile file inputs, Word archive limits, and static-server behavior. Fictional fixtures are created under ignored `test-output/` and never deployed.

`npm run verify` checks formatting, runs the regression suite, builds the application, and verifies required assets, deployment policy consistency, and a 160 KiB gzip budget for initial/shared JavaScript and CSS. The initial interface does not load the large PDF and Word engines until needed. GitHub Actions runs the checks on Linux and Windows after you push. Dependabot is configured for package and action updates.

These are engineering safeguards, not a claim of formal security or WCAG certification. Check your target browsers, screen readers, real document layouts, and hosting settings before a broad launch. Current embedded PDF fonts primarily cover Latin-script text; unrestricted multilingual typography is not claimed.

## GitHub and deployment

See [PUSH_TO_GITHUB.md](PUSH_TO_GITHUB.md) for the repository description, commit message, and push commands. GitHub publication is performed by the project owner.

Publish `dist/` at a domain root on a static host after `npm run build`. The app needs no environment secrets or processing backend. `_headers` is provided for compatible hosts, and a Content Security Policy is also included in the HTML. Apply equivalent response headers if your host ignores `_headers`. The local server is a development preview, not a public production server. GitHub Pages project-subdirectory hosting needs asset-base configuration before use.

### Netlify

Connect the repository and deploy branch `main`. The root `netlify.toml` configures Node.js 24, the build command `npm run build && npm run check:build`, and publish directory `dist`. Leave the base directory and package directory unset when this repository's `package.json` is at the root.

If a deployment shows only “Skip to content”, check `/assets/main.js` and `/assets/main.css`: missing files mean the source folder was published instead of the compiled app. Push the Netlify configuration and trigger a new deploy. The build check fails deployment if required assets are missing.

For a manual deploy, run `npm ci`, `npm run build`, and `npm run check:build`, then upload only the generated `dist` folder. Uploading the source repository does not run its build.

Read [SECURITY.md](SECURITY.md) for the privacy model and boundaries, and [CONTRIBUTING.md](CONTRIBUTING.md) for change and verification guidance.

## Source map

- `src/main.js`: application state, navigation, forms, review workflow, local storage.
- `src/model.js`: template catalog and resume data.
- `src/rules.js`: auditable deterministic extraction rules and skill dictionary.
- `src/parser.js`: local file readers and limits.
- `src/parse-worker.js`: cancellable background extraction entrypoint.
- `src/file-safety.js`: format and archive-size validation.
- `src/draft.js`: allowlisted draft/backup schema.
- `src/resume.js`: continuous preview composition.
- `src/export.js`: PDF and Word generation.
- `src/styles.css`: interface and resume layouts.
- `server.mjs`: local static server with security headers.
- `.github/workflows/ci.yml`: reproducible build and test checks.

Accessibility interaction work follows the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/); file validation is informed by [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

The Apple design skill from https://github.com/emilkowalski/skills guided spacing, typography, feedback, and restrained motion. No Apple branding or proprietary assets are used.
