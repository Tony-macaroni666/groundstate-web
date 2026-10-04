import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalEntry, publishedJournal } from "@/content/journal";
import { formatDate } from "@/components/article";
import { Disclaimer, Label } from "@/components/primitives";
import { Container, Section } from "@/components/layout";
import { pageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return publishedJournal().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getJournalEntry(slug);
  if (!entry) return pageMetadata({ title: "Journal", path: "/journal", noindex: true });
  return pageMetadata({
    title: entry.title,
    description: entry.summary,
    path: `/journal/${entry.slug}`,
    type: "article",
    publishedTime: entry.date,
    ogImage: entry.ogImage,
  });
}

export default async function JournalEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getJournalEntry(slug);
  if (!entry) notFound();

  const others = publishedJournal().filter((e) => e.slug !== entry.slug).slice(0, 3);

  return (
    <>
      <Container className="pt-16 md:pt-24">
        <div className="max-w-breakout">
          <p className="label flex flex-wrap gap-4 mb-8">
            <Link href="/journal" className="hover:text-charcoal dark:hover:text-bone">
              Journal
            </Link>
            <span aria-hidden="true">·</span>
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{entry.readingTime} min read</span>
          </p>
          <h1 className="text-h1">{entry.title}</h1>
          {entry.subtitle && <p className="text-body-l muted mt-6 max-w-prose">{entry.subtitle}</p>}
        </div>
      </Container>

      <Container className="pb-24">
        <article className="max-w-prose">
          <p className="text-body-l mt-8">{entry.summary}</p>

          {/* No evidence badge, ever. A synthesis reads records; it does not
              adjudicate them. Stating that is cheaper than being misread. */}
          <aside className="border-l-2 border-bone-deep dark:border-ink-rule pl-6 py-2 my-12">
            <Label className="mb-3">Synthesis, not a verdict</Label>
            <p className="text-body muted">
              This entry reads across records that were each adjudicated
              separately. It is not a systematic review and carries no evidence
              class of its own. Every verdict referred to below belongs to the
              record it came from, listed in full at the end.
            </p>
          </aside>

          {entry.sections.map((s) => (
            <section key={s.heading} className="mt-16">
              <h2 className="text-h3 mb-6">{s.heading}</h2>
              <div className="space-y-6">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-body-l">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* Provenance. Internal record identifiers are never shown in public
              presentation (owner decision, 3 October 2026), and the website has
              no mapping from a record to its published article — it receives
              publication bundles only. So the page states how many records the
              entry derives from and names none. Linking each one needs a public
              reference in the entry itself: an open decision, see README. */}
          <section aria-labelledby="derived-from" className="mt-16 border-t rule pt-8">
            <Label as="h2" className="mb-6">
              <span id="derived-from">Records this synthesis reads</span>
            </Label>
            <p className="text-body muted">
              Derived from {entry.gserIds.length} approved evidence{" "}
              {entry.gserIds.length === 1 ? "record" : "records"}.
            </p>
          </section>

          <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex gap-2">
              <dt className="label">Entry</dt>
              <dd className="label text-charcoal dark:text-bone">{entry.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="label">Version</dt>
              <dd className="label text-charcoal dark:text-bone">{entry.version}</dd>
            </div>
            {entry.status === "revised" && (
              <div className="flex gap-2">
                <dt className="label">State</dt>
                <dd className="label text-charcoal dark:text-bone">Revised</dd>
              </div>
            )}
          </dl>

          <Disclaimer />
        </article>
      </Container>

      {others.length > 0 && (
        <Section className="border-t rule">
          <Container>
            <Label as="h2" className="mb-12">
              More synthesis
            </Label>
            <div className="grid gap-12 md:grid-cols-3">
              {others.map((e) => (
                <article key={e.id} className="border-t rule pt-6">
                  <Label className="mb-4">Synthesis</Label>
                  <h3 className="text-h3 mb-4">
                    <Link
                      href={`/journal/${e.slug}`}
                      className="hover:text-forest dark:hover:text-sage transition-colors"
                    >
                      {e.title}
                    </Link>
                  </h3>
                  <p className="label">
                    <time dateTime={e.date}>{formatDate(e.date)}</time>
                  </p>
                </article>
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
