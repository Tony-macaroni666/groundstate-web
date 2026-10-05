import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL } from "../lib/publications/contract";
import { FixtureRepo } from "./helpers/bundle";
import { allowedSignersLine, testKey, type TestKey } from "./helpers/sign";

// How CI runs the gate on a pull request: from the base checkout (the working
// directory, whose signers file is the trusted pin), pointed with --tree at the
// PR's files. The PR's own copy of the signers file must count for nothing.
// Each test builds its own base, so nothing depends on this repository's real pin.
const REPO = process.cwd();
const gate = (base: string, tree: string) =>
  spawnSync(join(REPO, "node_modules/.bin/tsx"), [join(REPO, "scripts/verify-publications.ts"), "--tree", tree], {
    cwd: base,
    encoding: "utf8",
  });

function base(pin: TestKey | null): string {
  const dir = mkdtempSync(join(tmpdir(), "gs-web-base-"));
  mkdirSync(join(dir, ".github"));
  writeFileSync(
    join(dir, ".github/publication-signers"),
    pin ? allowedSignersLine(pin, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE) + "\n" : "# no key pinned\n",
  );
  return dir;
}

function prBringingItsOwnKey(): FixtureRepo {
  const pr = new FixtureRepo();
  pr.add({ id: "GSP-0001" });
  mkdirSync(join(pr.root, ".github"), { recursive: true });
  writeFileSync(join(pr.root, ".github/publication-signers"), allowedSignersLine(pr.key, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE) + "\n");
  return pr;
}

describe("the gate on a pull request's tree", () => {
  it("ignores a publisher key the pull request brings with it", () => {
    const pr = prBringingItsOwnKey();
    const r = gate(base(testKey()), pr.root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/not the pinned publisher key/);
  });

  it("refuses every bundle while the base pins no key", () => {
    const r = gate(base(null), prBringingItsOwnKey().root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/no trusted publisher key/);
  });

  it("control: against a base pinning the same key, the signature passes", () => {
    const pr = prBringingItsOwnKey();
    const r = gate(base(pr.key), pr.root);
    // Only the fixture marker, which the production gate always refuses, remains.
    expect(r.stderr).not.toMatch(/signature/);
    expect(r.stderr).toMatch(/gs-fixture/i);
  });

  it("passes an empty tree", () => {
    expect(gate(base(testKey()), new FixtureRepo().root).status).toBe(0);
  });
});
