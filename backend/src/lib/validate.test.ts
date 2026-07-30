import { describe, it, expect } from "vitest";
import { checkText, isTooShortToJudge, MIN_ARGUMENT_CHARS } from "./validate.js";

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

describe("isTooShortToJudge", () => {
  it("refuses the short generic posts that are never worth a model call", () => {
    expect(isTooShortToJudge("yes, i agree")).toBe(true);
    expect(isTooShortToJudge("no this is wrong")).toBe(true);
    expect(isTooShortToJudge("exactly this")).toBe(true);
  });

  it("measures after trimming, so whitespace cannot pad past the floor", () => {
    expect(isTooShortToJudge("   ok sure    ")).toBe(true);
  });

  it("lets anything long enough to hold a reason through to the model", () => {
    expect(isTooShortToJudge("wrong. the data says otherwise.")).toBe(false);
    expect(isTooShortToJudge("yes exactly, this is what i have been saying")).toBe(
      false,
    );
  });

  it("admits a real argument that happens to be terse", () => {
    expect(isTooShortToJudge("Vogtle cost $35bn, double the estimate.")).toBe(false);
  });

  it("puts the floor exactly at MIN_ARGUMENT_CHARS", () => {
    expect(isTooShortToJudge("x".repeat(MIN_ARGUMENT_CHARS - 1))).toBe(true);
    expect(isTooShortToJudge("x".repeat(MIN_ARGUMENT_CHARS))).toBe(false);
  });
});
