import { describe, it, expect } from "vitest";
import {
  CROSS_USER_MIN_LENGTH,
  findDuplicate,
  normaliseComment,
  type PriorComment,
} from "./duplicate.logic.js";

// A comment long enough that a cross-user repost of it is refused.
const LONG =
  "France built 56 reactors in 15 years, but only under a state monopoly with cheap public debt.";

const prior = (over: Partial<PriorComment> = {}): PriorComment => ({
  userId: 1,
  username: "arjun",
  content: LONG,
  ...over,
});

describe("normaliseComment", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(normaliseComment("The COST — is real!!")).toBe("the cost is real");
    expect(normaliseComment("  the   cost is real  ")).toBe("the cost is real");
  });

  it("strips accents so a re-typed comment still matches", () => {
    expect(normaliseComment("café")).toBe(normaliseComment("cafe"));
  });

  it("keeps non-Latin scripts instead of emptying them", () => {
    expect(normaliseComment("यह तर्क गलत है।")).toBe("यह तर्क गलत है");
  });

  it("collapses a punctuation-only comment to nothing", () => {
    expect(normaliseComment("!!! ???")).toBe("");
  });
});

describe("findDuplicate", () => {
  it("passes a genuinely new comment", () => {
    expect(findDuplicate("A brand new point", [prior()], 2)).toEqual({
      duplicate: false,
    });
  });

  it("refuses your own comment posted again", () => {
    const verdict = findDuplicate(LONG, [prior({ userId: 7 })], 7);
    expect(verdict).toEqual({ duplicate: true, of: "self" });
  });

  it("refuses your own repost however short it is", () => {
    const short = "agreed";
    expect(short.length).toBeLessThan(CROSS_USER_MIN_LENGTH);
    expect(
      findDuplicate(short, [prior({ userId: 7, content: short })], 7),
    ).toEqual({ duplicate: true, of: "self" });
  });

  it("refuses a comment copied from another debater, and names them", () => {
    const verdict = findDuplicate(LONG, [prior({ userId: 1 })], 2);
    expect(verdict).toEqual({ duplicate: true, of: "other", username: "arjun" });
  });

  it("catches a copy that only changed case and punctuation", () => {
    const dressed = `${LONG.toUpperCase()}!!!`;
    expect(findDuplicate(dressed, [prior({ userId: 1 })], 2)).toEqual({
      duplicate: true,
      of: "other",
      username: "arjun",
    });
  });

  it("allows a short collision between two different people", () => {
    const short = "i agree with this";
    expect(normaliseComment(short).length).toBeLessThan(CROSS_USER_MIN_LENGTH);
    expect(
      findDuplicate(short, [prior({ userId: 1, content: short })], 2),
    ).toEqual({ duplicate: false });
  });

  it("reports a self-repost even when someone else posted the words first", () => {
    const verdict = findDuplicate(
      LONG,
      [prior({ userId: 1, username: "arjun" }), prior({ userId: 7 })],
      7,
    );
    expect(verdict).toEqual({ duplicate: true, of: "self" });
  });

  it("does not refuse a comment that merely contains an earlier one", () => {
    expect(
      findDuplicate(`${LONG} And the storage cost is unpriced.`, [prior()], 2),
    ).toEqual({ duplicate: false });
  });

  it("never matches on a comment that normalises to nothing", () => {
    expect(findDuplicate("???", [prior({ content: "!!!" })], 2)).toEqual({
      duplicate: false,
    });
  });
});
