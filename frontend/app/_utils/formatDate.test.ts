import { describe, it, expect } from "vitest";
import { absoluteDate, absoluteDateTime } from "./formatDate";

// These render in the machine's local timezone, so the expectations are derived
// from the same Date rather than hardcoded — otherwise the suite passes in UTC
// and fails for anyone west of it. Mid-month, midday instants are used so no
// real offset (UTC-12..UTC+14) can push one into a different month or year.
const ISO = "2026-08-15T12:00:00.000Z";
const local = new Date(ISO);

describe("absoluteDate", () => {
  it("reads as day, short month, full year", () => {
    expect(absoluteDate(ISO)).toBe(`${local.getDate()} Aug 2026`);
  });

  it("does not pad the day, so it reads as prose and not as data", () => {
    const early = "2026-08-03T12:00:00.000Z";
    expect(absoluteDate(early)).toMatch(/^\d{1,2} Aug 2026$/);
  });

  it("names every month with three letters", () => {
    for (let month = 0; month < 12; month++) {
      const iso = new Date(Date.UTC(2026, month, 15, 12)).toISOString();
      expect(absoluteDate(iso)).toMatch(/^\d{1,2} [A-Z][a-z]{2} 2026$/);
    }
  });

  it("returns nothing rather than 'Invalid Date' for junk", () => {
    expect(absoluteDate("not a date")).toBe("");
    expect(absoluteDate("")).toBe("");
  });
});

describe("absoluteDateTime", () => {
  it("appends a zero-padded 24-hour clock to the date", () => {
    const hours = String(local.getHours()).padStart(2, "0");
    const minutes = String(local.getMinutes()).padStart(2, "0");
    expect(absoluteDateTime(ISO)).toBe(`${local.getDate()} Aug 2026, ${hours}:${minutes}`);
  });

  it("always pads to two digits on both sides of the colon", () => {
    const iso = new Date(Date.UTC(2026, 7, 15, 12, 5)).toISOString();
    expect(absoluteDateTime(iso)).toMatch(/, \d{2}:\d{2}$/);
  });

  it("opens with exactly the date form, so the two cannot drift apart", () => {
    expect(absoluteDateTime(ISO).startsWith(absoluteDate(ISO))).toBe(true);
  });

  it("returns nothing rather than 'Invalid Date' for junk", () => {
    expect(absoluteDateTime("not a date")).toBe("");
  });
});
