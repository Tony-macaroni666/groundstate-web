#!/usr/bin/env node
/**
 * The build Cloudflare runs on every push (Workers Builds → build command
 * `npm run build:cf`), and the build CI runs on every pull request.
 *
 *   1. the publication gate over the whole tree — an invalid bundle stops here;
 *   2. the content check (placeholders, banned labels, internal identifiers);
 *   3. on main with a production origin: the strict launch preflight;
 *   4. `next build` — the site, listings read from signed manifests only;
 *   5. every published article copied into ./out byte for byte and read back.
 *
 * The branch decides the mode. `main` builds the public site. Anything else
 * builds a preview: no production origin, so no canonical, no sitemap,
 * robots.txt disallows everything, every page is noindex, and every file gets
 * an X-Robots-Tag header. Cloudflare builds `main` only (non-production branch
 * builds are off, see SECURITY.md); previews are for local and CI builds.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PRODUCTION_BRANCH = "main";

/**
 * The public origin. Set when the custom domain is attached in the dashboard,
 * never before — a canonical tag on a domain the site is not served from points
 * crawlers somewhere else. Empty until then, and the production build is
 * unlisted.
 */
const PRODUCTION_ORIGIN = "";

const branch = process.env.WORKERS_CI_BRANCH ?? "";
const production = branch === PRODUCTION_BRANCH;

const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
if (production && PRODUCTION_ORIGIN) env.NEXT_PUBLIC_SITE_URL = PRODUCTION_ORIGIN;
if (!production) delete env.NEXT_PUBLIC_SITE_URL;

function run(cmd, args, extra = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...env, ...extra } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(`Ground State — ${production ? "production" : `preview (${branch || "local"})`} build`);
run("npx", ["tsx", "scripts/verify-publications.ts"]);
run("npx", ["tsx", "scripts/check-content.ts"]);
if (production && env.NEXT_PUBLIC_SITE_URL) {
  run("node", ["scripts/preflight.mjs"], { CI: "true" });
} else if (production) {
  console.warn("! No production origin yet: the site is built unlisted (robots disallow, noindex, no canonical).");
}
run("npx", ["next", "build"]);
run("npx", ["tsx", "scripts/export-publications.ts"]);
if (!production) appendFileSync("out/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n");
