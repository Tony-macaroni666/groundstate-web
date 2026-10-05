// END-TO-END CHECK of the real build, with a FIXTURE publication.
//
//   npm run test:e2e
//
// Runs in a throwaway copy of this repository, never in the checkout itself:
// it pins a key generated for this run in the copy's signers file, adds one
// signed fixture bundle, and runs the exact Cloudflare build (scripts/build-cf.mjs)
// as main with the production origin. It then checks that
//   - the article is served byte for byte at /research/<slug>,
//   - the research listing, the home page and the sitemap list it from its manifest,
//   - _publications.json and the article headers are there,
// and that a copy with one changed article byte does not build at all.
//
// The fixture article cannot carry the GS-FIXTURE marker, because the real gate
// refuses that marker — that refusal is the point of it. It is labelled in prose
// instead, lives only in the temporary copy, and is deleted afterwards.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestSelfHash, sha256Hex } from "../../lib/publications/canonical";
import { CANONICAL_ORIGIN, SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL } from "../../lib/publications/contract";
import { allowedSignersLine, sshSign, testKey } from "../helpers/sign";

const SOURCE = process.cwd();
const SLUG = "e2e-build-check";
const ROUTE = `/research/${SLUG}`;
const TITLE = "E2E build check — not a Ground State publication";

function copyRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "gs-web-e2e-"));
  cpSync(SOURCE, dir, {
    recursive: true,
    filter: (src) => !/\/(node_modules|\.next|out|\.git)(\/|$)/.test(src.slice(SOURCE.length)),
  });
  symlinkSync(join(SOURCE, "node_modules"), join(dir, "node_modules"));
  return dir;
}

function addBundle(root: string): Buffer {
  const key = testKey();
  writeFileSync(join(root, ".github/publication-signers"), allowedSignersLine(key, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE) + "\n");
  const article = Buffer.from(
    [
      "<!doctype html>",
      '<html lang="en"><head><meta charset="utf-8">',
      `<title>${TITLE}</title>`,
      `<link rel="canonical" href="${CANONICAL_ORIGIN}${ROUTE}">`,
      "<style>body{background:#f3f0e9;color:#171a19}</style>",
      "</head><body><p>End-to-end build check. Test content only; it says nothing about any subject.</p></body></html>",
      "",
    ].join("\n"),
  );
  const manifest: Record<string, unknown> = {
    schema: "ground-state.web-publication.v1",
    publication_id: "GSP-9999",
    action: "PUBLISH",
    artifact_type: "full_breakdown_v1",
    route: ROUTE,
    slug: SLUG,
    supersedes: null,
    listing: {
      title: TITLE,
      dek: "Test content for the end-to-end build check.",
      domain: "recovery",
      evidence_status: "contested",
      published_on: "2026-10-03",
      evidence_reviewed_on: null,
    },
    files: [{ path: "article.html", media_type: "text/html; charset=utf-8", bytes: article.length, sha256: sha256Hex(article) }],
    bindings: {
      approved_article_sha256: sha256Hex(article),
      content_approval_sha256: "1".repeat(64),
      visual_approval_sha256: "2".repeat(64),
      gser_artifact_sha256: "3".repeat(64),
      publication_authorization_sha256: "4".repeat(64),
      authorized_at: "2026-10-03T09:00:00Z",
    },
    exporter: { name: "e2e-check", version: "0.0.0", source_commit: "0".repeat(40) },
    manifest_sha256: "",
  };
  manifest.manifest_sha256 = manifestSelfHash(manifest);
  const dir = join(root, "publications/GSP-9999");
  mkdirSync(dir, { recursive: true });
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(dir, "article.html"), article);
  writeFileSync(join(dir, "manifest.json"), manifestBytes);
  writeFileSync(join(dir, "manifest.json.sig"), sshSign(key, manifestBytes, SIGNATURE_NAMESPACE));
  return article;
}

function build(root: string, origin: string | null = CANONICAL_ORIGIN): number {
  const env: NodeJS.ProcessEnv = { ...process.env, WORKERS_CI_BRANCH: "main", NEXT_TELEMETRY_DISABLED: "1" };
  if (origin) env.NEXT_PUBLIC_SITE_URL = origin;
  else delete env.NEXT_PUBLIC_SITE_URL;
  const r = spawnSync("node", ["scripts/build-cf.mjs"], { cwd: root, stdio: ["ignore", "inherit", "inherit"], env });
  return r.status ?? 1;
}

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));

const failures: string[] = [];
const expect = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures.push(what);
};

const good = copyRepo();
const bad = copyRepo();
const unlisted = copyRepo();
try {
  const article = addBundle(good);
  expect(build(good) === 0, "the production build succeeds with a valid signed bundle");
  const out = join(good, "out");
  expect(readFileSync(join(out, `research/${SLUG}.html`)).equals(article), "the article is served byte for byte");
  expect(readFileSync(join(out, "research.html"), "utf8").includes(`href="${ROUTE}"`), "the research listing links to it");
  expect(readFileSync(join(out, "research.html"), "utf8").includes(TITLE), "the research listing shows the manifest title");
  expect(readFileSync(join(out, "index.html"), "utf8").includes(TITLE), "the home page lists it");
  expect(
    readFileSync(join(out, "index.html"), "utf8").includes(`<meta property="og:image" content="${CANONICAL_ORIGIN}/og-default.png"/>`),
    "with an origin, the preview image is absolute on that origin",
  );
  expect(readFileSync(join(out, "sitemap.xml"), "utf8").includes(`${CANONICAL_ORIGIN}${ROUTE}`), "the sitemap lists it");
  const deployment = JSON.parse(readFileSync(join(out, "_publications.json"), "utf8"));
  expect(deployment.publications?.[0]?.article_sha256 === sha256Hex(article), "_publications.json carries the article hash");
  expect(readFileSync(join(out, "_headers"), "utf8").includes(`${ROUTE}\n  Content-Security-Policy:`), "the article route has its security headers");

  const tampered = Buffer.from(addBundle(bad));
  tampered[tampered.length - 3] ^= 1;
  writeFileSync(join(bad, "publications/GSP-9999/article.html"), tampered);
  expect(build(bad) !== 0, "a build with one changed article byte fails");

  // main before the domain is attached: no origin, so nothing may carry an
  // absolute URL — least of all one Next made up from localhost.
  expect(build(unlisted, null) === 0, "the unlisted production build (no origin) succeeds");
  const pages = htmlFiles(join(unlisted, "out")).map((f) => readFileSync(f, "utf8"));
  expect(pages.length > 0 && pages.every((p) => !p.includes("localhost")), "no unlisted page mentions localhost");
  expect(pages.every((p) => !p.includes('rel="canonical"')), "no unlisted page carries a canonical");
  expect(readFileSync(join(unlisted, "out/index.html"), "utf8").includes('<meta name="robots" content="noindex, nofollow"/>'), "the unlisted home page is noindex");
} finally {
  rmSync(good, { recursive: true, force: true });
  rmSync(bad, { recursive: true, force: true });
  rmSync(unlisted, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} end-to-end check(s) failed`);
  process.exit(1);
}
console.log("\n✓ End-to-end build check passed.");
