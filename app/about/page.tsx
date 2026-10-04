import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { Container, PageHeader, Section } from "@/components/layout";
import { SectionBlock } from "@/components/primitives";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "What Ground State is, what the name means, why the brand is faceless, and the principles behind it.",
  path: "/about",
});

const principles = [
  ["Strength before conclusion", "How good the evidence is comes before what to do about it. Always in that order."],
  ["Uncertainty is content", "“We don’t know yet” is published as readily as a conclusion. It is the more useful answer more often than people expect."],
  ["Source-traced", "A claim is traced back to the evidence it actually rests on, not to whoever repeated it most recently."],
  ["One variable at a time", "Systems are changed deliberately, so that when something works you know what it was."],
  ["Long horizons", "Decisions are judged over years. Most things that work quickly stop working quickly."],
  ["Practical when justified", "Every synthesis states what the evidence changes in practice — including when the justified action is to change nothing."],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Evidence, systems, and application."
        lead="An independent human-performance knowledge platform that turns primary research into transparent, practical decisions — without pretending the evidence is cleaner than it really is."
      />

      <Section>
        <Container>
          <SectionBlock number="01" eyebrow="Mission">
            <p className="text-body-l max-w-prose">
              To make the state of the evidence on human performance legible, and
              then usable. Most of what circulates about training, recovery and
              nutrition is a conclusion with the reasoning stripped out — which
              makes it impossible to tell a strong claim from a confident one.
              Ground State publishes the reasoning and the strength alongside the
              conclusion. The evidence shows up in the verdicts, the limitations
              and the sources.
            </p>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="02" eyebrow="What the name means">
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l max-w-prose">
                In physics, a ground state is the lowest stable energy
                configuration of a system — the reference against which every
                other state is described. Nothing about a system means anything
                until you know its baseline.
              </p>
              <p className="text-body-l muted max-w-prose">
                The same is true of a person. Sleep, load, stress, history and
                habit form a baseline, and an intervention only makes sense
                relative to it. Understand the system first. Then improve the
                outcome.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="03" eyebrow="Principles">
            <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {principles.map(([h, p], i) => (
                <div key={h} className="border-t rule pt-6">
                  <span className="label block mb-3">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-h3 mb-3">{h}</h3>
                  <p className="text-body muted">{p}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="04" eyebrow="Source-led, not personality-led">
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l max-w-prose">
                Ground State Research is intentionally source-led rather than
                personality-led. A claim is evaluated through its evidence and
                its provenance — what the sources are, what they measured, and
                how far they reach. Who is making the claim is not one of those
                inputs.
              </p>
              <p className="text-body-l muted max-w-prose">
                That is a statement about method, not about other people. Plenty
                of good work is published under a name. The point is narrower:
                an author&rsquo;s identity should never substitute for checking
                the source, and a reader should not have to trust anyone to
                verify a record here.
              </p>
              <p className="text-body-l muted max-w-prose md:col-span-2">
                Nor is it anonymity as a shield. Human review remains part of
                governance — a person reviews what publishes and is answerable
                for it. Facelessness removes the shortcut, not the
                accountability.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>
    </>
  );
}
