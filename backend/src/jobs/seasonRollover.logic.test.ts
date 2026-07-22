import { describe, it, expect } from "vitest";
import {
  awardsForSeason,
  previousSeason,
  TITLES,
  FRAMES,
} from "./seasonRollover.logic.js";

const board = [
  { userId: 7, seasonLogic: 210 },
  { userId: 3, seasonLogic: 190 },
  { userId: 9, seasonLogic: 140 },
  { userId: 4, seasonLogic: 120 },
];

const at = (iso: string) => new Date(iso).getTime();

describe("awardsForSeason", () => {
  it("awards exactly the top three", () => {
    const a = awardsForSeason(board, 0, "2026-08");
    expect(a).toHaveLength(3);
    expect(a.map((x) => x.userId)).toEqual([7, 3, 9]);
  });

  it("stamps the season number into the title", () => {
    const a = awardsForSeason(board, 0, "2026-08");
    expect(a[0]!.title).toBe("Champion of Season 0");
    expect(a[1]!.title).toBe("Challenger of Season 0");
    expect(a[2]!.title).toBe("Contender of Season 0");
  });

  it("assigns the frames in rank order", () => {
    const a = awardsForSeason(board, 3, "2026-11");
    expect(a.map((x) => x.frame)).toEqual(["gold", "silver", "bronze"]);
    expect(a.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it("freezes the winning totals", () => {
    expect(awardsForSeason(board, 0, "2026-08")[0]!.seasonLogic).toBe(210);
  });

  it("carries the season key onto every award", () => {
    // The key is what makes the job idempotent, via UNIQUE (season_key, rank).
    const a = awardsForSeason(board, 4, "2026-12");
    expect(a.every((x) => x.seasonKey === "2026-12")).toBe(true);
    expect(a.every((x) => x.seasonNumber === 4)).toBe(true);
  });

  it("awards fewer than three when the board is short", () => {
    expect(awardsForSeason(board.slice(0, 2), 0, "2026-08")).toHaveLength(2);
  });

  it("awards nothing on an empty board", () => {
    expect(awardsForSeason([], 0, "2026-08")).toEqual([]);
  });

  it("never awards a non-positive score", () => {
    // A month nobody played is not a month somebody won.
    const a = awardsForSeason([{ userId: 1, seasonLogic: 0 }], 0, "2026-08");
    expect(a).toEqual([]);
  });

  it("skips a non-positive score without spending its rank", () => {
    // A user who ended the month negative must not push a real winner off the
    // podium, nor silently take a rank number with them.
    const a = awardsForSeason(
      [
        { userId: 1, seasonLogic: 50 },
        { userId: 2, seasonLogic: 0 },
        { userId: 3, seasonLogic: -5 },
      ],
      0,
      "2026-08",
    );
    expect(a).toHaveLength(1);
    expect(a[0]!.rank).toBe(1);
    expect(a[0]!.userId).toBe(1);
  });

  it("names all three ranks", () => {
    expect(TITLES).toHaveLength(3);
    expect(FRAMES).toHaveLength(3);
  });
});

// SEASON_ZERO is read from the environment at import time; these cases assume
// the built-in default of 2026-08.
describe("previousSeason", () => {
  it("returns the month before the one containing `now`", () => {
    const p = previousSeason(at("2026-09-15T13:45:00Z"))!;
    expect(p.key).toBe("2026-08");
    expect(p.number).toBe(0);
  });

  it("returns the exact half-open window of that month", () => {
    const p = previousSeason(at("2026-09-15T13:45:00Z"))!;
    expect(p.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rolls back across a year boundary", () => {
    const p = previousSeason(at("2027-01-05T00:00:00Z"))!;
    expect(p.key).toBe("2026-12");
    expect(p.number).toBe(4);
    expect(p.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("works on the first instant of a month", () => {
    // The boundary itself belongs to the NEW month, so its predecessor is the
    // month that just closed -- this is the instant the job actually fires on.
    const p = previousSeason(at("2026-09-01T00:00:00Z"))!;
    expect(p.key).toBe("2026-08");
    expect(p.number).toBe(0);
  });

  it("returns null before Season 0 has finished", () => {
    // §10 numbers the launch month Season 0; there is no Season -1 to win.
    expect(previousSeason(at("2026-08-15T00:00:00Z"))).toBeNull();
    expect(previousSeason(at("2026-07-22T00:00:00Z"))).toBeNull();
  });
});
