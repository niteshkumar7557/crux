import { describe, expect, it } from "vitest";
import { compareTranscriptSegments, mergeWhisperTranscripts } from "./transcript.logic.js";
import type { TimelineEntry, TranscriptSegment } from "./manifest.types.js";

const timeline = (): TimelineEntry[] => [
  { type: "intro", start_ms: 0, end_ms: 10_000 },
  {
    type: "round",
    number: 1,
    domain: "Education",
    opener: "for",
    for: { start_ms: 10_000, end_ms: 20_000 },
    against: { start_ms: 20_000, end_ms: 30_000 },
    grace: { start_ms: 30_000, end_ms: 40_000 },
  },
  { type: "outro", start_ms: 40_000, end_ms: 50_000 },
];

const transcript = (segments: unknown[]) => ({ segments });

const segment = (start: number, end: number, text: string, words?: unknown[]) => ({
  start,
  end,
  text,
  ...(words === undefined ? {} : { words }),
});

const word = (start: number, end: number, text: string) => ({ start, end, word: text });

describe("mergeWhisperTranscripts", () => {
  it("assigns speaker ids from the input role, never Whisper text", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "host", document: { speaker: "against", ...transcript([segment(1, 2, "Welcome")]) } },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value[0]).toMatchObject({ id: "host-0001", speaker: "host" });
  });

  it("sorts simultaneous segments by start, then host-for-against, then source index", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "against", document: transcript([segment(1, 2, "Against")]) },
      { speaker: "for", document: transcript([segment(1, 2, "For")]) },
      { speaker: "host", document: transcript([segment(1, 2, "Host first"), segment(1, 2, "Host second")]) },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.map(({ speaker, text }) => ({ speaker, text }))).toEqual([
      { speaker: "host", text: "Host first" },
      { speaker: "host", text: "Host second" },
      { speaker: "for", text: "For" },
      { speaker: "against", text: "Against" },
    ]);
  });

  it("assigns stable ids host-0001, for-0001, and against-0001", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "against", document: transcript([segment(21, 22, "Against")]) },
      { speaker: "host", document: transcript([segment(1, 2, "Host")]) },
      { speaker: "for", document: transcript([segment(11, 12, "For")]) },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.map(({ id }) => id)).toEqual(["host-0001", "for-0001", "against-0001"]);
  });

  it("splits a segment at a judged-to-grace word boundary before assigning ids", () => {
    const result = mergeWhisperTranscripts([
      {
        speaker: "for",
        document: transcript([
          segment(19, 31, "Judged grace", [word(19, 20, "Judged "), word(30, 31, "grace")]),
        ]),
      },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        id: "for-0001",
        speaker: "for",
        start_ms: 19_000,
        end_ms: 20_000,
        text: "Judged ",
        phase: "judged",
        round: 1,
        judged: true,
      },
      {
        id: "for-0002",
        speaker: "for",
        start_ms: 30_000,
        end_ms: 31_000,
        text: "grace",
        phase: "grace",
        round: 1,
        judged: false,
      },
    ]);
  });

  it("never marks host, intro, grace, or outro speech judged", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "host", document: transcript([segment(1, 2, "Intro host"), segment(31, 32, "Grace host"), segment(41, 42, "Outro host")]) },
      { speaker: "for", document: transcript([segment(1, 2, "Intro"), segment(31, 32, "Grace"), segment(41, 42, "Outro")]) },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.every((entry) => entry.judged === false)).toBe(true);
  });

  it("marks only fully contained debater speech in the correct round turn judged", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "for", document: transcript([segment(11, 12, "FOR turn")]) },
      { speaker: "against", document: transcript([segment(21, 22, "AGAINST turn")]) },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.map(({ text, phase, round, judged }) => ({ text, phase, round, judged }))).toEqual([
      { text: "FOR turn", phase: "judged", round: 1, judged: true },
      { text: "AGAINST turn", phase: "judged", round: 1, judged: true },
    ]);
  });

  it("rejects host speech inside a judged turn", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "host", document: transcript([segment(11, 12, "Host interruption")]) },
    ], timeline());

    expect(result).toEqual({
      ok: false,
      errors: [expect.objectContaining({ code: "speaker_window_mismatch", path: "inputs[0].document.segments[0]" })],
    });
  });

  it("rejects a segment with no usable word timestamps when it crosses a boundary", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "for", document: transcript([segment(19, 31, "Cannot split")]) },
    ], timeline());

    expect(result).toEqual({
      ok: false,
      errors: [expect.objectContaining({ code: "unsplittable_boundary_segment", path: "inputs[0].document.segments[0]" })],
    });
  });

  it("rejects a corrected boundary-crossing segment whose word tokens are stale", () => {
    const result = mergeWhisperTranscripts([
      {
        speaker: "for",
        document: transcript([
          segment(19, 31, "Corrected judged grace", [word(19, 20, "Stale judged "), word(30, 31, "grace")]),
        ]),
      },
    ], timeline());

    expect(result).toEqual({
      ok: false,
      errors: [expect.objectContaining({ code: "corrected_split_requires_word_edits", path: "inputs[0].document.segments[0]" })],
    });
  });

  it("rejects a boundary-crossing segment whose only word omits corrected text", () => {
    const result = mergeWhisperTranscripts([
      {
        speaker: "for",
        document: transcript([
          segment(19, 31, "Judged grace", [word(19, 20, "Judged")]),
        ]),
      },
    ], timeline());

    expect(result).toEqual({
      ok: false,
      errors: [expect.objectContaining({ code: "corrected_split_requires_word_edits", path: "inputs[0].document.segments[0]" })],
    });
  });

  it("uses the full timestamp span of overlapping words in a split piece", () => {
    const result = mergeWhisperTranscripts([
      {
        speaker: "for",
        document: transcript([
          segment(11, 31, "Long overlap grace", [
            word(11, 19, "Long "),
            word(12, 13, "overlap "),
            word(30, 31, "grace"),
          ]),
        ]),
      },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value[0]).toMatchObject({ start_ms: 11_000, end_ms: 19_000, text: "Long overlap " });
  });

  it("rejects word timestamps outside their enclosing Whisper segment", () => {
    const result = mergeWhisperTranscripts([
      { speaker: "for", document: transcript([segment(11, 12, "Moved speech", [word(21, 22, "Moved speech")])]) },
    ], timeline());

    expect(result).toEqual({
      ok: false,
      errors: [expect.objectContaining({ code: "invalid_whisper_json", path: "inputs[0].document.segments[0]" })],
    });
  });

  it("preserves corrected text without translating or rewriting it", () => {
    const corrected = "Je m'appelle Crux — déjà.";
    const result = mergeWhisperTranscripts([
      { speaker: "host", document: transcript([segment(1, 2, corrected, [word(1, 1.5, "I am "), word(1.5, 2, "Crux.")])]) },
    ], timeline());

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value[0]?.text).toBe(corrected);
  });
});

describe("compareTranscriptSegments", () => {
  it("totally orders canonically equivalent distinct ids independent of input order", () => {
    const identified = (id: string): TranscriptSegment => ({
      id,
      speaker: "host",
      start_ms: 1_000,
      end_ms: 2_000,
      text: id,
      phase: "intro",
      round: null,
      judged: false,
    });
    const composed = identified("é");
    const decomposed = identified("é");
    const expected = [decomposed.id, composed.id];

    expect([composed, decomposed].sort(compareTranscriptSegments).map(({ id }) => id)).toEqual(expected);
    expect([decomposed, composed].sort(compareTranscriptSegments).map(({ id }) => id)).toEqual(expected);
  });
});
