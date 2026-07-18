import { describe, it, expect } from "vitest";
import { buildAnalystPrompt, NONE_YET } from "./analyst.logic.js";

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
