# Security model

groundstatemethod.com is a static site. This repository holds its source and
the signed publication bundles it serves. It is public on purpose: nothing in
it is secret, and on GitHub Free a public repository is what allows `main` to
be protected.

## Publishing: what actually stops an unauthorized change

The publisher (the `groundstate-publisher` GitHub App, used by the backend on
the Mac Mini) holds **Contents: write** and **Pull requests: write** on this one
repository. **A credential with Contents: write can technically create any
change in the repository.** The App's permissions alone do not stop it from
writing website code.

What stops an unauthorized change reaching the live site is the combination:

| Layer | What it enforces |
|---|---|
| Repository-scoped identity | The App is installed on this repository only. It has no access to the backend repository, no administration and no workflow permission. |
| No bypass | The App is on no ruleset bypass list and has no admin role. It cannot push to `main`, force-push, or merge without the required checks. |
| Protected `main` | Pull request required; force pushes and deletions blocked; required checks `publication-gate` and `build`. |
| Gate runs from the base | `publication-gate` checks out the PR's **base** commit and runs that code, with that pinned key; the PR's head is only fetched and read as data. A PR cannot weaken the gate by editing its scripts or bring its own trusted key. The workflow file comes from the PR, but the App has no Workflows permission and cannot change it. |
| Path allowlist | `publication-gate` refuses any PR from the publisher, or on a `publish/` branch, that does anything but **add** files under one `publications/<id>/`, and refuses any change to an existing bundle from anyone. |
| Code-owner review (defense in depth) | Every path except new bundles is owned by the site owner. Verified 4 Oct 2026: GitHub does **not** require it on a PR the owner authors (a README change by the owner showed "Ready to merge"). Whether it binds a PR authored by the App is not verified, so nothing above depends on it. |
| Signature | Every bundle's manifest must verify against the one pinned Ed25519 key (`.github/publication-signers`, namespace `ground-state.web-publication.v1`). The private key exists only on the Mac Mini. |
| Hash chain | Manifest self-hash, file sizes and SHA-256, and `approved_article_sha256` must agree; one changed byte fails. |
| Second gate at deploy | The Cloudflare build re-runs the full verification and the byte-exact export, so an invalid bundle cannot deploy even if it reached `main`. |
| Live reconciliation | The publisher marks a publication `PUBLISHED` only after hashing the bytes actually served. |

Remove any one layer and the others still hold most of it. Remove the protected
`main`, put the App on a bypass list, or give it the Workflows permission, and a
stolen publisher key plus the App credential could change website code. Keep all
three as they are.

## Human overrides

The site owner can bypass the `main` ruleset for pull requests (mode "for pull
requests only": never a direct push). That is how a sole maintainer merges their
own code PRs, which no one else can approve. A bypass merge skips the required
checks; it is the owner's deliberate act and is recorded on the PR.

## Boundaries

- **Nothing on the website connects back to the Mac Mini.** The publisher pushes;
  the site never pulls, polls or calls it.
- **Cloudflare can read this repository and nothing else.** It must never be given
  access to the backend repository.
- **No secrets** in this repository, its builds or its workflows. Workflows run
  with a read-only token and `persist-credentials: false`.
- **Articles cannot run code.** They carry no script by contract, and the route's
  Content-Security-Policy forbids scripts, external loads and framing anyway.
- **Edge rewriting is off for article routes** (Email Address Obfuscation, Rocket
  Loader, Automatic HTTPS Rewrites, Web Analytics auto-injection, Zaraz,
  Cloudflare Fonts) so the served bytes stay the signed bytes. The live hash
  check catches it if one is turned back on.

## Known gaps (v1)

- The signature authenticates the publisher machine, not the human approver.
  Approval identity on the backend is procedural, not cryptographic.
- Workflow actions are referenced by major version (`actions/checkout@v4`), not
  pinned to a commit SHA.
- A withdrawal returns the site's 404, not a withdrawal notice.

## Reporting

Use the contact form on groundstatemethod.com once it is open.
