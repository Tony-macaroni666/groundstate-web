import { describe, expect, it } from "vitest";
import {
  CONTACT_PATH,
  LIMITS,
  SENDER,
  SITE_HOSTNAME,
  SITE_ORIGIN,
  TURNSTILE_ACTION,
  buildMime,
  handleContact,
  parseMessage,
  type ContactDeps,
  type ContactEnv,
  type TurnstileResult,
} from "../worker/contact";

const RECIPIENT = "owner@example.test";
const GOOD = {
  subject: "correction",
  name: "Ada Reader",
  email: "ada@example.test",
  message: "Record GS-0001 misreads the second source: the effect was on women only.",
  token: "turnstile-token",
};

function setup(over: { env?: Partial<ContactEnv>; turnstile?: TurnstileResult | Error; sendError?: boolean } = {}) {
  const sent: { from: string; to: string; raw: string }[] = [];
  const checks: { token: string; secret: string; ip: string | null }[] = [];
  const env: ContactEnv = {
    CONTACT_EMAIL: {
      async send(m) {
        if (over.sendError) throw new Error("binding refused");
        sent.push(m as { from: string; to: string; raw: string });
      },
    },
    CONTACT_RECIPIENT: RECIPIENT,
    TURNSTILE_SECRET: "turnstile-secret",
    ...over.env,
  };
  const deps: ContactDeps = {
    async verifyTurnstile(token, secret, ip) {
      checks.push({ token, secret, ip });
      if (over.turnstile instanceof Error) throw over.turnstile;
      return over.turnstile ?? { success: true, hostname: SITE_HOSTNAME, action: TURNSTILE_ACTION };
    },
    message: (from, to, raw) => ({ from, to, raw }),
    now: () => new Date("2026-10-06T09:30:00Z"),
    id: () => "fixed-id",
  };
  return { env, deps, sent, checks };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE_ORIGIN}${CONTACT_PATH}`, {
    method: "POST",
    headers: { Origin: SITE_ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function call(req: Request, s = setup()) {
  const res = await handleContact(req, s.env, s.deps);
  return { status: res.status, body: (await res.json()) as { ok: boolean; error?: string }, res, ...s };
}

const decodeBody = (raw: string) => {
  const b64 = raw.split("\r\n\r\n")[1].replace(/\r\n/g, "");
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
};
const headers = (raw: string) => raw.split("\r\n\r\n")[0].split("\r\n");

describe("POST /api/contact", () => {
  it("delivers one plain-text email to the recipient, from the fixed sender", async () => {
    const r = await call(post(GOOD));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(r.sent).toHaveLength(1);
    expect(r.sent[0].from).toBe(SENDER);
    expect(r.sent[0].to).toBe(RECIPIENT);
    expect(r.checks).toEqual([{ token: "turnstile-token", secret: "turnstile-secret", ip: "203.0.113.7" }]);
    const h = headers(r.sent[0].raw);
    expect(h).toContain(`To: <${RECIPIENT}>`);
    expect(h.some((l) => l.startsWith("Reply-To: ") && l.endsWith("<ada@example.test>"))).toBe(true);
    const body = decodeBody(r.sent[0].raw);
    expect(body).toContain("Subject: Correction to a record");
    expect(body).toContain("From: Ada Reader <ada@example.test>");
    expect(body).toContain(GOOD.message);
  });

  it("answers with no-store JSON", async () => {
    const r = await call(post(GOOD));
    expect(r.res.headers.get("Cache-Control")).toBe("no-store");
    expect(r.res.headers.get("Content-Type")).toMatch(/^application\/json/);
  });

  it("refuses anything but POST", async () => {
    const r = await call(new Request(`${SITE_ORIGIN}${CONTACT_PATH}`));
    expect(r.status).toBe(405);
    expect(r.sent).toHaveLength(0);
  });

  it("refuses another origin, or none", async () => {
    expect((await call(post(GOOD, { Origin: "https://evil.example" }))).status).toBe(403);
    const noOrigin = new Request(`${SITE_ORIGIN}${CONTACT_PATH}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(GOOD),
    });
    expect((await call(noOrigin)).status).toBe(403);
  });

  it("is closed (503) without the binding, the recipient or the Turnstile secret, and checks nothing", async () => {
    for (const missing of ["CONTACT_EMAIL", "CONTACT_RECIPIENT", "TURNSTILE_SECRET"] as const) {
      const s = setup({ env: { [missing]: undefined } });
      const r = await call(post(GOOD), s);
      expect(r.status).toBe(503);
      expect(r.checks).toHaveLength(0);
    }
  });

  it("refuses a body that is not JSON, or too large", async () => {
    expect((await call(post(GOOD, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await call(post("{not json"))).status).toBe(400);
    const big = { ...GOOD, message: "x".repeat(LIMITS.body) };
    expect((await call(post(big))).status).toBe(413);
  });

  it("refuses a message without a Turnstile token, before asking Turnstile", async () => {
    const r = await call(post({ ...GOOD, token: "" }));
    expect(r.status).toBe(403);
    expect(r.checks).toHaveLength(0);
  });

  it("refuses a failed, foreign or mislabelled Turnstile check", async () => {
    for (const t of [
      { success: false },
      { success: true, hostname: "evil.example", action: TURNSTILE_ACTION },
      { success: true, hostname: SITE_HOSTNAME, action: "login" },
    ]) {
      const r = await call(post(GOOD), setup({ turnstile: t }));
      expect(r.status).toBe(403);
      expect(r.sent).toHaveLength(0);
    }
  });

  it("says so when Turnstile or the mail binding fails, and sends nothing twice", async () => {
    expect((await call(post(GOOD), setup({ turnstile: new Error("down") }))).status).toBe(502);
    const r = await call(post(GOOD), setup({ sendError: true }));
    expect(r.status).toBe(502);
    expect(r.body.ok).toBe(false);
  });
});

describe("parseMessage", () => {
  it("accepts a good message and defaults the subject", () => {
    expect(parseMessage({ ...GOOD, subject: undefined })).toMatchObject({ subject: "general", name: "Ada Reader" });
  });

  it.each([
    [{ ...GOOD, subject: "sales" }, "subject"],
    [{ ...GOOD, name: "  " }, "name"],
    [{ ...GOOD, name: "x".repeat(LIMITS.name + 1) }, "name"],
    [{ ...GOOD, email: "not-an-address" }, "email"],
    [{ ...GOOD, email: "a@b.c\r\nBcc: x@evil.example" }, "email"],
    [{ ...GOOD, message: "too short" }, "message"],
    [{ ...GOOD, message: "x".repeat(LIMITS.message + 1) }, "message"],
    [[], "body"],
  ])("refuses %j (%s)", (input, error) => {
    expect(parseMessage(input)).toEqual({ error });
  });

  it("refuses a name that tries to add a header", () => {
    expect(parseMessage({ ...GOOD, name: "Ada\r\nBcc: x@evil.example" })).toEqual({ error: "name" });
  });
});

describe("buildMime", () => {
  const m = { subject: "general" as const, name: "Žofie Ďuriš", email: "zofie@example.test", message: "Dobrý den — a question about protein timing, with non-ASCII text." };
  const raw = buildMime(m, RECIPIENT, new Date("2026-10-06T09:30:00Z"), "fixed-id");

  it("encodes every free-text header, so nothing a sender types becomes a header", () => {
    const h = headers(raw);
    expect(h.find((l) => l.startsWith("Subject: "))).toMatch(/^Subject: =\?utf-8\?B\?[A-Za-z0-9+/=]+\?=$/);
    expect(h.find((l) => l.startsWith("Reply-To: "))).toMatch(/^Reply-To: =\?utf-8\?B\?[A-Za-z0-9+/=]+\?= <zofie@example\.test>$/);
    expect(h).toContain("Message-ID: <fixed-id@groundstatemethod.com>");
    expect(h).toContain("Content-Type: text/plain; charset=utf-8");
  });

  it("keeps the body intact and its lines short", () => {
    expect(decodeBody(raw)).toContain(m.message);
    for (const line of raw.split("\r\n")) expect(line.length).toBeLessThanOrEqual(998);
    for (const line of raw.split("\r\n\r\n")[1].split("\r\n")) expect(line.length).toBeLessThanOrEqual(76);
  });
});
