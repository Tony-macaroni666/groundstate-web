"use client";

import { useState } from "react";
import { Button, Label } from "@/components/primitives";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

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
 */
export function ContactForm({ endpoint }: { endpoint: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

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

    setState("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message, subject: data.get("subject") }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
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
          id="name" name="name" type="text" autoComplete="name" className={field}
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
          id="email" name="email" type="email" autoComplete="email" className={field}
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
          id="message" name="message" rows={6} className={field}
          placeholder="If this is a correction, say which record and which source."
          aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message && (
          <p id="message-error" className="text-small text-forest dark:text-sage mt-2">
            {errors.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <Button type="submit">{state === "sending" ? "Sending…" : "Send"}</Button>
        {state === "failed" && (
          <p role="alert" className="text-small text-forest dark:text-sage">
            That did not send. Your message is still here — try again.
          </p>
        )}
      </div>
    </form>
  );
}
