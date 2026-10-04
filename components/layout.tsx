import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-content px-4 md:px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** Section rhythm: 128 desktop / 96 tablet / 64 mobile. */
export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`py-16 md:py-24 lg:py-32 ${className}`}>{children}</section>;
}

export function PageHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <Container className="pt-16 md:pt-24 pb-12">
      <p className="label mb-8">{eyebrow}</p>
      <h1 className="text-h1 max-w-breakout">{title}</h1>
      {lead && <p className="text-body-l muted mt-8 max-w-prose">{lead}</p>}
    </Container>
  );
}
