// END-TO-END CHECK of the real build, with a FIXTURE publication.
//
//   npm run test:e2e
//
// Runs in a throwaway copy of this repository, never in the checkout itself:
// it trusts a key generated for this run beside the pinned publisher key (so the
// real bundles in the copy keep verifying), adds one signed fixture bundle, and
// runs the exact Cloudflare build (scripts/build-cf.mjs) as main with the
// production origin. It then checks that
//   - the article is served byte for byte at /research/<slug>,
//   - the research listing, the home page and the sitemap list it from its manifest,
//   - _publications.json and the article headers are there,
// and that a copy with one changed article byte does not build at all.
//
// The fixture article cannot carry the GS-FIXTURE marker, because the real gate
// refuses that marker — that refusal is the point of it. It is labelled in prose
// instead, lives only in the temporary copy, and is deleted afterwards.

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestSelfHash, sha256Hex } from "../../lib/publications/canonical";
import { ARTICLE_THEME_SCRIPT, CANONICAL_ORIGIN, SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL } from "../../lib/publications/contract";
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
  appendFileSync(join(root, ".github/publication-signers"), allowedSignersLine(key, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE) + "\n");
  const article = Buffer.from(
    [
      "<!doctype html>",
      '<html lang="en"><head><meta charset="utf-8">',
      `<title>${TITLE}</title>`,
      `<link rel="canonical" href="${CANONICAL_ORIGIN}${ROUTE}">`,
      `<script>${ARTICLE_THEME_SCRIPT}</script>`,
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

function build(root: string, origin: string | null = CANONICAL_ORIGIN, branch = "main"): number {
  const env: NodeJS.ProcessEnv = { ...process.env, WORKERS_CI_BRANCH: branch, NEXT_TELEMETRY_DISABLED: "1" };
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
    readFileSync(join(out, "index.html"), "utf8").includes(
      '<span class="whitespace-nowrap">Human performance,</span> <span class="whitespace-nowrap">traced to the evidence</span>',
    ),
    "the home page category line breaks only after its comma",
  );
  expect(
    /<li class="lg:hidden"><a [^>]*href="\/contact"/.test(readFileSync(join(out, "index.html"), "utf8")),
    "from lg the header shows Contact once, as the button",
  );
  expect(
    readFileSync(join(out, "index.html"), "utf8").includes(`<meta property="og:image" content="${CANONICAL_ORIGIN}/og-default.png"/>`),
    "with an origin, the preview image is absolute on that origin",
  );
  expect(readFileSync(join(out, "sitemap.xml"), "utf8").includes(`${CANONICAL_ORIGIN}${ROUTE}`), "the sitemap lists it");
  const deployment = JSON.parse(readFileSync(join(out, "_publications.json"), "utf8"));
  const fixture = (deployment.publications ?? []).find((p: { publication_id: string }) => p.publication_id === "GSP-9999");
  expect(fixture?.article_sha256 === sha256Hex(article), "_publications.json carries the article hash");
  expect(readFileSync(join(out, "_headers"), "utf8").includes(`${ROUTE}\n  Content-Security-Policy:`), "the article route has its security headers");
  const headers = readFileSync(join(out, "_headers"), "utf8");
  expect(headers.split("\n").filter((l) => l === "/*").length === 1 && headers.includes("Strict-Transport-Security:"), "one rule for every path, with the site's security headers");
  expect(!headers.includes("X-Robots-Tag: noindex, nofollow"), "the production build is not noindex");

  const tampered = Buffer.from(addBundle(bad));
  tampered[tampered.length - 3] ^= 1;
  writeFileSync(join(bad, "publications/GSP-9999/article.html"), tampered);
  expect(build(bad) !== 0, "a build with one changed article byte fails");

  // An unlisted build (any branch but main, so no origin): nothing may carry an
  // absolute URL — least of all one Next made up from localhost.
  expect(build(unlisted, null, "e2e-unlisted") === 0, "the unlisted build (no origin) succeeds");
  // Signed articles are served as signed, canonical to production included; the
  // gate checks them. These checks are for the pages the site itself renders.
  const signed = new Set(
    (JSON.parse(readFileSync(join(unlisted, "out/_publications.json"), "utf8")).publications as { route: string }[])
      .map((p) => join(unlisted, "out", `${p.route}.html`)),
  );
  const pages = htmlFiles(join(unlisted, "out")).filter((f) => !signed.has(f)).map((f) => readFileSync(f, "utf8"));
  expect(pages.length > 0 && pages.every((p) => !p.includes("localhost")), "no unlisted page mentions localhost");
  expect(pages.every((p) => !p.includes('rel="canonical"')), "no unlisted page carries a canonical");
  expect(readFileSync(join(unlisted, "out/index.html"), "utf8").includes('<meta name="robots" content="noindex, nofollow"/>'), "the unlisted home page is noindex");
  // Cloudflare keeps one rule per path: a second "/*" block would drop the first one's headers.
  const unlistedHeaders = readFileSync(join(unlisted, "out/_headers"), "utf8");
  const everyPath = unlistedHeaders.split("\n/*\n");
  expect(everyPath.length === 2 && /X-Robots-Tag: noindex, nofollow/.test(everyPath[1].split("\n\n")[0]) && /Strict-Transport-Security:/.test(everyPath[1].split("\n\n")[0]),
    "the unlisted build adds noindex to the one rule for every path, keeping its security headers");
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
