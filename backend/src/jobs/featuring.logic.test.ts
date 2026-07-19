import { describe, it, expect } from "vitest";
import {
  computeHeat,
  shouldRotateDotd,
  effectiveScore,
  FEATURED_SLOTS,
  HEAT_WINDOW_HOURS,
  FEATURING_TICK_MS,
  VOTE_WEIGHT,
} from "./featuring.logic.js";

describe("computeHeat", () => {
  it("is 0 for a dead debate (no comments)", () => {
    expect(computeHeat({ recentComments: 0, affComments: 0, negComments: 0 })).toBe(0);
  });

  it("halves a one-sided debate (a side empty → balance 0)", () => {
    expect(computeHeat({ recentComments: 4, affComments: 4, negComments: 0 })).toBe(2);
  });

  it("gives full credit to a perfectly balanced debate (balance 1)", () => {
    expect(computeHeat({ recentComments: 6, affComments: 3, negComments: 3 })).toBe(6);
  });

  it("scales partial balance (aff 2, neg 6 → balance 1/3)", () => {
    // 8 * (0.5 + 0.5 * (2/6)) = 8 * 0.6666… = 5.333…
    expect(computeHeat({ recentComments: 8, affComments: 2, negComments: 6 })).toBeCloseTo(5.3333, 3);
  });

  it("scales linearly with velocity at fixed balance", () => {
    const a = computeHeat({ recentComments: 5, affComments: 3, negComments: 3 });
    const b = computeHeat({ recentComments: 10, affComments: 3, negComments: 3 });
    expect(b).toBeCloseTo(2 * a, 6);
  });
});

describe("shouldRotateDotd", () => {
  it("rotates only when none was crowned today", () => {
    expect(shouldRotateDotd(false)).toBe(true);
    expect(shouldRotateDotd(true)).toBe(false);
  });
});

describe("constants", () => {
  it("match the approved parameters", () => {
    expect(FEATURED_SLOTS).toBe(4);
    expect(HEAT_WINDOW_HOURS).toBe(24);
    expect(FEATURING_TICK_MS).toBe(300_000);
  });
});

describe("effectiveScore", () => {
  it("adds VOTE_WEIGHT per vote to heat", () => {
    expect(effectiveScore(2, 0)).toBe(2);
    expect(effectiveScore(2, 3)).toBe(5); // 2 + 1*3
    expect(VOTE_WEIGHT).toBe(1);
  });
});
