import { describe, it, expect } from "vitest";
import {
  currentSeasonStart,
  currentSeasonNumber,
  lpForResult,
  divisionForLP,
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

describe("lpForResult", () => {
  it("stacks win + MVP + upset", () => {
    expect(lpForResult({ outcome: "win", isMvp: true, isStandout: false, isUpset: true })).toBe(250);
  });
  it("upset only counts on a win", () => {
    expect(lpForResult({ outcome: "loss", isMvp: false, isStandout: false, isUpset: true })).toBe(-25);
  });
  it("losing-side standout softens a loss", () => {
    expect(lpForResult({ outcome: "loss", isMvp: false, isStandout: true, isUpset: false })).toBe(-10);
  });
  it("draw is a small positive", () => {
    expect(lpForResult({ outcome: "draw", isMvp: false, isStandout: false, isUpset: false })).toBe(25);
  });
});

describe("divisionForLP", () => {
  it("maps LP to the right division floor", () => {
    expect(divisionForLP(0)).toBe("Circuit");
    expect(divisionForLP(250)).toBe("Contender");
    expect(divisionForLP(1500)).toBe("National");
    expect(divisionForLP(9999)).toBe("Champion");
  });
});
