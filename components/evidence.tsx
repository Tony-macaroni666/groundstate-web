import type { ReactElement } from "react";
import {
  CERTAINTY_LABELS,
  DIRECTION_LABELS,
  EVIDENCE_CLASSES,
  type Certainty,
  type Direction,
  type EvidenceClass,
} from "@/content/types";

/**
 * Evidence status is encoded by FORM, not by a red/amber/green traffic light.
 * A traffic light would break the one-accent palette, read as a generic
 * dashboard, and fail colour-blind readers. Forest appears on Supported only.
 */
const glyphs: Record<EvidenceClass, ReactElement> = {
  supported: <rect x="0" y="0" width="8" height="8" fill="currentColor" />,
  contested: (
    <>
      <rect x="0.5" y="0.5" width="7" height="7" fill="none" stroke="currentColor" />
      <rect x="0.5" y="0.5" width="3.5" height="7" fill="currentColor" />
    </>
  ),
  uncertain: <rect x="0.5" y="0.5" width="7" height="7" fill="none" stroke="currentColor" />,
  unsupported: (
    <>
      <rect x="0.5" y="0.5" width="7" height="7" fill="none" stroke="currentColor" />
      <path d="M0.5 7.5L7.5 0.5" stroke="currentColor" />
    </>
  ),
};

const badgeStyles: Record<EvidenceClass, string> = {
  supported: "bg-forest text-bone border border-forest dark:bg-sage dark:text-ink dark:border-sage",
  contested: "border border-charcoal text-charcoal dark:border-bone dark:text-bone",
  uncertain: "border border-dashed border-charcoal text-charcoal dark:border-bone dark:text-bone",
  unsupported: "border border-gray muted",
};

export function EvidenceBadge({ status, className = "" }: { status: EvidenceClass; className?: string }) {
  const meta = EVIDENCE_CLASSES.find((c) => c.id === status)!;
  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded text-label uppercase ${badgeStyles[status]} ${className}`}
      title={meta.definition}
      aria-label={`Evidence: ${meta.label}. ${meta.definition}`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0">
        {glyphs[status]}
      </svg>
      {meta.label}
    </span>
  );
}

/**
 * The verdict panel. STATUS is always present; CERTAINTY and DIRECTION render
 * only when the record carries them. Nothing here is derived from STATUS — an
 * article with no adjudicated certainty shows no certainty.
 */
export function EvidenceBlock({
  status, note, certainty, direction,
}: {
  status: EvidenceClass;
  note?: string;
  certainty?: Certainty;
  direction?: Direction;
}) {
  const meta = EVIDENCE_CLASSES.find((c) => c.id === status)!;
  const axes: { label: string; value: string }[] = [];
  if (certainty) axes.push({ label: "Certainty", value: CERTAINTY_LABELS[certainty] });
  if (direction) axes.push({ label: "Direction", value: DIRECTION_LABELS[direction] });

  return (
    <section className="border rule my-12" aria-labelledby="evidence-status">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <h2 id="evidence-status" className="label">
            Verdict
          </h2>
          <EvidenceBadge status={status} />
        </div>
        <p className="text-body mt-4 max-w-prose">{meta.definition}</p>
        {note && <p className="text-small muted mt-4 max-w-prose">{note}</p>}
      </div>

      {axes.length > 0 && (
        <dl className="grid grid-cols-2 border-t rule divide-x divide-bone-deep dark:divide-ink-rule">
          {axes.map((a) => (
            <div key={a.label} className="p-6">
              <dt className="label mb-2">{a.label}</dt>
              <dd className="text-body">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function EvidenceKey() {
  return (
    <dl className="grid gap-8 sm:grid-cols-2">
      {EVIDENCE_CLASSES.map((c) => (
        <div key={c.id} className="border-t rule pt-6">
          <dt className="mb-3">
            <EvidenceBadge status={c.id} />
          </dt>
          <dd className="text-body muted">{c.definition}</dd>
        </div>
      ))}
    </dl>
  );
}
