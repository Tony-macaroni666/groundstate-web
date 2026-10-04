/** Five domains. A record has exactly one. See CONTENT-FRAMEWORK.md §3. */
export type Topic =
  | "strength-conditioning"
  | "musculoskeletal"
  | "recovery"
  | "nutrition"
  | "behaviour";

/**
 * Publication type — derived from the shape of the evidence, never chosen for
 * variety. See CONTENT-FRAMEWORK.md §2.
 */
export type PublicationType =
  | "research-note"
  | "contested"
  | "trace"
  | "mechanism"
  | "systems-lens"
  | "practice-brief";

/**
 * A claim assessment has three axes. STATUS is the only one the listing shows;
 * the others appear in the article's verdict panel when the record carries
 * them. They are never derived from STATUS — absent means absent.
 */
export type EvidenceClass = "supported" | "contested" | "uncertain" | "unsupported";

export type Certainty = "high" | "moderate" | "low" | "very-low";

export type Direction = "supports" | "null" | "contradicts" | "mixed" | "indeterminate";

export const CERTAINTY_LABELS: Record<Certainty, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  "very-low": "Very low",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  supports: "Supports",
  null: "Null",
  contradicts: "Contradicts",
  mixed: "Mixed",
  indeterminate: "Indeterminate",
};

export const TOPICS: { id: Topic; label: string; note: string }[] = [
  { id: "strength-conditioning", label: "Strength & Conditioning",
    note: "Programme design, adaptation, load, aerobic capacity, concurrent training." },
  { id: "musculoskeletal", label: "Musculoskeletal Health",
    note: "Rehabilitation, tendon and joint health, pain, return to performance." },
  { id: "recovery", label: "Recovery",
    note: "Sleep, fatigue management, deloads, and what the recovery industry oversells." },
  { id: "nutrition", label: "Nutrition",
    note: "Intake, timing, composition, supplementation." },
  { id: "behaviour", label: "Behaviour & Mental Health",
    note: "Adherence, habit, motivation, stress, the psychological side of load." },
];

export const PUBLICATION_TYPES: { id: PublicationType; label: string }[] = [
  { id: "research-note", label: "Research Note" },
  { id: "contested", label: "Contested Review" },
  { id: "trace", label: "Trace" },
  { id: "mechanism", label: "Mechanism" },
  { id: "systems-lens", label: "Systems Lens" },
  { id: "practice-brief", label: "Practice Brief" },
];

export const EVIDENCE_CLASSES: {
  id: EvidenceClass;
  label: string;
  definition: string;
}[] = [
  {
    id: "supported",
    label: "Supported",
    definition:
      "The claim is adequately supported by relevant evidence within its stated boundaries, with no unresolved contradiction strong enough to overturn the conclusion.",
  },
  {
    id: "contested",
    label: "Contested",
    definition:
      "Credible primary sources disagree. The disagreement is real and unresolved, not an artefact of one weak study.",
  },
  {
    id: "uncertain",
    label: "Uncertain",
    definition:
      "The evidence is too thin, too small, or too indirect to support a conclusion in either direction. Absence of evidence, not evidence of absence.",
  },
  {
    id: "unsupported",
    label: "Unsupported",
    definition:
      "The claim is widely repeated but the primary sources do not support it, or the sources cited do not say what they are said to say.",
  },
];
