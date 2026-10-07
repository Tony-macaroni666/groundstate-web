import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM build script without type declarations
import { contactSecretsPlan, withoutContactSecrets } from "../scripts/contact-secrets.mjs";

const BOTH = { CONTACT_RECIPIENT: "owner@example.test", TURNSTILE_SECRET: "s3cret", CLOUDFLARE_API_TOKEN: "t" };

describe("contact secrets in the Cloudflare build", () => {
  it("uploads both on a production build with a token", () => {
    expect(contactSecretsPlan(BOTH, true)).toEqual({
      action: "upload",
      values: { CONTACT_RECIPIENT: "owner@example.test", TURNSTILE_SECRET: "s3cret" },
    });
  });

  it("never uploads from a non-production build", () => {
    expect(contactSecretsPlan(BOTH, false).action).toBe("skip");
  });

  it("uploads nothing unless both are present, so it never blanks one", () => {
    expect(contactSecretsPlan({ ...BOTH, TURNSTILE_SECRET: "  " }, true)).toMatchObject({ action: "skip" });
    expect(contactSecretsPlan({ CLOUDFLARE_API_TOKEN: "t" }, true).action).toBe("skip");
  });

  it("reports a missing token instead of trying", () => {
    expect(contactSecretsPlan({ ...BOTH, CLOUDFLARE_API_TOKEN: "" }, true).action).toBe("no-token");
  });

  it("keeps the secrets out of every other build step", () => {
    const env = withoutContactSecrets({ ...BOTH, PATH: "/bin" });
    expect(env).toEqual({ CLOUDFLARE_API_TOKEN: "t", PATH: "/bin" });
  });
});
