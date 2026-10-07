import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The site serves Inter as WOFF2 subsets built by scripts/subset-fonts.py from
// the brand's TTFs. A character outside the subset would quietly fall back to
// a system face, so site copy may only use characters the subset carries.
const spec = JSON.parse(readFileSync("src/fonts/subset.json", "utf8")) as {
  latin: string[];
  "latin-ext": string[];
  extra: string[];
  fonts: Record<string, string>;
};

const covered = new Set<number>();
for (const item of [...spec.latin, ...spec["latin-ext"], ...spec.extra]) {
  const [lo, hi = lo] = item.replace("U+", "").split("-");
  for (let cp = parseInt(lo, 16); cp <= parseInt(hi, 16); cp++) covered.add(cp);
}

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|mdx?)$/.test(f) ? [path] : [];
  });

describe("self-hosted fonts", () => {
  it("the layout loads exactly the WOFF2 subsets, never a full TTF", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const loaded = [...layout.matchAll(/path: "\.\.\/src\/fonts\/([^"]+)"/g)].map((m) => m[1]);
    expect(loaded.sort()).toEqual(Object.values(spec.fonts).sort());
  });

  it.each(Object.values(spec.fonts))("%s is a WOFF2 subset, not a full font", (file) => {
    const bytes = readFileSync(join("src/fonts", file));
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(bytes.length).toBeLessThan(120 * 1024);
  });

  it("site copy uses only characters the subset carries", () => {
    const outside: string[] = [];
    for (const path of [...files("app"), ...files("components"), ...files("content"), "site.config.ts"]) {
      for (const ch of new Set(readFileSync(path, "utf8"))) {
        const cp = ch.codePointAt(0)!;
        if (cp > 0x7e && !covered.has(cp)) outside.push(`${path}: U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${ch}`);
      }
    }
    expect(outside).toEqual([]);
  });
});
