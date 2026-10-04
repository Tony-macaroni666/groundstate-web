// TEST HELPER. Builds publication bundles from FIXTURE content in a scratch
// directory. Every fixture article carries the GS-FIXTURE marker, which the
// production gate refuses: a fixture can never pass as a real publication.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestSelfHash, sha256Hex } from "../../lib/publications/canonical";
import { CANONICAL_ORIGIN, SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL, type Manifest } from "../../lib/publications/contract";
import { parseAllowedSigners, type AllowedSigner } from "../../lib/publications/sshsig";
import { allowedSignersLine, sshSign, testKey, type TestKey } from "./sign";

export const HASH = (c: string) => c.repeat(64);

export function fixtureArticle(route: string, body = "Fixture paragraph."): string {
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>GS-FIXTURE — not a Ground State publication</title>",
    `<link rel="canonical" href="${CANONICAL_ORIGIN}${route}">`,
    "<style>body{margin:0;background:#f3f0e9;color:#171a19;font:17px/1.7 sans-serif}</style>",
    "</head><body><main>",
    "<p>GS-FIXTURE. Test fixture, not a Ground State publication. It says nothing about any subject.</p>",
    `<p>${body}</p>`,
    '<p><a href="https://doi.org/10.0000/gs-fixture">A link that leaves the page</a></p>',
    "</main></body></html>",
    "",
  ].join("\n");
}

export interface FixtureOptions {
  id: string;
  slug?: string;
  action?: "PUBLISH" | "WITHDRAW";
  supersedes?: string | null;
  html?: string;
  title?: string;
  /** Last chance to edit the manifest before it is hashed and signed. */
  edit?: (m: Record<string, unknown>) => void;
}

export class FixtureRepo {
  readonly root = mkdtempSync(join(tmpdir(), "gs-web-fixture-"));
  readonly key: TestKey = testKey();
  readonly signers: AllowedSigner[];

  constructor() {
    this.signers = parseAllowedSigners(allowedSignersLine(this.key, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE));
    mkdirSync(join(this.root, "publications"), { recursive: true });
  }

  manifest(o: FixtureOptions, article?: Buffer): Record<string, unknown> {
    const slug = o.slug ?? "gs-fixture-article";
    const action = o.action ?? "PUBLISH";
    const m: Record<string, unknown> = {
      schema: "ground-state.web-publication.v1",
      publication_id: o.id,
      action,
      artifact_type: "full_breakdown_v1",
      route: `/research/${slug}`,
      slug,
      supersedes: o.supersedes ?? null,
      listing:
        action === "PUBLISH"
          ? {
              title: o.title ?? "GS-FIXTURE article",
              dek: "Test fixture, not a Ground State publication.",
              domain: "nutrition",
              evidence_status: "uncertain",
              published_on: "2026-10-01",
              evidence_reviewed_on: "2026-09-11",
            }
          : null,
      files: article ? [{ path: "article.html", media_type: "text/html; charset=utf-8", bytes: article.length, sha256: sha256Hex(article) }] : [],
      bindings:
        action === "PUBLISH"
          ? {
              approved_article_sha256: article ? sha256Hex(article) : HASH("0"),
              content_approval_sha256: HASH("1"),
              visual_approval_sha256: HASH("2"),
              gser_artifact_sha256: HASH("3"),
              publication_authorization_sha256: HASH("4"),
              authorized_at: "2026-10-01T09:00:00Z",
            }
          : { publication_authorization_sha256: HASH("5"), authorized_at: "2026-10-02T09:00:00Z" },
      exporter: { name: "gs-fixture-exporter", version: "0.0.0", source_commit: "0".repeat(40) },
      manifest_sha256: "",
    };
    o.edit?.(m);
    m.manifest_sha256 = manifestSelfHash(m);
    return m;
  }

  /** Writes a complete, correctly signed bundle and returns its directory. */
  add(o: FixtureOptions): string {
    const dir = join(this.root, "publications", o.id);
    mkdirSync(dir, { recursive: true });
    const action = o.action ?? "PUBLISH";
    let article: Buffer | undefined;
    if (action === "PUBLISH") {
      article = Buffer.from(o.html ?? fixtureArticle(`/research/${o.slug ?? "gs-fixture-article"}`));
      writeFileSync(join(dir, "article.html"), article);
    }
    const manifestBytes = Buffer.from(JSON.stringify(this.manifest(o, article), null, 2) + "\n");
    writeFileSync(join(dir, "manifest.json"), manifestBytes);
    writeFileSync(join(dir, "manifest.json.sig"), sshSign(this.key, manifestBytes, SIGNATURE_NAMESPACE));
    return dir;
  }
}

export type { Manifest };
