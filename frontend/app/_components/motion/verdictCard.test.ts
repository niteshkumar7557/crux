import { describe, it, expect } from "vitest";
import {
  buildVerdictCard,
  truncate,
  TOKENS,
  LIGHT_TOKENS,
  DARK_TOKENS,
  paletteFor,
} from "./verdictCard";
import type { MatchState } from "@/app/motion/types";

const base: MatchState = {
  status: "concluded",
  closesAt: null,
  winner: "for",
  margin: 26,
  mvpUsername: "ada",
  verdictText: "The crux held: coordination beats raw incentive.",
  affirmative: 63,
  negative: 37,
};

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("hello", 90)).toBe("hello");
  });
  it("cuts on a word boundary and appends an ellipsis", () => {
    const out = truncate("one two three four five", 12);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(13); // <= max + ellipsis
    expect(out).not.toContain("thr"); // did not cut mid-word "three"
  });
});

describe("buildVerdictCard", () => {
  it("for-win: cyan accent, score, split, mvp, verdict as hero", () => {
    const m = buildVerdictCard(base, "Should X be Y?");
    expect(m.mode).toBe("for");
    expect(m.label).toBe("AFFIRMATIVE WINS");
    expect(m.accent).toBe(TOKENS.forSide);
    expect(m.score).toBe("63–37 · margin 26");
    expect(m.split).toEqual({ for: 63, against: 37 });
    expect(m.mvpUsername).toBe("ada");
    expect(m.heroLine).toContain("coordination");
    expect(m.claim).toBe("Should X be Y?");
    expect(m.liveNote).toBeNull();
  });

  it("against-win: red accent, NEGATIVE label", () => {
    const m = buildVerdictCard({ ...base, winner: "against" }, "c");
    expect(m.label).toBe("NEGATIVE WINS");
    expect(m.accent).toBe(TOKENS.againstSide);
  });

  it("draw: draw accent, still shows score/split/mvp", () => {
    const m = buildVerdictCard(
      { ...base, winner: "draw", margin: 4, affirmative: 52, negative: 48 },
      "c",
    );
    expect(m.mode).toBe("draw");
    expect(m.label).toBe("DRAW");
    expect(m.accent).toBe(TOKENS.draw);
    expect(m.split).toEqual({ for: 52, against: 48 });
    expect(m.mvpUsername).toBe("ada");
  });

  it("walkover: outline accent, no score, no split, no mvp", () => {
    const m = buildVerdictCard(
      { ...base, winner: "walkover", mvpUsername: null },
      "c",
    );
    expect(m.mode).toBe("walkover");
    expect(m.label).toBe("UNOPPOSED");
    expect(m.accent).toBe(TOKENS.muted);
    expect(m.score).toBeNull();
    expect(m.split).toBeNull();
    expect(m.mvpUsername).toBeNull();
  });

  it("null winner on a concluded row falls back to draw", () => {
    const m = buildVerdictCard({ ...base, winner: null }, "c");
    expect(m.mode).toBe("draw");
  });

  it("live: outline accent, claim as hero, liveNote from closesAt, no mvp/score", () => {
    const closesAt = new Date(Date.now() + 12 * 3600_000).toISOString();
    const m = buildVerdictCard(
      { ...base, status: "live", winner: null, closesAt, mvpUsername: null },
      "Should X be Y?",
    );
    expect(m.mode).toBe("live");
    expect(m.accent).toBe(TOKENS.muted);
    expect(m.heroLine).toBe("Should X be Y?");
    expect(m.score).toBeNull();
    expect(m.mvpUsername).toBeNull();
    expect(m.liveNote).toMatch(/^LIVE · closes in \d+h$/);
    expect(m.split).toEqual({ for: 63, against: 37 });
  });

  it("live under 1h reads 'closing soon'", () => {
    const closesAt = new Date(Date.now() + 20 * 60_000).toISOString();
    const m = buildVerdictCard(
      { ...base, status: "live", winner: null, closesAt },
      "c",
    );
    expect(m.liveNote).toBe("LIVE · closing soon");
  });
});

describe("palettes", () => {
  it("still defaults to the light palette, so the share card cannot move", () => {
    const m = buildVerdictCard(base, "A motion.");
    expect(m.accent).toBe(LIGHT_TOKENS.forSide);
    expect(TOKENS).toBe(LIGHT_TOKENS);
  });

  it("takes its accent from the palette it is handed", () => {
    const m = buildVerdictCard(base, "A motion.", DARK_TOKENS);
    expect(m.accent).toBe(DARK_TOKENS.forSide);
    expect(m.accent).not.toBe(LIGHT_TOKENS.forSide);
  });

  it("carries the palette through every ruling, not just a win", () => {
    for (const winner of ["against", "draw", "walkover"] as const) {
      const m = buildVerdictCard({ ...base, winner }, "A motion.", DARK_TOKENS);
      expect(Object.values(DARK_TOKENS)).toContain(m.accent);
    }
  });

  it("resolves a palette by theme name", () => {
    expect(paletteFor("dark")).toBe(DARK_TOKENS);
    expect(paletteFor("light")).toBe(LIGHT_TOKENS);
  });

  it("keeps the share card's truncation whatever the palette", () => {
    const m = buildVerdictCard(base, "z".repeat(300), DARK_TOKENS);
    expect(m.claim).toContain("…");
    expect(m.claim.length).toBeLessThanOrEqual(91);
  });
});
