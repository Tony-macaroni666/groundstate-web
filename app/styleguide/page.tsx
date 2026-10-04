import type { Metadata } from "next";
import { PublicationCard } from "@/components/article";
import { EvidenceBadge, EvidenceBlock, EvidenceKey } from "@/components/evidence";
import { MethodFlow } from "@/components/diagram";
import { Container, PageHeader, Section } from "@/components/layout";
import { Button, Callout, Label, MetricBlock, SectionBlock } from "@/components/primitives";
import { EVIDENCE_CLASSES } from "@/content/types";
import type { PublicationSummary } from "@/lib/publications/types";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Style guide",
  description: "Internal component reference.",
  path: "/styleguide",
  noindex: true,
});

/**
 * Component fixtures.
 *
 * Deliberately self-describing: this page renders components, and the text in
 * them says so. It is not editorial content, it is noindex, it is excluded from
 * the sitemap and from robots.txt, and nothing here is or could be mistaken for
 * a published record.
 */
const fixture: PublicationSummary = {
  route: "/styleguide",
  title: "Component fixture — this is not a publication",
  dek: "Fixture text, present so the card can be seen at a realistic length. It says nothing about any subject.",
  domain: "strength-conditioning",
  status: "contested",
  publishedOn: "2026-01-01",
};

const swatches = [
  ["bone", "#F3F0E9"], ["bone-deep", "#E4DFD3"], ["charcoal", "#171A19"],
  ["ink", "#0F1211"], ["forest", "#1C4B3C"], ["sage", "#6FA88C"], ["gray", "#7C837E"],
];

export default function StyleguidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Internal"
        title="Style guide"
        lead="Every component in the system. Toggle the theme in the header to check both modes."
      />

      <Section>
        <Container>
          <SectionBlock number="01" eyebrow="Colour">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6">
              {swatches.map(([name, hex]) => (
                <div key={name}>
                  <div className="aspect-square border rule" style={{ background: hex }} />
                  <p className="label mt-3">{name}</p>
                  <p className="text-caption muted">{hex}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="02" eyebrow="Typography">
            <div className="space-y-8">
              <p className="text-display">Display 64</p>
              <p className="text-h1">Heading 1 · 48</p>
              <p className="text-h2">Heading 2 · 32</p>
              <p className="text-h3">Heading 3 · 24</p>
              <p className="text-body-l max-w-prose">Body large · 18. {fixture.dek}</p>
              <p className="text-body max-w-prose">Body · 16. {fixture.dek}</p>
              <p className="text-small muted">Small · 14</p>
              <p className="text-caption muted">Caption · 12</p>
              <p className="label">Label · 11, +0.14em, uppercase</p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="03" eyebrow="Buttons">
            <div className="flex flex-wrap gap-4 items-center">
              <Button href="#">Primary</Button>
              <Button href="#" variant="secondary">Secondary</Button>
              <Button href="#" variant="text">Text link</Button>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="04" eyebrow="Evidence badges" lead="Encoded by form, not by a traffic light. Forest appears on Supported only.">
            <div className="flex flex-wrap gap-4 mb-16">
              {EVIDENCE_CLASSES.map((c) => (
                <EvidenceBadge key={c.id} status={c.id} />
              ))}
            </div>
            <EvidenceKey />
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="04b"
            eyebrow="Verdict panel"
            lead="Three axes. Status is always present; certainty and direction render only where the record carries them — they are never derived from status. The values below are component examples on an internal page, not evidence about any claim."
          >
            <p className="label mb-4">With all three axes</p>
            <EvidenceBlock
              status="unsupported"
              note="Example values, shown to exercise the component. No record asserts this."
              certainty="moderate"
              direction="null"
            />
            <p className="label mb-4 mt-16">Status only — how every current article renders</p>
            <EvidenceBlock
              status="contested"
              note="No certainty or direction has been adjudicated, so neither is shown."
            />
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="05" eyebrow="Cards">
            <div className="grid gap-12 md:grid-cols-3">
              <PublicationCard item={fixture} />
              <PublicationCard item={{ ...fixture, status: "uncertain", title: "Fixture with a short title" }} />
              <PublicationCard item={{ ...fixture, status: "supported", title: "Fixture with a very long title, shown so the card can be checked against the worst realistic case" }} />
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="06" eyebrow="Callouts and metrics">
            <Callout kind="takeaway" title="Key takeaway">
              Fixture text for the takeaway callout. No claim is being made.
            </Callout>
            <Callout kind="note" title="Note">
              A neutral callout, for context that is not a conclusion.
            </Callout>
            <div className="my-16">
              <MetricBlock
                items={[
                  { value: "4", label: "Evidence classes" },
                  { value: "5", label: "Requirements" },
                  { value: "0", label: "Unqualified claims" },
                ]}
              />
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="07" eyebrow="Diagram">
            <MethodFlow />
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="08" eyebrow="Logo">
            <div className="grid gap-12 sm:grid-cols-2">
              <div className="border rule p-8 bg-bone">
                <Label className="mb-6">On bone</Label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/lockup-tagline-light.svg" alt="Ground State" className="w-full max-w-[320px]" />
              </div>
              <div className="border border-ink-rule p-8 bg-ink">
                <p className="label mb-6">On ink</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/lockup-tagline-dark.svg" alt="Ground State" className="w-full max-w-[320px]" />
              </div>
            </div>
          </SectionBlock>
        </Container>
      </Section>
    </>
  );
}
