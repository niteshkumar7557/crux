// The arithmetic of keeping three videos on one clock, with no video involved.
//
// Two questions live here. "This follower is 0.3s behind the host — nudge its rate
// or hard-seek it?" and "one tile is still buffering — should the whole group wait?"
// Both are plain functions over plain numbers, which is why they can be tested
// without a browser. playbackController.ts is what actually touches the elements.

export const SYNC_DEADBAND_SECONDS = 0.15;
export const SYNC_HARD_SEEK_SECONDS = 0.5;
export const SYNC_RATE_FACTOR = 0.04;
export const SYNC_CHECK_INTERVAL_MS = 250;
export const FOLLOWER_STALL_TIMEOUT_MS = 8_000;
export const FOLLOWER_RETRY_BUDGET = 2;

const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 2;
const TIME_EPSILON_SECONDS = 1e-9;

export type FollowerStatus = "playing" | "paused" | "seeking" | "buffering" | "ended";

export interface FollowerSyncInput {
  masterTimeSeconds: number;
  followerTimeSeconds: number;
  selectedRate: number;
  status: FollowerStatus;
  degraded: boolean;
}

export type SyncDecision =
  | { kind: "none"; playbackRate: number }
  | { kind: "rate"; playbackRate: number }
  | { kind: "seek"; currentTime: number; playbackRate: number };

export type TrackKey = "host" | "for" | "against";
export type FollowerKey = Exclude<TrackKey, "host">;

export interface TrackState {
  phase: "ready" | "waiting" | "error";
  degraded: boolean;
  waitingSinceMs: number | null;
  retriesUsed: number;
}

export interface GroupPlaybackState {
  intent: "playing" | "paused";
  tracks: Record<TrackKey, TrackState>;
}

export type GroupCommand =
  | { kind: "pause"; reason: "buffering" }
  | { kind: "resume" }
  | { kind: "degrade"; track: FollowerKey }
  | { kind: "fatal" }
  | { kind: "hold" };

const FOLLOWERS: readonly FollowerKey[] = ["for", "against"];

function clampRate(rate: number): number {
  return Math.min(Math.max(rate, MIN_PLAYBACK_RATE), MAX_PLAYBACK_RATE);
}

export function decideFollowerSync(input: FollowerSyncInput): SyncDecision {
  const selectedRate = clampRate(input.selectedRate);
  if (input.degraded || input.status !== "playing") {
    return { kind: "none", playbackRate: selectedRate };
  }

  // Media times are floats, so both thresholds are inclusive within representation noise.
  const drift = input.followerTimeSeconds - input.masterTimeSeconds;
  if (Math.abs(drift) <= SYNC_DEADBAND_SECONDS + TIME_EPSILON_SECONDS) {
    return { kind: "none", playbackRate: selectedRate };
  }
  if (Math.abs(drift) > SYNC_HARD_SEEK_SECONDS + TIME_EPSILON_SECONDS) {
    return { kind: "seek", currentTime: input.masterTimeSeconds, playbackRate: selectedRate };
  }

  const corrected = clampRate(selectedRate * (drift < 0 ? 1 + SYNC_RATE_FACTOR : 1 - SYNC_RATE_FACTOR));
  // A clamped correction that lands back on the selected rate is not a correction at all.
  if (corrected === selectedRate) return { kind: "none", playbackRate: selectedRate };
  return { kind: "rate", playbackRate: corrected };
}

function exhausted(track: TrackState, nowMs: number): boolean {
  // A media error is already the element giving up; only a silent stall spends the retry budget.
  if (track.phase === "error") return true;
  if (track.retriesUsed < FOLLOWER_RETRY_BUDGET) return false;
  return track.waitingSinceMs !== null && nowMs - track.waitingSinceMs >= FOLLOWER_STALL_TIMEOUT_MS;
}

export function decideGroupPlayback(state: GroupPlaybackState, nowMs: number): GroupCommand {
  // The host owns the audio and the clock, so it can never degrade into a missing tile.
  if (state.tracks.host.phase === "error") return { kind: "fatal" };

  for (const key of FOLLOWERS) {
    const follower = state.tracks[key];
    if (!follower.degraded && follower.phase !== "ready" && exhausted(follower, nowMs)) {
      return { kind: "degrade", track: key };
    }
  }

  const blocking = (["host", ...FOLLOWERS] as const).some((key) => {
    const track = state.tracks[key];
    return !track.degraded && track.phase !== "ready";
  });
  if (blocking) return { kind: "pause", reason: "buffering" };
  return state.intent === "playing" ? { kind: "resume" } : { kind: "hold" };
}
