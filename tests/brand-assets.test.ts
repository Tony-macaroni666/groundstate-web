import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Brand files are copies of canonical registry assets, never edited here.
const lock = JSON.parse(readFileSync("brand-assets.lock.json", "utf8")) as {
  files: Record<string, { sha256: string }>;
};

describe("brand assets", () => {
  it.each(Object.entries(lock.files))("%s is byte-identical to its pinned canonical file", (path, { sha256 }) => {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(sha256);
  });

  it("pins every file in public/brand", () => {
    const unpinned = readdirSync("public/brand").map((f) => `public/brand/${f}`).filter((p) => !(p in lock.files));
    expect(unpinned).toEqual([]);
  });
});
