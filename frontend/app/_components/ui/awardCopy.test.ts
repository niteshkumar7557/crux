import { describe, it, expect } from "vitest";
import { awardLedger, awardNote, type Award } from "./awardCopy";

const award = (over: Partial<Award> = {}): Award => ({
  points: 7,
  judged: 7,
  capped: false,
  isReply: false,
  replyToUsername: null,
  seasonLogic: 143,
  seasonRank: 12,
  lastArgumentOnMotion: false,
  ...over,
});

describe("awardLedger", () => {
  it("shows a single row when nothing reduced the award", () => {
    expect(awardLedger(award({ points: 4, judged: 4 }))).toEqual([
      { label: "Judged", value: "4" },
    ]);
  });

  it("shows a single row for a full-range reply, however high it scored", () => {
    expect(awardLedger(award({ points: 10, judged: 10, isReply: true }))).toEqual([
      { label: "Judged", value: "10" },
    ]);
  });

  it("prices the standalone cap, rather than only naming it", () => {
    expect(awardLedger(award({ points: 7, judged: 9, capped: true }))).toEqual([
      { label: "Judged", value: "9" },
      { label: "Standalone cap", value: "−2" },
      { label: "Awarded", value: "7", total: true },
    ]);
  });

  it("prices the widest cap the new range allows", () => {
    expect(awardLedger(award({ points: 7, judged: 10, capped: true }))).toEqual([
      { label: "Judged", value: "10" },
      { label: "Standalone cap", value: "−3" },
      { label: "Awarded", value: "7", total: true },
    ]);
  });

  it("marks only the final row as the total", () => {
    const rows = awardLedger(award({ points: 7, judged: 9, capped: true }));
    expect(rows.filter((r) => r.total)).toHaveLength(1);
    expect(rows.at(-1)?.total).toBe(true);
  });
});

describe("awardNote", () => {
  it("teaches the reply rule exactly when the cap was just paid", () => {
    expect(awardNote(award({ capped: true }))).toBe(
      "Reply to an opponent next time to earn up to 10.",
    );
  });

  it("names the opponent on a clean reply", () => {
    expect(
      awardNote(award({ points: 10, judged: 10, isReply: true, replyToUsername: "maya" })),
    ).toBe("A targeted rebuttal of @maya — the full range was in play.");
  });

  it("does not claim a rebuttal when the cap bit", () => {
    const capped = awardNote(
      award({ judged: 9, capped: true, isReply: true, replyToUsername: "maya" }),
    );
    expect(capped).not.toContain("@maya");
  });

  it("does not claim a rebuttal without a named opponent", () => {
    expect(awardNote(award({ isReply: true, replyToUsername: null }))).toBeNull();
  });

  it("stays quiet on an ordinary standalone", () => {
    expect(awardNote(award())).toBeNull();
  });

  it("names the fifth-and-last argument, ahead of the cap and reply notes", () => {
    expect(awardNote(award({ lastArgumentOnMotion: true }))).toBe(
      "That was your fifth and last argument on this debate.",
    );
    expect(
      awardNote(award({ lastArgumentOnMotion: true, capped: true })),
    ).toBe("That was your fifth and last argument on this debate.");
  });
});
