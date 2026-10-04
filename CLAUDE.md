# groundstate-web — agent notes

The public website for groundstatemethod.com. Read `README.md`, `SECURITY.md`
and `docs/PUBLICATION_CONTRACT.md` before changing anything that touches
publications.

## Hard rules

- **This repository never renders, writes or edits research.** Articles arrive as
  signed bundles in `publications/` and are served byte for byte. Never add a
  renderer for research content, never read GSER or any backend artifact, never
  touch an existing bundle. Never create a bundle outside `tests/` fixtures.
- **Fixtures are labelled.** Test bundles carry the `GS-FIXTURE` marker, which the
  production gate refuses. Never weaken that refusal, never commit a private key.
- **The gate is fail-closed.** Do not relax `lib/publications/verify.ts`,
  `scripts/check-publication-diff.ts`, the workflows, `CODEOWNERS` or
  `.github/publication-signers` without the owner's explicit approval.
- **No internal identifiers in public presentation**: no GSER, GS-TER or job ids,
  hashes, paths or workflow states. `check:content` enforces it for site copy.
- **Code changes go through pull requests**, reviewed by the owner. Never push to
  `main`.

## Brand

Anything under the Ground State name follows the Ground State brand manual,
which lives in the private backend repository (`AI-System`,
`.claude/skills/ground-state-brand-manual/`). If it is not loaded, stop and ask
rather than guess. In short: never redraw or re-typeset the mark (use the files
pinned in `brand-assets.lock.json`); never write "science-based",
"evidence-based" or "backed by science"; the category line is *Human
performance, traced to the evidence*. Brand authority is Jakub; a passing test
suite is not brand approval.

## Before you push

```bash
npm run typecheck && npm test && npm run check:content && npm run build:cf && npm run test:e2e
```
