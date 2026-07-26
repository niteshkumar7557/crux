import { describe, it, expect } from "vitest";
import { checkText } from "./validate.js";

describe("checkText", () => {
  it("rejects non-strings and empty/whitespace strings", () => {
    for (const bad of [undefined, null, 42, {}, "", "   "]) {
      const r = checkText(bad, { field: "content", max: 100 });
      expect(r).toEqual({ ok: false, reason: "content_required" });
    }
  });

  it("rejects over-cap strings and names the field", () => {
    const r = checkText("x".repeat(101), { field: "input", max: 100 });
    expect(r).toEqual({ ok: false, reason: "input_too_long" });
  });

  it("accepts and trims a valid string", () => {
    expect(checkText("  fine  ", { field: "content", max: 100 })).toEqual({
      ok: true,
      value: "fine",
    });
  });

  it("measures the cap on the trimmed value", () => {
    const padded = "  " + "x".repeat(100) + "  ";
    expect(checkText(padded, { field: "content", max: 100 }).ok).toBe(true);
  });
});
