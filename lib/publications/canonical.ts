// Canonical JSON and the manifest self-hash.
//
// Must produce exactly the bytes of the backend's
//   json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
// (ground_state_publication/compiler.py::canonical_bytes), and the self-hash
// follows hash_object_with_empty_field: the hash field is kept, set to "".
// tests/canonical.test.ts checks this against Python itself.

import { createHash } from "node:crypto";

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    // Integers only: Python and JavaScript disagree on float formatting.
    if (!Number.isSafeInteger(value)) throw new Error(`canonical JSON: non-integer number ${value}`);
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    // Python sorts str keys by code point; for these ASCII keys that is plain < order.
    const keys = Object.keys(value as object).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  throw new Error(`canonical JSON: unsupported ${typeof value}`);
}

export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonical(value), "utf8");
}

export const sha256Hex = (bytes: Buffer | Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

/** The manifest's own hash: canonical JSON with `manifest_sha256` present and empty. */
export function manifestSelfHash(manifest: Record<string, unknown>): string {
  return sha256Hex(canonicalBytes({ ...manifest, manifest_sha256: "" }));
}
