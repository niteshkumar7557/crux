import { describe, it, expect } from "vitest";
import {
  currentSeasonStart,
  currentSeasonEnd,
  seasonNumber,
  seasonKey,
  daysLeftInSeason,
  LAUNCH_AT,
  FIRST_SEASON_END,
} from "./season.logic.js";

const at = (iso: string) => new Date(iso).getTime();

describe("the launch anchor", () => {
  it("launches at 31 July 2026, UTC midnight", () => {
    expect(LAUNCH_AT.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("absorbs the rest of the launch month into the following one", () => {
    expect(FIRST_SEASON_END.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("season one", () => {
  it("starts at the launch instant, not at the 1st of the month", () => {
    expect(currentSeasonStart(at("2026-08-17T13:45:00Z")).toISOString()).toBe(
      "2026-07-31T00:00:00.000Z",
    );
    expect(currentSeasonStart(at("2026-07-31T00:00:00Z")).toISOString()).toBe(
      "2026-07-31T00:00:00.000Z",
    );
  });

  it("runs to the end of August", () => {
    expect(currentSeasonEnd(at("2026-07-31T09:00:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(currentSeasonEnd(at("2026-08-17T13:45:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("keeps one key across both calendar months it spans", () => {
    expect(seasonKey(at("2026-07-31T00:00:00Z"))).toBe("2026-08");
    expect(seasonKey(at("2026-08-17T00:00:00Z"))).toBe("2026-08");
    expect(seasonKey(at("2026-08-31T23:59:59Z"))).toBe("2026-08");
  });

  it("counts 32 days on the day it opens, and 1 on its last", () => {
    expect(daysLeftInSeason(at("2026-07-31T00:00:00Z"))).toBe(32);
    expect(daysLeftInSeason(at("2026-08-31T12:00:00Z"))).toBe(1);
  });
});

describe("every season after the first", () => {
  it("starts on the 1st of the month, UTC", () => {
    expect(currentSeasonStart(at("2026-09-17T13:45:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("ends at the 1st of the next month", () => {
    expect(currentSeasonEnd(at("2026-09-17T13:45:00Z")).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("rolls the year over in December", () => {
    expect(currentSeasonEnd(at("2026-12-31T23:59:59Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("builds a YYYY-MM key with a padded month", () => {
    expect(seasonKey(at("2026-09-17T00:00:00Z"))).toBe("2026-09");
    expect(seasonKey(at("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });

  it("reports whole days left, and 1 on the final day", () => {
    expect(daysLeftInSeason(at("2026-09-01T00:00:00Z"))).toBe(30);
    expect(daysLeftInSeason(at("2026-09-30T12:00:00Z"))).toBe(1);
  });
});

describe("season numbering", () => {
  it("numbers the first season 1 — there is no Season 0", () => {
    expect(seasonNumber(at("2026-07-31T00:00:00Z"))).toBe(1);
    expect(seasonNumber(at("2026-08-05T00:00:00Z"))).toBe(1);
    expect(seasonNumber(at("2026-08-31T23:59:59Z"))).toBe(1);
  });

  it("returns 0 before launch, which is the signal that nothing is awardable", () => {
    expect(seasonNumber(at("2026-07-30T23:59:59Z"))).toBe(0);
    expect(seasonNumber(at("2026-01-01T00:00:00Z"))).toBe(0);
  });

  it("counts months forward, across a year boundary", () => {
    expect(seasonNumber(at("2026-09-01T00:00:00Z"))).toBe(2);
    expect(seasonNumber(at("2026-12-14T00:00:00Z"))).toBe(5);
    expect(seasonNumber(at("2027-02-14T00:00:00Z"))).toBe(7);
  });
});
