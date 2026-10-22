import { describe, expect, it } from "vitest";
import { fixturePublicationDate } from "./helpers/fixture-date";

describe("E2E fixture publication date", () => {
  it("keeps the fixture newer than three existing publications", () => {
    const dates = ["2026-10-14", "2026-10-18", "2026-10-22"];
    const fixture = fixturePublicationDate(dates);
    expect(fixture).toBe("2026-10-23");
    expect([...dates, fixture].sort().reverse().slice(0, 3)).toContain(fixture);
  });

  it("uses the maximum independently of input order or the wall clock", () => {
    expect(fixturePublicationDate(["2030-01-01", "2026-10-22", "2029-12-31"])).toBe("2030-01-02");
  });

  it("handles a UTC year boundary", () => {
    expect(fixturePublicationDate(["2030-12-31"])).toBe("2031-01-01");
  });

  it("handles a leap-day boundary", () => {
    expect(fixturePublicationDate(["2028-02-28"])).toBe("2028-02-29");
    expect(fixturePublicationDate(["2028-02-29"])).toBe("2028-03-01");
  });

  it("keeps the original fixture date in an empty repository", () => {
    expect(fixturePublicationDate([])).toBe("2026-10-03");
  });
});
