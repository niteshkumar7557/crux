"use client";

// Best-effort playback health signals.
//
// Everything here is fire-and-forget: a refused beacon, a blocked request or an
// offline device must never change what the player does or put an error on screen.
// The payload is a fixed set of six fields — no URL, no transcript, no identity.

import type { ParticipantRole } from "@/app/video-debates/types";

export type PlaybackEventName =
  | "play_start"
  | "buffer_start"
  | "buffer_end"
  | "follower_degraded"
  | "host_error"
  | "completed";

export interface PlaybackPayload {
  event: PlaybackEventName;
  role: ParticipantRole | null;
  at_ms: number;
  buffer_ms: number | null;
  online: boolean | null;
  connection: string | null;
}

export interface PlaybackReporter {
  playStart(atMs: number): void;
  bufferStart(role: ParticipantRole, atMs: number): void;
  bufferEnd(role: ParticipantRole, atMs: number): void;
  followerDegraded(role: ParticipantRole, atMs: number): void;
  hostError(atMs: number): void;
  progress(atMs: number): void;
  ended(atMs: number): void;
}

export type PlaybackSend = (path: string, payload: PlaybackPayload) => void;

const COMPLETION_FRACTION = 0.95;

interface ConnectionInfo {
  effectiveType?: string;
}

function coarseConnection(): string | null {
  if (typeof navigator === "undefined") return null;
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  return connection?.effectiveType ?? null;
}

function online(): boolean | null {
  return typeof navigator === "undefined" ? null : navigator.onLine;
}

// sendBeacon survives the page going away, which is exactly when the last event
// matters; keepalive fetch is the fallback when it is unavailable or refuses.
function defaultSend(path: string, payload: PlaybackPayload): void {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(path, blob)) return;
    }
    void fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry is never load-bearing.
  }
}

export function createPlaybackReporter({
  slug,
  durationMs,
  send = defaultSend,
  now = () => Date.now(),
}: {
  slug: string;
  durationMs: number;
  send?: PlaybackSend;
  now?: () => number;
}): PlaybackReporter {
  const path = `/api/video-debates/${encodeURIComponent(slug)}/playback-events`;
  const bufferStartedAt = new Map<ParticipantRole, number>();
  let completed = false;

  function report(
    event: PlaybackEventName,
    role: ParticipantRole | null,
    atMs: number,
    bufferMs: number | null,
  ): void {
    try {
      send(path, {
        event,
        role,
        at_ms: Math.max(Math.round(atMs), 0),
        buffer_ms: bufferMs === null ? null : Math.max(Math.round(bufferMs), 0),
        online: online(),
        connection: coarseConnection(),
      });
    } catch {
      // A failed send is not a playback event.
    }
  }

  function complete(atMs: number): void {
    if (completed) return;
    completed = true;
    report("completed", null, atMs, null);
  }

  return {
    playStart: (atMs) => report("play_start", null, atMs, null),

    bufferStart(role, atMs) {
      bufferStartedAt.set(role, now());
      report("buffer_start", role, atMs, null);
    },

    bufferEnd(role, atMs) {
      const startedAt = bufferStartedAt.get(role);
      if (startedAt === undefined) return;
      bufferStartedAt.delete(role);
      report("buffer_end", role, atMs, now() - startedAt);
    },

    followerDegraded: (role, atMs) => report("follower_degraded", role, atMs, null),
    hostError: (atMs) => report("host_error", null, atMs, null),

    progress(atMs) {
      if (durationMs > 0 && atMs > durationMs * COMPLETION_FRACTION) complete(atMs);
    },

    ended: (atMs) => complete(atMs),
  };
}
