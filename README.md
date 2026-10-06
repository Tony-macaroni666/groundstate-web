# groundstatemethod.com

The Ground State website: Next.js 15 (App Router) as a static export,
TypeScript strict, Tailwind, served by Cloudflare Workers Static Assets. No CMS,
no database. The only server code is the contact route (`worker/`).

**This repository renders no research.** Research articles arrive as signed,
human-approved publication bundles (`publications/`), produced by the Ground
State publication backend, and are served byte for byte. The site lists them
from their manifests and writes none of their text. How a bundle gets here and
what it must contain: [`docs/PUBLICATION_CONTRACT.md`](docs/PUBLICATION_CONTRACT.md).
What stops an unauthorized change: [`SECURITY.md`](SECURITY.md). One-time setup:
[`docs/SETUP.md`](docs/SETUP.md).

**Launch state: nothing is published.** Research and Journal are empty and say
so. Nothing is filled with demonstration content.

## Run it

```bash
npm install
npm run dev                    # http://localhost:3000
npm run typecheck
npm test                       # unit tests (contract, signatures, gate, export, brand files)
npm run test:e2e               # the real build with a signed FIXTURE bundle, in a temp copy
npm run verify:publications    # the publication gate over publications/
npm run check:content          # site copy: placeholders, banned labels, internal identifiers
npm run build:cf               # what Cloudflare runs on main; elsewhere a noindex preview
```

Node 22 (`.node-version`, which the Cloudflare build image also reads).

## What is where

```
publications/                 signed bundles — added only by publication PRs, never edited
schemas/                      ground-state.web-publication.v1 JSON schema (the contract)
lib/publications/             the gate: contract, canonical hash, SSH signatures, verification
scripts/
  build-cf.mjs                the Cloudflare build: gate → content check → next build → export
  verify-publications.ts      required check "publication-gate" (whole tree)
  check-publication-diff.ts   required check "publication-gate" (which paths a PR may change)
  export-publications.ts      copies each article into ./out byte for byte; _publications.json
  check-content.ts  preflight.mjs
.github/
  workflows/                  publication-gate.yml, build.yml — the required checks
  CODEOWNERS                  everything owner-reviewed except new bundles
  publication-signers         the one pinned publisher key
worker/                       the only server code: POST /api/contact (Turnstile → one email)
app/  components/  content/   the site; listing, home and sitemap read lib/publications only
brand-assets.lock.json        canonical brand files, pinned to the brand registry hashes
site.config.ts                origin, contact routing, nav, OG image
```

## Articles

- `/research/<slug>` is `publications/<id>/article.html`, copied unchanged. The
  build reads the copy back and fails on any byte difference. Headers (CSP, cache)
  protect it; nothing rewrites it.
- An article is a standalone Ground State evidence surface, not a page of this
  app: no site navigation is wrapped around it, and listing cards link to it with
  a plain `<a>`.
- Listings, the home page and the sitemap show only the manifest's `listing`
  block: title, dek, domain, evidence status, date.
- A newer bundle supersedes an older one on the same route; a withdrawal removes
  the route (404). Published bundles are never edited.

## Environment

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production origin. Set only by `scripts/build-cf.mjs` on `main` once the domain is attached (`PRODUCTION_ORIGIN`). Unset: no canonical tags, empty sitemap, `robots.txt` disallows everything, every page `noindex`. |

## Contact

Form only — no published address, no `mailto:`. The form posts to
`/api/contact` (`worker/contact.ts`, the only server code), which checks a
Cloudflare Turnstile token and sends one email through Email Routing. The
recipient is a Worker secret and never appears here. Until the channel is set up
(`docs/SETUP.md` §7) the page shows no form and says no channel is open.

## Journal

A Journal entry is a weekly synthesis across approved records and carries no
evidence verdict (`content/journal.ts`). Internal record identifiers are never
shown publicly, so an entry page states how many records it derives from and
names none. How a Journal entry should arrive — and link the published articles
it reads — is an open decision; until then Journal stays empty.

## Content states

Every content-driven page renders intentionally at zero, one and many. Next
cannot export a dynamic route with no paths, so the Journal entry template is
`page.journal.tsx` and becomes a route only when there is an entry
(`next.config.mjs`). Articles are not Next routes at all.

## Brand

Brand authority lives outside this repository (the Ground State brand manual).
What this site holds to:

- Logo and lockup files are canonical copies, pinned by hash in
  `brand-assets.lock.json` and checked by the tests. Never redraw or edit one.
- Never "science-based", "evidence-based" or "backed by science" — `check:content`
  fails the build. The category line is *Human performance, traced to the evidence.*
- Evidence status is encoded by form, not a traffic light; forest only on
  Supported; every badge carries its definition in its `aria-label`.
- Contrast follows `BRAND.md` §2 (divergence from frozen Website V3 approved
  17 September 2026): Gray `#7C837E` only for type ≥ 24 px and non-text.
- No photography. Whitespace, rules, type, one flat diagram.
