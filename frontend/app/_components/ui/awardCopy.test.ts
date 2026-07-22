import { describe, it, expect } from "vitest";
import { awardLines, teachingLine, type Award } from "./awardCopy";

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

describe("awardLines", () => {
  it("names the opponent on a clean reply", () => {
    const l = awardLines(
      award({ points: 8, judged: 8, isReply: true, replyToUsername: "maya" }),
    );
    expect(l).toEqual([
      "Targeted rebuttal of @maya — full range unlocked",
    ]);
  });

  it("shows the cap as arithmetic under the judged score", () => {
    // §14: "+5 logic / Judged 6 / Capped at 5 (standalone)"
    const l = awardLines(award({ points: 5, judged: 6, capped: true }));
    expect(l).toEqual(["Judged 6", "Capped at 5 (standalone)"]);
  });

  it("shows the halving as arithmetic under the judged score", () => {
    // §14: "+3 logic / Judged 7 / Halved — 4th comment in this debate"
    const l = awardLines(
      award({ points: 3, judged: 7, isReply: true, replyToUsername: "maya", halved: true }),
    );
    expect(l).toEqual([
      "Judged 7",
      "Halved — 4th or later comment in this debate",
    ]);
  });

  it("names BOTH modifiers when both bit, in the order they applied", () => {
    // scoreComment: judged 7 -> capped to 5 -> halved to 2. Naming only the
    // last one would hide the step that cost the most.
    const l = awardLines(
      award({ points: 2, judged: 7, capped: true, halved: true }),
    );
    expect(l).toEqual([
      "Judged 7",
      "Capped at 5 (standalone)",
      "Halved — 4th or later comment in this debate",
    ]);
  });

  it("does not claim a rebuttal when a modifier bit", () => {
    // The arithmetic is the story once something reduced the award.
    const l = awardLines(
      award({ judged: 7, capped: true, isReply: true, replyToUsername: "maya" }),
    );
    expect(l.join(" ")).not.toContain("@maya");
  });

  it("falls back to plain full value for an unmodified standalone", () => {
    expect(awardLines(award({ points: 4, judged: 4 }))).toEqual([
      "Judged 4 — full value",
    ]);
  });

  it("does not claim a rebuttal without a named opponent", () => {
    const l = awardLines(award({ isReply: true, replyToUsername: null }));
    expect(l).toEqual(["Judged 7 — full value"]);
  });
});

describe("teachingLine", () => {
  it("teaches the reply rule exactly when the cap was just paid", () => {
    expect(teachingLine(award({ capped: true }))).toBe(
      "Reply to an opponent next time to earn up to 8.",
    );
  });

  it("stays quiet when the cap did not bite", () => {
    expect(teachingLine(award())).toBeNull();
    expect(teachingLine(award({ halved: true }))).toBeNull();
  });
});
