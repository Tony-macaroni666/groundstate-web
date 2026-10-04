import Link from "next/link";
import { PublicationCard } from "@/components/article";
import { Label } from "@/components/primitives";
import { EVIDENCE_CLASSES, TOPICS, type EvidenceClass, type Topic } from "@/content/types";
import type { PublicationSummary } from "@/lib/publications/types";

/**
 * The listing, rendered from an explicit filter state.
 *
 * It holds no hooks, so the same component produces the static HTML at build
 * time (unfiltered — see page.tsx) and the filtered view after hydration. That
 * matters: the records have to be in the HTML for a crawler and for a reader
 * without JavaScript, not assembled afterwards.
 */
export function ResearchListingView({
  records,
  topic,
  status,
}: {
  records: PublicationSummary[];
  topic?: Topic;
  status?: EvidenceClass;
}) {

  const href = (patch: { topic?: string; status?: string }) => {
    const next = { topic, status, ...patch };
    const qs = new URLSearchParams();
    if (next.topic && next.topic !== "all") qs.set("topic", next.topic);
    if (next.status && next.status !== "all") qs.set("status", next.status);
    const s = qs.toString();
    return s ? `/research?${s}` : "/research";
  };

  const chip = (active: boolean) =>
    `text-small px-3 py-1.5 rounded border transition-colors ${
      active
        ? "border-charcoal bg-charcoal text-bone dark:border-bone dark:bg-bone dark:text-ink"
        : "border-bone-deep dark:border-ink-rule muted hover:text-charcoal dark:hover:text-bone"
    }`;

  const results = records.filter(
    (r) => (!topic || r.domain === topic) && (!status || r.status === status),
  );

  const filtered = Boolean(topic || status);
  const empty = records.length === 0;

  return (
    <>
      {/* The filter bar is suppressed at zero records: filtering nothing into
          nothing is a dead control, not an empty state. */}
      {!empty && (
        <nav aria-label="Filter research" className="space-y-8 border-t rule pt-8">
          <div>
            <Label className="mb-4" as="h2">Filter by domain</Label>
            <div className="flex flex-wrap gap-2">
              <Link href={href({ topic: "all" })} aria-current={!topic ? "true" : undefined} className={chip(!topic)}>
                All
              </Link>
              {TOPICS.map((t) => (
                <Link
                  key={t.id}
                  href={href({ topic: t.id })}
                  aria-current={topic === t.id ? "true" : undefined}
                  className={chip(topic === t.id)}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-4" as="h2">Filter by evidence</Label>
            <div className="flex flex-wrap gap-2">
              <Link href={href({ status: "all" })} aria-current={!status ? "true" : undefined} className={chip(!status)}>
                All
              </Link>
              {EVIDENCE_CLASSES.map((c) => (
                <Link
                  key={c.id}
                  href={href({ status: c.id })}
                  aria-current={status === c.id ? "true" : undefined}
                  className={chip(status === c.id)}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      <div className="pt-16 md:pt-24">
        {empty ? (
          <div className="border-t rule pt-8 max-w-prose">
            <Label className="mb-6" as="h2">No records published yet</Label>
            <p className="text-body-l">
              The first evidence records are being adjudicated. Nothing is
              published here until it has been traced to its primary sources,
              weighed against what disagrees with it, and given a verdict.
            </p>
            <p className="text-body muted mt-6">
              An empty list is the honest state of a platform that has not
              published yet. It will not be filled with demonstration content to
              look busier than it is.
            </p>
          </div>
        ) : (
          <>
            <p className="label mb-12" role="status">
              {results.length} {results.length === 1 ? "record" : "records"}
              {filtered && ` of ${records.length}`}
            </p>
            {results.length === 0 ? (
              <p className="text-body-l muted">
                Nothing matches that combination yet.{" "}
                <Link href="/research" className="underline underline-offset-4 text-charcoal dark:text-bone">
                  Clear the filters
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                {results.map((r) => (
                  <PublicationCard key={r.route} item={r} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
