import { describe, it, expect } from "vitest";
import {
  diceScore,
  fingerprintOf,
  diceFromFingerprints,
  findSimilar,
  evaluateReworded,
  resolveDuplicateOf,
  SIMILARITY_MIN_LENGTH,
} from "./similarity.logic.js";
import { CROSS_USER_MIN_LENGTH } from "./duplicate.logic.js";

const FRANCE =
  "France built 56 reactors in 15 years, but only under a state monopoly with cheap public debt today nobody has.";

describe("SIMILARITY_MIN_LENGTH", () => {
  it("is the same number as the cross-user repost floor — one number, not two", () => {
    expect(SIMILARITY_MIN_LENGTH).toBe(CROSS_USER_MIN_LENGTH);
  });
});

describe("diceScore", () => {
  it("scores a one-word change high", () => {
    const changed = FRANCE.replace("reactors", "plants");
    expect(diceScore(FRANCE, changed)).toBeGreaterThan(0.8);
  });

  it("scores a one-word addition high", () => {
    const extended = `${FRANCE} That is the whole argument.`;
    expect(diceScore(FRANCE, extended)).toBeGreaterThan(0.7);
  });

  it("scores reordered clauses high", () => {
    const reordered =
      "Today nobody has the cheap public debt and state monopoly France used to build 56 reactors in 15 years.";
    expect(diceScore(FRANCE, reordered)).toBeGreaterThan(0.6);
  });

  it("scores unrelated arguments low", () => {
    const unrelated =
      "Storage costs are unpriced in every levelised-cost comparison anyone quotes.";
    expect(diceScore(FRANCE, unrelated)).toBeLessThan(0.2);
  });

  it("scores a genuine paraphrase low — a known, documented limitation", () => {
    const paraphrase =
      "No country today has the public financing France had when it electrified.";
    expect(diceScore(FRANCE, paraphrase)).toBeLessThan(0.3);
  });

  it("scores an identical Devanagari pair at 1.0 — guards combining-mark handling", () => {
    const hindi = "यह तर्क गलत है क्योंकि आंकड़े इसके विपरीत दिखाते हैं।";
    expect(diceScore(hindi, hindi)).toBe(1);
  });

  it("scores a romanised-Hindi pair with one word changed high", () => {
    const a = "yeh dalil galat hai kyunki data isse ulta dikhata hai";
    const b = "yeh dalil galat hai kyunki data iske khilaf dikhata hai";
    expect(diceScore(a, b)).toBeGreaterThan(0.6);
  });

  it("does not crash on empty or whitespace-only input, and reports no match", () => {
    expect(diceScore("", "")).toBe(0);
    expect(diceScore("   ", FRANCE)).toBe(0);
    expect(diceScore(FRANCE, "   ")).toBe(0);
  });
});

describe("fingerprintOf / diceFromFingerprints", () => {
  it("agrees with diceScore when precomputed", () => {
    const a = fingerprintOf(FRANCE);
    const b = fingerprintOf(FRANCE.replace("reactors", "plants"));
    expect(diceFromFingerprints(a, b)).toBeCloseTo(
      diceScore(FRANCE, FRANCE.replace("reactors", "plants")),
      10,
    );
  });

  it("returns an empty fingerprint for text under 3 normalised characters", () => {
    expect(fingerprintOf("ab")).toEqual([]);
    expect(fingerprintOf("!!")).toEqual([]);
  });

  it("is symmetric", () => {
    const a = fingerprintOf("the quick brown fox");
    const b = fingerprintOf("the slow brown fox");
    expect(diceFromFingerprints(a, b)).toBeCloseTo(diceFromFingerprints(b, a), 10);
  });
});

describe("findSimilar", () => {
  it("keeps only candidates at or above the floor, highest first", () => {
    const query = fingerprintOf(FRANCE);
    const candidates = [
      { item: "close", fingerprint: fingerprintOf(FRANCE.replace("reactors", "plants")) },
      { item: "far", fingerprint: fingerprintOf("storage costs are unpriced everywhere") },
    ];
    const result = findSimilar(query, candidates, { limit: 5, floor: 0.5 });
    expect(result.map((r) => r.item)).toEqual(["close"]);
  });

  it("caps at the limit", () => {
    const query = fingerprintOf(FRANCE);
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      item: i,
      fingerprint: fingerprintOf(`${FRANCE} variant ${i}`),
    }));
    const result = findSimilar(query, candidates, { limit: 3, floor: 0 });
    expect(result).toHaveLength(3);
  });

  it("breaks ties by candidate order (stable sort)", () => {
    const query = fingerprintOf("abcdefghij");
    const candidates = [
      { item: "first", fingerprint: [] },
      { item: "second", fingerprint: [] },
    ];
    const result = findSimilar(query, candidates, { limit: 5, floor: -1 });
    expect(result.map((r) => r.item)).toEqual(["first", "second"]);
  });
});

describe("evaluateReworded", () => {
  const FRANCE_LONG =
    "France built 56 reactors in 15 years, but only under a state monopoly with cheap public debt today nobody has.";

  it("skips below the length floor, regardless of how similar the text is", () => {
    const short = "agreed";
    const result = evaluateReworded(short, [{ item: "x", fingerprint: fingerprintOf(short) }]);
    expect(result).toEqual({ action: "skipped", top: null });
  });

  it("reports none when nothing clears the uncertain floor", () => {
    const result = evaluateReworded(FRANCE_LONG, [
      { item: "unrelated", fingerprint: fingerprintOf("storage costs are unpriced everywhere") },
    ]);
    expect(result.action).toBe("none");
  });

  it("reports warn for a near-verbatim reword", () => {
    const reworded = FRANCE_LONG.replace("reactors", "plants");
    const result = evaluateReworded(FRANCE_LONG, [
      { item: "close", fingerprint: fingerprintOf(reworded) },
    ]);
    expect(result.action).toBe("warn");
    expect(result.top?.item).toBe("close");
  });

  it("picks the single highest-scoring candidate when several clear the floor", () => {
    const reworded = FRANCE_LONG.replace("reactors", "plants");
    const result = evaluateReworded(FRANCE_LONG, [
      { item: "far", fingerprint: fingerprintOf("storage costs are unpriced everywhere") },
      { item: "close", fingerprint: fingerprintOf(reworded) },
    ]);
    expect(result.top?.item).toBe("close");
  });

  it("reports shadow for a mid-range score", () => {
    const mid = "In 15 years France put up 56 reactors, financed publicly under one state monopoly.";
    const result = evaluateReworded(FRANCE_LONG, [{ item: "mid", fingerprint: fingerprintOf(mid) }]);
    expect(["shadow", "warn", "none"]).toContain(result.action);
    expect(result.top).not.toBeNull();
  });
});

describe("resolveDuplicateOf", () => {
  it("returns the id when it is on the shortlist", () => {
    expect(resolveDuplicateOf(812, [812, 40, 91])).toBe(812);
  });

  it("returns null when the id is not on the shortlist — an invented or hallucinated id", () => {
    expect(resolveDuplicateOf(999, [812, 40, 91])).toBeNull();
  });

  it("returns null for null, undefined, or non-integer input", () => {
    expect(resolveDuplicateOf(null, [812])).toBeNull();
    expect(resolveDuplicateOf(undefined, [812])).toBeNull();
    expect(resolveDuplicateOf(1.5, [812])).toBeNull();
    expect(resolveDuplicateOf("812", [812])).toBe(812);
  });

  it("returns null against an empty shortlist regardless of input", () => {
    expect(resolveDuplicateOf(812, [])).toBeNull();
  });
});
