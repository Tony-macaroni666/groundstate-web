import type { Metadata } from "next";
import { Container, PageHeader, Section } from "@/components/layout";
import { Label } from "@/components/primitives";
import { CONTACT, contactChannelOpen } from "@/site.config";
import { ContactForm } from "./form";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "General enquiries, corrections and updates for Ground State.",
  path: "/contact",
});

/**
 * The form ships only when there is somewhere for it to post.
 *
 * The prototype shipped one that validated input, POSTed to a stub, and told the
 * reader their message had "reached us". It had not. A form that silently
 * discards a correction is worse than no form on a site whose whole proposition
 * is that it tells you what it does and does not know.
 *
 * TO OPEN THE CHANNEL: set `NEXT_PUBLIC_CONTACT_ENDPOINT` to a real form
 * backend. It needs server-side validation, rate limiting and spam protection,
 * and it holds the recipient as `CONTACT_RECIPIENT` — which never appears in
 * this repository or in anything served to a browser. No public address is
 * shown and no `mailto:` is used.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        lead="General enquiries, corrections, and questions about a record."
      />
      <Section>
        <Container>
          <div className="grid gap-16 lg:grid-cols-[1fr_320px] items-start">
            <div className="max-w-prose">
              {contactChannelOpen && CONTACT.formEndpoint ? (
                <ContactForm endpoint={CONTACT.formEndpoint} />
              ) : (
                <div className="border-t rule pt-8">
                  <Label className="mb-6" as="h2">No channel open yet</Label>
                  <p className="text-body-l">
                    There is no working contact form on this site yet. Rather
                    than publish one that goes nowhere, this page says so.
                  </p>
                  <p className="text-body muted mt-6">
                    A monitored channel opens here before the first record is
                    published, because a correction that cannot reach anyone is
                    the one failure this platform cannot afford.
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-12">
              <div className="border-t rule pt-6">
                <Label className="mb-3" as="h2">Corrections</Label>
                <p className="text-body muted">
                  If a record misreads a source, say which source and where. A
                  correction that holds up is published as a revision, with the
                  change recorded — not quietly edited in.
                </p>
              </div>
              <div className="border-t rule pt-6">
                <Label className="mb-3" as="h2">Updates</Label>
                <p className="text-body muted">
                  There is no mailing list yet. When there is one, it will be one
                  synthesis at a time and nothing else.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
