import { describe, it, expect } from "vitest";
import {
  currentSeasonStart,
  currentSeasonEnd,
  seasonNumber,
  seasonKey,
  daysLeftInSeason,
} from "./season.logic.js";

const at = (iso: string) => new Date(iso).getTime();

describe("season windows", () => {
  it("starts a season on the 1st of the month, UTC", () => {
    expect(currentSeasonStart(at("2026-08-17T13:45:00Z")).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("ends a season at the 1st of the next month", () => {
    expect(currentSeasonEnd(at("2026-08-17T13:45:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("rolls the year over in December", () => {
    expect(currentSeasonEnd(at("2026-12-31T23:59:59Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("numbers the launch month Season 0", () => {
    expect(seasonNumber(at("2026-08-05T00:00:00Z"))).toBe(0);
  });

  it("counts months forward, across a year boundary", () => {
    expect(seasonNumber(at("2026-09-01T00:00:00Z"))).toBe(1);
    expect(seasonNumber(at("2027-02-14T00:00:00Z"))).toBe(6);
  });

  it("builds a YYYY-MM key with a padded month", () => {
    expect(seasonKey(at("2026-08-17T00:00:00Z"))).toBe("2026-08");
    expect(seasonKey(at("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });

  it("reports whole days left, and 1 on the final day", () => {
    expect(daysLeftInSeason(at("2026-08-01T00:00:00Z"))).toBe(31);
    expect(daysLeftInSeason(at("2026-08-31T12:00:00Z"))).toBe(1);
  });
});
