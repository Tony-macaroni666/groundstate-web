import type { Metadata } from "next";
import { Button } from "@/components/primitives";
import { Container } from "@/components/layout";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Not found",
  description: "That page is not here.",
  path: "/404",
  noindex: true,
});

export default function NotFound() {
  return (
    <Container className="py-32">
      <p className="label mb-8">404</p>
      <h1 className="text-h1 max-w-breakout">That page is not here.</h1>
      <p className="text-body-l muted mt-8 max-w-prose">
        It may have moved, or it may never have existed. Both happen.
      </p>
      <div className="mt-12 flex flex-wrap gap-4">
        <Button href="/research">Browse research</Button>
        <Button href="/" variant="secondary">
          Home
        </Button>
      </div>
    </Container>
  );
}
