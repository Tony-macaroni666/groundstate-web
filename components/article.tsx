import { EvidenceBadge } from "./evidence";
import { Label } from "./primitives";
import { TOPICS } from "@/content/types";
import type { Domain } from "@/lib/publications/contract";
import type { PublicationSummary } from "@/lib/publications/types";

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export function topicLabel(id: Domain) {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

/**
 * A listing card. Every word on it comes from the signed manifest's `listing`
 * block; the site writes none of it. Status only — the listing never shows
 * certainty or direction.
 *
 * The link is a plain <a>, not next/link: an article is a separate, standalone
 * evidence surface served as its own document, not a route of this app.
 */
export function PublicationCard({ item }: { item: PublicationSummary }) {
  return (
    <article className="group border-t rule pt-6 flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Label>{topicLabel(item.domain)}</Label>
        <EvidenceBadge status={item.status} />
      </div>
      <h3 className="text-h3 mb-4">
        <a href={item.route} className="hover:text-forest dark:hover:text-sage transition-colors">
          {item.title}
        </a>
      </h3>
      <p className="text-body muted mb-6 flex-1">{item.dek}</p>
      <p className="label">
        <time dateTime={item.publishedOn}>{formatDate(item.publishedOn)}</time>
      </p>
    </article>
  );
}
