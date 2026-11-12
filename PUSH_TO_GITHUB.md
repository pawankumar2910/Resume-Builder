# Push this project to GitHub

The project is committed locally. GitHub publication is left to you, as requested.

## Repository description

Copy this into GitHub's **Description** field:

> A privacy-first resume builder with 60 customizable templates, local certificate parsing, a live editor, and PDF/DOCX exports. No AI models or external processing APIs.

Suggested topics: `resume-builder`, `javascript`, `privacy-first`, `local-first`, `pdf`, `docx`, `portfolio`, `static-site`.

## Commit message

The prepared release uses:

```text
Harden Folio resume studio and prepare GitHub quality checks
```

For the release description:

> Folio combines an Apple-inspired interface with 60 editable resume presets, photo support, deterministic certificate extraction, source-backed review, and PDF/Word exports. This update adds portable backups, safer draft restoration, cross-tab conflict detection, cancellable background parsing, file validation, keyboard navigation, content security policies, and automated Windows/Linux verification.

## Push commands

1. Sign in as `pawankumar2910` and create a **public** repository named `folio-resume-studio` at https://github.com/new.
2. Leave **README**, **.gitignore**, and **license** initialization disabled so the repository is empty.
3. In PowerShell, run:

```powershell
Set-Location 'C:\Users\pavan\OneDrive\Documents\RESUME BUILDER\folio'
git remote -v
git push -u origin main
```

The intended origin is `https://github.com/pawankumar2910/folio-resume-studio.git`. Authenticate through Git Credential Manager if Git prompts you. Do not put a password or token into the remote URL.

If this is a separate clone without an origin, add it once:

```powershell
git remote add origin https://github.com/pawankumar2910/folio-resume-studio.git
```

The GitHub Actions workflow runs formatting, regression tests, production build verification, and a dependency audit on Windows and Linux. Its first remote run will happen after your push. The workflow builds a static artifact; it does not publish the site or require any deployment secrets.

For ordinary static hosting, publish the `dist/` output at the domain root after `npm ci` and `npm run build`. The existing `.openai/hosting.json` belongs to the separately hosted Sites version and is not a GitHub credential. Preserve it when editing that Site; ordinary static hosts do not need it. A GitHub Pages project subdirectory is not configured—use a root domain or configure asset base paths first.
