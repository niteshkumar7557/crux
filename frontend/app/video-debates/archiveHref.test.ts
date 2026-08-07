import { describe, expect, it } from "vitest";
import { parseArchivePage, videoDebateArchiveHref } from "./archiveHref";

describe("video debate archive links", () => {
  it("page one uses the clean archive path without ?page=1", () => {
    expect(videoDebateArchiveHref(1)).toBe("/video-debates");
    expect(videoDebateArchiveHref()).toBe("/video-debates");
  });

  it("later pages preserve only the validated positive page number", () => {
    expect(videoDebateArchiveHref(2)).toBe("/video-debates?page=2");
    expect(videoDebateArchiveHref(17)).toBe("/video-debates?page=17");
  });

  it.each(["0", "-3", "abc", "1.5", "", undefined, "9007199254740993"])(
    "invalid, zero, and negative page input normalize to page one (%s)",
    (raw) => {
      expect(parseArchivePage(raw)).toBe(1);
      expect(videoDebateArchiveHref(parseArchivePage(raw))).toBe("/video-debates");
    },
  );

  it("reads a valid page number back out of the query", () => {
    expect(parseArchivePage("4")).toBe(4);
  });
});
