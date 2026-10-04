// What the pages read: the published articles, from their manifests only.
//
// Server-side, build-time only (it reads the filesystem). The listing is a client
// component, so it receives PublicationSummary values and imports the type, never
// this module. Every page that lists publications calls the verifier first: a
// bundle that would not pass the gate is not listed either — the build fails.

import { verifyPublications } from "./verify";
import type { PublicationSummary } from "./types";

let cache: PublicationSummary[] | undefined;

export function publishedArticles(): PublicationSummary[] {
  if (cache) return cache;
  const report = verifyPublications({ root: process.cwd() });
  if (report.errors.length) {
    throw new Error(`Publication bundles failed verification:\n- ${report.errors.join("\n- ")}`);
  }
  cache = report.active
    .map((b): PublicationSummary => {
      const l = b.manifest.listing!;
      return {
        route: b.manifest.route,
        title: l.title,
        dek: l.dek,
        domain: l.domain,
        status: l.evidence_status,
        publishedOn: l.published_on,
      };
    })
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.route.localeCompare(b.route));
  return cache;
}
