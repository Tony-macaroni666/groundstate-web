import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../lib/publications/canonical";
import { ARTICLE_THEME_SCRIPT } from "../lib/publications/contract";
import { verifyPublications } from "../lib/publications/verify";
import { ARTICLE_CSP, exportPublications } from "../scripts/export-publications";
import { FixtureRepo } from "./helpers/bundle";

// FIXTURE bundles, exported into a scratch ./out.
function exported(repo: FixtureRepo) {
  const out = mkdtempSync(join(tmpdir(), "gs-web-out-"));
  const report = verifyPublications({ root: repo.root, signers: repo.signers, allowFixtureMarker: true });
  const errors = exportPublications({ root: repo.root, out, report });
  return { out, errors };
}

describe("export into the static build", () => {
  it("serves the signed article byte for byte at its route", () => {
    const repo = new FixtureRepo();
    const dir = repo.add({ id: "GSP-0001" });
    const { out, errors } = exported(repo);
    expect(errors).toEqual([]);
    const served = readFileSync(join(out, "research/gs-fixture-article.html"));
    expect(served.equals(readFileSync(join(dir, "article.html")))).toBe(true);
  });

  it("publishes what is live for the publisher's reconciliation", () => {
    const repo = new FixtureRepo();
    const dir = repo.add({ id: "GSP-0001" });
    const { out } = exported(repo);
    const deployment = JSON.parse(readFileSync(join(out, "_publications.json"), "utf8"));
    expect(deployment).toMatchObject({
      schema: "ground-state.web-deployment.v1",
      publications: [
        {
          publication_id: "GSP-0001",
          action: "PUBLISH",
          route: "/research/gs-fixture-article",
          article_sha256: sha256Hex(readFileSync(join(dir, "article.html"))),
        },
      ],
    });
  });

  it("protects the article with headers, never by changing its bytes", () => {
    const repo = new FixtureRepo();
    repo.add({ id: "GSP-0001" });
    const { out } = exported(repo);
    const headers = readFileSync(join(out, "_headers"), "utf8");
    expect(headers).toContain("/research/gs-fixture-article\n");
    expect(headers).toContain(`Content-Security-Policy: ${ARTICLE_CSP}`);
    expect(headers).toMatch(/\/_publications\.json\n  Cache-Control: no-store/);
  });

  it("admits the pinned theme script by its hash and no other script", () => {
    const hash = createHash("sha256").update(ARTICLE_THEME_SCRIPT, "utf8").digest("base64");
    expect(ARTICLE_CSP).toContain(`script-src 'sha256-${hash}';`);
    expect(ARTICLE_CSP.match(/script-src[^;]*/)?.[0]).toBe(`script-src 'sha256-${hash}'`);
    expect(ARTICLE_CSP).toContain("default-src 'none'");
  });

  it("serves only the newest version, and nothing for a withdrawn route", () => {
    const repo = new FixtureRepo();
    repo.add({ id: "GSP-0001" });
    const v2 = repo.add({ id: "GSP-0002", supersedes: "GSP-0001", title: "GS-FIXTURE v2" });
    expect(readFileSync(join(exported(repo).out, "research/gs-fixture-article.html")).equals(readFileSync(join(v2, "article.html")))).toBe(true);

    repo.add({ id: "GSP-0003", action: "WITHDRAW", supersedes: "GSP-0002" });
    const { out, errors } = exported(repo);
    expect(errors).toEqual([]);
    expect(existsSync(join(out, "research/gs-fixture-article.html"))).toBe(false);
  });

  it("refuses to overwrite a page the site already has", () => {
    const repo = new FixtureRepo();
    repo.add({ id: "GSP-0001" });
    const out = mkdtempSync(join(tmpdir(), "gs-web-out-"));
    mkdirSync(join(out, "research"), { recursive: true });
    writeFileSync(join(out, "research/gs-fixture-article.html"), "existing");
    const report = verifyPublications({ root: repo.root, signers: repo.signers, allowFixtureMarker: true });
    expect(exportPublications({ root: repo.root, out, report }).join()).toMatch(/already has a page/);
  });

  it("exports nothing when any bundle fails the gate", () => {
    const repo = new FixtureRepo();
    repo.add({ id: "GSP-0001" });
    const out = mkdtempSync(join(tmpdir(), "gs-web-out-"));
    expect(exportPublications({ root: repo.root, out }).join()).toMatch(/no trusted publisher key|gs-fixture/);
    expect(existsSync(join(out, "_publications.json"))).toBe(false);
  });
});
