import Link from "next/link";
import { publishedArticles } from "@/lib/publications";
import { publishedJournal } from "@/content/journal";
import { TOPICS } from "@/content/types";
import { PublicationCard } from "@/components/article";
import { Button, Label, MetricBlock, SectionBlock } from "@/components/primitives";
import { EvidenceKey } from "@/components/evidence";
import { Container, Section } from "@/components/layout";
import { MethodFlow } from "@/components/diagram";

export default function Home() {
  const featured = publishedArticles().slice(0, 3);
  const latestSynthesis = publishedJournal()[0];
  return (
    <>
      {/* Hero — the one place the tagline is the headline, because the logo
          sits directly above it and supplies the category. */}
      <Container className="pt-24 md:pt-32 pb-16 md:pb-24">
        <Label className="mb-12">Human performance, traced to the evidence</Label>
        <h1 className="display-hero max-w-breakout">
          Understand the system.
          <br />
          Improve the outcome.
        </h1>
        <p className="text-body-l muted mt-12 max-w-prose">
          An independent human-performance knowledge platform. Strength and
          conditioning, musculoskeletal health, recovery, nutrition and
          behaviour — turned into practical decisions, including what we still
          don’t know.
        </p>
        <div className="flex flex-wrap gap-4 mt-12">
          <Button href="/research">Explore research</Button>
          <Button href="/standard" variant="secondary">
            Read the standard
          </Button>
        </div>
      </Container>

      <Container>
        <MetricBlock
          items={[
            { value: "4", label: "Evidence classes" },
            { value: "5", label: "Requirements a claim must meet" },
            { value: "0", label: "Claims published without a verdict" },
          ]}
        />
      </Container>

      <Section>
        <Container>
          <SectionBlock
            number="01"
            eyebrow="Research into practice"
            heading="Most training advice is a conclusion with the reasoning removed."
            lead="We publish the reasoning. Every piece states how strong the evidence is before it states what to do, and says plainly where the evidence runs out. A claim you cannot qualify is a claim you cannot use."
          >
            <div className="grid gap-8 md:grid-cols-3">
              {[
                ["Source-traced", "We trace claims back to the evidence they actually rest on, rather than relying on downstream summaries."],
                ["Stated strength", "Every claim carries one of four verdicts, visible before you read a word of the body."],
                ["Practical translation", "The output is what to do differently, not a literature review."],
              ].map(([h, p]) => (
                <div key={h} className="border-t rule pt-6">
                  <h3 className="text-body font-semibold mb-3">{h}</h3>
                  <p className="text-body muted">{p}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="02" eyebrow="Latest" heading="Recent syntheses">
            {featured.length === 0 ? (
              /* Zero records is a real launch state, not a layout to be filled
                 with demonstration content. */
              <div className="border-t rule pt-6 max-w-prose">
                <p className="text-body-l">
                  The first records are being adjudicated. Nothing appears here
                  until it has been traced, weighed and given a verdict.
                </p>
                <p className="text-body muted mt-6">
                  {latestSynthesis
                    ? "The Journal reads across the records as they publish."
                    : "Research and the weekly Journal synthesis both open with the first published records."}
                </p>
                <div className="mt-12 flex flex-wrap gap-8">
                  <Button href="/standard" variant="text">
                    Read the standard
                  </Button>
                  <Button href="/journal" variant="text">
                    The Journal
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-12 md:grid-cols-3">
                  {featured.map((r) => (
                    <PublicationCard key={r.route} item={r} />
                  ))}
                </div>
                <div className="mt-16">
                  <Button href="/research" variant="text">
                    All research
                  </Button>
                </div>
              </>
            )}
          </SectionBlock>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock number="03" eyebrow="Content pillars" heading="Five domains, one method.">
            <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICS.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/research?topic=${t.id}`}
                  className="group border-t rule pt-6 block hover:border-forest dark:hover:border-sage transition-colors"
                >
                  <span className="label block mb-3">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-h3 mb-3 group-hover:text-forest dark:group-hover:text-sage transition-colors">
                    {t.label}
                  </h3>
                  <p className="text-body muted">{t.note}</p>
                </Link>
              ))}
            </div>
          </SectionBlock>
        </Container>
      </Section>

      <Section className="bg-charcoal text-bone dark:bg-ink-raised">
        <Container>
          <div className="border-t border-ink-rule pt-8">
            <Label className="mb-8 flex gap-4 text-gray dark:text-gray-dark">
              <span aria-hidden="true">04</span>
              <span>Methodology</span>
            </Label>
            <h2 className="text-h2 max-w-breakout">
              How a question becomes something you can act on.
            </h2>
            <div className="mt-16">
              <MethodFlow tone="dark" />
            </div>
            <div className="mt-16">
              <Link
                href="/standard"
                className="text-small underline underline-offset-4 hover:text-sage transition-colors"
              >
                Read the full methodology
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionBlock
            number="05"
            eyebrow="Evidence classes"
            heading="Four verdicts, because “it works” and “we don’t know yet” are different answers."
          >
            <EvidenceKey />
          </SectionBlock>
        </Container>
      </Section>

      <Section className="border-t rule">
        <Container>
          <div className="grid gap-12 md:grid-cols-2 items-end">
            <div>
              <Label className="mb-8">Journal</Label>
              <h2 className="text-h2 max-w-prose">
                One synthesis a week, reading across everything published.
              </h2>
              <p className="text-body muted mt-6 max-w-prose">
                Patterns, contradictions and what changed — with a link to every
                record it derives from.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button href="/journal">Read the Journal</Button>
            </div>
          </div>
        </Container>
      </Section>

    </>
  );
}
