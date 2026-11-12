# Security and privacy

Folio is a static, browser-local application. It has no application accounts, server-side document storage, analytics, AI calls, or document-processing APIs. The hosting provider may enforce its own sign-in gate and log page requests.

## Implemented controls

- Text-only document extraction. File extensions and signatures are checked; Word archives are inspected before decompression for excessive expanded sizes and unsupported formats.
- Parsing in a dedicated worker with a 45-second timeout and cancellation. PDF limits are 75 pages and 200,000 extracted characters. Uploaded certificates are limited to 15 MB each and 75 MB per batch.
- Imported backups and restored drafts use an allowlisted schema. External image URLs, executable image formats, unknown keys, invalid styles, and oversized fields are rejected or replaced with safe defaults.
- Resume text is escaped before HTML rendering. Certificate suggestions require review before insertion. Raw document content is never interpreted as instructions or HTML.
- A Content Security Policy restricts scripts, workers, connections, fonts, and images to local resources. Inline styles remain enabled for live template customization. WebAssembly is allowed for the local PDF library; JavaScript `unsafe-eval` is not allowed.
- The local server sends `nosniff`, a no-referrer policy, and permissions restrictions. `_headers` includes the same settings for hosts that support that format; the HTML also carries the document policy.
- Pinned CI action revisions, a committed npm lockfile, dependency alerts, and test/build checks.

## Boundaries

Local storage is not encrypted. Anyone using the same browser profile can access its draft. Backups include personal details and the photo; keep them private. Original documents stay in tab memory and are lost when the page reloads. Saving in one tab detects conflicting changes from another tab rather than silently overwriting them.

File validation and resource limits reduce risk but do not make the browser a malware scanner. Archive declarations can be dishonest; worker timeouts and browser memory limits are additional containment layers, not an absolute memory guarantee. Use current browsers and dependencies. Folio does not verify certificate authenticity or guarantee the accuracy of extracted facts.

## Reporting a vulnerability

Use GitHub's private vulnerability-reporting option if the repository owner has enabled it. Otherwise, contact the repository owner through their GitHub profile to arrange a private report. Do not attach real resumes, certificates, credentials, or exploit payloads to public issues. Provide a minimal synthetic reproduction, affected version, and expected behavior.
