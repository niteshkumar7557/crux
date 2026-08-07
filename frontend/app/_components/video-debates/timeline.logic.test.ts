import { describe, expect, it } from "vitest";
import { videoDebateFixture } from "./videoDebate.fixture";
import { layoutAt, revealAt } from "./timeline.logic";

const manifest = videoDebateFixture.manifest;

describe("video debate timeline", () => {
  it("intro is active at 0 and the host is primary", () => {
    expect(revealAt(manifest, 0).active).toMatchObject({ type: "intro", speaker: "host" });
    expect(layoutAt(manifest, 0)).toEqual({
      mode: "single",
      primary: ["host"],
      contextual: ["for", "against"],
    });
  });

  it.each([
    [30_000, "for"],
    [60_000, "against"],
    [115_000, "against"],
    [145_000, "for"],
  ] as const)("the scheduled %s ms speaker is primary", (atMs, speaker) => {
    expect(revealAt(manifest, atMs).active).toMatchObject({
      type: "judged",
      speaker,
    });
    expect(layoutAt(manifest, atMs).primary).toEqual([speaker]);
  });

  it("grace makes FOR and AGAINST co-primary and host contextual", () => {
    expect(revealAt(manifest, 90_000).active).toMatchObject({ type: "grace", round: 1 });
    expect(layoutAt(manifest, 90_000)).toEqual({
      mode: "grace",
      primary: ["for", "against"],
      contextual: ["host"],
    });
  });

  it("outro begins exactly at Round 5 grace end and makes host primary", () => {
    expect(revealAt(manifest, 455_000).active).toMatchObject({ type: "outro", speaker: "host" });
    expect(layoutAt(manifest, 455_000)).toEqual({
      mode: "single",
      primary: ["host"],
      contextual: ["for", "against"],
    });
  });

  it("a transcript segment is hidden one millisecond before start and visible at start", () => {
  });

  it("a cited point is hidden one millisecond before its real segment and visible at segment start", () => {
    expect(revealAt(manifest, 29_999).visiblePointIds).not.toContain("for-r1-0001");
    expect(revealAt(manifest, 30_000).visiblePointIds).toContain("for-r1-0001");
  });

  it("a round ruling and pip are hidden before grace end and visible exactly at grace end", () => {
    expect(revealAt(manifest, 114_999).revealedRoundNumbers).not.toContain(1);
    expect(revealAt(manifest, 115_000).revealedRoundNumbers).toContain(1);
  });

  it("the final verdict is hidden before Round 5 grace end and visible exactly at that boundary", () => {
    expect(revealAt(manifest, 454_999).finalVisible).toBe(false);
    expect(revealAt(manifest, 455_000).finalVisible).toBe(true);
  });

  it("running score counts only revealed round winners", () => {
    expect(revealAt(manifest, 369_999).roundScore).toEqual({ for: 2, against: 1 });
    expect(revealAt(manifest, 370_000).roundScore).toEqual({ for: 2, against: 2 });
    expect(revealAt(manifest, 455_000).roundScore).toEqual({ for: 3, against: 2 });
  });

  it("clamps negative time to zero and time after duration to duration", () => {
    expect(revealAt(manifest, -500)).toEqual(revealAt(manifest, 0));
    expect(revealAt(manifest, 999_999)).toEqual(revealAt(manifest, manifest.duration_ms));
    expect(layoutAt(manifest, -500)).toEqual(layoutAt(manifest, 0));
    expect(layoutAt(manifest, 999_999)).toEqual(layoutAt(manifest, manifest.duration_ms));
  });

  it("seeking from final back into Round 2 hides Rounds 2-5 outcomes beyond the destination", () => {
    expect(revealAt(manifest, 455_000).revealedRoundNumbers).toEqual([1, 2, 3, 4, 5]);
    expect(revealAt(manifest, 150_000).revealedRoundNumbers).toEqual([1]);
    expect(revealAt(manifest, 150_000).finalVisible).toBe(false);
  });

  it("seeking from intro into Round 4 reveals only state at or before the destination", () => {
    expect(revealAt(manifest, 0).revealedRoundNumbers).toEqual([]);
    const destination = revealAt(manifest, 315_000);
    expect(destination.revealedRoundNumbers).toEqual([1, 2, 3]);
  });

  it("repeating the same timestamp is deterministic and creates no duplicate point ids", () => {
    const first = revealAt(manifest, 455_000);
    const second = revealAt(manifest, 455_000);
    expect(second).toEqual(first);
    expect(new Set(first.visiblePointIds).size).toBe(first.visiblePointIds.length);
  });
});
