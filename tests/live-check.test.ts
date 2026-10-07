import { describe, expect, it } from "vitest";
import { compareDeployment, type LiveEntry } from "../scripts/live-check";

const A: LiveEntry = { publication_id: "GSP-0001", action: "PUBLISH", route: "/research/a", manifest_sha256: "1".repeat(64), article_sha256: "2".repeat(64) };
const W: LiveEntry = { publication_id: "GSP-0002", action: "WITHDRAW", route: "/research/b", manifest_sha256: "3".repeat(64), article_sha256: null };
const deployment = (publications: LiveEntry[], over: Record<string, unknown> = {}) => ({
  schema: "ground-state.web-deployment.v1", commit: "a".repeat(40), build_uuid: "b", branch: "main", publications, ...over,
});
const failures = (live: unknown, expected: LiveEntry[]) => compareDeployment(live, expected).filter((f) => !f.ok).map((f) => f.what);

describe("compareDeployment", () => {
  it("passes when the live list is exactly main's", () => {
    expect(failures(deployment([A, W]), [A, W])).toEqual([]);
  });

  it("flags a publication missing from the live site (stale or failed deploy)", () => {
    expect(failures(deployment([]), [A])).toEqual([expect.stringContaining("serves GSP-0001")]);
  });

  it("flags a live publication main does not have", () => {
    expect(failures(deployment([A, W]), [A])).toEqual([expect.stringContaining("which main does not")]);
  });

  it("flags different bytes for the same publication", () => {
    expect(failures(deployment([{ ...A, article_sha256: "f".repeat(64) }]), [A]).length).toBe(2);
  });

  it("flags a wrong schema, branch or missing commit", () => {
    expect(failures(deployment([], { schema: "x", branch: "dev", commit: null }), []).length).toBe(3);
    expect(failures(null, []).length).toBe(3);
  });
});
