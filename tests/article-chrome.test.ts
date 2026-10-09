import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_THEME_SCRIPT } from "../lib/publications/contract";
import { NAV } from "../site.config";

// docs/article-chrome is what the backend copies into every article. It must
// not drift from the gate's pinned script or from the site's own navigation.
const doc = (name: string) => readFileSync(`docs/article-chrome/${name}`, "utf8");

describe("article chrome reference", () => {
  it("ships the theme script the gate pins, byte for byte", () => {
    expect(doc("theme-script.js")).toBe(`${ARTICLE_THEME_SCRIPT}\n`);
  });

  it("links the header to the site's navigation, in the site's order", () => {
    const header = doc("header.html");
    const nav = (cls: string) =>
      [...header.split(`class="${cls}"`)[1].split("</nav>")[0].matchAll(/<a class="gs-h-link" href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
    const site = NAV.map((n) => [n.href, n.label]);
    expect(nav("gs-h-nav")).toEqual(site);
    expect(nav("gs-h-compact")).toEqual(site);
  });

  it("marks Research as the current section, has the theme switch and the Contact button", () => {
    const header = doc("header.html");
    expect(header.match(/href="\/research" aria-current="page"/g)).toHaveLength(2);
    expect(header).toContain('data-gs-theme-toggle aria-label="Switch theme"');
    expect(header).toContain('<a class="gs-h-cta" href="/contact">Contact</a>');
  });
});
