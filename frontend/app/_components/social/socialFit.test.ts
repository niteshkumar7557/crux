import { describe, expect, it } from "vitest";
import {
  SIZE_STEPS,
  charsPerLine,
  fitFontSize,
  fitScaled,
  heightAt,
  isSizeStep,
  linesAt,
  scaled,
} from "./socialFit";

// The argument slide's real headline box: 1080 wide less the 40px margin, the
// 1.5px frame and the 66px padding.
const BOX_W = 865;

describe("charsPerLine", () => {
  it("fits fewer characters as the type grows", () => {
    expect(charsPerLine("display", BOX_W, 60)).toBeGreaterThan(
      charsPerLine("display", BOX_W, 120),
    );
  });

  it("never returns zero, however absurd the size", () => {
    expect(charsPerLine("display", BOX_W, 100000)).toBe(1);
    expect(charsPerLine("display", 0, 100)).toBe(1);
  });
});

describe("linesAt", () => {
  it("is zero for empty text", () => {
    expect(linesAt("", "display", BOX_W, 100)).toBe(0);
  });

  it("wraps a long line onto more lines than a short one", () => {
    const short = linesAt("SHORT LINE", "display", BOX_W, 100);
    const long = linesAt("A".repeat(200), "display", BOX_W, 100);
    expect(long).toBeGreaterThan(short);
  });
});

describe("fitFontSize", () => {
  const base = { face: "display" as const, width: BOX_W, height: 535, lineHeight: 0.94, max: 116, min: 54 };

  it("leaves a short headline at the maximum", () => {
    expect(fitFontSize({ ...base, text: "COACHING FAILS" })).toBe(116);
  });

  // The bug this module exists for: 96 characters of Anton at a fixed 116px
  // wraps to six lines and prints straight through the quote below it.
  it("shrinks the headline that used to overlap the quote", () => {
    const text = "COMPETITIVE EXAMS DEMAND INTENSIVE PRACTICE BEYOND SCHOOL CURRICULUM SCOPE AND BUDGET";
    const size = fitFontSize({ ...base, text });
    expect(size).toBeLessThan(116);
    expect(heightAt(text, "display", BOX_W, size, 0.94)).toBeLessThanOrEqual(535);
  });

  it("never returns more than max nor less than min", () => {
    expect(fitFontSize({ ...base, text: "TINY" })).toBeLessThanOrEqual(116);
    expect(fitFontSize({ ...base, text: "X".repeat(5000) })).toBe(54);
  });

  it("is monotonic: longer text never gets a bigger size", () => {
    let previous = Infinity;
    for (const length of [10, 40, 80, 120, 200, 400]) {
      const size = fitFontSize({ ...base, text: "A".repeat(length) });
      expect(size).toBeLessThanOrEqual(previous);
      previous = size;
    }
  });

  it("gives a taller box a bigger size for the same text", () => {
    const text = "A".repeat(120);
    expect(fitFontSize({ ...base, text, height: 800 })).toBeGreaterThanOrEqual(
      fitFontSize({ ...base, text, height: 400 }),
    );
  });

  it("returns a whole number, because satori is laying out pixels", () => {
    const size = fitFontSize({ ...base, text: "A".repeat(77) });
    expect(Number.isInteger(size)).toBe(true);
  });
});

describe("scaled", () => {
  it("leaves auto alone and moves every other step", () => {
    expect(scaled(100, "auto")).toBe(100);
    expect(scaled(100, undefined)).toBe(100);
    expect(scaled(100, "xs")).toBeLessThan(100);
    expect(scaled(100, "xl")).toBeGreaterThan(100);
  });

  it("orders the steps smallest to largest", () => {
    const sizes = SIZE_STEPS.filter((s) => s !== "auto").map((s) => scaled(100, s));
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });

  it("never returns zero", () => {
    expect(scaled(1, "xs")).toBeGreaterThanOrEqual(1);
  });
});

describe("fitScaled", () => {
  it("applies the preset on top of the fitted size", () => {
    const input = { text: "A".repeat(90), face: "display" as const, width: BOX_W, height: 535, lineHeight: 0.94, max: 116, min: 54 };
    expect(fitScaled(input, "auto")).toBe(fitFontSize(input));
    expect(fitScaled(input, "xs")).toBeLessThan(fitScaled(input, "xl"));
  });
});

describe("isSizeStep", () => {
  it("accepts the steps and rejects anything else", () => {
    expect(isSizeStep("auto")).toBe(true);
    expect(isSizeStep("xl")).toBe(true);
    for (const bad of ["huge", "", null, 7, {}]) expect(isSizeStep(bad)).toBe(false);
  });
});
