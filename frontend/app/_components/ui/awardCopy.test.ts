import { describe, it, expect } from "vitest";
import { awardLedger, awardNote, type Award } from "./awardCopy";

const award = (over: Partial<Award> = {}): Award => ({
  points: 7,
  judged: 7,
  capped: false,
  halved: false,
  isReply: false,
  replyToUsername: null,
  seasonLogic: 143,
  seasonRank: 12,
  ...over,
});

describe("awardLedger", () => {
  it("shows a single row when nothing reduced the award", () => {
    expect(awardLedger(award({ points: 4, judged: 4 }))).toEqual([
      { label: "Judged", value: "4" },
    ]);
  });

  it("prices the standalone cap, rather than only naming it", () => {
    expect(awardLedger(award({ points: 5, judged: 6, capped: true }))).toEqual([
      { label: "Judged", value: "6" },
      { label: "Standalone cap", value: "−1" },
      { label: "Awarded", value: "5", total: true },
    ]);
  });

  it("prices the halving", () => {
    expect(
      awardLedger(
        award({ points: 3, judged: 7, isReply: true, replyToUsername: "maya", halved: true }),
      ),
    ).toEqual([
      { label: "Judged", value: "7" },
      { label: "Repeat halving", value: "−4" },
      { label: "Awarded", value: "3", total: true },
    ]);
  });

  it("prices BOTH modifiers when both bit, in the order they applied", () => {
    expect(
      awardLedger(award({ points: 2, judged: 7, capped: true, halved: true })),
    ).toEqual([
      { label: "Judged", value: "7" },
      { label: "Standalone cap", value: "−2" },
      { label: "Repeat halving", value: "−3" },
      { label: "Awarded", value: "2", total: true },
    ]);
  });

  it("still shows the halving row when the floor made it free", () => {
    const rows = awardLedger(award({ points: 1, judged: 1, halved: true }));
    expect(rows).toEqual([
      { label: "Judged", value: "1" },
      { label: "Repeat halving", value: "0" },
      { label: "Awarded", value: "1", total: true },
    ]);
  });

  it("marks only the final row as the total", () => {
    const rows = awardLedger(award({ points: 2, judged: 7, capped: true, halved: true }));
    expect(rows.filter((r) => r.total)).toHaveLength(1);
    expect(rows.at(-1)?.total).toBe(true);
  });
});

describe("awardNote", () => {
  it("teaches the reply rule exactly when the cap was just paid", () => {
    expect(awardNote(award({ capped: true }))).toBe(
      "Reply to an opponent next time to earn up to 8.",
    );
  });

  it("names the opponent on a clean reply", () => {
    expect(
      awardNote(award({ points: 8, judged: 8, isReply: true, replyToUsername: "maya" })),
    ).toBe("A targeted rebuttal of @maya — the full range was in play.");
  });

  it("does not claim a rebuttal when a modifier bit", () => {
    const capped = awardNote(
      award({ judged: 7, capped: true, isReply: true, replyToUsername: "maya" }),
    );
    expect(capped).not.toContain("@maya");
    expect(
      awardNote(award({ halved: true, isReply: true, replyToUsername: "maya" })),
    ).toBeNull();
  });

  it("does not claim a rebuttal without a named opponent", () => {
    expect(awardNote(award({ isReply: true, replyToUsername: null }))).toBeNull();
  });

  it("stays quiet on an ordinary standalone", () => {
    expect(awardNote(award())).toBeNull();
  });
});
