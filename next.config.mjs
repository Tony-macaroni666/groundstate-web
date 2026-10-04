import { readFileSync } from "node:fs";

/**
 * Static export for Cloudflare Workers Static Assets.
 *
 * `output: "export"` emits one HTML file per route into `out/`, so every public
 * URL is a real path served by the host: no hash routing, no SPA fallback, and a
 * direct hit or a browser refresh on /research/<slug> works without JavaScript
 * reconstructing the route. The host has no Node runtime, which is why there are
 * no route handlers and why the research filters read the query string on the
 * client (app/research/listing.tsx) while their controls stay ordinary links.
 *
 * THE ZERO-CONTENT CASE
 * ---------------------
 * Next refuses to export a dynamic route that produces no paths: a `[slug]`
 * route whose `generateStaticParams()` returns an empty array fails the build
 * outright. The Journal template is therefore named `page.journal.tsx` and is
 * registered as a page only while content/journal.ts has an entry. Empty list,
 * no route — which is correct, there is nothing it could serve. An unrecognised
 * edit to journal.ts counts as "has content", so it enables the route and fails
 * loudly at build time rather than silently dropping it.
 *
 * Research articles are not Next routes at all. Each is a signed, standalone
 * publication bundle (publications/<id>/article.html) that the build copies
 * into ./out byte for byte — see scripts/export-publications.ts. Next never
 * renders an article.
 */
function isEmptyList(file, name) {
  const src = readFileSync(new URL(file, import.meta.url), "utf8");
  return new RegExp(`export const ${name}[^=\\n]*=\\s*\\[\\s*\\];`).test(src);
}

const pageExtensions = ["tsx", "ts"];
if (!isEmptyList("./content/journal.ts", "journal")) pageExtensions.push("journal.tsx");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions,
  // There is no Image Optimization server on a static host. The site ships SVG
  // logos with explicit dimensions, so nothing is lost.
  images: { unoptimized: true },
};
export default nextConfig;
