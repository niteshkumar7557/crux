import { describe, it, expect } from "vitest";
import {
  buildAnalystPrompt,
  NONE_YET,
  applyRepeatDecay,
  REPEAT_GRACE,
} from "./analyst.logic.js";

const base = {
  statement: "AI should have legal personhood.",
  author: "ada",
  comment: "Corporations already have legal personhood, so precedent exists.",
} as const;

describe("buildAnalystPrompt", () => {
  it("FOR: own = for_analysis, opponent = against_analysis, uppercased side", () => {
    const out = buildAnalystPrompt({
      ...base,
      side: "for",
      forAnalysis: "FOR points here",
      againstAnalysis: "AGAINST points here",
      ownIsFirst: false,
    });
    expect(out).toContain("SIDE: FOR");
    expect(out).toContain("OWN SIDE ANALYSIS: FOR points here");
    expect(out).toContain("OPPONENT ANALYSIS: AGAINST points here");
    expect(out).toContain("AUTHOR: ada");
    expect(out).toContain(`COMMENT: "${base.comment}"`);
    expect(out).toContain(`STATEMENT: "${base.statement}"`);
  });

  it("AGAINST: own = against_analysis, opponent = for_analysis", () => {
    const out = buildAnalystPrompt({
      ...base,
      side: "against",
      forAnalysis: "FOR points here",
      againstAnalysis: "AGAINST points here",
      ownIsFirst: false,
    });
    expect(out).toContain("SIDE: AGAINST");
    expect(out).toContain("OWN SIDE ANALYSIS: AGAINST points here");
    expect(out).toContain("OPPONENT ANALYSIS: FOR points here");
  });

  it("opener: no opponent yet → opponent block is (none yet)", () => {
    const out = buildAnalystPrompt({
      ...base,
      side: "for",
      forAnalysis: null,
      againstAnalysis: null,
      ownIsFirst: true,
    });
    expect(out).toContain(`OWN SIDE ANALYSIS: ${NONE_YET}`);
    expect(out).toContain(`OPPONENT ANALYSIS: ${NONE_YET}`);
  });

  it("ownIsFirst forces own block to (none yet) even if a stale analysis exists", () => {
    const out = buildAnalystPrompt({
      ...base,
      side: "for",
      forAnalysis: "stale",
      againstAnalysis: "AGAINST points here",
      ownIsFirst: true,
    });
    expect(out).toContain(`OWN SIDE ANALYSIS: ${NONE_YET}`);
    expect(out).toContain("OPPONENT ANALYSIS: AGAINST points here");
  });

  it("empty-string opponent analysis renders (none yet)", () => {
    const out = buildAnalystPrompt({
      ...base,
      side: "against",
      forAnalysis: "",
      againstAnalysis: "AGAINST points here",
      ownIsFirst: false,
    });
    expect(out).toContain(`OPPONENT ANALYSIS: ${NONE_YET}`);
  });
});

describe("applyRepeatDecay", () => {
  it("first REPEAT_GRACE comments (priorCount 0,1,2) score full", () => {
    expect(applyRepeatDecay(8, 0)).toBe(8);
    expect(applyRepeatDecay(6, 1)).toBe(6);
    expect(applyRepeatDecay(5, 2)).toBe(5);
    expect(REPEAT_GRACE).toBe(3);
  });

  it("4th comment onward (priorCount >= 3) is halved, floored", () => {
    expect(applyRepeatDecay(8, 3)).toBe(4);
    expect(applyRepeatDecay(6, 4)).toBe(3);
    expect(applyRepeatDecay(5, 5)).toBe(2); // floor(5/2)=2
    expect(applyRepeatDecay(1, 9)).toBe(1); // floor(1/2)=0 → clamped to 1
    expect(applyRepeatDecay(2, 3)).toBe(1); // floor(2/2)=1
  });
});
