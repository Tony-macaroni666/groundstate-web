import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNATURE_NAMESPACE, SIGNER_PRINCIPAL } from "../lib/publications/contract";
import { parseAllowedSigners, parseSignerTime } from "../lib/publications/sshsig";
import { verifyPublications } from "../lib/publications/verify";
import { FixtureRepo } from "./helpers/bundle";
import { allowedSignersLine, sshSign, testKey, type TestKey } from "./helpers/sign";

// Key rotation. The old key is retired with valid-before; the new one starts
// with valid-after. Bundles already on main keep verifying at their own
// authorized_at; a bundle a pull request adds must be signed by a key valid now.

const ROTATION = "20261101Z"; // 1 November 2026, 00:00 UTC
const line = (key: TestKey, options: string) =>
  `${SIGNER_PRINCIPAL} namespaces="${SIGNATURE_NAMESPACE}",${options} ${key.openssh} test-key`;

function bundle(repo: FixtureRepo, id: string, key: TestKey, authorizedAt: string, slug = id.toLowerCase()) {
  const dir = repo.add({
    id,
    slug,
    edit: (m) => {
      (m.bindings as Record<string, unknown>).authorized_at = authorizedAt;
    },
  });
  const manifest = readFileSync(join(dir, "manifest.json"));
  writeFileSync(join(dir, "manifest.json.sig"), sshSign(key, manifest, SIGNATURE_NAMESPACE));
}

function setup() {
  const oldKey = testKey();
  const newKey = testKey();
  const signers = parseAllowedSigners(
    [line(oldKey, `valid-before="${ROTATION}"`), line(newKey, `valid-after="${ROTATION}"`)].join("\n"),
  );
  return { repo: new FixtureRepo(), oldKey, newKey, signers };
}

const verify = (repo: FixtureRepo, signers: ReturnType<typeof parseAllowedSigners>, extra: { isNew?: (id: string) => boolean; now?: Date } = {}) =>
  verifyPublications({ root: repo.root, signers, allowFixtureMarker: true, ...extra }).errors.join("\n");

describe("signer validity windows", () => {
  it("keeps a bundle signed before the rotation valid on main", () => {
    const { repo, oldKey, newKey, signers } = setup();
    bundle(repo, "GSP-0001", oldKey, "2026-10-01T09:00:00Z");
    bundle(repo, "GSP-0002", newKey, "2026-11-02T09:00:00Z");
    expect(verify(repo, signers)).toBe("");
  });

  it("refuses a retired key signing after its valid-before", () => {
    const { repo, oldKey, signers } = setup();
    bundle(repo, "GSP-0001", oldKey, "2026-11-01T00:00:00Z");
    expect(verify(repo, signers)).toMatch(/not valid at authorized_at/);
  });

  it("refuses a new key signing before its valid-after", () => {
    const { repo, newKey, signers } = setup();
    bundle(repo, "GSP-0001", newKey, "2026-10-31T23:59:59Z");
    expect(verify(repo, signers)).toMatch(/not valid at authorized_at/);
  });

  it("refuses a backdated bundle from a retired key when a pull request adds it", () => {
    const { repo, oldKey, signers } = setup();
    bundle(repo, "GSP-0003", oldKey, "2026-10-15T09:00:00Z"); // backdated, after the key was retired
    const pr = { isNew: (id: string) => id === "GSP-0003", now: new Date("2026-12-01T00:00:00Z") };
    expect(verify(repo, signers, pr)).toMatch(/must be signed by a key that is valid now/);
    // The same bundle, already on main before the rotation, still verifies.
    expect(verify(repo, signers)).toBe("");
  });

  it("accepts a new bundle from the current key", () => {
    const { repo, newKey, signers } = setup();
    bundle(repo, "GSP-0004", newKey, "2026-12-01T09:00:00Z");
    expect(verify(repo, signers, { isNew: () => true, now: new Date("2026-12-02T00:00:00Z") })).toBe("");
  });

  it("removing a key's line (compromise) makes everything it signed fail", () => {
    const { repo, oldKey, newKey } = setup();
    bundle(repo, "GSP-0001", oldKey, "2026-10-01T09:00:00Z");
    const onlyNew = parseAllowedSigners(line(newKey, `valid-after="${ROTATION}"`));
    expect(verify(repo, onlyNew)).toMatch(/not the pinned publisher key/);
  });
});

describe("allowed_signers parsing", () => {
  it("reads valid-after and valid-before as UTC", () => {
    const k = testKey();
    const [s] = parseAllowedSigners(line(k, `valid-after="20261101Z",valid-before="202612311200Z"`));
    expect(s.validAfter?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(s.validBefore?.toISOString()).toBe("2026-12-31T12:00:00.000Z");
    expect(s.namespaces).toEqual([SIGNATURE_NAMESPACE]);
  });

  it("keeps a plain line unrestricted", () => {
    const [s] = parseAllowedSigners(allowedSignersLine(testKey(), SIGNER_PRINCIPAL, SIGNATURE_NAMESPACE));
    expect(s.validAfter).toBeNull();
    expect(s.validBefore).toBeNull();
  });

  it.each([
    ["an unknown option", `verify-required`],
    ["cert-authority", `cert-authority`],
    ["a malformed time", `valid-before="2026-11-01"`],
    ["an impossible date", `valid-before="20261332Z"`],
  ])("drops the whole line for %s, so the key is not trusted", (_label, option) => {
    expect(parseAllowedSigners(line(testKey(), option))).toEqual([]);
  });

  it.each([
    ["20261101", "2026-11-01T00:00:00.000Z"],
    ["20261101Z", "2026-11-01T00:00:00.000Z"],
    ["202611011230", "2026-11-01T12:30:00.000Z"],
    ["20261101123045Z", "2026-11-01T12:30:45.000Z"],
  ])("parses %s", (value, iso) => {
    expect(parseSignerTime(value)?.toISOString()).toBe(iso);
  });

  it.each(["2026110", "20261101T1230", "202611011260", "20260229"])("rejects %s", (value) => {
    expect(parseSignerTime(value)).toBeNull();
  });
});
