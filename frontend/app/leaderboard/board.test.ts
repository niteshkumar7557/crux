import { describe, it, expect } from "vitest";
import { leaderboardHref, metricLabel, parseTab } from "./board";

describe("parseTab", () => {
  it("defaults to the season board", () => {
    expect(parseTab(undefined)).toBe("season");
    expect(parseTab("")).toBe("season");
    expect(parseTab("bogus")).toBe("season");
    expect(parseTab("season")).toBe("season");
  });

  it("recognises the all-time board", () => {
    expect(parseTab("all-time")).toBe("all-time");
  });
});

describe("leaderboardHref", () => {
  it("keeps the default board on the bare URL", () => {
    expect(leaderboardHref("season")).toBe("/leaderboard");
    expect(leaderboardHref("season", 1)).toBe("/leaderboard");
  });

  it("names the non-default board", () => {
    expect(leaderboardHref("all-time")).toBe("/leaderboard?tab=all-time");
  });

  it("carries the page, and keeps the tab with it", () => {
    expect(leaderboardHref("season", 3)).toBe("/leaderboard?page=3");
    expect(leaderboardHref("all-time", 2)).toBe(
      "/leaderboard?tab=all-time&page=2",
    );
  });
});

describe("metricLabel", () => {
  it("names the metric each board actually ranks by", () => {
    expect(metricLabel("season")).toBe("Season Logic");
    expect(metricLabel("all-time")).toBe("Logic Score");
  });
});
