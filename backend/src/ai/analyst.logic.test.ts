import { describe, it, expect } from "vitest";
import {
  buildAnalystPrompt,
  buildOwnSideBlock,
  clampAffirmative,
  scoreArgument,
  selectForJudge,
  NONE_YET,
  OWN_SIDE_ARGUMENT_LIMIT,
  type OwnSideArgument,
} from "./analyst.logic.js";

const base = {
  rawPoints: 7,
  isReply: false,
  opponentHasArguments: true,
};

describe("scoreArgument", () => {
  it("gives a reply the full range", () => {
    const r = scoreArgument({ ...base, rawPoints: 10, isReply: true });
    expect(r.points).toBe(10);
    expect(r.capped).toBe(false);
  });

  it("caps a standalone argument at 7", () => {
    const r = scoreArgument({ ...base, rawPoints: 9 });
    expect(r.judged).toBe(9);
    expect(r.points).toBe(7);
    expect(r.capped).toBe(true);
  });

  it("does not cap a standalone sitting exactly on the cap", () => {
    const r = scoreArgument({ ...base, rawPoints: 7 });
    expect(r.points).toBe(7);
    expect(r.capped).toBe(false);
  });

  it("exempts a standalone when the opposing side is empty", () => {
    const r = scoreArgument({ ...base, rawPoints: 10, opponentHasArguments: false });
    expect(r.points).toBe(10);
    expect(r.capped).toBe(false);
  });

  it("clamps a nonsense score from the model into 2-10", () => {
    expect(scoreArgument({ ...base, rawPoints: 99, isReply: true }).points).toBe(10);
    expect(scoreArgument({ ...base, rawPoints: -4, isReply: true }).points).toBe(2);
    expect(scoreArgument({ ...base, rawPoints: NaN, isReply: true }).points).toBe(2);
    expect(scoreArgument({ ...base, rawPoints: 1, isReply: true }).points).toBe(2);
  });

  it("no longer damps a prolific arguer — the halving rule is gone", () => {
    const r = scoreArgument({ ...base, rawPoints: 8, isReply: true });
    expect(r.points).toBe(8);
    expect(r).not.toHaveProperty("halved");
  });
});

describe("clampAffirmative", () => {
  it("keeps a sane value", () => {
    expect(clampAffirmative(64)).toBe(64);
  });

  it("rounds a fractional value", () => {
    expect(clampAffirmative(63.6)).toBe(64);
  });

  it("clamps to the 2-98 sanity bounds", () => {
    expect(clampAffirmative(130)).toBe(98);
    expect(clampAffirmative(0)).toBe(2);
    expect(clampAffirmative(-20)).toBe(2);
  });

  it("allows a landslide the old 20-80 floor would have hidden", () => {
    expect(clampAffirmative(91)).toBe(91);
    expect(clampAffirmative(9)).toBe(9);
  });

  it("returns null for garbage, so the caller can skip the update", () => {
    expect(clampAffirmative(NaN)).toBeNull();
    expect(clampAffirmative(undefined)).toBeNull();
    expect(clampAffirmative("nope")).toBeNull();
  });
});

describe("buildAnalystPrompt", () => {
  const prior = { priorAffirmative: 50, priorNegative: 50 };

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
      ...prior,
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
      ...prior,
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
      ...prior,
    });
    expect(p).toContain('OWN SIDE ARGUMENTS:\n[#41] @maya: "Nuclear is the only baseload."');
  });

  it("marks an empty own side as (none yet) rather than a blank block", () => {
    expect(buildOwnSideBlock([])).toBe(NONE_YET);
  });
});

describe("buildAnalystPrompt — the prior split", () => {
  const input = {
    motion: "Nuclear power is the only realistic path to decarbonise.",
    side: "against" as const,
    author: "dev",
    ownAnalysis: "The case against.",
    opponentAnalysis: "The case for.",
    ownIsFirst: false,
    argument: "France was a one-off.",
    replyTo: null,
    ownSideArguments: [],
    newArgumentId: 63,
    priorAffirmative: 60,
    priorNegative: 40,
  };

  it("renders the prior split, so the judge updates it rather than re-deriving", () => {
    expect(buildAnalystPrompt(input)).toContain("PRIOR SPLIT: FOR 60 / AGAINST 40");
  });

  it("defaults a null prior split to 50/50", () => {
    const p = buildAnalystPrompt({
      ...input,
      priorAffirmative: null,
      priorNegative: null,
    });
    expect(p).toContain("PRIOR SPLIT: FOR 50 / AGAINST 50");
  });

  it("puts the prior split ahead of the argument it judges", () => {
    const p = buildAnalystPrompt(input);
    expect(p.indexOf("PRIOR SPLIT")).toBeLessThan(p.indexOf("ARGUMENT:"));
  });
});

describe("selectForJudge", () => {
  const argument = (id: number, content: string): OwnSideArgument => ({
    id,
    username: `u${id}`,
    content,
  });

  it("returns everything, chronologically, when at or under the limit", () => {
    const few = [argument(1, "First point."), argument(2, "Second point.")];
    expect(selectForJudge(few, "A brand new argument about something else.")).toEqual(few);
  });

  it("picks the most similar arguments over the newest ones", () => {
    const target = "France built 56 reactors in 15 years under a state monopoly.";
    const many = Array.from({ length: OWN_SIDE_ARGUMENT_LIMIT + 1 }, (_, i) =>
      argument(i + 1, `Unrelated filler point number ${i + 1} about storage costs.`),
    );
    // The 4th argument (scrolled out of a recency window) is the one that
    // actually matches the incoming argument.
    many[3] = argument(4, "France built 56 reactors in 15 years, state monopoly.");
    const selected = selectForJudge(many, target);
    expect(selected.map((c) => c.id)).toContain(4);
    expect(selected).toHaveLength(OWN_SIDE_ARGUMENT_LIMIT);
  });

  it("renders the selection in original chronological order, not similarity order", () => {
    const target = "France built 56 reactors in 15 years under a state monopoly.";
    const many = Array.from({ length: OWN_SIDE_ARGUMENT_LIMIT + 1 }, (_, i) =>
      argument(i + 1, `Unrelated filler point number ${i + 1} about storage costs.`),
    );
    many[0] = argument(1, "France built 56 reactors in 15 years, state monopoly.");
    const selected = selectForJudge(many, target);
    const ids = selected.map((c) => c.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it("breaks ties by recency — the most recent of equally-scored candidates wins", () => {
    const target = "Something with no overlap with any candidate at all zz.";
    const many = Array.from({ length: OWN_SIDE_ARGUMENT_LIMIT + 2 }, (_, i) =>
      argument(i + 1, "Identical filler text shared by every candidate here."),
    );
    const selected = selectForJudge(many, target);
    const ids = selected.map((c) => c.id).sort((a, b) => a - b);
    // With every score tied at the same value, the two OLDEST (ids 1 and 2)
    // must be the ones dropped.
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
  });
});

describe("buildOwnSideBlock", () => {
  const argument = (id: number, content = "A point."): OwnSideArgument => ({
    id,
    username: `u${id}`,
    content,
  });

  it("renders every argument it is given, in the order given", () => {
    const block = buildOwnSideBlock([argument(1), argument(2)]);
    const ids = [...block.matchAll(/\[#(\d+)\]/g)].map((m) => Number(m[1]));
    expect(ids).toEqual([1, 2]);
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
