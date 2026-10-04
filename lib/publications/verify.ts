// Verification of publication bundles. Fail-closed: anything not positively
// valid is an error, and an error anywhere stops the gate and the build.
//
// Used by scripts/verify-publications.ts (CI and the Cloudflare build), by
// scripts/export-publications.ts (byte-exact copy into the build) and by the
// pages that list publications. One implementation, three callers.

import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../schemas/ground-state.web-publication.v1.schema.json";
import { manifestSelfHash, sha256Hex } from "./canonical";
import {
  ARTICLE_FILE,
  CANONICAL_ORIGIN,
  FORBIDDEN_ELEMENTS,
  FORBIDDEN_MARKERS,
  FORBIDDEN_PATTERNS,
  MANIFEST_FILE,
  MAX_ARTICLE_BYTES,
  MAX_MANIFEST_BYTES,
  MAX_SIGNATURE_BYTES,
  PUBLICATIONS_DIR,
  SIGNATURE_FILE,
  SIGNATURE_NAMESPACE,
  SIGNER_PRINCIPAL,
  SIGNERS_FILE,
  type Manifest,
} from "./contract";
import { parseAllowedSigners, verifySshSignature, type AllowedSigner } from "./sshsig";

// strictRequired is off only because if/then branches list properties declared at the top level.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const validateSchema = ajv.compile(schema);

export interface Bundle {
  id: string;
  manifest: Manifest;
  manifestBytes: Buffer;
  /** Present for PUBLISH. The exact bytes that will be served. */
  article?: Buffer;
}

export interface VerifyOptions {
  /** Repository root. */
  root: string;
  /** Overrides the pinned signers file (tests). */
  signers?: AllowedSigner[];
  /** Tests only: let fixture-marked articles through the marker check. Never set in production. */
  allowFixtureMarker?: boolean;
}

export interface VerifyReport {
  bundles: Bundle[];
  /** Heads of PUBLISH chains: what the site serves, one per route. */
  active: Bundle[];
  /** Heads of WITHDRAW chains: routes that must not be served. */
  withdrawn: Bundle[];
  errors: string[];
}

export function loadSigners(root: string): AllowedSigner[] {
  const path = join(root, SIGNERS_FILE);
  return existsSync(path) ? parseAllowedSigners(readFileSync(path, "utf8")) : [];
}

/** Checks the article HTML is a self-contained, public-safe evidence page. */
export function inspectArticle(html: Buffer, route: string, allowFixtureMarker = false): string[] {
  const errors: string[] = [];
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(html);
  } catch {
    return ["article.html is not valid UTF-8"];
  }
  if (text.charCodeAt(0) === 0xfeff) errors.push("article.html starts with a byte-order mark");
  if (!/^<!doctype html>/i.test(text)) errors.push("article.html must start with <!doctype html>");
  if (!/<meta\s+charset=["']?utf-8["']?\s*\/?>/i.test(text)) errors.push("article.html must declare <meta charset=\"utf-8\">");

  const lower = text.toLowerCase();
  for (const [marker, why] of FORBIDDEN_MARKERS) {
    if (allowFixtureMarker && marker === "gs-fixture") continue;
    if (lower.includes(marker)) errors.push(`article.html contains "${marker}" (${why})`);
  }
  for (const [pattern, why] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) errors.push(`article.html matches ${pattern} (${why})`);
  }
  for (const element of FORBIDDEN_ELEMENTS) {
    if (new RegExp(`<${element.replace(" ", "\\s+")}\\b`, "i").test(text)) errors.push(`article.html contains <${element}>`);
  }
  if (/\son[a-z]+\s*=/i.test(text)) errors.push("article.html contains an inline event handler");
  if (/javascript:/i.test(text)) errors.push("article.html contains a javascript: URL");
  if (/@import/i.test(text)) errors.push("article.html contains @import");

  // Self-contained: every embedded resource is inline. Only <a href> may leave the page.
  for (const m of text.matchAll(/\s(?:src|srcset|poster|data)\s*=\s*["']?([^"'\s>]*)/gi)) {
    if (!m[1].startsWith("data:")) errors.push(`article.html loads an external resource: ${m[1].slice(0, 80)}`);
  }
  for (const m of text.matchAll(/url\(\s*["']?([^"')]*)/gi)) {
    if (!m[1].startsWith("data:") && !m[1].startsWith("#")) errors.push(`article.html references an external url(): ${m[1].slice(0, 80)}`);
  }

  // Exactly one <link>, the canonical one, and it must name this route.
  const links = [...text.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const canonical = links.filter((l) => /rel=["']?canonical["']?/i.test(l));
  if (links.length !== canonical.length) errors.push("article.html may contain no <link> other than rel=canonical");
  const expected = `${CANONICAL_ORIGIN}${route}`;
  if (canonical.length !== 1) errors.push("article.html must contain exactly one <link rel=\"canonical\">");
  else if (!canonical[0].includes(`href="${expected}"`)) errors.push(`canonical link must be ${expected}`);

  if (/<meta[^>]+name=["']?robots["']?[^>]*noindex/i.test(text)) errors.push("article.html is marked noindex");
  return errors;
}

function verifyBundle(dir: string, id: string, signers: AllowedSigner[], opts: VerifyOptions): { bundle?: Bundle; errors: string[] } {
  const errors: string[] = [];
  const where = `${PUBLICATIONS_DIR}/${id}`;
  const fail = (msg: string) => ({ errors: [...errors, `${where}: ${msg}`] });

  const entries = readdirSync(dir);
  for (const name of entries) {
    const st = lstatSync(join(dir, name));
    if (!st.isFile() || st.isSymbolicLink()) return fail(`${name} is not a regular file`);
  }
  if (!entries.includes(MANIFEST_FILE)) return fail(`${MANIFEST_FILE} is missing`);
  if (!entries.includes(SIGNATURE_FILE)) return fail(`${SIGNATURE_FILE} is missing`);

  const manifestBytes = readFileSync(join(dir, MANIFEST_FILE));
  if (manifestBytes.length > MAX_MANIFEST_BYTES) return fail("manifest is too large");
  const signature = readFileSync(join(dir, SIGNATURE_FILE));
  if (signature.length > MAX_SIGNATURE_BYTES) return fail("signature is too large");

  // Provenance first: nothing in an unsigned bundle is worth reading further.
  if (signers.length === 0) return fail(`no trusted publisher key is pinned in ${SIGNERS_FILE}`);
  const sig = verifySshSignature({
    message: manifestBytes,
    armored: signature.toString("utf8"),
    signers,
    principal: SIGNER_PRINCIPAL,
    namespace: SIGNATURE_NAMESPACE,
  });
  if (!sig.ok) return fail(`signature: ${sig.reason}`);

  let manifest: Manifest;
  try {
    manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes)) as Manifest;
  } catch {
    return fail("manifest is not valid UTF-8 JSON");
  }
  if (!validateSchema(manifest)) {
    return fail(`schema: ${ajv.errorsText(validateSchema.errors, { separator: "; " })}`);
  }
  if (manifest.publication_id !== id) errors.push(`${where}: directory name and publication_id differ (${manifest.publication_id})`);
  if (manifest.route !== `/research/${manifest.slug}`) errors.push(`${where}: route must be /research/<slug>`);
  if (manifestSelfHash(manifest as unknown as Record<string, unknown>) !== manifest.manifest_sha256) {
    errors.push(`${where}: manifest_sha256 does not match the manifest`);
  }

  const expectedFiles = new Set([MANIFEST_FILE, SIGNATURE_FILE, ...manifest.files.map((f) => f.path)]);
  for (const name of entries) if (!expectedFiles.has(name)) errors.push(`${where}: ${name} is not listed in the manifest`);

  let article: Buffer | undefined;
  if (manifest.action === "PUBLISH") {
    const entry = manifest.files.find((f) => f.path === ARTICLE_FILE);
    if (!entry) errors.push(`${where}: PUBLISH must carry ${ARTICLE_FILE}`);
    else if (!entries.includes(ARTICLE_FILE)) errors.push(`${where}: ${ARTICLE_FILE} is missing`);
    else {
      article = readFileSync(join(dir, ARTICLE_FILE));
      if (article.length > MAX_ARTICLE_BYTES) errors.push(`${where}: ${ARTICLE_FILE} is too large`);
      if (article.length !== entry.bytes) errors.push(`${where}: ${ARTICLE_FILE} is ${article.length} bytes, manifest says ${entry.bytes}`);
      const hash = sha256Hex(article);
      if (hash !== entry.sha256) errors.push(`${where}: ${ARTICLE_FILE} sha256 differs from the manifest`);
      if (manifest.bindings.approved_article_sha256 !== entry.sha256) {
        errors.push(`${where}: the served article is not the approved article (approved_article_sha256)`);
      }
      for (const e of inspectArticle(article, manifest.route, opts.allowFixtureMarker)) errors.push(`${where}: ${e}`);
    }
  }
  if (errors.length) return { errors };
  return { bundle: { id, manifest, manifestBytes, article }, errors: [] };
}

/** Verifies every bundle and resolves which ones the site serves. */
export function verifyPublications(opts: VerifyOptions): VerifyReport {
  const signers = opts.signers ?? loadSigners(opts.root);
  const base = join(opts.root, PUBLICATIONS_DIR);
  const report: VerifyReport = { bundles: [], active: [], withdrawn: [], errors: [] };
  if (!existsSync(base)) return report;

  for (const name of readdirSync(base).sort()) {
    const path = join(base, name);
    if (name === "README.md") continue;
    if (!lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink()) {
      report.errors.push(`${PUBLICATIONS_DIR}/${name}: only bundle directories belong here`);
      continue;
    }
    const { bundle, errors } = verifyBundle(path, name, signers, opts);
    report.errors.push(...errors);
    if (bundle) report.bundles.push(bundle);
  }
  if (report.errors.length) return report;

  // Supersession: each bundle is superseded at most once, only by one that keeps
  // its route, and a withdrawal ends a chain. The head of each chain decides the route.
  const byId = new Map(report.bundles.map((b) => [b.id, b]));
  const successor = new Map<string, Bundle>();
  for (const b of report.bundles) {
    const prev = b.manifest.supersedes;
    if (prev === null) continue;
    const before = byId.get(prev);
    if (!before) report.errors.push(`${b.id}: supersedes ${prev}, which is not here`);
    else if (before.manifest.action === "WITHDRAW") report.errors.push(`${b.id}: supersedes ${prev}, which is a withdrawal`);
    else if (before.manifest.route !== b.manifest.route) report.errors.push(`${b.id}: changes the route of ${prev}`);
    if (successor.has(prev)) report.errors.push(`${prev}: superseded twice (${successor.get(prev)!.id}, ${b.id})`);
    successor.set(prev, b);
  }
  for (const b of report.bundles) {
    if (b.manifest.action === "PUBLISH" && b.manifest.supersedes === null) continue;
    // Walk back to a root; a cycle never reaches one.
    const seen = new Set<string>();
    let cur: Bundle | undefined = b;
    while (cur && cur.manifest.supersedes !== null && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.manifest.supersedes);
    }
    if (cur && seen.has(cur.id)) report.errors.push(`${b.id}: supersession cycle`);
  }
  const heads = report.bundles.filter((b) => !successor.has(b.id));
  const routes = new Map<string, string>();
  for (const h of heads) {
    const owner = routes.get(h.manifest.route);
    if (owner) report.errors.push(`${h.manifest.route}: claimed by ${owner} and ${h.id}`);
    routes.set(h.manifest.route, h.id);
  }
  if (report.errors.length) return report;

  report.active = heads.filter((h) => h.manifest.action === "PUBLISH");
  report.withdrawn = heads.filter((h) => h.manifest.action === "WITHDRAW");
  return report;
}
