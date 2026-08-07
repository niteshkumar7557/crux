// Renders the transcript as a WebVTT subtitle file for the host video.
//
// Pure string building: the same segments always produce byte-identical output,
// which is what lets the file be cached and compared.

import type { Speaker, TranscriptSegment } from "./manifest.types.js";

const SPEAKER_LABEL: Record<Speaker, string> = {
  host: "HOST",
  for: "FOR",
  against: "AGAINST",
};

function timestamp(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds / 60_000) % 60;
  const seconds = Math.floor(milliseconds / 1_000) % 60;
  const remainder = milliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(remainder).padStart(3, "0")}`;
}

function cueText(segment: TranscriptSegment): string {
  const text = segment.text
    .replace(/\r\n?|\n/g, "\n")
    .replace(/\n(?:[\t ]*\n)+/g, "\n")
    .replace(/-->/g, "--&gt;");
  return `${SPEAKER_LABEL[segment.speaker]}: ${text}`;
}

function cueIdentifier(id: string): string {
  return id
    .replace(/\r\n?|\n/g, " ")
    .replace(/-->/g, "--&gt;");
}

export function renderWebVtt(segments: readonly TranscriptSegment[]): string {
  if (segments.length === 0) return "WEBVTT\n\n";
  return `WEBVTT\n\n${segments.map((segment) => `${cueIdentifier(segment.id)}\n${timestamp(segment.start_ms)} --> ${timestamp(segment.end_ms)}\n${cueText(segment)}`).join("\n\n")}\n`;
}
