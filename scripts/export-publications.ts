// After `next build`: put every published article into ./out exactly as signed.
//
// For each active bundle, publications/<id>/article.html is copied to
// out/research/<slug>.html — the host serves it at /research/<slug>. The copy is
// read back and compared with the manifest hash; a single differing byte fails
// the build. Nothing here parses, rewrites, minifies or wraps the article.
//
// Also written:
//   out/_publications.json  what this build serves, for the publisher's live check
//   out/_headers            per-article security headers (headers, not bytes)

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256Hex } from "../lib/publications/canonical";
import { verifyPublications, type VerifyReport } from "../lib/publications/verify";

export const DEPLOYMENT_SCHEMA = "ground-state.web-deployment.v1";

/** No script, no external resource, no framing: the page is a document and nothing else. */
export const ARTICLE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function exportPublications(opts: { root: string; out: string; report?: VerifyReport }): string[] {
  const report = opts.report ?? verifyPublications({ root: opts.root });
  if (report.errors.length) return report.errors;
  const errors: string[] = [];
  const headers: string[] = [];

  for (const b of report.active) {
    const target = join(opts.out, `${b.manifest.route.slice(1)}.html`);
    if (existsSync(target)) {
      errors.push(`${b.manifest.route}: the site already has a page at this route`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, b.article!);
    const written = readFileSync(target);
    const expected = b.manifest.files[0].sha256;
    if (!written.equals(b.article!) || sha256Hex(written) !== expected) {
      errors.push(`${b.manifest.route}: served bytes differ from the signed article`);
    }
    headers.push(
      b.manifest.route,
      `  Content-Security-Policy: ${ARTICLE_CSP}`,
      "  X-Content-Type-Options: nosniff",
      "  Referrer-Policy: strict-origin-when-cross-origin",
      "  Cache-Control: public, max-age=300, must-revalidate",
      "",
    );
  }
  for (const w of report.withdrawn) {
    if (existsSync(join(opts.out, `${w.manifest.route.slice(1)}.html`))) {
      errors.push(`${w.manifest.route}: withdrawn, but a page exists at this route`);
    }
  }
  if (errors.length) return errors;

  const deployment = {
    schema: DEPLOYMENT_SCHEMA,
    commit: process.env.WORKERS_CI_COMMIT_SHA ?? null,
    build_uuid: process.env.WORKERS_CI_BUILD_UUID ?? null,
    branch: process.env.WORKERS_CI_BRANCH ?? null,
    publications: [
      ...report.active.map((b) => ({
        publication_id: b.id,
        action: "PUBLISH" as const,
        route: b.manifest.route,
        manifest_sha256: b.manifest.manifest_sha256,
        article_sha256: b.manifest.files[0].sha256,
        article_bytes: b.manifest.files[0].bytes,
      })),
      ...report.withdrawn.map((b) => ({
        publication_id: b.id,
        action: "WITHDRAW" as const,
        route: b.manifest.route,
        manifest_sha256: b.manifest.manifest_sha256,
        article_sha256: null,
        article_bytes: null,
      })),
    ].sort((a, b) => a.publication_id.localeCompare(b.publication_id)),
  };
  writeFileSync(join(opts.out, "_publications.json"), JSON.stringify(deployment, null, 2) + "\n");
  headers.push("/_publications.json", "  Cache-Control: no-store", "  X-Robots-Tag: noindex", "");
  appendFileSync(join(opts.out, "_headers"), headers.join("\n"));
  return [];
}

function main(): void {
  const errors = exportPublications({ root: process.cwd(), out: join(process.cwd(), "out") });
  if (errors.length) {
    console.error(`✗ Export of publications failed:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log("✓ Publications exported byte for byte; _publications.json written.");
}

if (process.argv[1]?.endsWith("export-publications.ts")) main();
