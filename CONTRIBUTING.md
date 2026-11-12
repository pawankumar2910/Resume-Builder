# Contributing

Use Node.js 24 or newer and run `npm ci`. Keep uploaded documents and test data fictional. Never commit real resumes, certificates, tokens, `.env` files, or downloaded personal backups.

Before proposing a change:

```sh
npm run format
npm run verify
npm audit --omit=dev --audit-level=high
```

For UI or import/export changes, also run `npm run dev` and check desktop and mobile layouts, keyboard-only navigation, reduced motion, document review, draft restoration, and both download formats. Add regression tests for concrete failure cases. Check final PDF pages rather than assuming the continuous editor preview has identical page breaks.

Keep processing local. Any external service, telemetry, authentication change, or data-sharing behavior needs an explicit product decision and updated privacy documentation. Do not introduce AI/OCR models into the deterministic parsing workflow.

The repository contains third-party components under their own licenses. The project owner should choose an application license before accepting outside contributions; public repository visibility alone is not a license grant.
