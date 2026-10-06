# Publication contract — `ground-state.web-publication.v1`

How a human-approved Ground State publication reaches groundstatemethod.com.
Written for the backend publication exporter and publisher (on the Mac Mini, in
the private backend repository) and for anyone changing this website.

**The website never decides whether something is approved.** It accepts a
bundle that is signed by the pinned publisher key and passes every check below,
and it serves the article bytes exactly as signed. It never renders, edits or
wraps an article.

## Lifecycle (backend)

```
VISUAL_APPROVED (publication-profile render)
  → PUBLICATION_AUTHORIZED     human authorization, bound to the exact article hash
  → PUBLISHING                 bundle exported, signed, pushed, PR opened
  → PUBLISHED                  only after live reconciliation succeeds
  | PUBLICATION_FAILED         gate failure, merge failure, or reconciliation mismatch/timeout
```

A push, a merged PR or a finished Cloudflare build is **not** `PUBLISHED`. No
automatic retry after a failed reconciliation in v1.

## Bundle layout

```
publications/<publication_id>/
  manifest.json         the manifest below, UTF-8 JSON
  manifest.json.sig     SSH signature over the exact bytes of manifest.json
  article.html          PUBLISH only — the exact bytes approved at the visual gate
```

Nothing else. No subdirectories, no symlinks, no unlisted file.

## Manifest

Structural contract: [`schemas/ground-state.web-publication.v1.schema.json`](../schemas/ground-state.web-publication.v1.schema.json)
(JSON Schema 2020-12; the backend can validate with Python `jsonschema`).

| Field | Rule |
|---|---|
| `schema` | `ground-state.web-publication.v1` |
| `publication_id` | `GSP-NNNN` (4–8 digits). Public-safe, immutable, never reused. Equals the directory name. |
| `action` | `PUBLISH` or `WITHDRAW` |
| `artifact_type` | `full_breakdown_v1` |
| `slug` / `route` | `route` is exactly `/research/<slug>`; lowercase ASCII words joined by `-`. |
| `supersedes` | `null`, or the `publication_id` this one replaces (same route). Required for `WITHDRAW`. |
| `listing` | `PUBLISH`: `{title, dek, domain, evidence_status, published_on, evidence_reviewed_on}` — the only text the site shows about the article (cards, listing, sitemap). `WITHDRAW`: `null`. |
| `files` | `PUBLISH`: exactly `[{path: "article.html", media_type: "text/html; charset=utf-8", bytes, sha256}]`. `WITHDRAW`: `[]`. |
| `bindings` | Hashes only. `PUBLISH`: `approved_article_sha256` (must equal the `article.html` hash), `content_approval_sha256`, `visual_approval_sha256`, `gser_artifact_sha256`, `publication_authorization_sha256`, `authorized_at` (UTC, `YYYY-MM-DDTHH:MM:SSZ`). `WITHDRAW`: `publication_authorization_sha256`, `authorized_at`. |
| `exporter` | `{name, version, source_commit}` (40-hex backend commit). |
| `manifest_sha256` | The self-hash, below. |

No internal identifiers (GSER, GS-TER, job ids), no paths, no actor names, no
approval metadata beyond the hashes listed. Integers only — no floats.

### Self-hash

Identical to `ground_state_publication/compiler.py::hash_object_with_empty_field(manifest, "manifest_sha256")`:

```python
payload = dict(manifest); payload["manifest_sha256"] = ""
manifest["manifest_sha256"] = hashlib.sha256(
    json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
).hexdigest()
```

The file on disk may be formatted any way; the signature covers its exact bytes.

### Signature

```bash
ssh-keygen -Y sign -f <publisher-key> -n ground-state.web-publication.v1 manifest.json
# writes manifest.json.sig
```

- Ed25519 only. Namespace exactly `ground-state.web-publication.v1`.
- Principal `ground-state-web-publisher`, pinned with its public key in
  [`.github/publication-signers`](../.github/publication-signers):
  `ground-state-web-publisher namespaces="ground-state.web-publication.v1" ssh-ed25519 AAAA…`
- The private key exists only on the Mac Mini.
- Key rotation: a pinned line may carry `valid-after` / `valid-before` (UTC,
  `YYYYMMDDZ`). The signing key must be valid at the bundle's
  `bindings.authorized_at`, and for a bundle a pull request adds, valid at the
  time of the check as well. Sign new bundles only with the current key.
- Check locally before pushing:
  `ssh-keygen -Y verify -f .github/publication-signers -I ground-state-web-publisher -n ground-state.web-publication.v1 -s manifest.json.sig < manifest.json`

The signature proves the bundle came from the authorized publisher. It does not
authenticate the human approver; that is a backend concern.

## The article (`article.html`)

The publication-profile render, byte for byte. The gate refuses it unless it is:

- valid UTF-8, starting `<!doctype html>`, declaring `<meta charset="utf-8">`, no byte-order mark;
- **self-contained**: every `src`/`srcset`/`url(…)` is a `data:` URI (fonts and
  images inline). Only `<a href>` may leave the page;
- **script-free**: no `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`,
  `<base>`, `<meta http-equiv>`, inline event handlers, `javascript:` or `@import`;
- carrying **exactly one `<link>`**: `<link rel="canonical" href="https://groundstatemethod.com/research/<slug>">`;
- not `noindex`;
- free of review and internal markers: `Not authorised/authorized for publication`,
  `Draft for human`, `visual-revision`, `sha256`, `/Users/`, `file://`,
  `localhost`, `127.0.0.1`, `operations/`, `research-engine`, `GSER-<digit>`,
  `GS-TER-<digit>`/`GSTER-<digit>`, `GSFB-`, `GSCG-`, `GSAF-`, and the test marker
  `GS-FIXTURE`.

The site serves it at `/research/<slug>` with headers only — the bytes are never
touched:

```
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: public, max-age=300, must-revalidate
```

## Versions and withdrawal

- A correction is a **new bundle** with `supersedes` pointing at the old one and the
  same route. The site serves the newest; the old bundle stays, unchanged.
- A withdrawal is a `WITHDRAW` bundle superseding the live one. The route then
  serves the site's 404 and drops out of listings and the sitemap.
- Each bundle is superseded at most once; chains never fork, cycle or move routes;
  two chains never share a route. A published bundle is never modified or deleted.

## Handoff (publisher)

1. Create branch `publish/<publication_id>` from the current `main`.
2. One commit that **only adds** `publications/<publication_id>/…`.
3. Open a PR into `main`, as the `groundstate-publisher` GitHub App; enable auto-merge.
4. Required checks `publication-gate` and `build` run; the PR merges when they pass.
   `main` requires a PR to be up to date: if `main` moved meanwhile, update the PR
   (`PUT /repos/{owner}/{repo}/pulls/{number}/update-branch`) and let the checks
   run again. Never force-push a `publish/` branch.
   Anything else in the PR — any other path, any modification, a branch name that
   does not match — fails the gate. The publisher cannot merge around it.
5. Same `publication_id` already on `main` with identical bytes: nothing to do.
   With different bytes: a contract violation — never retry, report.

## Live reconciliation (publisher)

After the merge, poll for at most 15 minutes:

1. `GET https://groundstatemethod.com/_publications.json` (served `no-store`):
   ```json
   { "schema": "ground-state.web-deployment.v1", "commit": "<sha>", "build_uuid": "<id>", "branch": "main",
     "publications": [{ "publication_id": "GSP-0001", "action": "PUBLISH", "route": "/research/…",
                        "manifest_sha256": "…", "article_sha256": "…", "article_bytes": 123 }] }
   ```
   It must list the publication with the expected `manifest_sha256` and `article_sha256`.
2. `GET https://groundstatemethod.com/research/<slug>` and hash the body. It must
   equal `article_sha256`.

Both hold → `PUBLISHED`, with a receipt recording `publication_id`,
`publication_authorization_sha256`, `commit`, `build_uuid`, canonical URL,
`served_article_sha256`, result and time. Anything else, or the timeout →
`PUBLICATION_FAILED` with the reason. A `WITHDRAW` reconciles when the route
returns 404 and the listing shows the withdrawal.
