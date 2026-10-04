import { describe, expect, it } from "vitest";
import { PUBLISHER_LOGIN, checkDiff } from "../scripts/check-publication-diff";

const add = (path: string) => ({ status: "A", path });
const bundle = (id: string) => [add(`publications/${id}/manifest.json`), add(`publications/${id}/manifest.json.sig`), add(`publications/${id}/article.html`)];

describe("allowed changed paths", () => {
  it("accepts a publication PR: one new bundle, added only, on publish/<id>", () => {
    expect(checkDiff({ changes: bundle("GSP-0001"), headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN })).toEqual([]);
  });

  it("accepts an ordinary code PR that does not touch bundles", () => {
    expect(checkDiff({ changes: [{ status: "M", path: "app/page.tsx" }], headRef: "feature/x", author: "Tony-macaroni666" })).toEqual([]);
  });

  it("refuses a publication PR that also changes code", () => {
    const errors = checkDiff({ changes: [...bundle("GSP-0001"), { status: "M", path: "scripts/build-cf.mjs" }], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN });
    expect(errors.join()).toMatch(/nothing outside publications/);
  });

  it("refuses any PR by the publisher that is not a publication", () => {
    const errors = checkDiff({ changes: [{ status: "M", path: "app/page.tsx" }], headRef: "fix/typo", author: PUBLISHER_LOGIN });
    expect(errors.join()).toMatch(/nothing outside publications/);
  });

  it("refuses the publisher touching workflows, CODEOWNERS or the signer pin", () => {
    for (const path of [".github/workflows/publication-gate.yml", ".github/CODEOWNERS", ".github/publication-signers"]) {
      expect(checkDiff({ changes: [...bundle("GSP-0001"), { status: "M", path }], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN }).length).toBeGreaterThan(0);
    }
  });

  it("refuses changing, deleting or renaming a published bundle — from anyone", () => {
    for (const status of ["M", "D", "T"]) {
      const errors = checkDiff({ changes: [{ status, path: "publications/GSP-0001/article.html" }], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN });
      expect(errors.join()).toMatch(/immutable/);
    }
    const human = checkDiff({ changes: [{ status: "M", path: "publications/GSP-0001/article.html" }], headRef: "fix/article", author: "Tony-macaroni666" });
    expect(human.join()).toMatch(/immutable|publish\/<id>/);
  });

  it("refuses two bundles in one PR, a branch that does not match, and nested paths", () => {
    expect(checkDiff({ changes: [...bundle("GSP-0001"), ...bundle("GSP-0002")], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN }).join()).toMatch(/one publication per PR/);
    expect(checkDiff({ changes: bundle("GSP-0001"), headRef: "publish/GSP-0009", author: PUBLISHER_LOGIN }).join()).toMatch(/must be publish\/GSP-0001/);
    expect(checkDiff({ changes: [add("publications/GSP-0001/assets/x.png")], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN }).join()).toMatch(/nothing outside/);
  });

  it("refuses an empty publication PR and a bundle arriving outside publish/<id>", () => {
    expect(checkDiff({ changes: [], headRef: "publish/GSP-0001", author: PUBLISHER_LOGIN }).join()).toMatch(/must add a bundle/);
    expect(checkDiff({ changes: bundle("GSP-0001"), headRef: "main-copy", author: "Tony-macaroni666" }).join()).toMatch(/publish\/<id>/);
  });
});
