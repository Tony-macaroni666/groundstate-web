// Verification of OpenSSH signatures (`ssh-keygen -Y sign`), Ed25519 only.
//
// Implemented directly against the SSHSIG format (OpenSSH PROTOCOL.sshsig) so
// the gate needs no ssh-keygen binary: it runs the same way in GitHub Actions,
// in the Cloudflare build and locally. tests/sshsig.test.ts checks it against
// real `ssh-keygen -Y sign` output wherever ssh-keygen is installed (CI).
//
// The trust decision is deliberately narrow: one principal, one namespace, keys
// from the pinned allowed-signers file, Ed25519, sha256 or sha512 message hash.

import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

const MAGIC = Buffer.from("SSHSIG");
const ED25519 = "ssh-ed25519";
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface AllowedSigner {
  principal: string;
  namespaces: string[] | null;
  keyBlob: Buffer;
  /** valid-after="…": the key signs nothing authorized before this instant. */
  validAfter: Date | null;
  /** valid-before="…": the key signs nothing authorized at or after this instant (a retired key). */
  validBefore: Date | null;
}

/**
 * An allowed_signers time, always read as UTC: YYYYMMDD, YYYYMMDDHHMM or
 * YYYYMMDDHHMMSS, optionally with a trailing Z. Write it with the Z, so
 * ssh-keygen reads it the same way. Anything else is not a time.
 */
export function parseSignerTime(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})?)?Z?$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h = "0", mi = "0", s = "0"] = m.slice(1).map((v) => v ?? "0");
  const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  // Reject 20261332 and the like instead of letting Date roll them over.
  const fields = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds()];
  if (fields.some((f, i) => f !== [+y, +mo, +d, +h, +mi, +s][i])) return null;
  return t;
}

/** Whether `at` falls inside the signer's validity window. */
export function signerValidAt(s: AllowedSigner, at: Date): boolean {
  if (Number.isNaN(at.getTime())) return false;
  if (s.validAfter && at < s.validAfter) return false;
  if (s.validBefore && at >= s.validBefore) return false;
  return true;
}

class Reader {
  private offset = 0;
  constructor(private readonly buf: Buffer) {}
  bytes(n: number): Buffer {
    if (this.offset + n > this.buf.length) throw new Error("truncated");
    const out = this.buf.subarray(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }
  uint32(): number {
    return this.bytes(4).readUInt32BE(0);
  }
  string(): Buffer {
    return this.bytes(this.uint32());
  }
  done(): boolean {
    return this.offset === this.buf.length;
  }
}

const sshString = (b: Buffer | string) => {
  const body = typeof b === "string" ? Buffer.from(b) : b;
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
};

/**
 * Parses an allowed_signers file (ssh-keygen(1) ALLOWED SIGNERS).
 *
 * Honoured options: namespaces, valid-after, valid-before. A line with any other
 * option (cert-authority, an unknown one, a malformed time) is dropped whole:
 * a restriction this parser does not understand must not be silently ignored,
 * so the key it was meant to restrict is not trusted at all. Unsupported key
 * types are dropped too.
 */
export function parseAllowedSigners(text: string): AllowedSigner[] {
  const out: AllowedSigner[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const tokens = line.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    const principal = tokens.shift();
    if (!principal) continue;
    let namespaces: string[] | null = null;
    let validAfter: Date | null = null;
    let validBefore: Date | null = null;
    let understood = true;
    // Options precede the key type.
    const isKeyType = (t: string) => t.startsWith("ssh-") || t.startsWith("ecdsa-") || t.startsWith("sk-");
    while (tokens.length > 0 && !isKeyType(tokens[0]!)) {
      const opt = tokens.shift()!;
      // Split on commas outside quotes: namespaces="a,b" is one option.
      for (const part of opt.match(/(?:[^,"]+|"[^"]*")+/g) ?? []) {
        const m = /^([a-z-]+)="([^"]*)"$/.exec(part);
        if (m?.[1] === "namespaces") namespaces = m[2].split(",").map((s) => s.trim());
        else if (m?.[1] === "valid-after" && parseSignerTime(m[2])) validAfter = parseSignerTime(m[2]);
        else if (m?.[1] === "valid-before" && parseSignerTime(m[2])) validBefore = parseSignerTime(m[2]);
        else understood = false;
      }
    }
    const [keyType, b64] = tokens;
    if (!understood || keyType !== ED25519 || !b64) continue;
    out.push({ principal, namespaces, keyBlob: Buffer.from(b64, "base64"), validAfter, validBefore });
  }
  return out;
}

function unarmor(armored: string): Buffer {
  const m = /-----BEGIN SSH SIGNATURE-----([\s\S]*?)-----END SSH SIGNATURE-----/.exec(armored);
  if (!m) throw new Error("not an armored SSH signature");
  return Buffer.from(m[1].replace(/\s+/g, ""), "base64");
}

/** On success, the pinned lines whose key made the signature (their validity windows are the caller's to check). */
export type VerifyResult = { ok: true; matched: AllowedSigner[] } | { ok: false; reason: string };

/**
 * Verifies `armored` over `message` for `principal` in `namespace`, against
 * `signers`. Returns the reason on failure; never throws on bad input.
 */
export function verifySshSignature(opts: {
  message: Buffer;
  armored: string;
  signers: AllowedSigner[];
  principal: string;
  namespace: string;
}): VerifyResult {
  try {
    const r = new Reader(unarmor(opts.armored));
    if (!r.bytes(6).equals(MAGIC)) return { ok: false, reason: "bad magic" };
    if (r.uint32() !== 1) return { ok: false, reason: "unsupported SSHSIG version" };
    const publicKey = r.string();
    const namespace = r.string().toString();
    r.string(); // reserved
    const hashAlg = r.string().toString();
    const sigBlob = r.string();
    if (!r.done()) return { ok: false, reason: "trailing data in signature" };

    if (namespace !== opts.namespace) return { ok: false, reason: `namespace "${namespace}" is not "${opts.namespace}"` };
    if (hashAlg !== "sha256" && hashAlg !== "sha512") return { ok: false, reason: `hash algorithm ${hashAlg} not allowed` };

    const trusted = opts.signers.filter(
      (s) =>
        s.principal === opts.principal &&
        (s.namespaces === null || s.namespaces.includes(opts.namespace)) &&
        s.keyBlob.equals(publicKey),
    );
    if (trusted.length === 0) return { ok: false, reason: "signing key is not the pinned publisher key" };

    const pk = new Reader(publicKey);
    if (pk.string().toString() !== ED25519) return { ok: false, reason: "only Ed25519 keys are accepted" };
    const rawKey = pk.string();
    if (rawKey.length !== 32 || !pk.done()) return { ok: false, reason: "malformed Ed25519 key" };

    const sig = new Reader(sigBlob);
    if (sig.string().toString() !== ED25519) return { ok: false, reason: "signature is not Ed25519" };
    const rawSig = sig.string();
    if (rawSig.length !== 64 || !sig.done()) return { ok: false, reason: "malformed Ed25519 signature" };

    const digest = createHash(hashAlg).update(opts.message).digest();
    const signed = Buffer.concat([MAGIC, sshString(namespace), sshString(""), sshString(hashAlg), sshString(digest)]);
    const key = createPublicKey({ key: Buffer.concat([SPKI_ED25519_PREFIX, rawKey]), format: "der", type: "spki" });
    return verifySignature(null, signed, key, rawSig)
      ? { ok: true, matched: trusted }
      : { ok: false, reason: "signature does not verify" };
  } catch (e) {
    return { ok: false, reason: `unreadable signature: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** For tests and documentation only: the wire helpers the signer side needs. */
export const _wire = { sshString, MAGIC, ED25519 };
