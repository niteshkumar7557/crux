import { describe, expect, it } from "vitest";
import { videoDebateFixture } from "./videoDebate.fixture";
import type { RoundTimeline } from "@/app/video-debates/types";
import { MAX_PLAYBACK_STEP_MS, verdictCueAt } from "./verdictGate.logic";

const manifest = videoDebateFixture.manifest;
// A plain .filter() widens to the timeline union, whose members do not all have
// `grace` — the predicate is what keeps this typed.
const rounds = manifest.timeline.filter(
  (entry): entry is RoundTimeline => entry.type === "round",
);
const firstGraceEnd = rounds[0].grace.end_ms;
const last = manifest.timeline[manifest.timeline.length - 1];
const outroEnd = last.type === "outro" ? last.end_ms : 0;

describe("when a verdict interrupts", () => {
  it("fires as playback crosses the end of a round's grace period", () => {
    expect(verdictCueAt(manifest, firstGraceEnd - 40, firstGraceEnd + 10, true)).toEqual({
      kind: "round",
      round: rounds[0].number,
    });
  });

  it("does not fire before the boundary or after it has been passed", () => {
    expect(verdictCueAt(manifest, firstGraceEnd - 90, firstGraceEnd - 40, true)).toBeNull();
    expect(verdictCueAt(manifest, firstGraceEnd + 40, firstGraceEnd + 90, true)).toBeNull();
  });

  // Scrubbing across five rounds must not throw five overlays.
  it("does not fire on a seek, however far it lands past a boundary", () => {
    const scrub = firstGraceEnd - 10 + MAX_PLAYBACK_STEP_MS + 1;
    expect(verdictCueAt(manifest, firstGraceEnd - 10, scrub, true)).toBeNull();
  });

  it("does not fire while paused", () => {
    expect(verdictCueAt(manifest, firstGraceEnd - 40, firstGraceEnd + 10, false)).toBeNull();
  });

  // Seeking back and replaying the round is a second crossing, so it fires again.
  it("fires again when the same boundary is crossed a second time", () => {
    const replay = verdictCueAt(manifest, firstGraceEnd - 40, firstGraceEnd + 10, true);
    expect(replay).toEqual({ kind: "round", round: rounds[0].number });
  });

  it("fires the final cue as the programme ends, distinct from any round", () => {
    expect(verdictCueAt(manifest, outroEnd - 40, outroEnd + 10, true)).toEqual({ kind: "final" });
  });

  it("ignores a backward step", () => {
    expect(verdictCueAt(manifest, firstGraceEnd + 10, firstGraceEnd - 40, true)).toBeNull();
  });
});
