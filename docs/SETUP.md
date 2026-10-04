# Setup — GitHub, publisher, Cloudflare

Done once, in this order, in the browser. **Do not connect Cloudflare (step 4)
until steps 1–3 are done and verified (step 5 part A).**

## 1. Repository settings

github.com/Tony-macaroni666/groundstate-web → **Settings**

- **General → Pull Requests:** tick **Allow auto-merge** and **Automatically delete
  head branches**. Untick merge methods other than **Allow squash merging**.
- **Actions → General → Workflow permissions:** **Read repository contents and
  packages permissions**; untick **Allow GitHub Actions to create and approve pull
  requests**.

## 2. Ruleset protecting `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

| Setting | Value |
|---|---|
| Ruleset name | `main` |
| Enforcement status | **Active** |
| Bypass list | **Repository admin** only, mode **For pull requests only**. Nothing else — never the publisher App. |
| Target branches | **Include default branch** |
| Restrict deletions | ✓ |
| Block force pushes | ✓ |
| Require a pull request before merging | ✓ — Required approvals **0**; **Require review from Code Owners** ✓; **Dismiss stale pull request approvals when new commits are pushed** ✓ |
| Require status checks to pass | ✓ — add **`publication-gate`** and **`build`** (source: GitHub Actions); **Require branches to be up to date before merging** ✓ |

The two checks appear in the search box once each workflow has run at least once
(they run on every push to `main`).

Code-owner review is what lets a publication merge alone but not a code change:
new bundles under `publications/` have no owner; everything else is owned by
`@Tony-macaroni666` (`.github/CODEOWNERS`).

## 3. The publisher identity — GitHub App

Your account → **Settings → Developer settings → GitHub Apps → New GitHub App**

| Setting | Value |
|---|---|
| GitHub App name | `groundstate-publisher` (its bot login becomes `groundstate-publisher[bot]`, which the gate expects) |
| Homepage URL | `https://groundstatemethod.com` |
| Webhook | **Active** unticked |
| Repository permissions | **Contents: Read and write**, **Pull requests: Read and write**, **Metadata: Read-only**. Nothing else: no Administration, no Workflows, no Actions, no Secrets. |
| Account permissions | none |
| Where can this GitHub App be installed? | **Only on this account** |

Then:
1. **Generate a private key.** The `.pem` goes to the Mac Mini only (Keychain or a
   `0600` file outside every repository). Never commit it, never paste it in chat.
2. **Install App → Only select repositories → `groundstate-web`.** Not the backend
   repository, not any other.
3. Give the backend the **App ID** and **Installation ID** (not secret).

If the App name differs, `PUBLISHER_LOGIN` in `scripts/check-publication-diff.ts`
must be changed to match, in a reviewed PR.

## 4. The publication signing key (backend)

On the Mac Mini, by the backend:

```bash
ssh-keygen -t ed25519 -C ground-state-web-publisher -f <private path outside every repository>
```

The **public** half goes into `.github/publication-signers` as one line, through a
normal PR that you review:

```
ground-state-web-publisher namespaces="ground-state.web-publication.v1" ssh-ed25519 AAAA… ground-state-web-publisher
```

Until that line exists, every bundle fails the gate. Nothing can be published.

## 5. Verify before connecting Cloudflare

A. Isolation and protection:
- [ ] The repository is **public** and holds no secret.
- [ ] A direct push to `main` is rejected (try any trivial change from a clone:
      `git push origin HEAD:main` must fail with a rule violation).
- [ ] A PR changing a code file shows **Review required — code owner**.
- [ ] The App's installation lists **groundstate-web** only.

B. Cloudflare (only now):
1. **Workers & Pages → Create → Import a repository.** In GitHub's dialog choose
   **Only select repositories → `groundstate-web`**. Never the backend repository.
2. | Field | Value |
   |---|---|
   | Project name | `ground-state` (must match `wrangler.jsonc`) |
   | Production branch | `main` |
   | Build command | `npm run build:cf` |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | `/` (repository root) |
3. **Settings → Builds → Builds for non-production branches: Enable** (noindex previews).
4. When the domain is attached (**Settings → Domains & Routes → Add → Custom domain
   → `groundstatemethod.com`**), set `PRODUCTION_ORIGIN` in `scripts/build-cf.mjs` to
   `https://groundstatemethod.com` in the same step, through a reviewed PR.

## 6. Zone settings for the domain

Dashboard → `groundstatemethod.com` zone. Turn **off** anything that rewrites HTML,
so the served article bytes stay the signed bytes:

- **Scrape Shield → Email Address Obfuscation:** Off
- **Speed → Optimization → Rocket Loader:** Off
- **SSL/TLS → Edge Certificates → Automatic HTTPS Rewrites:** Off
- **Web Analytics:** no automatic JavaScript injection for this site
- **Zaraz:** not enabled
- **Speed → Cloudflare Fonts:** Off

The publisher's live hash check catches a rewrite either way; these settings keep
it from happening.
