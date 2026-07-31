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
    const a = awardsForSeason(board, 1, "2026-08");
    expect(a).toHaveLength(3);
    expect(a.map((x) => x.userId)).toEqual([7, 3, 9]);
  });

  it("stamps the season number into the title", () => {
    const a = awardsForSeason(board, 1, "2026-08");
    expect(a[0]!.title).toBe("Champion of Season 1");
    expect(a[1]!.title).toBe("Challenger of Season 1");
    expect(a[2]!.title).toBe("Contender of Season 1");
  });

  it("assigns the frames in rank order", () => {
    const a = awardsForSeason(board, 4, "2026-11");
    expect(a.map((x) => x.frame)).toEqual(["gold", "silver", "bronze"]);
    expect(a.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it("freezes the winning totals", () => {
    expect(awardsForSeason(board, 1, "2026-08")[0]!.seasonLogic).toBe(210);
  });

  it("carries the season key onto every award", () => {
    const a = awardsForSeason(board, 5, "2026-12");
    expect(a.every((x) => x.seasonKey === "2026-12")).toBe(true);
    expect(a.every((x) => x.seasonNumber === 5)).toBe(true);
  });

  it("awards fewer than three when the board is short", () => {
    expect(awardsForSeason(board.slice(0, 2), 1, "2026-08")).toHaveLength(2);
  });

  it("awards nothing on an empty board", () => {
    expect(awardsForSeason([], 1, "2026-08")).toEqual([]);
  });

  it("never awards a non-positive score", () => {
    const a = awardsForSeason([{ userId: 1, seasonLogic: 0 }], 1, "2026-08");
    expect(a).toEqual([]);
  });

  it("skips a non-positive score without spending its rank", () => {
    const a = awardsForSeason(
      [
        { userId: 1, seasonLogic: 50 },
        { userId: 2, seasonLogic: 0 },
        { userId: 3, seasonLogic: -5 },
      ],
      1,
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

describe("previousSeason", () => {
  it("returns Season 1 over its full 32-day window once September opens", () => {
    const p = previousSeason(at("2026-09-15T13:45:00Z"))!;
    expect(p.key).toBe("2026-08");
    expect(p.number).toBe(1);
    expect(p.start.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("works on the first instant of a month", () => {
    const p = previousSeason(at("2026-09-01T00:00:00Z"))!;
    expect(p.key).toBe("2026-08");
    expect(p.number).toBe(1);
  });

  it("returns the exact half-open window of an ordinary month", () => {
    const p = previousSeason(at("2026-10-15T13:45:00Z"))!;
    expect(p.key).toBe("2026-09");
    expect(p.number).toBe(2);
    expect(p.start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("rolls back across a year boundary", () => {
    const p = previousSeason(at("2027-01-05T00:00:00Z"))!;
    expect(p.key).toBe("2026-12");
    expect(p.number).toBe(5);
    expect(p.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("returns null while Season 1 is still running", () => {
    expect(previousSeason(at("2026-07-31T06:00:00Z"))).toBeNull();
    expect(previousSeason(at("2026-08-15T00:00:00Z"))).toBeNull();
    expect(previousSeason(at("2026-08-31T23:59:59Z"))).toBeNull();
  });

  // The month boundary Season 1 deliberately runs straight through. Awarding here
  // would hand out three permanent titles for one day of play.
  it("awards nothing at the 1 August rollover", () => {
    expect(previousSeason(at("2026-08-01T00:00:00Z"))).toBeNull();
  });

  it("returns null before launch", () => {
    expect(previousSeason(at("2026-07-22T00:00:00Z"))).toBeNull();
  });
});
