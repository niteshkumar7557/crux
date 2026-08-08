import { describe, expect, it } from "vitest";
import {
  chooseTurnEnd,
  edgeIsLegal,
  findForeignSpeech,
  findHallucinations,
  findStraddles,
  nearestLegalEdge,
  proposeBoundaries,
  speechIntervals,
  type BoundaryDocument,
  type BoundaryRound,
  type SpeechInterval,
  type Track,
} from "./preflight.js";
import { timelineWindows } from "../../src/video-debates/transcript.logic.js";
import type { TimelineEntry } from "../../src/video-debates/manifest.types.js";

function word(start_ms: number, end_ms: number, text = "w") {
  return { start_ms, end_ms, text };
}

function segment(start_ms: number, end_ms: number, text: string, words: ReturnType<typeof word>[] | null) {
  return { start_ms, end_ms, text, words };
}

// One round, so the timeline stays readable: intro 0-1000, for 1000-31000,
// against 31000-61000, grace 61000-62000, outro 62000-63000.
const ROUND_TIMELINE: TimelineEntry[] = [
  { type: "intro", start_ms: 0, end_ms: 1_000 },
  {
    type: "round", number: 1, domain: "Education", opener: "for",
    for: { start_ms: 1_000, end_ms: 31_000 },
    against: { start_ms: 31_000, end_ms: 61_000 },
    grace: { start_ms: 61_000, end_ms: 62_000 },
  },
  { type: "outro", start_ms: 62_000, end_ms: 63_000 },
];
const WINDOWS = timelineWindows(ROUND_TIMELINE);

describe("speechIntervals", () => {
  it("uses word spans when present and the segment when not", () => {
    const intervals = speechIntervals([
      segment(0, 500, "a b", [word(0, 200), word(300, 500)]),
      segment(900, 1_200, "c", null),
    ]);

    expect(intervals).toEqual([
      { start_ms: 0, end_ms: 200 },
      { start_ms: 300, end_ms: 500 },
      { start_ms: 900, end_ms: 1_200 },
    ]);
  });
});

describe("edgeIsLegal", () => {
  const intervals: SpeechInterval[] = [{ start_ms: 100, end_ms: 200 }];

  it("rejects an edge strictly inside a word", () => {
    expect(edgeIsLegal(intervals, 150)).toBe(false);
  });

  it("accepts an edge touching a word boundary, which splits nothing", () => {
    expect(edgeIsLegal(intervals, 100)).toBe(true);
    expect(edgeIsLegal(intervals, 200)).toBe(true);
    expect(edgeIsLegal(intervals, 250)).toBe(true);
  });
});

describe("nearestLegalEdge", () => {
  const intervals: SpeechInterval[] = [{ start_ms: 1_000, end_ms: 1_500 }];

  it("returns the target untouched when it is already in a gap", () => {
    expect(nearestLegalEdge(intervals, 2_000, 500)).toBe(2_000);
  });

  it("prefers the later of two equidistant gaps", () => {
    // 1250 is dead centre; +250 and -250 both escape, later wins.
    expect(nearestLegalEdge(intervals, 1_250, 500)).toBe(1_500);
  });

  it("never returns a time below the floor", () => {
    const found = nearestLegalEdge(intervals, 1_100, 500, 1_400);
    expect(found).not.toBeNull();
    expect(found!).toBeGreaterThanOrEqual(1_400);
  });

  it("gives up rather than exceeding the allowed shift", () => {
    expect(nearestLegalEdge([{ start_ms: 0, end_ms: 10_000 }], 5_000, 100)).toBeNull();
  });
});

describe("chooseTurnEnd", () => {
  it("lands exactly on 30 s when that is already a gap", () => {
    expect(chooseTurnEnd([], 1_000)).toBe(31_000);
  });

  it("moves within the 100 ms allowance to escape a word", () => {
    const intervals: SpeechInterval[] = [{ start_ms: 30_950, end_ms: 31_050 }];
    const found = chooseTurnEnd(intervals, 1_000);

    expect(found).not.toBeNull();
    expect(Math.abs(found! - 31_000)).toBeLessThanOrEqual(100);
    expect(edgeIsLegal(intervals, found!)).toBe(true);
  });

  it("refuses when the whole allowance is inside one word", () => {
    expect(chooseTurnEnd([{ start_ms: 30_000, end_ms: 32_000 }], 1_000)).toBeNull();
  });
});

describe("findStraddles", () => {
  it("finds the word a boundary cuts in half", () => {
    const track: Track = {
      speaker: "host",
      segments: [segment(30_800, 31_400, "so now", [word(30_800, 30_900, " so"), word(30_900, 31_400, " now")])],
    };

    expect(findStraddles(track, WINDOWS)).toEqual([{
      speaker: "host", segment_index: 0, word_index: 1, text: " now",
      start_ms: 30_900, end_ms: 31_400, boundary_ms: 31_000,
    }]);
  });

  it("flags a wordless segment crossing a boundary, which cannot be split at all", () => {
    const track: Track = { speaker: "for", segments: [segment(30_500, 31_500, "spanning", null)] };
    const found = findStraddles(track, WINDOWS);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ word_index: null, boundary_ms: 31_000 });
  });

  it("stays silent when every word sits inside one window", () => {
    const track: Track = { speaker: "for", segments: [segment(2_000, 3_000, "fine", [word(2_000, 3_000)])] };

    expect(findStraddles(track, WINDOWS)).toEqual([]);
  });
});

describe("findForeignSpeech", () => {
  it("reports a speaker inside someone else's judged turn", () => {
    const track: Track = { speaker: "host", segments: [segment(5_000, 6_000, "your time starts now", null)] };

    expect(findForeignSpeech(track, WINDOWS)).toEqual([{
      speaker: "host", segment_index: 0, start_ms: 5_000, end_ms: 6_000,
      text: "your time starts now", round: 1, belongs_to: "for",
    }]);
  });

  // The first version only looked at whole segments, so a segment straddling the
  // handover was reported as clean and the merge still died on it.
  it("catches a segment whose later words cross into the next debater's turn", () => {
    const track: Track = {
      speaker: "for",
      segments: [segment(30_500, 31_500, "mine then theirs", [
        word(30_500, 30_900, " mine"),
        word(31_100, 31_500, " theirs"),
      ])],
    };

    expect(findForeignSpeech(track, WINDOWS)).toMatchObject([
      { speaker: "for", segment_index: 0, round: 1, belongs_to: "against" },
    ]);
  });

  it("allows the scheduled debater, and anyone during grace", () => {
    const scheduled: Track = { speaker: "for", segments: [segment(5_000, 6_000, "argument", null)] };
    const inGrace: Track = { speaker: "host", segments: [segment(61_100, 61_500, "time is up", null)] };

    expect(findForeignSpeech(scheduled, WINDOWS)).toEqual([]);
    expect(findForeignSpeech(inGrace, WINDOWS)).toEqual([]);
  });
});

describe("findHallucinations", () => {
  it("flags punctuation-only segments, known filler and implausibly short ones", () => {
    const track: Track = {
      speaker: "against",
      segments: [
        segment(1_000, 2_000, " ...", null),
        segment(3_000, 4_000, "Thank you.", null),
        segment(5_000, 5_020, "hm", null),
        segment(6_000, 8_000, "A real argument about hospitals.", null),
      ],
    };
    const found = findHallucinations(track);

    expect(found.map((item) => item.segment_index)).toEqual([0, 1, 2]);
    expect(found[2]?.reason).toContain("20 ms");
  });
});

describe("proposeBoundaries", () => {
  // A realistic contiguous programme: intro, then five rounds of 30 s + 30 s with
  // a 200 ms grace, then the outro. Five rounds are 300 s of judged speech alone.
  const boundaries: BoundaryDocument = (() => {
    const rounds: BoundaryRound[] = [];
    let cursor = 10_000;
    for (const number of [1, 2, 3, 4, 5]) {
      const opener = number % 2 === 1 ? "for" as const : "against" as const;
      const first = { start_ms: cursor, end_ms: cursor + 30_000 };
      const second = { start_ms: cursor + 30_000, end_ms: cursor + 60_000 };
      const grace = { start_ms: cursor + 60_000, end_ms: cursor + 60_200 };
      rounds.push({
        number, domain: `Domain ${number}`, opener,
        for: opener === "for" ? first : second,
        against: opener === "for" ? second : first,
        grace,
      });
      cursor = grace.end_ms;
    }
    return {
      version: 1 as const,
      duration_ms: 400_000,
      intro: { start_ms: 0, end_ms: 10_000 },
      rounds,
      outro: { start_ms: cursor, end_ms: 400_000 },
    };
  })();

  it("produces a contiguous programme with every turn inside the allowance", () => {
    const result = proposeBoundaries(boundaries, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const value = result.value;
    expect(value.intro.start_ms).toBe(0);
    let cursor = value.intro.end_ms;
    for (const round of value.rounds) {
      const first = round.opener === "for" ? round.for : round.against;
      const second = round.opener === "for" ? round.against : round.for;
      expect(first.start_ms).toBe(cursor);
      expect(first.end_ms).toBe(second.start_ms);
      expect(second.end_ms).toBe(round.grace.start_ms);
      for (const turn of [first, second]) {
        expect(turn.end_ms - turn.start_ms).toBeGreaterThanOrEqual(29_900);
        expect(turn.end_ms - turn.start_ms).toBeLessThanOrEqual(30_100);
      }
      cursor = round.grace.end_ms;
    }
    expect(value.outro.start_ms).toBe(cursor);
    expect(value.outro.end_ms).toBe(boundaries.duration_ms);
  });

  // The first version chose a round's start and the previous grace's end
  // independently, so any shifted round left a hole and the merger rejected the
  // whole file with `timeline_partition`. Empty intervals never shift anything,
  // which is exactly why the test above missed it.
  it("keeps the programme contiguous when a round has to shift", () => {
    // Sits across round 2's original start, forcing that block later.
    const intervals: SpeechInterval[] = [{ start_ms: 70_000, end_ms: 71_500 }];
    const result = proposeBoundaries(boundaries, intervals);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    let cursor = result.value.intro.end_ms;
    for (const round of result.value.rounds) {
      const first = round.opener === "for" ? round.for : round.against;
      expect(first.start_ms).toBe(cursor);
      cursor = round.grace.end_ms;
      expect(round.grace.end_ms).toBeGreaterThan(round.grace.start_ms);
    }
    expect(result.value.outro.start_ms).toBe(cursor);
  });

  it("moves every edge out of the words that covered it", () => {
    // A word straddling the original round-1 handover at 40000.
    const intervals: SpeechInterval[] = [{ start_ms: 39_950, end_ms: 40_050 }];
    const result = proposeBoundaries(boundaries, intervals);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const edges = [
      result.value.intro.end_ms,
      ...result.value.rounds.flatMap((round) => [round.for.start_ms, round.for.end_ms, round.against.start_ms, round.against.end_ms, round.grace.start_ms, round.grace.end_ms]),
      result.value.outro.start_ms,
    ];
    for (const edge of edges) expect(edgeIsLegal(intervals, edge)).toBe(true);
  });

  it("reports the round rather than inventing a turn outside the allowance", () => {
    // Continuous speech across the whole first turn window: no legal end exists.
    const result = proposeBoundaries(boundaries, [{ start_ms: 0, end_ms: 120_000 }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/Round 1|intro end/);
  });

  it("refuses when the rounds would run past duration_ms", () => {
    const short: BoundaryDocument = { ...boundaries, duration_ms: 60_000 };

    expect(proposeBoundaries(short, []).ok).toBe(false);
  });
});
