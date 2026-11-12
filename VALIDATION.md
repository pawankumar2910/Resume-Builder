# Release verification — 12 November 2026

## Completed locally

- `npm run verify` passed: formatting, 18 regression tests, production build, required-asset checks, and policy/bundle-budget checks.
- `npm audit --omit=dev --audit-level=high` reported zero known vulnerabilities at verification time.
- Initial/shared JavaScript and CSS: approximately 32.1 KiB gzipped. The separate PDF and Word engines load on demand.
- Browser checks: PDF and DOCX certificate extraction in background workers; source facts and duplicate prevention; keyboard navigation between editor tabs; backup download and restore; PDF rendering under the Content Security Policy; mobile controls and desktop composition.
- Two-tab check: an edit in another tab raised a conflict, retained the local preview, and loaded the selected version only after the explicit action.
- Export regression tests cover long-document pagination, searchable PDF text, every layout family, font changes, and Word content retention.

## Remaining release checks

- GitHub Actions has been configured but cannot run until the owner creates the repository and pushes the code. Linux runner verification is therefore pending; local checks ran on Windows with Node.js 24.
- This is not a formal WCAG audit, penetration test, certificate-verification service, or guarantee of perfect extraction from arbitrary documents.
- Full non-Latin PDF typography and OCR are outside the current implementation. Review real-world documents and final exported pages before use.
- Before a public launch, verify the selected host applies the supplied response headers and test the supported browser/screen-reader combinations for the intended audience.

All test documents use fictional example content. Personal resume data and generated test artifacts are excluded from version control and deployment.
