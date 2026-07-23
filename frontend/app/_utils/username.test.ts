import { describe, it, expect } from "vitest";
import { normalizeUsername, validateUsername } from "./username";

describe("username (frontend mirror of backend/src/lib/username.logic.ts)", () => {
  it("normalises the same way the server stores it", () => {
    expect(normalizeUsername("  MAYA_Reasons ")).toBe("maya_reasons");
  });

  it("accepts a plain handle", () => {
    expect(validateUsername("maya_reasons")).toEqual({
      ok: true,
      value: "maya_reasons",
    });
  });

  it("returns the server's exact rejection copy", () => {
    const r = (raw: string) => {
      const out = validateUsername(raw);
      return out.ok ? null : out.reason;
    };
    expect(r("   ")).toBe("Pick a username.");
    expect(r("bad name")).toBe("Usernames can't contain spaces.");
    expect(r("ab")).toBe("Usernames are 3–20 characters.");
    expect(r("maya-reasons")).toBe("Use letters, numbers and underscores only.");
    expect(r("123")).toBe("Usernames need at least one letter.");
    expect(r("admin")).toBe("That username is reserved.");
  });
});
