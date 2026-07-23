import { describe, it, expect } from "vitest";
import { archiveHref, parseOutcome } from "./archiveHref";

describe("archiveHref", () => {
  it("keeps the bare address clean when nothing is filtered", () => {
    expect(archiveHref({})).toBe("/archive");
    expect(archiveHref({ outcome: "all", domain: "all", page: 1 })).toBe(
      "/archive",
    );
  });

  it("carries a single filter", () => {
    expect(archiveHref({ outcome: "draw" })).toBe("/archive?outcome=draw");
    expect(archiveHref({ domain: "science" })).toBe("/archive?domain=science");
  });

  it("keeps the other filter when one changes — the whole point", () => {
    expect(archiveHref({ outcome: "draw", domain: "science" })).toBe(
      "/archive?outcome=draw&domain=science",
    );
  });

  it("keeps both filters when paging", () => {
    expect(archiveHref({ outcome: "for", domain: "science", page: 3 })).toBe(
      "/archive?outcome=for&domain=science&page=3",
    );
  });

  it("leaves page 1 out of the URL", () => {
    expect(archiveHref({ outcome: "for", page: 1 })).toBe("/archive?outcome=for");
  });

  it("encodes a domain slug rather than trusting it", () => {
    expect(archiveHref({ domain: "law & justice" })).toBe(
      "/archive?domain=law+%26+justice",
    );
  });
});

describe("parseOutcome", () => {
  it("accepts every ruling in the vocabulary", () => {
    for (const slug of ["all", "for", "against", "draw", "walkover"]) {
      expect(parseOutcome(slug)).toBe(slug);
    }
  });

  it("falls back to all for junk or nothing", () => {
    expect(parseOutcome("bogus")).toBe("all");
    expect(parseOutcome(undefined)).toBe("all");
    expect(parseOutcome("")).toBe("all");
  });
});
