// Drives three <video> elements as a single programme, with the host as the clock.
//
// Everything a viewer can do — play, pause, seek, change speed — happens to all
// three at once, and the two follower angles are continuously nudged back onto the
// host's time. It takes its elements as a MediaPort interface rather than importing
// the DOM, so the whole thing is testable with plain objects.

import {
  FOLLOWER_RETRY_BUDGET,
  SYNC_CHECK_INTERVAL_MS,
  decideFollowerSync,
  decideGroupPlayback,
  type FollowerKey,
  type GroupPlaybackState,
  type TrackKey,
  type TrackState,
} from "./sync.logic";

export interface MediaPort {
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  defaultMuted: boolean;
  volume: number;
  playbackRate: number;
  readyState: number;
  networkState: number;
  play(): Promise<void>;
  pause(): void;
  load(): void;
}

export type MediaPorts = Record<TrackKey, MediaPort>;

export type PortEventName =
  | "waiting"
  | "canplay"
  | "playing"
  | "seeking"
  | "seeked"
  | "ended"
  | "error"
  | "volumechange";

export type TileState = "ready" | "buffering" | "unavailable";

export interface PlaybackSnapshot {
  intent: "playing" | "paused";
  playing: boolean;
  buffering: boolean;
  fatal: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  tracks: Record<TrackKey, TileState>;
}

export interface PlaybackController {
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: () => void): () => void;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  retry(track: TrackKey): void;
  handleEvent(track: TrackKey, event: PortEventName): void;
  sample(): void;
  tick(): void;
  destroy(): void;
}

export interface Clock {
  now(): number;
}

export interface IntervalScheduler {
  setInterval(handler: () => void, ms: number): number;
  clearInterval(handle: number): void;
}

const FOLLOWERS: readonly FollowerKey[] = ["for", "against"];
const TRACKS: readonly TrackKey[] = ["host", "for", "against"];

const defaultScheduler: IntervalScheduler = {
  setInterval: (handler, ms) => globalThis.setInterval(handler, ms) as unknown as number,
  clearInterval: (handle) => { globalThis.clearInterval(handle); },
};

function readyTrack(): TrackState {
  return { phase: "ready", degraded: false, waitingSinceMs: null, retriesUsed: 0 };
}

export function createPlaybackController(
  ports: MediaPorts,
  clock: Clock,
  scheduler: IntervalScheduler = defaultScheduler,
): PlaybackController {
  const group: GroupPlaybackState = {
    intent: "paused",
    tracks: { host: readyTrack(), for: readyTrack(), against: readyTrack() },
  };
  let fatal = false;
  let selectedRate = 1;
  let volume = ports.host.volume;
  let muted = ports.host.muted;
  let destroyed = false;
  let snapshot = buildSnapshot();
  const listeners = new Set<() => void>();

  for (const key of FOLLOWERS) enforceFollowerSilence(key);
  const intervalHandle = scheduler.setInterval(() => { tick(); }, SYNC_CHECK_INTERVAL_MS);

  function enforceFollowerSilence(key: FollowerKey): void {
    const port = ports[key];
    if (!port.muted) port.muted = true;
    if (!port.defaultMuted) port.defaultMuted = true;
  }

  function healthy(key: TrackKey): boolean {
    return !group.tracks[key].degraded && !(key === "host" && fatal);
  }

  function tileState(key: TrackKey): TileState {
    const track = group.tracks[key];
    if (track.degraded || (key === "host" && fatal)) return "unavailable";
    return track.phase === "ready" ? "ready" : "buffering";
  }

  function buildSnapshot(): PlaybackSnapshot {
    return {
      intent: group.intent,
      playing: !ports.host.paused,
      buffering: group.intent === "playing" && TRACKS.some(
        (key) => !group.tracks[key].degraded && group.tracks[key].phase === "waiting",
      ),
      fatal,
      currentTimeSeconds: ports.host.currentTime,
      durationSeconds: Number.isFinite(ports.host.duration) ? ports.host.duration : 0,
      playbackRate: selectedRate,
      volume,
      muted,
      tracks: { host: tileState("host"), for: tileState("for"), against: tileState("against") },
    };
  }

  function publish(): void {
    if (destroyed) return;
    snapshot = buildSnapshot();
    for (const listener of listeners) listener();
  }

  function pauseAll(): void {
    for (const key of TRACKS) {
      if (healthy(key) && !ports[key].paused) ports[key].pause();
    }
  }

  function clampedTime(seconds: number): number {
    const duration = Number.isFinite(ports.host.duration) ? ports.host.duration : 0;
    if (!Number.isFinite(seconds) || seconds < 0) return 0;
    return Math.min(seconds, duration);
  }

  function degradeFollower(key: FollowerKey): void {
    group.tracks[key] = { ...group.tracks[key], degraded: true, waitingSinceMs: null };
    if (!ports[key].paused) ports[key].pause();
  }

  function becomeFatal(): void {
    fatal = true;
    group.intent = "paused";
    group.tracks.host = { ...group.tracks.host, phase: "error" };
    for (const key of TRACKS) {
      if (!ports[key].paused) ports[key].pause();
    }
  }

  // A play() that a pause() superseded, which is not a media failure. Browsers
  // reject with AbortError for it, and pauseAll() causes it routinely: setting a
  // follower's currentTime fires `seeking`, which pauses the group mid-resume.
  // Treating it as a failure condemned a perfectly good angle to "Angle
  // unavailable" for the rest of the programme. Duck-typed, because this module
  // imports no DOM.
  function supersededByPause(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
  }

  async function startHealthyPorts(): Promise<void> {
    for (const key of TRACKS) {
      if (!healthy(key)) continue;
      try {
        await ports[key].play();
      } catch (error) {
        if (supersededByPause(error)) continue;
        if (key === "host") {
          becomeFatal();
          return;
        }
        degradeFollower(key as FollowerKey);
      }
    }
  }

  function reconcile(): void {
    const command = decideGroupPlayback(group, clock.now());
    if (command.kind === "fatal") {
      if (!fatal) becomeFatal();
      return;
    }
    if (command.kind === "degrade") {
      degradeFollower(command.track);
      reconcile();
      return;
    }
    if (command.kind === "pause") {
      pauseAll();
      return;
    }
    // Any healthy port that is paused, not just the host. Setting a follower's
    // currentTime fires `seeking`, which pauses the group mid-resume; if the host
    // came back and a follower did not, gating this on the host left that follower
    // frozen forever — tick() only seeks and never plays.
    if (command.kind === "resume" && TRACKS.some((key) => healthy(key) && ports[key].paused)) {
      void startHealthyPorts();
    }
  }

  function tick(): void {
    if (destroyed || fatal) return;
    reconcile();
    if (ports.host.paused) return;
    const masterTimeSeconds = ports.host.currentTime;
    for (const key of FOLLOWERS) {
      const track = group.tracks[key];
      if (track.degraded) continue;
      const port = ports[key];
      const decision = decideFollowerSync({
        masterTimeSeconds,
        followerTimeSeconds: port.currentTime,
        selectedRate,
        status: track.phase === "waiting" ? "buffering" : port.paused ? "paused" : "playing",
        degraded: false,
      });
      if (decision.kind === "seek") port.currentTime = decision.currentTime;
      if (port.playbackRate !== decision.playbackRate) port.playbackRate = decision.playbackRate;
    }
  }

  const controller: PlaybackController = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    async play() {
      if (destroyed || fatal) return;
      group.intent = "playing";
      const masterTimeSeconds = ports.host.currentTime;
      for (const key of FOLLOWERS) {
        if (!healthy(key)) continue;
        enforceFollowerSilence(key);
        ports[key].currentTime = masterTimeSeconds;
      }
      await startHealthyPorts();
      publish();
    },

    pause() {
      if (destroyed) return;
      group.intent = "paused";
      pauseAll();
      publish();
    },

    seek(seconds) {
      if (destroyed) return;
      const time = clampedTime(seconds);
      for (const key of TRACKS) {
        if (healthy(key)) ports[key].currentTime = time;
      }
      publish();
    },

    setPlaybackRate(rate) {
      if (destroyed) return;
      selectedRate = rate;
      for (const key of TRACKS) {
        if (healthy(key)) ports[key].playbackRate = rate;
      }
      publish();
    },

    setVolume(next) {
      if (destroyed) return;
      volume = next;
      ports.host.volume = next;
      publish();
    },

    setMuted(next) {
      if (destroyed) return;
      muted = next;
      ports.host.muted = next;
      publish();
    },

    retry(key) {
      if (destroyed) return;
      const port = ports[key];
      if (key === "host") {
        fatal = false;
        group.intent = "paused";
        group.tracks.host = { phase: "waiting", degraded: false, waitingSinceMs: clock.now(), retriesUsed: group.tracks.host.retriesUsed + 1 };
        port.load();
        publish();
        return;
      }
      group.tracks[key] = {
        phase: "waiting",
        degraded: false,
        waitingSinceMs: clock.now(),
        retriesUsed: Math.min(group.tracks[key].retriesUsed + 1, FOLLOWER_RETRY_BUDGET),
      };
      port.load();
      port.currentTime = ports.host.currentTime;
      enforceFollowerSilence(key);
      publish();
    },

    handleEvent(key, event) {
      if (destroyed) return;
      const track = group.tracks[key];
      if (event === "volumechange") {
        if (key !== "host") enforceFollowerSilence(key);
        else {
          volume = ports.host.volume;
          muted = ports.host.muted;
          publish();
        }
        return;
      }
      if (event === "error") {
        if (key === "host") becomeFatal();
        else group.tracks[key] = { ...track, phase: "error" };
      } else if (event === "waiting" || event === "seeking") {
        group.tracks[key] = {
          ...track,
          phase: "waiting",
          waitingSinceMs: track.phase === "waiting" ? track.waitingSinceMs : clock.now(),
        };
      } else if (event === "canplay" || event === "playing" || event === "seeked") {
        group.tracks[key] = { ...track, phase: "ready", waitingSinceMs: null };
      } else if (event === "ended") {
        group.intent = "paused";
      }
      reconcile();
      publish();
    },

    // Called once per presented frame, so it publishes only when the playhead actually moved.
    sample() {
      if (destroyed) return;
      if (ports.host.currentTime === snapshot.currentTimeSeconds && !ports.host.paused === snapshot.playing) {
        return;
      }
      publish();
    },

    tick,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      scheduler.clearInterval(intervalHandle);
      listeners.clear();
    },
  };

  return controller;
}
