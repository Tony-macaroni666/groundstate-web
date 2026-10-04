#!/usr/bin/env node
/**
 * Launch guard. Run before a production build.
 *
 * Two things must never reach production, and both are exactly the kind of
 * thing that survives a launch because everyone assumes someone else checked:
 *
 *  1. An unverified citation. A plausible-looking DOI on a health site is worse
 *     than no DOI at all (WEBSITE-BRIEF §3.1).
 *  2. An unset production origin. Without it the canonical tags, the sitemap
 *     and the Open Graph URLs are silently omitted and robots.txt disallows
 *     everything — a site that is live and invisible.
 *  3. A declared Open Graph image whose file is not there. The card renders
 *     blank rather than falling back, so a missing file is worse than no
 *     declaration at all.
 *
 * Locally both are warnings. With NODE_ENV=production or CI=true they fail.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.NODE_ENV === "production" || process.env.CI === "true";
const problems = [];

// 1. Placeholder references. Scans whatever content files exist — a deleted one
//    must not break the guard, and a new one must not silently escape it.
const contentFiles = ["articles.ts", "journal.ts", "coaches.ts"];
let placeholders = 0;
const perFile = [];
for (const f of contentFiles) {
  const path = join(root, "content", f);
  if (!existsSync(path)) continue;
  // Comments are stripped first: these files document the placeholder rule in
  // prose, and a doc comment is not a shipped citation.
  const src = readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const n = (src.match(/placeholder:\s*true/g) ?? []).length;
  if (n > 0) perFile.push(`${n} in ${f}`);
  placeholders += n;
}
if (placeholders > 0) {
  problems.push(
    `${placeholders} placeholder entr${placeholders === 1 ? "y" : "ies"} (${perFile.join(", ")}). ` +
      "Replace with verified primary sources.",
  );
}

// 2. Production origin.
if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim()) {
  problems.push(
    "NEXT_PUBLIC_SITE_URL is not set. Canonical URLs, the sitemap and Open Graph " +
      "URLs are omitted and robots.txt disallows the whole site until it is.",
  );
}

// 3. The declared OG image must exist on disk.
const ogPath = (readFileSync(join(root, "site.config.ts"), "utf8")
  .match(/path:\s*"(\/[^"]+)"/) ?? [])[1];
if (ogPath && !existsSync(join(root, "public", ogPath.replace(/^\//, "")))) {
  problems.push(
    `OG_IMAGE declares ${ogPath} but public${ogPath} does not exist. ` +
      "Add the file, or set OG_IMAGE to null.",
  );
}

if (problems.length === 0) {
  console.log("✓ Preflight clean.");
  process.exit(0);
}

const report = problems.map((p) => `  - ${p}`).join("\n");
if (strict) {
  console.error(`✗ Preflight failed:\n${report}`);
  process.exit(1);
}
console.warn(`! Preflight warnings (this build is not publication-ready):\n${report}`);
process.exit(0);
