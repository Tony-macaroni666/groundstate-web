// TEST HELPER. Generates throwaway Ed25519 keys and SSHSIG signatures, so the
// tests never need a real key and no private key is ever committed. The real
// signing key exists only on the Mac Mini.

import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { _wire } from "../../lib/publications/sshsig";

const { sshString, MAGIC, ED25519 } = _wire;

export interface TestKey {
  privateKey: KeyObject;
  /** SSH wire-format public key blob. */
  blob: Buffer;
  /** The "ssh-ed25519 AAAA…" form. */
  openssh: string;
}

export function testKey(): TestKey {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url");
  const blob = Buffer.concat([sshString(ED25519), sshString(raw)]);
  return { privateKey, blob, openssh: `${ED25519} ${blob.toString("base64")}` };
}

export function allowedSignersLine(key: TestKey, principal: string, namespace?: string): string {
  return `${principal}${namespace ? ` namespaces="${namespace}"` : ""} ${key.openssh} test-key`;
}

/** An armored SSHSIG, byte-compatible with `ssh-keygen -Y sign` (sha512). */
export function sshSign(key: TestKey, message: Buffer, namespace: string, hashAlg: "sha256" | "sha512" = "sha512"): string {
  const digest = createHash(hashAlg).update(message).digest();
  const signed = Buffer.concat([MAGIC, sshString(namespace), sshString(""), sshString(hashAlg), sshString(digest)]);
  const rawSig = sign(null, signed, key.privateKey);
  const sigBlob = Buffer.concat([sshString(ED25519), sshString(rawSig)]);
  const version = Buffer.alloc(4);
  version.writeUInt32BE(1, 0);
  const blob = Buffer.concat([MAGIC, version, sshString(key.blob), sshString(namespace), sshString(""), sshString(hashAlg), sshString(sigBlob)]);
  const b64 = blob.toString("base64").match(/.{1,70}/g)!.join("\n");
  return `-----BEGIN SSH SIGNATURE-----\n${b64}\n-----END SSH SIGNATURE-----\n`;
}
