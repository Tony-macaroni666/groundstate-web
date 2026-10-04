import type { Metadata } from "next";
import Link from "next/link";
import { publishedJournal } from "@/content/journal";
import { Container, PageHeader, Section } from "@/components/layout";
import { Label } from "@/components/primitives";
import { formatDate } from "@/components/article";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Journal",
  description:
    "Weekly synthesis. Patterns, contradictions and practical implications across the evidence published by Ground State.",
  path: "/journal",
});

export default function JournalPage() {
  const entries = publishedJournal();

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="Weekly synthesis"
        lead="Patterns, contradictions and practical implications across the evidence published by Ground State."
      />
      <Container>
        {/* The absence of an evidence badge here is deliberate and stated, so a
            synthesis is never mistaken for an adjudicated record. */}
        <aside className="border-l-2 border-bone-deep dark:border-ink-rule pl-6 py-2">
          <Label className="mb-3" as="h2">Reads across records, adjudicates none</Label>
          <p className="text-body muted max-w-prose">
            A Journal entry carries no evidence verdict, because it makes no new
            evidence claim. Verdicts belong to the records it reads, and every
            entry links to each of them in{" "}
            <Link href="/research" className="underline underline-offset-4 text-charcoal dark:text-bone">
              Research
            </Link>
            .
          </p>
        </aside>
      </Container>
      <Section>
        <Container>
          {entries.length === 0 ? (
            <div className="border-t rule pt-8 max-w-prose">
              <Label className="mb-6" as="h2">No synthesis published yet</Label>
              <p className="text-body-l">
                A Journal entry reads across the records approved that week. The
                first one publishes once there are records to read across.
              </p>
              <p className="text-body muted mt-6">
                Nothing is written here that the published records do not
                already support.
              </p>
            </div>
          ) : (
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((e) => (
                <article key={e.id} className="border-t rule pt-6 flex flex-col h-full">
                  <Label className="mb-4">Synthesis</Label>
                  <h2 className="text-h3 mb-4">
                    <Link
                      href={`/journal/${e.slug}`}
                      className="hover:text-forest dark:hover:text-sage transition-colors"
                    >
                      {e.title}
                    </Link>
                  </h2>
                  <p className="text-body muted mb-6 flex-1">{e.summary}</p>
                  <p className="label flex flex-wrap gap-x-4 gap-y-2">
                    <time dateTime={e.date}>{formatDate(e.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{e.readingTime} min read</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {e.gserIds.length} {e.gserIds.length === 1 ? "record" : "records"}
                    </span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
