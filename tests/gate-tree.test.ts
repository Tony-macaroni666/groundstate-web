import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL } from "../lib/publications/contract";
import { FixtureRepo } from "./helpers/bundle";
import { allowedSignersLine } from "./helpers/sign";

// How CI runs the gate on a pull request: from the base checkout, pointed with
// --tree at the PR's files. The PR's own copy of the signers file must count for nothing.
const gate = (tree: string) =>
  spawnSync("npx", ["tsx", "scripts/verify-publications.ts", "--tree", tree], { encoding: "utf8" });

describe("the gate on a pull request's tree", () => {
  it("ignores a publisher key the pull request brings with it", () => {
    const repo = new FixtureRepo();
    repo.add({ id: "GSP-0001" });
    // The PR pins its own key next to its bundle…
    mkdirSync(join(repo.root, ".github"), { recursive: true });
    writeFileSync(join(repo.root, ".github/publication-signers"), allowedSignersLine(repo.key, SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE) + "\n");
    const r = gate(repo.root);
    // …and the base's pin (empty in this repository) is what decides.
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/no trusted publisher key/);
  });

  it("passes an empty tree", () => {
    const repo = new FixtureRepo();
    expect(gate(repo.root).status).toBe(0);
  });
});
