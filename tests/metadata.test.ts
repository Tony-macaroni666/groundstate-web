import { describe, expect, it } from "vitest";
import { pageMetadata } from "../lib/metadata";
import { SITE_CATEGORY_LINE, SITE_DESCRIPTION } from "../site.config";

// The brand manual locks the category line in front of every meta description:
// a search result is a cold arrival.
describe("pageMetadata", () => {
  it("puts the category line in front of a page's own description", () => {
    const m = pageMetadata({ title: "About", description: "What Ground State is.", path: "/about" });
    expect(m.description).toBe(`${SITE_CATEGORY_LINE}. What Ground State is.`);
    expect(m.openGraph?.description).toBe(m.description);
    expect(m.twitter?.description).toBe(m.description);
  });

  it("does not repeat it when the description already leads with it", () => {
    expect(SITE_DESCRIPTION.startsWith(SITE_CATEGORY_LINE)).toBe(true);
    expect(pageMetadata({ path: "/" }).description).toBe(SITE_DESCRIPTION);
  });
});
