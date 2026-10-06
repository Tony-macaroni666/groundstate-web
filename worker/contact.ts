// The contact channel: POST /api/contact.
//
// The only server code on groundstatemethod.com. A message passes the
// Turnstile check, becomes one plain-text email to the owner, and is gone:
// nothing is stored and nothing is logged but the outcome.
//
// The recipient (CONTACT_RECIPIENT) and the Turnstile secret (TURNSTILE_SECRET)
// are Worker secrets set in the Cloudflare dashboard. Neither is in this
// repository or in anything served to a browser. Without either, or without the
// send_email binding, the route answers 503: it never accepts a message it
// cannot deliver.
//
// Kept free of Workers globals and of `cloudflare:email`, so it runs under the
// unit tests in Node. worker/index.ts supplies the real EmailMessage.

export const CONTACT_PATH = "/api/contact";
export const SITE_ORIGIN = "https://groundstatemethod.com";
export const SITE_HOSTNAME = "groundstatemethod.com";
/** Must be an address on the zone with Email Routing; see wrangler.jsonc. */
export const SENDER = "contact@groundstatemethod.com";
export const TURNSTILE_ACTION = "contact";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const LIMITS = { body: 16 * 1024, name: 200, email: 254, minMessage: 20, message: 5000 } as const;

/** The form's subject choices. Anything else is refused. */
export const SUBJECTS = {
  general: "General question",
  correction: "Correction to a record",
} as const;

export interface Mailer {
  send(message: unknown): Promise<unknown>;
}

export interface ContactEnv {
  CONTACT_EMAIL?: Mailer;
  CONTACT_RECIPIENT?: string;
  TURNSTILE_SECRET?: string;
}

export interface TurnstileResult {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export interface ContactDeps {
  verifyTurnstile(token: string, secret: string, ip: string | null): Promise<TurnstileResult>;
  /** Wraps a raw MIME message for the binding (EmailMessage in the Worker). */
  message(from: string, to: string, raw: string): unknown;
  now?(): Date;
  id?(): string;
}

export interface ContactMessage {
  subject: keyof typeof SUBJECTS;
  name: string;
  email: string;
  message: string;
}

// An address with no whitespace, quotes, brackets or separators, so it can sit
// in a header as is.
const EMAIL = /^[^\s@<>"(),;:\\[\]]+@[^\s@<>"(),;:\\[\]]+\.[^\s@<>"(),;:\\[\]]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// One log line per refusal: the status and the one-word reason, never the
// message, the name, the address or the token.
const fail = (status: number, error: string) => {
  console.log(JSON.stringify({ route: "contact", status, error }));
  return json(status, { ok: false, error });
};

/** Field checks, shared in spirit with the form's own. Returns the clean message or the first problem. */
export function parseMessage(input: unknown): ContactMessage | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "body" };
  const o = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const subject = str(o.subject) || "general";
  const name = str(o.name).trim();
  const email = str(o.email).trim();
  const message = str(o.message).replace(/\r\n?/g, "\n").trim();

  if (!Object.hasOwn(SUBJECTS, subject)) return { error: "subject" };
  if (!name || name.length > LIMITS.name || /[\r\n]/.test(name) || CONTROL.test(name)) return { error: "name" };
  if (email.length > LIMITS.email || !EMAIL.test(email)) return { error: "email" };
  if (message.length < LIMITS.minMessage || message.length > LIMITS.message || CONTROL.test(message)) {
    return { error: "message" };
  }
  return { subject: subject as keyof typeof SUBJECTS, name, email, message };
}

/** RFC 2047 encoded-word, so any name or subject is one safe header line. */
function encodedWord(text: string): string {
  return `=?utf-8?B?${base64(text)}?=`;
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** The email: plain text, base64 body, every header value either fixed or encoded. */
export function buildMime(m: ContactMessage, to: string, at: Date, id: string): string {
  const subject = `[Ground State] ${SUBJECTS[m.subject]} — ${m.name}`;
  const body = [
    `Subject: ${SUBJECTS[m.subject]}`,
    `From: ${m.name} <${m.email}>`,
    `Sent: ${at.toISOString()}`,
    "",
    m.message,
    "",
    "—",
    `Sent through the contact form on ${SITE_HOSTNAME}. Reply to this email to answer the sender.`,
    "",
  ].join("\n");
  const wrapped = (base64(body).match(/.{1,76}/g) ?? []).join("\r\n");
  return [
    `From: ${encodedWord("Ground State contact form")} <${SENDER}>`,
    `To: <${to}>`,
    `Reply-To: ${encodedWord(m.name)} <${m.email}>`,
    `Subject: ${encodedWord(subject)}`,
    `Date: ${at.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${SITE_HOSTNAME}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapped,
    "",
  ].join("\r\n");
}

/** Cloudflare's siteverify. */
export async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<TurnstileResult> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  const res = await fetch(SITEVERIFY, { method: "POST", body: form });
  if (!res.ok) return { success: false };
  return (await res.json()) as TurnstileResult;
}

export async function handleContact(request: Request, env: ContactEnv, deps: ContactDeps): Promise<Response> {
  if (request.method !== "POST") return fail(405, "method");
  if (request.headers.get("Origin") !== SITE_ORIGIN) return fail(403, "origin");
  if (!env.CONTACT_EMAIL || !env.CONTACT_RECIPIENT || !env.TURNSTILE_SECRET) return fail(503, "closed");
  if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail(415, "content-type");
  }

  if (Number(request.headers.get("Content-Length") ?? 0) > LIMITS.body) return fail(413, "too-large");
  const raw = await request.text();
  if (raw.length > LIMITS.body) return fail(413, "too-large");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail(400, "body");
  }

  const token = typeof (input as { token?: unknown })?.token === "string" ? (input as { token: string }).token : "";
  if (!token || token.length > 4096) return fail(403, "challenge");
  const parsed = parseMessage(input);
  if ("error" in parsed) return fail(400, parsed.error);

  let check: TurnstileResult;
  try {
    check = await deps.verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"));
  } catch {
    return fail(502, "challenge-unavailable");
  }
  if (!check.success || check.hostname !== SITE_HOSTNAME || check.action !== TURNSTILE_ACTION) {
    console.log(JSON.stringify({
      route: "contact",
      turnstile: { success: check.success, hostname: check.hostname ?? null, action: check.action ?? null, codes: check["error-codes"] ?? [] },
    }));
    return fail(403, "challenge");
  }

  const at = deps.now?.() ?? new Date();
  const id = deps.id?.() ?? crypto.randomUUID();
  try {
    await env.CONTACT_EMAIL.send(deps.message(SENDER, env.CONTACT_RECIPIENT, buildMime(parsed, env.CONTACT_RECIPIENT, at, id)));
  } catch (e) {
    // The binding's own message (e.g. an unverified destination); it names no sender content.
    console.log(JSON.stringify({ route: "contact", send_error: e instanceof Error ? e.message.slice(0, 300) : "unknown" }));
    return fail(502, "send");
  }
  console.log(JSON.stringify({ route: "contact", status: 200 }));
  return json(200, { ok: true });
}
