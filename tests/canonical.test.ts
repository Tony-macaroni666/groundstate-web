import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { canonicalBytes, manifestSelfHash } from "../lib/publications/canonical";

// The backend computes the same hashes in Python
// (ground_state_publication/compiler.py: canonical_bytes, hash_object_with_empty_field).
const PYTHON = `
import hashlib, json, sys
v = json.loads(sys.stdin.read())
b = json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
p = dict(v); p["manifest_sha256"] = ""
h = hashlib.sha256(json.dumps(p, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
sys.stdout.write(json.dumps({"bytes": b.decode("utf-8"), "self": h}))
`;
const hasPython = (() => {
  try {
    execFileSync("python3", ["-c", "pass"]);
    return true;
  } catch {
    return false;
  }
})();

const sample = {
  schema: "ground-state.web-publication.v1",
  z_last: 1,
  a_first: { nested_b: [3, 2, 1], nested_a: null, flag: true },
  text: "Évidence — “quoted” \\ back\\slash \"q\" tab\tnewline\n\u0001 ✓ 𝛼",
  manifest_sha256: "ignored",
};

describe("canonical JSON", () => {
  it("sorts keys and drops whitespace", () => {
    expect(canonicalBytes({ b: 1, a: [true, null] }).toString()).toBe('{"a":[true,null],"b":1}');
  });

  it("refuses floats, which Python and JavaScript format differently", () => {
    expect(() => canonicalBytes({ x: 1.5 })).toThrow(/non-integer/);
  });

  it.skipIf(!hasPython)("is byte-identical to the backend's Python canonicalisation, self-hash included", () => {
    const py = JSON.parse(execFileSync("python3", ["-c", PYTHON], { input: JSON.stringify(sample), encoding: "utf8" }));
    expect(canonicalBytes(sample).toString("utf8")).toBe(py.bytes);
    expect(manifestSelfHash(sample)).toBe(py.self);
  });
});
