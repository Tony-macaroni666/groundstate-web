"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Label } from "@/components/primitives";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

// Cloudflare Turnstile, rendered explicitly. "interaction-only" keeps it out of
// sight unless Cloudflare needs the reader to click something.
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"))));
    script.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

const field =
  "w-full bg-transparent border rule px-4 py-3 text-body " +
  "placeholder:text-body-muted dark:placeholder:text-gray-dark " +
  "focus:border-forest dark:focus:border-sage transition-colors rounded";

/**
 * The contact form.
 *
 * Only rendered when a real endpoint is configured — see app/contact/page.tsx.
 * This component never fakes a success: `sent` is set from the endpoint's
 * response, and a failure says so and keeps the message in the fields.
 *
 * The recipient mailbox lives at the endpoint as `CONTACT_RECIPIENT` and is
 * never referenced here. Nothing in this file reveals who receives the message.
 *
 * On success the reader gets an on-page confirmation and nothing else: no
 * automatic email reply is sent, and none is promised.
 *
 * Every send carries a single-use Turnstile token, which the endpoint checks
 * with Cloudflare before it sends anything. After a failed send the widget is
 * reset, so the next attempt has a fresh token.
 */
export function ContactForm({ endpoint, siteKey }: { endpoint: string; siteKey: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed" | "unchecked">("idle");
  const [token, setToken] = useState<string | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((t) => {
        if (cancelled || !widget.current || widgetId.current) return;
        widgetId.current = t.render(widget.current, {
          sitekey: siteKey,
          action: "contact",
          appearance: "interaction-only",
          theme: "auto",
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => setToken(null));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  function resetCheck() {
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const next: Errors = {};
    if (!name) next.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "That does not look like an email address.";
    if (message.length < 20) next.message = "A little more detail helps — at least a couple of sentences.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (!token) {
      setState("unchecked");
      return;
    }

    setState("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message, subject: data.get("subject"), token }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      setState("failed");
    } catch {
      setState("failed");
    }
    resetCheck();
  }

  if (state === "sent") {
    return (
      <div className="border rule p-8" role="status">
        <Label className="mb-3" as="h2">Received</Label>
        <p className="text-body-l max-w-prose">
          Thank you — your message has been delivered. There is no automatic
          reply: anything that needs an answer is answered by a person, which
          takes a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8 max-w-prose">
      <div>
        <label htmlFor="subject" className="label block mb-3">
          Subject
        </label>
        <select id="subject" name="subject" className={field} defaultValue="general">
          <option value="general">General question</option>
          <option value="correction">Correction to a record</option>
        </select>
      </div>

      <div>
        <label htmlFor="name" className="label block mb-3">
          Name
        </label>
        <input
          id="name" name="name" type="text" autoComplete="name" maxLength={200} className={field}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-small text-forest dark:text-sage mt-2">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="label block mb-3">
          Email
        </label>
        <input
          id="email" name="email" type="email" autoComplete="email" maxLength={254} className={field}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-small text-forest dark:text-sage mt-2">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="label block mb-3">
          Message
        </label>
        <textarea
          id="message" name="message" rows={6} maxLength={5000} className={field}
          placeholder="If this is a correction, say which record and which source."
          aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message && (
          <p id="message-error" className="text-small text-forest dark:text-sage mt-2">
            {errors.message}
          </p>
        )}
      </div>

      <div ref={widget} />

      <div className="flex items-center gap-6">
        <Button type="submit">{state === "sending" ? "Sending…" : "Send"}</Button>
        {state === "failed" && (
          <p role="alert" className="text-small text-forest dark:text-sage">
            That did not send. Your message is still here — try again.
          </p>
        )}
        {state === "unchecked" && (
          <p role="alert" className="text-small text-forest dark:text-sage">
            The spam check has not finished. Your message is still here — send again in a moment.
          </p>
        )}
      </div>
    </form>
  );
}
