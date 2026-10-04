import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { EvidenceKey } from "@/components/evidence";
import { MethodFlow } from "@/components/diagram";
import { Container, PageHeader, Section } from "@/components/layout";
import { SectionBlock } from "@/components/primitives";

export const metadata: Metadata = pageMetadata({
  title: "Standard",
  description:
    "What a claim has to survive before Ground State publishes it: traced to a primary source, read in full, weighed against what disagrees, classified, and translated into practice.",
  path: "/standard",
});

export default function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="The standard"
        title="What a claim has to survive before we publish it."
        lead="This is a set of requirements, not a workflow. Every one of them is checkable from the finished piece — if a synthesis does not meet them, you can tell by reading it."
      />

      <Section>
        <Container>
          <SectionBlock number="01" eyebrow="Five requirements">
            <MethodFlow />
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="02"
            eyebrow="Traced"
            heading="A claim is traced back to the evidence it rests on, not to who repeated it."
          >
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l muted max-w-prose">
                Most performance advice is a conclusion that has travelled a long
                way from its source. It gets quoted, compressed, quoted again, and
                by the fourth repetition the qualifier has fallen off. The first
                requirement is to walk it back to what it actually rests on —
                a trial, a review, a guideline — and to record which of those it
                is, because what a source is determines what it can support.
              </p>
              <p className="text-body-l muted max-w-prose">
                Where a claim traces to a source that does not say what the claim
                says, that becomes the finding. Several pieces in this archive
                exist for exactly that reason.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="03"
            eyebrow="Accessed"
            heading="Full text is preferred, and the claim never reaches past what could be verified."
          >
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l muted max-w-prose">
                Abstracts overstate. Effect sizes shrink between the abstract and
                the results table, control conditions turn out weaker than
                described, and the population is narrower than the conclusion
                implies. So full text is what a synthesis is built on wherever it
                can be obtained.
              </p>
              <p className="text-body-l muted max-w-prose">
                Sometimes it cannot be. When only an abstract or a citation
                record is available, the claim is explicitly constrained by what
                that actually establishes — and a record that carries no more
                than a title and a journal cannot substantively support a claim
                at all. What was read is part of what is known.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="04"
            eyebrow="Weighed"
            heading="Disagreement is looked for, not averaged out."
          >
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l muted max-w-prose">
                Every question is worked from both directions: what supports the
                claim, and what would have to be true for it to be wrong. The
                second search is the one that changes verdicts, and it is the one
                most easily skipped, because the first already produced an answer.
              </p>
              <p className="text-body-l muted max-w-prose">
                Where credible sources disagree, the disagreement carries through
                to publication rather than being resolved by picking a side. A
                confident answer to a contested question is a failure, not a
                service.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="05"
            eyebrow="Classified"
            heading="Four verdicts, because “it works” and “we don’t know yet” are different answers."
            lead="Every synthesis carries exactly one of these, visible on the card before you open it. There is no fifth option and no hedging between them."
          >
            <EvidenceKey />
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="06"
            eyebrow="Translated"
            heading="Into what the evidence changes in practice — including when that is nothing."
          >
            <div className="grid gap-12 md:grid-cols-2">
              <p className="text-body-l muted max-w-prose">
                Every synthesis says what the evidence changes in practice, and
                the recommendation never reaches further than the evidence does.
                Where the honest reading is that nothing should change yet, that
                is the practical implication, stated as plainly as any other.
              </p>
              <p className="text-body-l muted max-w-prose">
                It also ends in limitations. Not as a disclaimer at the bottom,
                but as part of the answer: knowing where a finding stops applying
                is most of knowing how to use it.
              </p>
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section className="border-t rule">
        <Container>
          <div className="max-w-prose">
            <p className="label mb-8">On tools</p>
            <p className="text-body-l">
              Searching, retrieval and drafting all use software, the way every
              research process has for thirty years. Nothing in the list above is
              satisfied by software, and no tool decides a verdict — agreement
              between two search passes is a process signal, not evidence.
              Nothing publishes that cannot be defended line by line against its
              sources.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
