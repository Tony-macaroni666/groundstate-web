/**
 * The five requirements. This is a standard, not a workflow — each item is a
 * condition the finished piece can be checked against, which is why they are
 * stated as past participles rather than as process steps.
 */
const steps = [
  { n: "01", title: "Traced", note: "Back to the primary source, not to whoever repeated it most recently." },
  { n: "02", title: "Accessed", note: "Full text preferred. A claim never reaches past what could actually be verified." },
  { n: "03", title: "Weighed", note: "Against what would have to be true for the claim to be wrong." },
  { n: "04", title: "Classified", note: "One of four verdicts. No fifth option, no hedging between them." },
  { n: "05", title: "Translated", note: "Into what the evidence changes in practice — including when that is nothing." },
];

export function MethodFlow({ tone = "light" }: { tone?: "light" | "dark" }) {
  const rule = tone === "dark" ? "border-ink-rule" : "border-bone-deep dark:border-ink-rule";
  const accent = tone === "dark" ? "text-sage" : "text-forest dark:text-sage";
  // On the inverted band Gray measures 4.51:1 on Charcoal but only 4.35:1 on
  // Ink Raised, so dark mode steps up to Gray Dark (5.40:1). On Bone, Gray is
  // 3.41:1 and the default tone uses the compliant pairing instead.
  const muted = tone === "dark" ? "text-gray dark:text-gray-dark" : "muted";
  return (
    <ol className="grid gap-8 md:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.n} className={`border-t ${rule} pt-6`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-label uppercase ${muted}`}>{s.n}</span>
            {i < steps.length - 1 && (
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true"
                   className={`hidden md:block ${accent}`}>
                <path d="M9 1l4 3-4 3M13 4H0" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            )}
          </div>
          <h3 className="text-body font-semibold mb-2">{s.title}</h3>
          <p className={`text-small ${muted}`}>{s.note}</p>
        </li>
      ))}
    </ol>
  );
}
