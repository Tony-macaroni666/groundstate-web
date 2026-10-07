import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM build script without type declarations
import { addToEveryPath } from "../scripts/headers.mjs";

const SITE = "# note\n/*\n  X-Content-Type-Options: nosniff\n\n/_next/static/*\n  Cache-Control: immutable\n";

describe("addToEveryPath", () => {
  it("adds the header to the existing rule, keeping the rule's other headers", () => {
    const out = addToEveryPath(SITE, "X-Robots-Tag: noindex, nofollow");
    expect(out.split("\n").filter((l: string) => l === "/*")).toHaveLength(1);
    expect(out).toContain("/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n");
    expect(out).toContain("/_next/static/*\n  Cache-Control: immutable\n");
  });

  it("creates the rule when there is none", () => {
    expect(addToEveryPath("/_next/static/*\n  A: b", "X-Robots-Tag: noindex")).toBe("/_next/static/*\n  A: b\n/*\n  X-Robots-Tag: noindex\n");
    expect(addToEveryPath("", "X-Robots-Tag: noindex")).toBe("/*\n  X-Robots-Tag: noindex\n");
  });
});
