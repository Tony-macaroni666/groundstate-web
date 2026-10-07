// The live check: what https://groundstatemethod.com actually serves, compared
// with what main says it should. Read-only; no secrets; sends no email.
//
// Run by .github/workflows/live-check.yml (daily, and on demand). It catches a
// failed or stale deploy, an article whose served bytes are not the signed
// bytes (an edge feature rewriting HTML), a withdrawn route still answering,
// the www redirect or HTTPS redirect gone, and the contact route closed while
// the form is open.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { CANONICAL_ORIGIN } from "../lib/publications/contract";
import { verifyPublications, type VerifyReport } from "../lib/publications/verify";
import { CONTACT } from "../site.config";
import { ARTICLE_CSP, DEPLOYMENT_SCHEMA } from "./export-publications";

export interface LiveEntry {
  publication_id: string;
  action: "PUBLISH" | "WITHDRAW";
  route: string;
  manifest_sha256: string;
  article_sha256: string | null;
}

export interface Finding {
  ok: boolean;
  what: string;
}

/** What main's bundles say the deployment must list. */
export function expectedEntries(report: VerifyReport): LiveEntry[] {
  return [
    ...report.active.map((b) => ({
      publication_id: b.id,
      action: "PUBLISH" as const,
      route: b.manifest.route,
      manifest_sha256: b.manifest.manifest_sha256,
      article_sha256: b.manifest.files[0].sha256,
    })),
    ...report.withdrawn.map((b) => ({
      publication_id: b.id,
      action: "WITHDRAW" as const,
      route: b.manifest.route,
      manifest_sha256: b.manifest.manifest_sha256,
      article_sha256: null,
    })),
  ].sort((a, b) => a.publication_id.localeCompare(b.publication_id));
}

/** Compares the served _publications.json with main. */
export function compareDeployment(live: unknown, expected: LiveEntry[]): Finding[] {
  const out: Finding[] = [];
  const d = live as { schema?: unknown; branch?: unknown; commit?: unknown; publications?: unknown };
  out.push({ ok: d?.schema === DEPLOYMENT_SCHEMA, what: `deployment schema is ${DEPLOYMENT_SCHEMA}` });
  out.push({ ok: d?.branch === "main", what: "deployed from main" });
  out.push({ ok: typeof d?.commit === "string" && /^[0-9a-f]{40}$/.test(d.commit), what: "deployment names its commit" });
  const served = Array.isArray(d?.publications) ? (d.publications as LiveEntry[]) : [];
  const key = (e: LiveEntry) => [e.publication_id, e.action, e.route, e.manifest_sha256, e.article_sha256 ?? ""].join(" ");
  const want = new Set(expected.map(key));
  const have = new Set(served.map(key));
  for (const e of expected) out.push({ ok: have.has(key(e)), what: `serves ${e.publication_id} (${e.action} ${e.route}) as on main` });
  for (const e of served) if (!want.has(key(e))) out.push({ ok: false, what: `serves ${e.publication_id} (${e.action} ${e.route}), which main does not` });
  return out;
}

/** Minutes a merge may take to reach the site before a stale deploy is an error. */
export const DEPLOY_GRACE_MINUTES = 20;

/**
 * The site serves main's latest commit. Cloudflare deploys every push to main
 * within a few minutes; an older commit after that means deploys have stopped,
 * which the publication comparison alone misses until a publication changes.
 */
export function deployFresh(deployed: unknown, head: string, headAgeMinutes: number): Finding {
  if (deployed === head) return { ok: true, what: "serves main's latest commit" };
  const ok = headAgeMinutes < DEPLOY_GRACE_MINUTES;
  return {
    ok,
    what: ok
      ? `main moved ${Math.round(headAgeMinutes)} min ago; its deploy may still be running (serving ${String(deployed)})`
      : `serves ${String(deployed)}, not main's ${head} from ${Math.round(headAgeMinutes)} min ago: deploys have stopped`,
  };
}

export interface Hop {
  url: string;
  status: number;
}

/**
 * A redirect chain is right when every hop but the last is permanent (301 or
 * 308), the last answers 200 at `target`, and it takes at most `max` redirects.
 * http://www takes two: Cloudflare's Always Use HTTPS upgrades it on the same
 * host first, then the www rule moves it to the apex. That is the order HSTS
 * needs (each host upgraded on itself), so the check accepts it.
 */
export function chainEndsAt(hops: Hop[], target: string, max: number): boolean {
  const last = hops.at(-1);
  return (
    last !== undefined &&
    last.status === 200 &&
    last.url === target &&
    hops.length - 1 <= max &&
    hops.slice(0, -1).every((h) => h.status === 301 || h.status === 308)
  );
}

const trace = (hops: Hop[]) => hops.map((h) => `${h.status} ${h.url}`).join(" → ");

const sha256 = (b: ArrayBuffer) => createHash("sha256").update(Buffer.from(b)).digest("hex");
const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { redirect: "manual", ...init, headers: { "User-Agent": "groundstate-live-check", ...(init.headers ?? {}) } });

/** Follows redirects by hand, recording every hop; stops after `limit`. */
export async function follow(url: string, limit = 5): Promise<Hop[]> {
  const hops: Hop[] = [];
  for (let next: string | null = url; next && hops.length <= limit; ) {
    const r = await get(next);
    await r.arrayBuffer();
    hops.push({ url: next, status: r.status });
    const location = r.headers.get("location");
    next = r.status >= 300 && r.status < 400 && location ? new URL(location, next).href : null;
  }
  return hops;
}

async function main(): Promise<void> {
  const findings: Finding[] = [];
  const check = (ok: boolean, what: string) => findings.push({ ok, what });
  const report = verifyPublications({ root: process.cwd() });
  check(report.errors.length === 0, "main's bundles verify");

  // The deployment and every publication on it.
  const res = await get(`${CANONICAL_ORIGIN}/_publications.json`);
  check(res.status === 200, `/_publications.json answers 200 (got ${res.status})`);
  // The article CSP rides on _headers too, so prove Cloudflare applies the file.
  check(res.headers.get("cache-control") === "no-store" && res.headers.get("x-robots-tag") === "noindex",
    "_headers is applied (/_publications.json is no-store, noindex)");
  const live = res.status === 200 ? await res.json() : null;
  findings.push(...compareDeployment(live, expectedEntries(report)));
  if (live?.commit) console.log(`  deployed commit ${live.commit}, build ${live.build_uuid}`);
  const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const head = git(["rev-parse", "HEAD"]);
  findings.push(deployFresh(live?.commit, head, (Date.now() / 1000 - Number(git(["log", "-1", "--format=%ct"]))) / 60));

  for (const e of expectedEntries(report)) {
    const r = await get(`${CANONICAL_ORIGIN}${e.route}`);
    if (e.action === "WITHDRAW") {
      check(r.status === 404, `${e.route} is gone (404, got ${r.status})`);
      continue;
    }
    const body = await r.arrayBuffer();
    check(r.status === 200, `${e.route} answers 200 (got ${r.status})`);
    check(sha256(body) === e.article_sha256, `${e.route} serves exactly the signed article bytes`);
    check(r.headers.get("content-security-policy") === ARTICLE_CSP, `${e.route} carries the article CSP`);
  }

  // Pages, and no edge feature injecting anything into them.
  const home = await get(`${CANONICAL_ORIGIN}/`);
  const html = await home.text();
  check(home.status === 200, `home answers 200 (got ${home.status})`);
  check(html.includes(`<link rel="canonical" href="${CANONICAL_ORIGIN}"`), "home carries its canonical link");
  // A build that thinks it is not production marks every page noindex.
  check(!/noindex/i.test(home.headers.get("x-robots-tag") ?? "") && !/<meta name="robots" content="[^"]*noindex/i.test(html),
    "home is indexable (no noindex header or meta)");
  // The site-wide security headers (public/_headers, rule "/*").
  const hsts = /max-age=(\d+)/.exec(home.headers.get("strict-transport-security") ?? "");
  check(!!hsts && Number(hsts[1]) >= 31536000, "home sends HSTS for at least a year");
  check(home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY"
    && home.headers.get("referrer-policy") === "strict-origin-when-cross-origin" && !!home.headers.get("permissions-policy"),
    "home sends nosniff, frame denial, the referrer policy and the permissions policy");
  check(!/cdn-cgi\/scripts|rocket-loader|data-cfemail|__cf_email__/i.test(html), "no Cloudflare script or email rewriting in the page");
  const robots = await (await get(`${CANONICAL_ORIGIN}/robots.txt`)).text();
  check(/^Allow: \/$/m.test(robots) && robots.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`), "robots.txt allows indexing and names the sitemap");

  // Redirects. The www rule itself is one hop; from http it is two.
  const research = `${CANONICAL_ORIGIN}/research`;
  const www = await follow("https://www.groundstatemethod.com/research");
  check(chainEndsAt(www, research, 1), `https://www redirects to the apex in one hop (${trace(www)})`);
  const wwwHttp = await follow("http://www.groundstatemethod.com/research");
  check(chainEndsAt(wwwHttp, research, 2), `http://www reaches the apex over https (${trace(wwwHttp)})`);
  const http = await follow("http://groundstatemethod.com/research");
  check(chainEndsAt(http, research, 1), `http redirects to https in one hop (${trace(http)})`);

  // The contact route: alive, and configured if the form is open. A POST with
  // no Turnstile token is refused before anything is sent.
  const method = await get(`${CANONICAL_ORIGIN}/api/contact`);
  check(method.status === 405, `/api/contact refuses GET (405, got ${method.status})`);
  if (CONTACT.turnstileSiteKey) {
    const probe = await get(`${CANONICAL_ORIGIN}/api/contact`, {
      method: "POST",
      headers: { Origin: CANONICAL_ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ probe: true }),
    });
    // Configured means it got as far as the Turnstile check: 403 "challenge".
    // "closed" (503) means the Worker has no secrets; anything else is unexpected.
    const reason = ((await probe.json().catch(() => ({}))) as { error?: string }).error;
    check(probe.status === 403 && reason === "challenge",
      `contact route is configured (a tokenless probe must get 403 challenge; got ${probe.status} ${reason ?? "no reason"})`);
  }

  for (const f of findings) console.log(`${f.ok ? "✓" : "✗"} ${f.what}`);
  const failed = findings.filter((f) => !f.ok).length;
  if (failed) {
    console.error(`\n✗ ${failed} live check(s) failed`);
    process.exit(1);
  }
  console.log(`\n✓ Live site matches main (${findings.length} checks).`);
}

if (process.argv[1]?.endsWith("live-check.ts")) {
  main().catch((e) => {
    console.error(`✗ live check could not run: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
