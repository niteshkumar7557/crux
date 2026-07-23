import { describe, it, expect } from "vitest";
import { convertLogicScore, tierProgress, TIER_LADDER } from "./logicScore";

describe("TIER_LADDER", () => {
  it("is §15's ladder, unchanged", () => {
    expect(TIER_LADDER.map((t) => t.at)).toEqual([0, 50, 100, 150, 200]);
    expect(TIER_LADDER.map((t) => t.grade)).toEqual(["B", "B+", "A", "A+", "M"]);
  });
});

describe("tierProgress", () => {
  it("puts 0 at the bottom of Beginner", () => {
    const p = tierProgress(0);
    expect(p.tier).toBe("beginner");
    expect(p.grade).toBe("B");
    expect(p.floor).toBe(0);
    expect(p.nextAt).toBe(50);
    expect(p.nextTier).toBe("intermediate");
    expect(p.toNext).toBe(50);
    expect(p.pct).toBe(0);
  });

  it("holds Beginner at 49 and flips at 50", () => {
    expect(tierProgress(49).tier).toBe("beginner");
    expect(tierProgress(49).toNext).toBe(1);
    expect(tierProgress(50).tier).toBe("intermediate");
    expect(tierProgress(50).pct).toBe(0);
  });

  it("reports position within a band", () => {
    const p = tierProgress(125);
    expect(p.tier).toBe("skilled");
    expect(p.nextTier).toBe("expert");
    expect(p.toNext).toBe(25);
    expect(p.pct).toBe(0.5);
  });

  it("holds Expert at 199", () => {
    expect(tierProgress(199).tier).toBe("expert");
    expect(tierProgress(199).toNext).toBe(1);
  });

  it("tops out at Master with no next tier", () => {
    const p = tierProgress(200);
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
  it("keeps its existing contract for cards and the leaderboard", () => {
    expect(convertLogicScore(0)).toEqual({ reputation: "beginner", grade: "B" });
    expect(convertLogicScore(75)).toEqual({
      reputation: "intermediate",
      grade: "B+",
    });
    expect(convertLogicScore(200)).toEqual({ reputation: "master", grade: "M" });
  });
});
