import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chainEndsAt, compareDeployment, deployFresh, DEPLOY_GRACE_MINUTES, follow, type Hop, type LiveEntry } from "../scripts/live-check";

const A: LiveEntry = { publication_id: "GSP-0001", action: "PUBLISH", route: "/research/a", manifest_sha256: "1".repeat(64), article_sha256: "2".repeat(64) };
const W: LiveEntry = { publication_id: "GSP-0002", action: "WITHDRAW", route: "/research/b", manifest_sha256: "3".repeat(64), article_sha256: null };
const deployment = (publications: LiveEntry[], over: Record<string, unknown> = {}) => ({
  schema: "ground-state.web-deployment.v1", commit: "a".repeat(40), build_uuid: "b", branch: "main", publications, ...over,
});
const failures = (live: unknown, expected: LiveEntry[]) => compareDeployment(live, expected).filter((f) => !f.ok).map((f) => f.what);

describe("compareDeployment", () => {
  it("passes when the live list is exactly main's", () => {
    expect(failures(deployment([A, W]), [A, W])).toEqual([]);
  });

  it("flags a publication missing from the live site (stale or failed deploy)", () => {
    expect(failures(deployment([]), [A])).toEqual([expect.stringContaining("serves GSP-0001")]);
  });

  it("flags a live publication main does not have", () => {
    expect(failures(deployment([A, W]), [A])).toEqual([expect.stringContaining("which main does not")]);
  });

  it("flags different bytes for the same publication", () => {
    expect(failures(deployment([{ ...A, article_sha256: "f".repeat(64) }]), [A]).length).toBe(2);
  });

  it("flags a wrong schema, branch or missing commit", () => {
    expect(failures(deployment([], { schema: "x", branch: "dev", commit: null }), []).length).toBe(3);
    expect(failures(null, []).length).toBe(3);
  });
});

describe("chainEndsAt", () => {
  const apex = "https://groundstatemethod.com/research";
  const hop = (status: number, url: string): Hop => ({ status, url });

  it("accepts http://www upgraded on its own host first, then moved to the apex", () => {
    const hops = [hop(301, "http://www.groundstatemethod.com/research"), hop(301, "https://www.groundstatemethod.com/research"), hop(200, apex)];
    expect(chainEndsAt(hops, apex, 2)).toBe(true);
    expect(chainEndsAt(hops, apex, 1)).toBe(false);
  });

  it("refuses a chain that stops short of the apex", () => {
    expect(chainEndsAt([hop(301, "http://www.groundstatemethod.com/research"), hop(200, "https://www.groundstatemethod.com/research")], apex, 2)).toBe(false);
  });

  it("refuses a temporary redirect on the way", () => {
    expect(chainEndsAt([hop(302, "https://www.groundstatemethod.com/research"), hop(200, apex)], apex, 1)).toBe(false);
  });

  it("refuses an end that is not 200, and an empty chain", () => {
    expect(chainEndsAt([hop(301, "https://www.groundstatemethod.com/research"), hop(404, apex)], apex, 1)).toBe(false);
    expect(chainEndsAt([], apex, 1)).toBe(false);
  });
});

describe("deployFresh", () => {
  const head = "a".repeat(40);
  const old = "b".repeat(40);

  it("passes when the site serves main's head", () => {
    expect(deployFresh(head, head, 600).ok).toBe(true);
  });

  it("allows a fresh merge time to deploy", () => {
    expect(deployFresh(old, head, DEPLOY_GRACE_MINUTES - 1).ok).toBe(true);
  });

  it("fails when main has been ahead of the site for longer than the grace", () => {
    const f = deployFresh(old, head, DEPLOY_GRACE_MINUTES + 1);
    expect(f.ok).toBe(false);
    expect(f.what).toContain("deploys have stopped");
  });

  it("fails when the deployment names no commit", () => {
    expect(deployFresh(undefined, head, 600).ok).toBe(false);
  });
});

describe("follow", () => {
  let server: Server;
  let origin = "";
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/a") res.writeHead(301, { Location: "/b" }).end();
      else if (req.url === "/b") res.writeHead(308, { Location: `${origin}/c` }).end();
      else if (req.url === "/loop") res.writeHead(301, { Location: "/loop" }).end();
      else res.writeHead(200).end("ok");
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("records every hop, resolving relative and absolute locations", async () => {
    const hops = await follow(`${origin}/a`);
    expect(hops).toEqual([
      { url: `${origin}/a`, status: 301 },
      { url: `${origin}/b`, status: 308 },
      { url: `${origin}/c`, status: 200 },
    ]);
    expect(chainEndsAt(hops, `${origin}/c`, 2)).toBe(true);
  });

  it("stops a redirect loop, and the loop fails the chain check", async () => {
    const hops = await follow(`${origin}/loop`, 3);
    expect(hops.length).toBe(4);
    expect(chainEndsAt(hops, `${origin}/loop`, 3)).toBe(false);
  });
});
