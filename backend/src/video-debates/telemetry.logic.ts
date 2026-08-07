// Narrows one untrusted playback event into the few operational fields worth logging.
//
// This is health data, not behaviour: it never reaches a table, a score or a
// publication decision, and it carries no transcript text, URL, header or address.

import type { ParticipantRole } from "./manifest.types.js";

export const PLAYBACK_EVENTS = [
  "play_start",
  "buffer_start",
  "buffer_end",
  "follower_degraded",
  "host_error",
  "completed",
] as const;

export type PlaybackEventName = (typeof PLAYBACK_EVENTS)[number];

const CONNECTION_TYPES = ["slow-2g", "2g", "3g", "4g"] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export interface PlaybackEvent {
  event: PlaybackEventName;
  role: ParticipantRole | null;
  atMs: number;
  bufferMs: number | null;
  online: boolean | null;
  connection: ConnectionType | null;
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function eventName(value: unknown): PlaybackEventName | null {
  return PLAYBACK_EVENTS.find((name) => name === value) ?? null;
}

function role(value: unknown): ParticipantRole | null | undefined {
  if (value === null || value === undefined) return null;
  return value === "host" || value === "for" || value === "against" ? value : undefined;
}

function connection(value: unknown): ConnectionType | null {
  return CONNECTION_TYPES.find((type) => type === value) ?? null;
}

function clampedMs(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.floor(value), 0), max);
}

export function narrowPlaybackEvent(raw: unknown, durationMs: number): PlaybackEvent | null {
  const body = record(raw);
  if (!body) return null;

  const event = eventName(body.event);
  const participantRole = role(body.role);
  const atMs = clampedMs(body.at_ms, durationMs);
  if (!event || participantRole === undefined || atMs === undefined) return null;

  let bufferMs: number | null = null;
  if (body.buffer_ms !== undefined && body.buffer_ms !== null) {
    const clamped = clampedMs(body.buffer_ms, durationMs);
    if (clamped === undefined) return null;
    bufferMs = clamped;
  }

  return {
    event,
    role: participantRole,
    atMs,
    bufferMs,
    online: typeof body.online === "boolean" ? body.online : null,
    connection: connection(body.connection),
  };
}
