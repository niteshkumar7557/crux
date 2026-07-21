import { describe, it, expect } from "vitest";
import {
  currentSeasonStart,
  currentSeasonNumber,
  SEASON_ANCHOR,
  SEASON_LENGTH_DAYS,
} from "./season.logic.js";

const DAY = 86_400_000;
const SEASON = SEASON_LENGTH_DAYS * DAY;

describe("season windows", () => {
  it("floors to the anchor within the first season", () => {
    expect(currentSeasonStart(SEASON_ANCHOR + 3 * DAY)).toBe(SEASON_ANCHOR);
    expect(currentSeasonNumber(SEASON_ANCHOR + 3 * DAY)).toBe(1);
  });
  it("rolls to the next window after the season length", () => {
    expect(currentSeasonStart(SEASON_ANCHOR + SEASON + DAY)).toBe(SEASON_ANCHOR + SEASON);
    expect(currentSeasonNumber(SEASON_ANCHOR + SEASON + DAY)).toBe(2);
  });
});
