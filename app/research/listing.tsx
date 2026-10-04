"use client";

import { useSearchParams } from "next/navigation";
import type { EvidenceClass, Topic } from "@/content/types";
import type { PublicationSummary } from "@/lib/publications/types";
import { ResearchListingView } from "./listing-view";

/**
 * Filters are URL state (`?topic=…&status=…`), so a filtered view is linkable
 * and shareable, and every control is an ordinary link — keyboard- and
 * screen-reader-navigable.
 *
 * The query string is read on the client because the site is statically
 * exported and one HTML file serves every query string. Until this hydrates,
 * the Suspense fallback in page.tsx shows the same listing unfiltered.
 */
export function ResearchListing({ records }: { records: PublicationSummary[] }) {
  const params = useSearchParams();
  return (
    <ResearchListingView
      records={records}
      topic={(params.get("topic") ?? undefined) as Topic | undefined}
      status={(params.get("status") ?? undefined) as EvidenceClass | undefined}
    />
  );
}
