import { describe, expect, it } from "vitest";
import { PLAYBACK_EVENTS, narrowPlaybackEvent } from "./telemetry.logic.js";

const DURATION_MS = 480_000;

function body(overrides: Record<string, unknown> = {}) {
  return { event: "buffer_end", role: "for", at_ms: 120_000, buffer_ms: 1_400, ...overrides };
}

describe("playback telemetry narrowing", () => {
  it("accepts only the six known event names", () => {
    for (const event of PLAYBACK_EVENTS) {
      expect(narrowPlaybackEvent(body({ event }), DURATION_MS)?.event).toBe(event);
    }
    expect(PLAYBACK_EVENTS).toHaveLength(6);
    for (const event of ["seek", "pause", "PLAY_START", "", null, 7]) {
      expect(narrowPlaybackEvent(body({ event }), DURATION_MS)).toBeNull();
    }
  });

  it("accepts role only for host, for, or against", () => {
    for (const role of ["host", "for", "against"]) {
      expect(narrowPlaybackEvent(body({ role }), DURATION_MS)?.role).toBe(role);
    }
    expect(narrowPlaybackEvent(body({ role: null }), DURATION_MS)?.role).toBeNull();
    expect(narrowPlaybackEvent(body({ role: "poster" }), DURATION_MS)).toBeNull();
  });

  it.each([
    [-5, 0],
    [DURATION_MS + 9_000, DURATION_MS],
    [120_000.7, 120_000],
  ])("clamps at_ms to a non-negative integer within programme bounds (%s)", (at_ms, expected) => {
    expect(narrowPlaybackEvent(body({ at_ms }), DURATION_MS)?.atMs).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, "1400", {}])(
    "rejects a non-finite at_ms (%s)",
    (at_ms) => {
      expect(narrowPlaybackEvent(body({ at_ms }), DURATION_MS)).toBeNull();
    },
  );

  it("clamps buffer_ms to a finite non-negative integer and allows its absence", () => {
    expect(narrowPlaybackEvent(body({ buffer_ms: -2 }), DURATION_MS)?.bufferMs).toBe(0);
    expect(narrowPlaybackEvent(body({ buffer_ms: 1_400.6 }), DURATION_MS)?.bufferMs).toBe(1_400);
    expect(narrowPlaybackEvent(body({ buffer_ms: undefined }), DURATION_MS)?.bufferMs).toBeNull();
    expect(narrowPlaybackEvent(body({ buffer_ms: Number.NaN }), DURATION_MS)).toBeNull();
  });

  it("drops transcript, urls, headers, email, and arbitrary nested properties", () => {
    const narrowed = narrowPlaybackEvent(
      {
        ...body(),
        transcript: [{ id: "for-0001", text: "Applied learning improves retention." }],
        url: "https://media.crux.test/video-debates/x/host.mp4",
        headers: { authorization: "Bearer secret" },
        email: "someone@example.com",
        nested: { deep: { deeper: true } },
      },
      DURATION_MS,
    );

    expect(narrowed).not.toBeNull();
    expect(Object.keys(narrowed!).sort()).toEqual(
      ["atMs", "bufferMs", "connection", "event", "online", "role"].sort(),
    );
    expect(JSON.stringify(narrowed)).not.toMatch(/transcript|Bearer|example\.com|mp4|deeper/i);
  });

  it("keeps only a coarse connection type and a boolean online flag", () => {
    expect(narrowPlaybackEvent(body({ online: true, connection: "4g" }), DURATION_MS)).toMatchObject({
      online: true,
      connection: "4g",
    });
    expect(narrowPlaybackEvent(body({ connection: "fibre-to-my-house" }), DURATION_MS)?.connection)
      .toBeNull();
    expect(narrowPlaybackEvent(body({ online: "yes" }), DURATION_MS)?.online).toBeNull();
  });

  it("refuses a non-object body", () => {
    for (const raw of [null, undefined, "buffer_end", 7, []]) {
      expect(narrowPlaybackEvent(raw, DURATION_MS)).toBeNull();
    }
  });
});
