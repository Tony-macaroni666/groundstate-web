// The site Worker. Static assets serve every page and every article; this
// script runs only for /api/* (wrangler.jsonc → assets.run_worker_first), so
// no article ever passes through it and its bytes stay the signed bytes.

import { EmailMessage } from "cloudflare:email";
import { CONTACT_PATH, handleContact, verifyTurnstile } from "./contact";

interface Env {
  ASSETS: Fetcher;
  CONTACT_EMAIL?: SendEmail;
  CONTACT_RECIPIENT?: string;
  TURNSTILE_SECRET?: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === CONTACT_PATH) {
      return handleContact(request, env, {
        verifyTurnstile,
        message: (from, to, raw) => new EmailMessage(from, to, raw),
      });
    }
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
