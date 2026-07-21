import { describe, it, expect } from "vitest";
import {
  resolveVerdict,
  resolvePayouts,
  walkoverPayout,
  MVP_BONUS,
  AUTHOR_BASE_BONUS,
  AUTHOR_WALKOVER_BONUS,
} from "./verdict.logic.js";

const base = { closing: "x", mvp_username: null, standout_username: null } as const;

describe("resolveVerdict", () => {
  it("normalizes for/against to sum 100", () => {
    const r = resolveVerdict({ ...base, for: 30, against: 10, winner: "for" }, new Set());
    expect(r.affirmative + r.negative).toBe(100);
    expect(r.affirmative).toBe(75);
    expect(r.negative).toBe(25);
  });

  it("forces a draw when the margin is within the threshold", () => {
    const r = resolveVerdict({ ...base, for: 53, against: 47, winner: "for" }, new Set());
    expect(r.margin).toBe(6);
    expect(r.winner).toBe("draw");
  });

  it("keeps a side winner when the margin exceeds the threshold", () => {
    const r = resolveVerdict({ ...base, for: 46, against: 54, winner: "against" }, new Set());
    expect(r.margin).toBe(8);
    expect(r.winner).toBe("against");
  });

  it("defaults to a 50/50 draw when both scores are zero", () => {
    const r = resolveVerdict({ ...base, for: 0, against: 0, winner: "for" }, new Set());
    expect(r.affirmative).toBe(50);
    expect(r.winner).toBe("draw");
  });

  it("keeps a valid MVP username and drops an unknown one", () => {
    const known = resolveVerdict({ ...base, for: 70, against: 30, winner: "for", mvp_username: "ada_novak" }, new Set(["ada_novak"]));
    expect(known.mvpUsername).toBe("ada_novak");
    const bogus = resolveVerdict({ ...base, for: 70, against: 30, winner: "for", mvp_username: "ghost" }, new Set(["ada_novak"]));
    expect(bogus.mvpUsername).toBeNull();
  });
});

describe("resolvePayouts", () => {
  const participants = [
    { userId: 1, side: "for" as const },
    { userId: 2, side: "against" as const },
    { userId: 3, side: "for" as const },
  ];

  it("maps winning side to win and losing side to loss", () => {
    const p = resolvePayouts({ winner: "for", participants, mvpUserId: 1, authorId: 9 });
    const byUser = Object.fromEntries(p.results.map((r) => [r.userId, r.outcome]));
    expect(byUser[1]).toBe("win");
    expect(byUser[3]).toBe("win");
    expect(byUser[2]).toBe("loss");
  });

  it("marks only the MVP row and awards the MVP bonus", () => {
    const p = resolvePayouts({ winner: "for", participants, mvpUserId: 1, authorId: 9 });
    expect(p.results.filter((r) => r.isMvp).map((r) => r.userId)).toEqual([1]);
    expect(p.logicAwards).toContainEqual({ userId: 1, amount: MVP_BONUS });
  });

  it("gives every participant a draw outcome when the debate is a draw", () => {
    const p = resolvePayouts({ winner: "draw", participants, mvpUserId: null, authorId: 9 });
    expect(p.results.every((r) => r.outcome === "draw")).toBe(true);
    expect(p.logicAwards.some((a) => a.amount === MVP_BONUS)).toBe(false);
  });

  it("scales the author bonus by debate size and caps it", () => {
    const small = resolvePayouts({ winner: "for", participants, mvpUserId: null, authorId: 9 });
    expect(small.logicAwards).toContainEqual({ userId: 9, amount: AUTHOR_BASE_BONUS + 3 });

    const big = Array.from({ length: 20 }, (_, i) => ({ userId: i + 1, side: "for" as const }));
    const capped = resolvePayouts({ winner: "for", participants: big, mvpUserId: null, authorId: 99 });
    expect(capped.logicAwards).toContainEqual({ userId: 99, amount: AUTHOR_BASE_BONUS + 8 });
  });

  it("walkover: author credit only, no result rows", () => {
    const p = walkoverPayout(9);
    expect(p.results).toEqual([]);
    expect(p.logicAwards).toEqual([{ userId: 9, amount: AUTHOR_WALKOVER_BONUS }]);
  });
});
