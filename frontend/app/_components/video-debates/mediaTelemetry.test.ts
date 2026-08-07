import { describe, expect, it } from "vitest";
import { createPlaybackReporter, type PlaybackPayload } from "./mediaTelemetry";

function harness(options: { failing?: boolean } = {}) {
  const sent: { path: string; payload: PlaybackPayload }[] = [];
  const reporter = createPlaybackReporter({
    slug: "applied-learning",
    durationMs: 480_000,
    send(path, payload) {
      if (options.failing) throw new Error("beacon refused");
      sent.push({ path, payload });
    },
  });
  return { reporter, sent };
}

describe("playback telemetry sender", () => {
  it("serializes only the allowed event fields", () => {
    const { reporter, sent } = harness();

    reporter.playStart(0);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.path).toBe("/api/video-debates/applied-learning/playback-events");
    expect(Object.keys(sent[0]!.payload).sort()).toEqual(
      ["at_ms", "buffer_ms", "connection", "event", "online", "role"].sort(),
    );
  });

  it("never sends a media URL or transcript segment", () => {
    const { reporter, sent } = harness();

    reporter.playStart(1_000);
    reporter.followerDegraded("against", 120_000);
    reporter.hostError(130_000);

    const serialized = JSON.stringify(sent);
    expect(serialized).not.toMatch(/https?:|\.mp4|\.webp|transcript|segment/i);
  });

  it("pairs buffer start/end into one finite duration", () => {
    const clock = { nowMs: 10_000 };
    const sent: PlaybackPayload[] = [];
    const reporter = createPlaybackReporter({
      slug: "applied-learning",
      durationMs: 480_000,
      now: () => clock.nowMs,
      send: (_path, payload) => sent.push(payload),
    });

    reporter.bufferStart("for", 60_000);
    clock.nowMs = 11_400;
    reporter.bufferEnd("for", 60_000);

    expect(sent.map((payload) => payload.event)).toEqual(["buffer_start", "buffer_end"]);
    expect(sent[0]?.buffer_ms).toBeNull();
    expect(sent[1]?.buffer_ms).toBe(1_400);
  });

  it("does not report a buffer end that was never started", () => {
    const { reporter, sent } = harness();

    reporter.bufferEnd("for", 60_000);

    expect(sent).toHaveLength(0);
  });

  it("sends completed once at 95 percent or ended", () => {
    const { reporter, sent } = harness();

    reporter.progress(455_000);
    expect(sent).toHaveLength(0);

    reporter.progress(456_000);
    reporter.progress(470_000);
    reporter.ended(480_000);

    expect(sent.filter((entry) => entry.payload.event === "completed")).toHaveLength(1);
  });

  it("sends completed on ended even when the playhead never reached 95 percent", () => {
    const { reporter, sent } = harness();

    reporter.ended(200_000);

    expect(sent.map((entry) => entry.payload.event)).toEqual(["completed"]);
  });

  it("failed telemetry never changes playback state or displays an error", () => {
    const { reporter } = harness({ failing: true });

    expect(() => {
      reporter.playStart(0);
      reporter.bufferStart("for", 1_000);
      reporter.bufferEnd("for", 2_000);
      reporter.hostError(3_000);
      reporter.ended(480_000);
    }).not.toThrow();
  });
});
