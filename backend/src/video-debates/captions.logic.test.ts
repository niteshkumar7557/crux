import { describe, expect, it } from "vitest";
import { renderWebVtt } from "./captions.logic.js";
import type { TranscriptSegment } from "./manifest.types.js";

function segment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    id: "host-0001",
    speaker: "host",
    start_ms: 1_234,
    end_ms: 5_678,
    text: "Welcome.",
    phase: "intro",
    round: null,
    judged: false,
    ...overrides,
  };
}

describe("renderWebVtt", () => {
  it("renders a WEBVTT header and millisecond cue timestamps", () => {
    expect(renderWebVtt([segment()])).toBe(
      "WEBVTT\n\n"
      + "host-0001\n"
      + "00:00:01.234 --> 00:00:05.678\n"
      + "HOST: Welcome.\n",
    );
  });

  it("prefixes visible cue text with HOST, FOR, or AGAINST", () => {
    expect(renderWebVtt([
      segment({ id: "host-0001", speaker: "host", text: "Moderator." }),
      segment({ id: "for-0001", speaker: "for", text: "My case." }),
      segment({ id: "against-0001", speaker: "against", text: "My reply." }),
    ])).toBe(
      "WEBVTT\n\n"
      + "host-0001\n00:00:01.234 --> 00:00:05.678\nHOST: Moderator.\n\n"
      + "for-0001\n00:00:01.234 --> 00:00:05.678\nFOR: My case.\n\n"
      + "against-0001\n00:00:01.234 --> 00:00:05.678\nAGAINST: My reply.\n",
    );
  });

  it("escapes cue-breaking arrows and normalizes embedded line endings", () => {
    expect(renderWebVtt([segment({ text: "First\r\nSecond\rThird --> still speaking" })])).toBe(
      "WEBVTT\n\n"
      + "host-0001\n"
      + "00:00:01.234 --> 00:00:05.678\n"
      + "HOST: First\nSecond\nThird --&gt; still speaking\n",
    );
  });

  it("collapses multiple normalized blank lines without discarding ordinary line breaks", () => {
    expect(renderWebVtt([segment({ text: "First\r\nSecond\r\n\r\nThird\n\n\nFourth" })])).toBe(
      "WEBVTT\n\n"
      + "host-0001\n"
      + "00:00:01.234 --> 00:00:05.678\n"
      + "HOST: First\nSecond\nThird\nFourth\n",
    );
  });

  it("renders newline-bearing cue identifiers on one line", () => {
    expect(renderWebVtt([segment({ id: "host\r\nline\nthree" })])).toBe(
      "WEBVTT\n\n"
      + "host line three\n"
      + "00:00:01.234 --> 00:00:05.678\n"
      + "HOST: Welcome.\n",
    );
  });

  it("escapes cue-breaking arrows in cue identifiers", () => {
    expect(renderWebVtt([segment({ id: "host-->0001" })])).toBe(
      "WEBVTT\n\n"
      + "host--&gt;0001\n"
      + "00:00:01.234 --> 00:00:05.678\n"
      + "HOST: Welcome.\n",
    );
  });

  it("keeps overlapping grace speech as distinct ordered cues", () => {
    expect(renderWebVtt([
      segment({ id: "host-0002", speaker: "host", start_ms: 30_000, end_ms: 32_000, text: "Time.", phase: "grace", round: 1 }),
      segment({ id: "for-0003", speaker: "for", start_ms: 30_500, end_ms: 33_000, text: "One last point.", phase: "grace", round: 1 }),
    ])).toBe(
      "WEBVTT\n\n"
      + "host-0002\n00:00:30.000 --> 00:00:32.000\nHOST: Time.\n\n"
      + "for-0003\n00:00:30.500 --> 00:00:33.000\nFOR: One last point.\n",
    );
  });

  it("returns a valid empty WEBVTT document for no segments", () => {
    expect(renderWebVtt([])).toBe("WEBVTT\n\n");
  });
});
