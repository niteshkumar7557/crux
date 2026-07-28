import { describe, it, expect } from "vitest";
import {
  buildAnalystPrompt,
  buildOwnSideBlock,
  buildProbabilityPrompt,
  scoreArgument,
  NONE_YET,
  OWN_SIDE_ARGUMENT_LIMIT,
  type OwnSideArgument,
} from "./analyst.logic.js";

const base = {
  rawPoints: 7,
  isReply: false,
  opponentHasArguments: true,
  priorCount: 0,
};

describe("scoreArgument", () => {
  it("gives a reply the full range", () => {
    const r = scoreArgument({ ...base, rawPoints: 8, isReply: true });
    expect(r.points).toBe(8);
    expect(r.capped).toBe(false);
    expect(r.halved).toBe(false);
  });

  it("caps a standalone argument at 5", () => {
    const r = scoreArgument({ ...base, rawPoints: 7 });
    expect(r.judged).toBe(7);
    expect(r.points).toBe(5);
    expect(r.capped).toBe(true);
  });

  it("does not cap a standalone below the cap", () => {
    const r = scoreArgument({ ...base, rawPoints: 3 });
    expect(r.points).toBe(3);
    expect(r.capped).toBe(false);
  });

  it("exempts a standalone when the opposing side is empty", () => {
    const r = scoreArgument({ ...base, rawPoints: 8, opponentHasArguments: false });
    expect(r.points).toBe(8);
    expect(r.capped).toBe(false);
  });

  it("halves the 4th argument in a debate", () => {
    const r = scoreArgument({ ...base, rawPoints: 7, isReply: true, priorCount: 3 });
    expect(r.points).toBe(3);
    expect(r.halved).toBe(true);
  });

  it("applies the cap before the halving", () => {
    // judged 7 -> capped to 5 -> halved to 2
    const r = scoreArgument({ ...base, rawPoints: 7, priorCount: 3 });
    expect(r.points).toBe(2);
    expect(r.capped).toBe(true);
    expect(r.halved).toBe(true);
  });

  it("never halves below 1", () => {
    const r = scoreArgument({ ...base, rawPoints: 1, isReply: true, priorCount: 9 });
    expect(r.points).toBe(1);
  });

  it("clamps a nonsense score from the model into 1-8", () => {
    expect(scoreArgument({ ...base, rawPoints: 99, isReply: true }).points).toBe(8);
    expect(scoreArgument({ ...base, rawPoints: -4, isReply: true }).points).toBe(1);
    expect(scoreArgument({ ...base, rawPoints: NaN, isReply: true }).points).toBe(1);
  });
});

describe("buildAnalystPrompt", () => {
  it("shows the opponent as (none yet) when their side is empty", () => {
    const p = buildAnalystPrompt({
      motion: "Nuclear power is the fastest path to decarbonisation.",
      side: "for",
      author: "maya",
      ownAnalysis: "",
      opponentAnalysis: "",
      ownIsFirst: true,
      argument: "Baseload matters.",
      replyTo: null,
      ownSideArguments: [],
      newArgumentId: 63,
    });
    expect(p).toContain(`OPPONENT ANALYSIS: ${NONE_YET}`);
    expect(p).not.toContain("REPLYING TO");
  });

  it("includes the exact target argument when replying", () => {
    const p = buildAnalystPrompt({
      motion: "Nuclear power is the fastest path to decarbonisation.",
      side: "against",
      author: "dev",
      opponentAnalysis: "The case for.",
      ownAnalysis: "The case against.",
      ownIsFirst: false,
      argument: "Hydro is baseload too.",
      replyTo: { username: "maya", content: "Nuclear is the only baseload." },
      ownSideArguments: [],
      newArgumentId: 63,
    });
    expect(p).toContain("REPLYING TO @maya");
    expect(p).toContain("Nuclear is the only baseload.");
  });

  it("shows the own side's arguments with their ids, so a point can be traced", () => {
    const p = buildAnalystPrompt({
      motion: "Nuclear power is the fastest path to decarbonisation.",
      side: "for",
      author: "sam",
      ownAnalysis: "The case for.",
      opponentAnalysis: "The case against.",
      ownIsFirst: false,
      argument: "Costs are falling.",
      replyTo: null,
      ownSideArguments: [
        { id: 41, username: "maya", content: "Nuclear is the only baseload." },
      ],
      newArgumentId: 63,
    });
    expect(p).toContain('OWN SIDE ARGUMENTS:\n[#41] @maya: "Nuclear is the only baseload."');
  });

  it("marks an empty own side as (none yet) rather than a blank block", () => {
    expect(buildOwnSideBlock([])).toBe(NONE_YET);
  });
});

describe("buildOwnSideBlock", () => {
  const argument = (id: number, content = "A point."): OwnSideArgument => ({
    id,
    username: `u${id}`,
    content,
  });

  it("keeps only the most recent arguments, in order", () => {
    const many = Array.from({ length: OWN_SIDE_ARGUMENT_LIMIT + 4 }, (_, i) =>
      argument(i + 1),
    );
    const block = buildOwnSideBlock(many);
    const ids = [...block.matchAll(/\[#(\d+)\]/g)].map((m) => Number(m[1]));
    expect(ids).toHaveLength(OWN_SIDE_ARGUMENT_LIMIT);
    // The four oldest are dropped, and the newest is last.
    expect(ids[0]).toBe(5);
    expect(ids.at(-1)).toBe(OWN_SIDE_ARGUMENT_LIMIT + 4);
  });

  it("trims a long argument so one wall of text can't dominate the prompt", () => {
    const block = buildOwnSideBlock([argument(1, "x".repeat(900))]);
    expect(block).toContain("…");
    expect(block.length).toBeLessThan(900);
  });

  it("leaves an argument under the limit untouched", () => {
    expect(buildOwnSideBlock([argument(1, "Short and whole.")])).toContain(
      '"Short and whole."',
    );
  });
});

describe("buildProbabilityPrompt", () => {
  const probInput = {
    motion: "Nuclear power is the only realistic path to decarbonise.",
    priorAffirmative: 60,
    priorNegative: 40,
    forAnalysis: "The case for.",
    againstAnalysis: "The case against.",
    latest: { username: "dev", side: "against" as const, content: "France was a one-off." },
  };

  it("renders the prior split and the latest argument, side uppercased", () => {
    const p = buildProbabilityPrompt(probInput);
    expect(p).toContain("PRIOR SPLIT: FOR 60 / AGAINST 40");
    expect(p).toContain(`LATEST ARGUMENT — @dev [AGAINST]: "France was a one-off."`);
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
