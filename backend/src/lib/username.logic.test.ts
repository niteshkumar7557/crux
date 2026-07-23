import { describe, it, expect } from "vitest";
import {
  normalizeUsername,
  validateUsername,
  USERNAME_MIN,
  USERNAME_MAX,
} from "./username.logic.js";

const reason = (raw: string) => {
  const r = validateUsername(raw);
  return r.ok ? null : r.reason;
};

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  MAYA_Reasons ")).toBe("maya_reasons");
  });

  it("survives null-ish input", () => {
    expect(normalizeUsername(undefined as unknown as string)).toBe("");
  });
});

describe("validateUsername", () => {
  it("accepts a plain handle", () => {
    expect(validateUsername("maya_reasons")).toEqual({
      ok: true,
      value: "maya_reasons",
    });
  });

  it("accepts and normalises mixed case", () => {
    expect(validateUsername("  Maya  ")).toEqual({ ok: true, value: "maya" });
  });

  it("rejects an empty handle", () => {
    expect(reason("   ")).toBe("Pick a username.");
  });

  it("rejects spaces, and says so specifically", () => {
    expect(reason("bad name")).toBe("Usernames can't contain spaces.");
    expect(reason("a b")).toBe("Usernames can't contain spaces.");
  });

  it("rejects handles outside 3–20 characters", () => {
    const msg = `Usernames are ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
    expect(reason("ab")).toBe(msg);
    expect(reason("a".repeat(21))).toBe(msg);
  });

  it("accepts the exact boundaries", () => {
    expect(validateUsername("abc").ok).toBe(true);
    expect(validateUsername("a".repeat(20)).ok).toBe(true);
  });

  it("rejects anything outside [a-z0-9_]", () => {
    const msg = "Use letters, numbers and underscores only.";
    expect(reason("maya/reasons")).toBe(msg);
    expect(reason("maya.reasons")).toBe(msg);
    expect(reason("maya-reasons")).toBe(msg);
    expect(reason("maya🙂")).toBe(msg);
  });

  it("rejects an all-digit handle so a numeric URL is always a legacy id", () => {
    expect(reason("123")).toBe("Usernames need at least one letter.");
    expect(reason("1_2_3")).toBe("Usernames need at least one letter.");
  });

  it("rejects reserved names", () => {
    expect(reason("admin")).toBe("That username is reserved.");
    expect(reason("Profile")).toBe("That username is reserved.");
  });
});
