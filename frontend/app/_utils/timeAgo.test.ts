import { describe, it, expect } from "vitest";
import { timeAgo, timeAgoShort } from "./timeAgo";

// One fixed instant, and every case expressed as an offset from it. No fake
// timers: `now` is an argument.
const NOW = Date.parse("2026-08-04T12:00:00.000Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it("counts seconds under a minute", () => {
    expect(timeAgo(ago(5), NOW)).toBe("5 seconds ago");
  });

  it("says one, not 1 units", () => {
    expect(timeAgo(ago(60), NOW)).toBe("1 minute ago");
    expect(timeAgo(ago(3600), NOW)).toBe("1 hour ago");
    expect(timeAgo(ago(86_400), NOW)).toBe("1 day ago");
  });

  it("pluralises everything else", () => {
    expect(timeAgo(ago(120), NOW)).toBe("2 minutes ago");
    expect(timeAgo(ago(7200), NOW)).toBe("2 hours ago");
    expect(timeAgo(ago(3 * 86_400), NOW)).toBe("3 days ago");
  });

  it("steps up through months and years", () => {
    expect(timeAgo(ago(45 * 86_400), NOW)).toBe("1 month ago");
    expect(timeAgo(ago(400 * 86_400), NOW)).toBe("1 year ago");
  });

  it("never counts backwards when a clock is a moment ahead", () => {
    expect(timeAgo(ago(-30), NOW)).toBe("0 seconds ago");
  });
});

describe("timeAgoShort", () => {
  it("does not put a number on the first minute", () => {
    expect(timeAgoShort(ago(0), NOW)).toBe("just now");
    expect(timeAgoShort(ago(59), NOW)).toBe("just now");
  });

  it("compresses each unit to a single letter", () => {
    expect(timeAgoShort(ago(5 * 60), NOW)).toBe("5m ago");
    expect(timeAgoShort(ago(3 * 3600), NOW)).toBe("3h ago");
    expect(timeAgoShort(ago(2 * 86_400), NOW)).toBe("2d ago");
    expect(timeAgoShort(ago(60 * 86_400), NOW)).toBe("2mo ago");
    expect(timeAgoShort(ago(400 * 86_400), NOW)).toBe("1y ago");
  });

  it("crosses each boundary exactly where the long form does", () => {
    for (const seconds of [60, 3600, 86_400, 30 * 86_400, 360 * 86_400]) {
      const short = timeAgoShort(ago(seconds), NOW);
      const long = timeAgo(ago(seconds), NOW);
      expect(short.startsWith(long.split(" ")[0])).toBe(true);
    }
  });
});
