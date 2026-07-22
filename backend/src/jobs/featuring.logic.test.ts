import { describe, it, expect } from "vitest";
import {
  computeHeat,
  MAIN_STAGE_SIZE,
  HEAT_WINDOW_HOURS,
  BALANCE_FLOOR,
} from "./featuring.logic.js";

describe("computeHeat", () => {
  it("is zero with no comments", () => {
    expect(computeHeat(0, 0, 0)).toBe(0);
  });

  it("ranks a balanced fight above a busier blowout", () => {
    // §11: a 50/50 fight at 10 comments beats a 90/10 pile-on at 20.
    expect(computeHeat(10, 5, 5)).toBeGreaterThan(computeHeat(20, 18, 2));
  });

  it("rises with velocity when balance is equal", () => {
    expect(computeHeat(20, 10, 10)).toBeGreaterThan(computeHeat(10, 5, 5));
  });

  it("discounts a lopsided debate against an even one at the same velocity", () => {
    // The balance factor is the whole point: same volume, different contest.
    expect(computeHeat(10, 5, 5)).toBeGreaterThan(computeHeat(10, 8, 2));
    expect(computeHeat(10, 8, 2)).toBeGreaterThan(computeHeat(10, 10, 0));
  });

  it("scores a perfectly even debate at its full velocity", () => {
    expect(computeHeat(12, 6, 6)).toBeCloseTo(12, 5);
  });

  it("floors a fully one-sided debate at the balance minimum", () => {
    expect(computeHeat(10, 10, 0)).toBeCloseTo(2.5, 5);
    expect(BALANCE_FLOOR).toBe(0.25);
  });

  it("is symmetric — which side is ahead does not matter", () => {
    expect(computeHeat(10, 8, 2)).toBe(computeHeat(10, 2, 8));
  });

  it("never returns a negative or non-finite heat", () => {
    // heat feeds an ORDER BY, so garbage must sort last, not crash the tick.
    expect(computeHeat(-5, 0, 0)).toBe(0);
    expect(computeHeat(NaN, 1, 1)).toBe(0);
    expect(computeHeat(10, NaN, 1)).toBe(0);
  });

  it("keeps the stage small", () => {
    expect(MAIN_STAGE_SIZE).toBe(4);
    expect(HEAT_WINDOW_HOURS).toBe(6);
  });
});
