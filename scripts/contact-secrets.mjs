/**
 * The contact channel's two secrets, CONTACT_RECIPIENT and TURNSTILE_SECRET.
 *
 * They are kept in the dashboard under Settings → Builds → Variables and
 * secrets (type Secret), so the production build sees them as environment
 * variables. The production build copies them into the Worker's runtime
 * secrets with `wrangler secret bulk`, values on stdin, names only in the log.
 * Setting them directly as runtime secrets works too; this copy just keeps the
 * build-side values authoritative when they are present.
 *
 * Only main is ever built by Cloudflare (branch builds are off, SECURITY.md),
 * so no other branch's code sees them. Every later build step runs without them.
 */

export const CONTACT_SECRET_NAMES = ["CONTACT_RECIPIENT", "TURNSTILE_SECRET"];

/**
 * What the build should do with the secrets in `env`.
 *   skip     not production, or the secrets are not in the build environment
 *   no-token production, secrets present, but no API token to upload them
 *   upload   upload `values`
 */
export function contactSecretsPlan(env, production) {
  const values = Object.fromEntries(CONTACT_SECRET_NAMES.map((n) => [n, (env[n] ?? "").trim()]));
  if (!production) return { action: "skip", reason: "not a production build" };
  const missing = CONTACT_SECRET_NAMES.filter((n) => !values[n]);
  if (missing.length) return { action: "skip", reason: `not in the build environment: ${missing.join(", ")}` };
  if (!(env.CLOUDFLARE_API_TOKEN ?? "").trim()) return { action: "no-token" };
  return { action: "upload", values };
}

/** Removes the secrets from an environment object, so later build steps never see them. */
export function withoutContactSecrets(env) {
  const out = { ...env };
  for (const n of CONTACT_SECRET_NAMES) delete out[n];
  return out;
}
