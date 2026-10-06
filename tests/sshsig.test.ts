import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAllowedSigners, verifySshSignature } from "../lib/publications/sshsig";
import { allowedSignersLine, sshSign, testKey } from "./helpers/sign";

const NS = "ground-state.web-publication.v1";
const WHO = "ground-state-web-publisher";
const message = Buffer.from('{"fixture":"GS-FIXTURE manifest bytes"}\n');

describe("SSH signature verification", () => {
  const key = testKey();
  const signers = parseAllowedSigners(allowedSignersLine(key, WHO, NS));
  const check = (over: Partial<Parameters<typeof verifySshSignature>[0]> = {}) =>
    verifySshSignature({ message, armored: sshSign(key, message, NS), signers, principal: WHO, namespace: NS, ...over });

  it("accepts the pinned key, principal and namespace (sha512 and sha256)", () => {
    expect(check()).toMatchObject({ ok: true });
    expect(check({ armored: sshSign(key, message, NS, "sha256") })).toMatchObject({ ok: true });
  });

  it("refuses a changed message", () => {
    expect(check({ message: Buffer.from(message.toString().replace("GS", "Gs")) })).toMatchObject({ ok: false, reason: /does not verify/ });
  });

  it("refuses another namespace, even with the right key", () => {
    expect(check({ armored: sshSign(key, message, "git") })).toMatchObject({ ok: false, reason: /namespace/ });
  });

  it("refuses a key that is not pinned", () => {
    const other = testKey();
    expect(check({ armored: sshSign(other, message, NS) })).toMatchObject({ ok: false, reason: /not the pinned/ });
  });

  it("refuses the pinned key under another principal, or outside its namespaces", () => {
    expect(check({ principal: "someone-else" })).toMatchObject({ ok: false });
    const narrow = parseAllowedSigners(allowedSignersLine(key, WHO, "file"));
    expect(check({ signers: narrow })).toMatchObject({ ok: false, reason: /not the pinned/ });
  });

  it("refuses garbage without throwing", () => {
    expect(check({ armored: "not a signature" })).toMatchObject({ ok: false });
    expect(check({ armored: "-----BEGIN SSH SIGNATURE-----\nAAAA\n-----END SSH SIGNATURE-----" })).toMatchObject({ ok: false });
  });

  it("ignores comments and unsupported key types in the signers file", () => {
    const text = `# comment\n\nsomeone ssh-rsa AAAAB3NzaC1yc2E= rsa\n${allowedSignersLine(key, WHO, NS)}\n`;
    expect(parseAllowedSigners(text)).toHaveLength(1);
  });
});

// Interoperability with real OpenSSH, wherever ssh-keygen exists (GitHub's runners have it).
const hasSshKeygen = (() => {
  try {
    execFileSync("ssh-keygen", ["-?"], { stdio: "ignore" });
    return true;
  } catch (e) {
    return (e as { status?: number }).status !== undefined && (e as { code?: string }).code !== "ENOENT";
  }
})();

describe.skipIf(!hasSshKeygen)("interoperability with ssh-keygen", () => {
  const dir = mkdtempSync(join(tmpdir(), "gs-sshsig-"));
  const keyPath = join(dir, "key");
  const msgPath = join(dir, "manifest.json");
  writeFileSync(msgPath, message);

  it("verifies a signature made by ssh-keygen -Y sign", () => {
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "fixture", "-f", keyPath]);
    execFileSync("ssh-keygen", ["-Y", "sign", "-f", keyPath, "-n", NS, msgPath], { stdio: "ignore" });
    const pub = readFileSync(`${keyPath}.pub`, "utf8").trim().split(" ").slice(0, 2).join(" ");
    const signers = parseAllowedSigners(`${WHO} namespaces="${NS}" ${pub}`);
    const armored = readFileSync(`${msgPath}.sig`, "utf8");
    expect(verifySshSignature({ message, armored, signers, principal: WHO, namespace: NS })).toMatchObject({ ok: true });
  });

  it("produces signatures ssh-keygen -Y verify accepts", () => {
    const key = testKey();
    const sigPath = join(dir, "ours.sig");
    const allowed = join(dir, "allowed");
    writeFileSync(sigPath, sshSign(key, message, NS));
    writeFileSync(allowed, allowedSignersLine(key, WHO, NS) + "\n");
    execFileSync("ssh-keygen", ["-Y", "verify", "-f", allowed, "-I", WHO, "-n", NS, "-s", sigPath], { input: message, stdio: ["pipe", "ignore", "ignore"] });
  });
});
