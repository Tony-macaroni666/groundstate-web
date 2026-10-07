// The live check: what https://groundstatemethod.com actually serves, compared
// with what main says it should. Read-only; no secrets; sends no email.
//
// Run by .github/workflows/live-check.yml (daily, and on demand). It catches a
// failed or stale deploy, an article whose served bytes are not the signed
// bytes (an edge feature rewriting HTML), a withdrawn route still answering,
// the www redirect or HTTPS redirect gone, and the contact route closed while
// the form is open.

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

const sha256 = (b: ArrayBuffer) => createHash("sha256").update(Buffer.from(b)).digest("hex");
const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { redirect: "manual", ...init, headers: { "User-Agent": "groundstate-live-check", ...(init.headers ?? {}) } });

async function main(): Promise<void> {
  const findings: Finding[] = [];
  const check = (ok: boolean, what: string) => findings.push({ ok, what });
  const report = verifyPublications({ root: process.cwd() });
  check(report.errors.length === 0, "main's bundles verify");

  // The deployment and every publication on it.
  const res = await get(`${CANONICAL_ORIGIN}/_publications.json`);
  check(res.status === 200, `/_publications.json answers 200 (got ${res.status})`);
  const live = res.status === 200 ? await res.json() : null;
  findings.push(...compareDeployment(live, expectedEntries(report)));
  if (live?.commit) console.log(`  deployed commit ${live.commit}, build ${live.build_uuid}`);

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
  check(!/cdn-cgi\/scripts|rocket-loader|data-cfemail|__cf_email__/i.test(html), "no Cloudflare script or email rewriting in the page");
  const robots = await (await get(`${CANONICAL_ORIGIN}/robots.txt`)).text();
  check(/^Allow: \/$/m.test(robots) && robots.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`), "robots.txt allows indexing and names the sitemap");

  // Redirects.
  const www = await get("http://www.groundstatemethod.com/research");
  check([301, 308].includes(www.status) && /^https:\/\/groundstatemethod\.com\/research\/?$/.test(www.headers.get("location") ?? ""),
    `www redirects to the apex (got ${www.status} → ${www.headers.get("location")})`);
  const http = await get("http://groundstatemethod.com/");
  check([301, 308].includes(http.status) && (http.headers.get("location") ?? "").startsWith("https://groundstatemethod.com"),
    `http redirects to https (got ${http.status})`);

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
