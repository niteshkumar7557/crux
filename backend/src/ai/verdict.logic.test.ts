import { describe, it, expect } from "vitest";
import {
  resolveVerdict,
  resolvePayouts,
  walkoverPayout,
  DRAW_MARGIN,
  MVP_BONUS,
  WIN_BONUS,
  LOSS_PENALTY,
  AUTHOR_BONUS,
  type RawVerdict,
  type ParticipantWithName,
} from "./verdict.logic.js";

const people: ParticipantWithName[] = [
  { userId: 1, side: "for", username: "maya" },
  { userId: 2, side: "against", username: "dev" },
];

const raw = (over: Partial<RawVerdict> = {}): RawVerdict => ({
  for: 58,
  against: 42,
  winner: "for",
  mvp_username: "maya",
  closing: "The crux was baseload.",
  ...over,
});

describe("resolveVerdict", () => {
  it("declares a winner when the margin exceeds 5", () => {
    const v = resolveVerdict(raw(), people);
    expect(v.winner).toBe("for");
    expect(v.margin).toBe(16);
  });

  it("draws at exactly the threshold", () => {
    // 53-47 is a margin of 6 -> decisive; 52-48 is 4 -> draw.
    expect(resolveVerdict(raw({ for: 53, against: 47 }), people).winner).toBe("for");
    expect(resolveVerdict(raw({ for: 52, against: 48 }), people).winner).toBe("draw");
    expect(DRAW_MARGIN).toBe(5);
  });

  it("normalises scores that do not sum to 100", () => {
    const v = resolveVerdict(raw({ for: 30, against: 10 }), people);
    expect(v.affirmative + v.negative).toBe(100);
    expect(v.affirmative).toBe(75);
  });

  it("accepts an MVP on the winning side", () => {
    expect(resolveVerdict(raw(), people).mvpUserId).toBe(1);
  });

  it("rejects an MVP on the losing side", () => {
    const v = resolveVerdict(raw({ mvp_username: "dev" }), people);
    expect(v.mvpUserId).toBeNull();
  });

  it("rejects an MVP on a draw", () => {
    const v = resolveVerdict(raw({ for: 51, against: 49 }), people);
    expect(v.winner).toBe("draw");
    expect(v.mvpUserId).toBeNull();
  });

  it("rejects an invented username", () => {
    const v = resolveVerdict(raw({ mvp_username: "ghost" }), people);
    expect(v.mvpUserId).toBeNull();
  });
});

describe("resolvePayouts", () => {
  it("pays the MVP 25 instead of, not on top of, the win bonus", () => {
    const p = resolvePayouts({
      winner: "for",
      participants: people,
      mvpUserId: 1,
      authorId: 3,
    });
    const maya = p.logicAwards.filter((a) => a.userId === 1);
    expect(maya).toHaveLength(1);
    expect(maya[0]!.amount).toBe(MVP_BONUS);
    expect(MVP_BONUS).toBe(25);
  });

  it("pays other winners the win bonus", () => {
    const p = resolvePayouts({
      winner: "for",
      participants: [...people, { userId: 4, side: "for", username: "sam" }],
      mvpUserId: 1,
      authorId: 9,
    });
    const sam = p.logicAwards.find((a) => a.userId === 4)!;
    expect(sam.amount).toBe(WIN_BONUS);
    expect(sam.seasonOnly).toBe(false);
  });

  it("docks the loser season-only", () => {
    const p = resolvePayouts({
      winner: "for",
      participants: people,
      mvpUserId: 1,
      authorId: 9,
    });
    const dev = p.logicAwards.find((a) => a.userId === 2)!;
    expect(dev.amount).toBe(LOSS_PENALTY);
    expect(LOSS_PENALTY).toBe(-5);
    expect(dev.seasonOnly).toBe(true);
  });

  it("pays nobody but the author on a draw", () => {
    const p = resolvePayouts({
      winner: "draw",
      participants: people,
      mvpUserId: null,
      authorId: 9,
    });
    expect(p.logicAwards).toEqual([
      { userId: 9, amount: AUTHOR_BONUS, seasonOnly: false },
    ]);
    expect(p.results.every((r) => r.outcome === "draw")).toBe(true);
  });

  it("records win/loss outcomes per side", () => {
    const p = resolvePayouts({
      winner: "for",
      participants: people,
      mvpUserId: 1,
      authorId: 9,
    });
    expect(p.results.find((r) => r.userId === 1)!.outcome).toBe("win");
    expect(p.results.find((r) => r.userId === 2)!.outcome).toBe("loss");
    expect(p.results.find((r) => r.userId === 1)!.isMvp).toBe(true);
  });

  it("pays an author who also argued both bonuses", () => {
    const p = resolvePayouts({
      winner: "for",
      participants: people,
      mvpUserId: null,
      authorId: 1, // maya wrote the statement AND argued for
    });
    const maya = p.logicAwards.filter((a) => a.userId === 1);
    // Numeric comparator: a bare .sort() is lexicographic, so [10, 5] would
    // "sort" to [10, 5] ("1" < "5") and never match [5, 10].
    expect(maya.map((a) => a.amount).sort((a, b) => a - b)).toEqual([
      AUTHOR_BONUS,
      WIN_BONUS,
    ]);
  });
});

describe("walkoverPayout", () => {
  it("pays absolutely nobody, author included", () => {
    expect(walkoverPayout()).toEqual({ results: [], logicAwards: [] });
  });
});
