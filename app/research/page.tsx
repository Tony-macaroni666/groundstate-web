import type { Metadata } from "next";
import { Suspense } from "react";
import { publishedArticles } from "@/lib/publications";
import { Container, PageHeader } from "@/components/layout";
import { pageMetadata } from "@/lib/metadata";
import { ResearchListing } from "./listing";
import { ResearchListingView } from "./listing-view";

export const metadata: Metadata = pageMetadata({
  title: "Research",
  description:
    "Evidence records across strength and conditioning, musculoskeletal health, recovery, nutrition and behaviour — each with its verdict stated before its conclusion.",
  path: "/research",
});

export default function ResearchPage() {
  const records = publishedArticles();
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Evidence syntheses"
        lead="Every record states how strong the evidence is before it states what to do. Five domains, one method."
      />
      <Container className="pb-16 md:pb-24 lg:pb-32">
        {/* The fallback is what lands in the exported HTML: the complete,
            unfiltered listing. Filtering is an enhancement on top of it, never
            the thing that makes the records appear. */}
        <Suspense fallback={<ResearchListingView records={records} />}>
          <ResearchListing records={records} />
        </Suspense>
      </Container>
    </>
  );
}
