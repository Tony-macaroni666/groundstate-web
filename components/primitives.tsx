import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ Label */

export function Label({ children, as: As = "p", className = "" }: {
  children: ReactNode; as?: "p" | "span" | "h2" | "div"; className?: string;
}) {
  return <As className={`label ${className}`}>{children}</As>;
}

/* ----------------------------------------------------------------- Button */

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "text";
  type?: "button" | "submit";
  className?: string;
};

const buttonStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-forest text-bone hover:bg-charcoal dark:bg-sage dark:text-ink dark:hover:bg-bone px-6 py-3",
  secondary:
    "border border-charcoal text-charcoal hover:bg-charcoal hover:text-bone " +
    "dark:border-bone dark:text-bone dark:hover:bg-bone dark:hover:text-ink px-6 py-3",
  text: "text-charcoal dark:text-bone underline underline-offset-4 decoration-1 hover:decoration-2",
};

export function Button({ children, href, variant = "primary", type = "button", className = "" }: ButtonProps) {
  const cls =
    `inline-flex items-center gap-3 text-small font-medium rounded transition-colors ` +
    `${buttonStyles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
        {variant !== "text" && <Arrow />}
      </Link>
    );
  }
  return (
    <button type={type} className={cls}>
      {children}
      {variant !== "text" && <Arrow />}
    </button>
  );
}

function Arrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path d="M9 1l4 4-4 4M13 5H0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ----------------------------------------------------------- SectionBlock */

export function SectionBlock({ number, eyebrow, heading, lead, children, className = "" }: {
  number?: string; eyebrow?: string; heading?: string; lead?: string;
  children?: ReactNode; className?: string;
}) {
  // When the section has no heading of its own, the eyebrow IS its heading, and
  // the h3s inside it would otherwise sit directly under the page h1. `.label`
  // carries every type property, so this is a semantic change with no visual one.
  const eyebrowAs = !heading && (number || eyebrow) ? "h2" : "p";
  return (
    <section className={`border-t rule pt-8 ${className}`}>
      {(number || eyebrow) && (
        <Label as={eyebrowAs} className="mb-8 flex gap-4">
          {number && <span aria-hidden="true">{number}</span>}
          {eyebrow && <span>{eyebrow}</span>}
        </Label>
      )}
      {heading && <h2 className="text-h2 max-w-breakout">{heading}</h2>}
      {lead && <p className="text-body-l muted mt-6 max-w-prose">{lead}</p>}
      {children && <div className="mt-12">{children}</div>}
    </section>
  );
}

/* ---------------------------------------------------------------- Callout */

export function Callout({ kind, title, children }: {
  kind: "takeaway" | "limitation" | "note"; title: string; children: ReactNode;
}) {
  const accent =
    kind === "takeaway"
      ? "border-l-forest dark:border-l-sage"
      : "border-l-bone-deep dark:border-l-ink-rule";
  return (
    <aside className={`border-l-2 ${accent} pl-6 py-2 my-12`}>
      <Label className="mb-3">{title}</Label>
      <div className="text-body-l">{children}</div>
    </aside>
  );
}

/* ------------------------------------------------------------ MetricBlock */

export function MetricBlock({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t rule pt-8">
      {items.map((it) => (
        <div key={it.label}>
          <dd className="text-h2 tabular-nums">{it.value}</dd>
          <dt className="label mt-2">{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------- Disclaimer */

export function Disclaimer() {
  return (
    <p className="text-caption muted max-w-prose mt-16 border-t rule pt-6">
      General information, not individual medical advice. Nothing here replaces
      assessment by a qualified clinician who can examine you. If you have a
      diagnosed condition, an acute injury, or you are pregnant, speak to one
      before changing what you do.
    </p>
  );
}
