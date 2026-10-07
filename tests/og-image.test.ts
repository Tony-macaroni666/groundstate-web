import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OG_IMAGE } from "../site.config";

// og:image:width and og:image:height are what a card renders from before the
// image arrives; they must be the file's real size.
describe("OG image", () => {
  it.runIf(OG_IMAGE)("declares the PNG's real dimensions", () => {
    const png = readFileSync(join("public", OG_IMAGE!.path));
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) }).toEqual({ width: OG_IMAGE!.width, height: OG_IMAGE!.height });
  });
});
