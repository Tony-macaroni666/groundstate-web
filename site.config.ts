/**
 * GROUND STATE — site configuration.
 *
 * The single place where deployment-specific values live. Nothing here is
 * invented: a value that has not been decided is empty, and every consumer
 * degrades to "omit it" rather than to a plausible-looking default.
 */

/**
 * The production origin.
 *
 * INTENDED DOMAIN: `https://groundstatemethod.com` — human-approved intent, but
 * **not yet registered**, so it is provisional and is deliberately NOT the
 * default here. Publishing a canonical URL, a sitemap entry or an `og:url` on a
 * domain nobody owns yet asserts ownership that does not exist, and points
 * crawlers at whoever registers it first.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the build environment once registration is
 * confirmed. Until then local and preview builds work fine and simply omit
 * every absolute URL; `npm run preflight` blocks a production build.
 *
 * Once confirmed, groundstatemethod.com is the single canonical production
 * origin unless changed by human approval.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

export const siteUrlConfigured = SITE_URL.length > 0;

/** Absolute URL for a site-relative path, or `undefined` when no origin is set. */
export function absoluteUrl(path: string): string | undefined {
  if (!siteUrlConfigured) return undefined;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "Ground State";

/** The category line. Frozen wording — see the brand manual. */
export const SITE_TAGLINE = "Understand the system. Improve the outcome.";
export const SITE_CATEGORY_LINE = "Human performance, traced to the evidence";

export const SITE_DESCRIPTION =
  "Human performance, traced to the evidence. Strength and conditioning, " +
  "musculoskeletal health, recovery, nutrition and behaviour — turned into " +
  "practical decisions, including what we still don’t know.";

export interface OgImage {
  path: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * The default social preview image.
 *
 * The supplied asset is authoritative: the Ground State lockup with the tagline,
 * on bone, composed at the 1.91:1 OG ratio. It is never cropped, recoloured,
 * distorted, non-proportionally resized or otherwise redesigned.
 *
 * Used as the fallback for every page. Research records and Journal entries may
 * each carry an `ogImage` of their own, which takes precedence.
 *
 * `npm run preflight` fails if this is set and the file is missing — a 404 OG
 * image is worse than none, because the card renders blank rather than falling
 * back.
 */
export const OG_IMAGE: OgImage | null = {
  path: "/og-default.png",
  width: 2400,
  height: 1260,
  alt: "Ground State — Understand the system. Improve the outcome.",
};

/**
 * Contact routing.
 *
 * NO PUBLIC EMAIL ADDRESS, AND NO `mailto:`. The recipient mailbox is a
 * server-side value named `CONTACT_RECIPIENT`, held by the form endpoint and
 * never by this repository. It must not appear in HTML, in client JavaScript,
 * in metadata, in source-visible config or anywhere in the UI — an address in
 * the page source is an address in every scraper's list, and this one has to be
 * repointable without a frontend change.
 *
 * The form posts to `/api/contact` on this site (worker/contact.ts), which
 * checks a Cloudflare Turnstile token and sends one email through Email Routing.
 *
 * `turnstileSiteKey` is the public Turnstile site key (widget "Ground State
 * contact", hostname groundstatemethod.com). Set to null to close the channel:
 * the contact page then shows NO FORM and says no channel is open. It may only
 * be non-null while the channel really works: Email Routing on, the recipient
 * verified, the Worker secrets CONTACT_RECIPIENT and TURNSTILE_SECRET set
 * (docs/SETUP.md §7), and the notice under the form true. A form that accepts a correction and discards it is worse
 * than no form: the sender believes the correction landed.
 */
export const CONTACT: { formEndpoint: string; turnstileSiteKey: string | null } = {
  formEndpoint: "/api/contact",
  turnstileSiteKey: "0x4AAAAAAFPRCuhcncVHgMdP",
};

export const contactChannelOpen = CONTACT.turnstileSiteKey !== null;

/** Primary navigation. Coaching is FUTURE_RESERVED and never appears here. */
export const NAV = [
  { href: "/research", label: "Research" },
  { href: "/standard", label: "Standard" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Routes that are not content-driven, for the sitemap. `/styleguide` is noindex. */
export const STATIC_ROUTES = ["/", "/research", "/journal", "/standard", "/about", "/contact"];
