import { describe, it, expect } from "vitest";
import { convertLogicScore, tierProgress, TIER_LADDER } from "./logicScore";

describe("TIER_LADDER", () => {
  it("is §13's ladder, unchanged", () => {
    expect(TIER_LADDER.map((t) => t.at)).toEqual([0, 100, 200, 300, 400]);
    expect(TIER_LADDER.map((t) => t.tier)).toEqual([
      "beginner",
      "intermediate",
      "skilled",
      "expert",
      "master",
    ]);
  });

  it("carries a tier name and nothing else — the letter grades are gone", () => {
    for (const rung of TIER_LADDER) {
      expect(Object.keys(rung).sort()).toEqual(["at", "tier"]);
    }
  });
});

describe("tierProgress", () => {
  it("puts 0 at the bottom of Beginner", () => {
    const p = tierProgress(0);
    expect(p.tier).toBe("beginner");
    expect(p.floor).toBe(0);
    expect(p.nextAt).toBe(100);
    expect(p.nextTier).toBe("intermediate");
    expect(p.toNext).toBe(100);
    expect(p.pct).toBe(0);
  });

  it("holds Beginner at 99 and flips at 100", () => {
    expect(tierProgress(99).tier).toBe("beginner");
    expect(tierProgress(99).toNext).toBe(1);
    expect(tierProgress(100).tier).toBe("intermediate");
    expect(tierProgress(100).pct).toBe(0);
  });

  it("reports position within a band", () => {
    const p = tierProgress(250);
    expect(p.tier).toBe("skilled");
    expect(p.nextTier).toBe("expert");
    expect(p.toNext).toBe(50);
    expect(p.pct).toBe(0.5);
  });

  it("holds Expert at 399", () => {
    expect(tierProgress(399).tier).toBe("expert");
    expect(tierProgress(399).toNext).toBe(1);
  });

  it("tops out at Master with no next tier", () => {
    const p = tierProgress(400);
    expect(p.tier).toBe("master");
    expect(p.index).toBe(4);
    expect(p.nextAt).toBeNull();
    expect(p.nextTier).toBeNull();
    expect(p.toNext).toBe(0);
    expect(p.pct).toBe(1);
  });

  it("stays at Master far above the threshold", () => {
    expect(tierProgress(10000).tier).toBe("master");
    expect(tierProgress(10000).pct).toBe(1);
  });

  it("floors junk input at Beginner", () => {
    expect(tierProgress(-10).tier).toBe("beginner");
    expect(tierProgress(NaN).tier).toBe("beginner");
  });
});

describe("convertLogicScore", () => {
  it("returns the reputation tier alone", () => {
    expect(convertLogicScore(0)).toEqual({ reputation: "beginner" });
    expect(convertLogicScore(150)).toEqual({ reputation: "intermediate" });
    expect(convertLogicScore(400)).toEqual({ reputation: "master" });
  });
});
