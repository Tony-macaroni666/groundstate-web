/**
 * JOURNAL — weekly synthesis across Ground State evidence records.
 *
 * A Journal entry is a *second-order* content type. It reads across several
 * approved GSERs published that week and reports what they say together:
 * patterns, agreements, contradictions, what changed, what is still open, and
 * what that means in practice.
 *
 * Three rules govern it, and they are the reason it has its own type rather
 * than reusing `Article`:
 *
 *  1. A Journal entry NEVER carries an evidence verdict. It adjudicates nothing.
 *     There is no `status: EvidenceClass` field here and there must never be
 *     one — the verdict belongs to the record, and repeating it at this layer
 *     would create a second, unadjudicated one.
 *  2. It is not a systematic review and must not be presented as one. It is an
 *     editorial reading of records that were each adjudicated separately.
 *  3. It must never introduce a factual claim that no underlying record
 *     supports. `gserIds` is mandatory and non-empty: every entry states which
 *     records it derives from, and the page links to each one.
 */

/**
 * Publication lifecycle. This is NOT an evidence verdict — see rule 1 above.
 * It answers "is this piece published", never "how strong is the evidence".
 */
export type JournalStatus = "draft" | "published" | "revised";

/** One section of the body. */
export interface JournalSection {
  heading: string;
  paragraphs: string[];
}

/**
 * Field names follow the repository's TypeScript convention (camelCase). The
 * corresponding field in the Journal data spec is given where the two differ.
 */
export interface JournalEntry {
  /** Stable identifier, e.g. "GSJ-0001". Assigned once, never reused. */
  id: string;
  /** URL segment: /journal/<slug>. */
  slug: string;
  title: string;
  /** One line under the title. Optional. */
  subtitle?: string;
  /** ISO date of publication. */
  date: string;
  /** Standfirst — what this week's records say together, in two or three lines. */
  summary: string;
  /** Spec field: `reading_time`. Whole minutes. */
  readingTime: number;
  /**
   * Spec field: `gser_ids`. The records this synthesis derives from.
   * Non-empty by contract — a synthesis with no sources is an opinion piece,
   * and this content type is not for opinion pieces.
   */
  gserIds: string[];
  sections: JournalSection[];
  /** Page-specific social preview path. Absent uses the site-wide default. */
  ogImage?: string;
  status: JournalStatus;
  /** Revision of this entry, e.g. "1.0". */
  version: string;
}

/**
 * EMPTY BY DESIGN.
 *
 * The three notes previously here were demonstration copy. They described no
 * real records and derived from none, so they could not become Journal entries
 * under the rules above. The listing and the entry template render from this
 * array; the launch state is the zero case.
 *
 * TO ADD AN ENTRY: append a `JournalEntry` whose `gserIds` name approved
 * records. Ids that have a published article resolve to a link automatically
 * (see `lib/gser/load.ts` → `summaryForRecord`); ids without one are listed
 * as text, so the provenance is visible even before the article is public.
 */
export const journal: JournalEntry[] = [];

/** Newest first. */
export function publishedJournal() {
  return journal
    .filter((e) => e.status !== "draft")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getJournalEntry(slug: string) {
  return journal.find((e) => e.slug === slug && e.status !== "draft");
}
