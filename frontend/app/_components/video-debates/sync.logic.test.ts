import { describe, expect, it } from "vitest";
import {
  FOLLOWER_RETRY_BUDGET,
  FOLLOWER_STALL_TIMEOUT_MS,
  SYNC_DEADBAND_SECONDS,
  SYNC_HARD_SEEK_SECONDS,
  decideFollowerSync,
  decideGroupPlayback,
  type FollowerSyncInput,
  type GroupPlaybackState,
  type TrackState,
} from "./sync.logic";

function follower(overrides: Partial<FollowerSyncInput> = {}): FollowerSyncInput {
  return {
    masterTimeSeconds: 120,
    followerTimeSeconds: 120,
    selectedRate: 1,
    status: "playing",
    degraded: false,
    ...overrides,
  };
}

function track(overrides: Partial<TrackState> = {}): TrackState {
  return { phase: "ready", degraded: false, waitingSinceMs: null, retriesUsed: 0, ...overrides };
}

function group(overrides: Partial<GroupPlaybackState> = {}): GroupPlaybackState {
  return {
    intent: "playing",
    tracks: { host: track(), for: track(), against: track() },
    ...overrides,
  };
}

describe("follower drift correction", () => {
  it.each([0, SYNC_DEADBAND_SECONDS, -SYNC_DEADBAND_SECONDS])(
    "does nothing at 0ms and exactly 150ms drift (%s)",
    (drift) => {
      const decision = decideFollowerSync(follower({ followerTimeSeconds: 120 + drift }));

      expect(decision).toEqual({ kind: "none", playbackRate: 1 });
    },
  );

  it("speeds a follower behind by 4 percent of the selected rate", () => {
    const decision = decideFollowerSync(follower({ followerTimeSeconds: 119.7 }));

    expect(decision.kind).toBe("rate");
    expect(decision.playbackRate).toBeCloseTo(1.04, 10);
  });

  it("slows a follower ahead by 4 percent of the selected rate", () => {
    const decision = decideFollowerSync(follower({ followerTimeSeconds: 120.3 }));

    expect(decision.kind).toBe("rate");
    expect(decision.playbackRate).toBeCloseTo(0.96, 10);
  });

  it.each([
    [120 - SYNC_HARD_SEEK_SECONDS, "rate"],
    [120 + SYNC_HARD_SEEK_SECONDS, "rate"],
    [119.4, "seek"],
    [120.6, "seek"],
  ] as const)("hard seeks only when absolute drift exceeds 500ms (%s)", (followerTimeSeconds, kind) => {
    expect(decideFollowerSync(follower({ followerTimeSeconds })).kind).toBe(kind);
  });

  it("restores the exact selected playback rate after correction", () => {
    const seek = decideFollowerSync(follower({ followerTimeSeconds: 118, selectedRate: 1.5 }));

    expect(seek).toEqual({ kind: "seek", currentTime: 120, playbackRate: 1.5 });
    expect(decideFollowerSync(follower({ selectedRate: 1.5 }))).toEqual({
      kind: "none",
      playbackRate: 1.5,
    });
  });

  it.each([
    [0.5, 119.7],
    [0.5, 120.3],
    [2, 119.7],
    [2, 120.3],
  ])("never makes a negative or unsupported correction at %sx", (selectedRate, followerTimeSeconds) => {
    const decision = decideFollowerSync(follower({ selectedRate, followerTimeSeconds }));

    expect(decision.playbackRate).toBeGreaterThanOrEqual(0.25);
    expect(decision.playbackRate).toBeLessThanOrEqual(2);
  });

  it.each(["paused", "seeking", "buffering", "ended"] as const)(
    "does not correct a %s follower",
    (status) => {
      expect(decideFollowerSync(follower({ status, followerTimeSeconds: 100 }))).toEqual({
        kind: "none",
        playbackRate: 1,
      });
    },
  );

  it("does not correct a degraded follower", () => {
    expect(decideFollowerSync(follower({ degraded: true, followerTimeSeconds: 100 }))).toEqual({
      kind: "none",
      playbackRate: 1,
    });
  });
});

describe("group playback readiness", () => {
  it("one healthy waiting follower requests a group pause", () => {
    const state = group({
      tracks: {
        host: track(),
        for: track({ phase: "waiting", waitingSinceMs: 1_000 }),
        against: track(),
      },
    });

    expect(decideGroupPlayback(state, 2_000)).toEqual({ kind: "pause", reason: "buffering" });
  });

  it("a degraded follower never blocks readiness", () => {
    const state = group({
      tracks: {
        host: track(),
        for: track({ phase: "error", degraded: true, retriesUsed: FOLLOWER_RETRY_BUDGET }),
        against: track(),
      },
    });

    expect(decideGroupPlayback(state, 60_000)).toEqual({ kind: "resume" });
  });

  it("all healthy ready tracks permit resume only when user intent is playing", () => {
    expect(decideGroupPlayback(group(), 5_000)).toEqual({ kind: "resume" });
    expect(decideGroupPlayback(group({ intent: "paused" }), 5_000)).toEqual({ kind: "hold" });
  });

  it("host waiting pauses but host error is fatal rather than degraded", () => {
    const waiting = group({
      tracks: { host: track({ phase: "waiting", waitingSinceMs: 0 }), for: track(), against: track() },
    });
    const failed = group({
      tracks: {
        host: track({ phase: "error", retriesUsed: FOLLOWER_RETRY_BUDGET }),
        for: track(),
        against: track(),
      },
    });

    expect(decideGroupPlayback(waiting, FOLLOWER_STALL_TIMEOUT_MS * 2)).toEqual({
      kind: "pause",
      reason: "buffering",
    });
    expect(decideGroupPlayback(failed, 1_000)).toEqual({ kind: "fatal" });
  });

  it("a follower stalled for eight seconds becomes degraded after retry budget is exhausted", () => {
    const stalled = (retriesUsed: number) => group({
      tracks: {
        host: track(),
        for: track(),
        against: track({ phase: "waiting", waitingSinceMs: 1_000, retriesUsed }),
      },
    });

    expect(decideGroupPlayback(stalled(0), 1_000 + FOLLOWER_STALL_TIMEOUT_MS)).toEqual({
      kind: "pause",
      reason: "buffering",
    });
    expect(
      decideGroupPlayback(stalled(FOLLOWER_RETRY_BUDGET), 1_000 + FOLLOWER_STALL_TIMEOUT_MS - 1),
    ).toEqual({ kind: "pause", reason: "buffering" });
    expect(
      decideGroupPlayback(stalled(FOLLOWER_RETRY_BUDGET), 1_000 + FOLLOWER_STALL_TIMEOUT_MS),
    ).toEqual({ kind: "degrade", track: "against" });
  });
});
