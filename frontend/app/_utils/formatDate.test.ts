import { describe, it, expect } from "vitest";
import { utcDate, utcDateTime } from "./formatDate";

// Every expectation is hardcoded on purpose. These render against UTC rather
// than the machine's zone, so the correct output does not depend on where the
// suite runs — and if someone switches them to local time, these fail rather
// than quietly passing in a UTC container and mismatching in a real browser.
const ISO = "2026-08-02T20:04:00.000Z";

describe("utcDate", () => {
  it("reads as day, short month, full year", () => {
    expect(utcDate(ISO)).toBe("2 Aug 2026");
  });

  it("does not pad the day, so it reads as prose and not as data", () => {
    expect(utcDate("2026-08-03T12:00:00.000Z")).toBe("3 Aug 2026");
  });

  it("names every month with three letters", () => {
    const names = Array.from({ length: 12 }, (_, m) =>
      utcDate(new Date(Date.UTC(2026, m, 15)).toISOString()),
    );
    expect(names).toEqual([
      "15 Jan 2026", "15 Feb 2026", "15 Mar 2026", "15 Apr 2026",
      "15 May 2026", "15 Jun 2026", "15 Jul 2026", "15 Aug 2026",
      "15 Sep 2026", "15 Oct 2026", "15 Nov 2026", "15 Dec 2026",
    ]);
  });

  it("does not drift across a UTC midnight, whatever the host zone", () => {
    expect(utcDate("2026-08-02T23:59:59.000Z")).toBe("2 Aug 2026");
    expect(utcDate("2026-08-03T00:00:00.000Z")).toBe("3 Aug 2026");
  });

  it("returns nothing rather than 'Invalid Date' for junk", () => {
    expect(utcDate("not a date")).toBe("");
    expect(utcDate("")).toBe("");
  });
});

describe("utcDateTime", () => {
  it("appends a zero-padded 24-hour clock and names the zone", () => {
    expect(utcDateTime(ISO)).toBe("2 Aug 2026, 20:04 UTC");
  });

  it("pads both sides of the colon", () => {
    expect(utcDateTime("2026-08-02T05:07:00.000Z")).toBe("2 Aug 2026, 05:07 UTC");
  });

  it("opens with exactly the date form, so the two cannot drift apart", () => {
    expect(utcDateTime(ISO).startsWith(utcDate(ISO))).toBe(true);
  });

  it("returns nothing rather than 'Invalid Date' for junk", () => {
    expect(utcDateTime("not a date")).toBe("");
  });
});
