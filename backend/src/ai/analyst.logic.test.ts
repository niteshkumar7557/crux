import { describe, it, expect } from "vitest";
import {
  buildAnalystPrompt,
  buildProbabilityPrompt,
  scoreComment,
  NONE_YET,
} from "./analyst.logic.js";

const base = {
  rawPoints: 7,
  isReply: false,
  opponentHasComments: true,
  priorCount: 0,
};

describe("scoreComment", () => {
  it("gives a reply the full range", () => {
    const r = scoreComment({ ...base, rawPoints: 8, isReply: true });
    expect(r.points).toBe(8);
    expect(r.capped).toBe(false);
    expect(r.halved).toBe(false);
  });

  it("caps a standalone comment at 5", () => {
    const r = scoreComment({ ...base, rawPoints: 7 });
    expect(r.judged).toBe(7);
    expect(r.points).toBe(5);
    expect(r.capped).toBe(true);
  });

  it("does not cap a standalone below the cap", () => {
    const r = scoreComment({ ...base, rawPoints: 3 });
    expect(r.points).toBe(3);
    expect(r.capped).toBe(false);
  });

  it("exempts a standalone when the opposing side is empty", () => {
    const r = scoreComment({ ...base, rawPoints: 8, opponentHasComments: false });
    expect(r.points).toBe(8);
    expect(r.capped).toBe(false);
  });

  it("halves the 4th comment in a debate", () => {
    const r = scoreComment({ ...base, rawPoints: 7, isReply: true, priorCount: 3 });
    expect(r.points).toBe(3);
    expect(r.halved).toBe(true);
  });

  it("applies the cap before the halving", () => {
    // judged 7 -> capped to 5 -> halved to 2
    const r = scoreComment({ ...base, rawPoints: 7, priorCount: 3 });
    expect(r.points).toBe(2);
    expect(r.capped).toBe(true);
    expect(r.halved).toBe(true);
  });

  it("never halves below 1", () => {
    const r = scoreComment({ ...base, rawPoints: 1, isReply: true, priorCount: 9 });
    expect(r.points).toBe(1);
  });

  it("clamps a nonsense score from the model into 1-8", () => {
    expect(scoreComment({ ...base, rawPoints: 99, isReply: true }).points).toBe(8);
    expect(scoreComment({ ...base, rawPoints: -4, isReply: true }).points).toBe(1);
    expect(scoreComment({ ...base, rawPoints: NaN, isReply: true }).points).toBe(1);
  });
});

describe("buildAnalystPrompt", () => {
  it("shows the opponent as (none yet) when their side is empty", () => {
    const p = buildAnalystPrompt({
      statement: "Nuclear power is the fastest path to decarbonisation.",
      side: "for",
      author: "maya",
      forAnalysis: null,
      againstAnalysis: null,
      ownIsFirst: true,
      comment: "Baseload matters.",
      replyTo: null,
    });
    expect(p).toContain(`OPPONENT ANALYSIS: ${NONE_YET}`);
    expect(p).not.toContain("REPLYING TO");
  });

  it("includes the exact target comment when replying", () => {
    const p = buildAnalystPrompt({
      statement: "Nuclear power is the fastest path to decarbonisation.",
      side: "against",
      author: "dev",
      forAnalysis: "The case for.",
      againstAnalysis: "The case against.",
      ownIsFirst: false,
      comment: "Hydro is baseload too.",
      replyTo: { username: "maya", content: "Nuclear is the only baseload." },
    });
    expect(p).toContain("REPLYING TO @maya");
    expect(p).toContain("Nuclear is the only baseload.");
  });
});

describe("buildProbabilityPrompt", () => {
  const probInput = {
    statement: "Nuclear power is the only realistic path to decarbonise.",
    priorAffirmative: 60,
    priorNegative: 40,
    forAnalysis: "The case for.",
    againstAnalysis: "The case against.",
    latest: { username: "dev", side: "against" as const, content: "France was a one-off." },
  };

  it("renders the prior split and the latest comment, side uppercased", () => {
    const p = buildProbabilityPrompt(probInput);
    expect(p).toContain("PRIOR SPLIT: FOR 60 / AGAINST 40");
    expect(p).toContain(`LATEST COMMENT — @dev [AGAINST]: "France was a one-off."`);
  });

  it("defaults a null prior split to 50/50", () => {
    const p = buildProbabilityPrompt({
      ...probInput,
      priorAffirmative: null,
      priorNegative: null,
    });
    expect(p).toContain("PRIOR SPLIT: FOR 50 / AGAINST 50");
  });

  it("shows an empty analysis as (none yet)", () => {
    const p = buildProbabilityPrompt({ ...probInput, forAnalysis: null });
    expect(p).toContain(`FOR analysis: ${NONE_YET}`);
  });
});
