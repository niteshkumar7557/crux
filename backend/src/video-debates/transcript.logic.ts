// Narrows aligned Whisper transcripts, splits them at timeline boundaries, and classifies their segments.

import type {
  DebateSide,
  Speaker,
  TimelineEntry,
  TranscriptPhase,
  TranscriptSegment,
  ValidationResult,
} from "./manifest.types.js";

type UnknownRecord = Record<string, unknown>;

export type WhisperWord = {
  start_ms: number;
  end_ms: number;
  text: string;
};

export type WhisperSegment = {
  start_ms: number;
  end_ms: number;
  text: string;
  words: WhisperWord[] | null;
};

export type TimelineWindow = {
  start_ms: number;
  end_ms: number;
  phase: TranscriptPhase;
  round: number | null;
  judged: boolean;
  speaker: DebateSide | null;
};

type UnidentifiedSegment = Omit<TranscriptSegment, "id"> & {
  source_index: number;
  piece_index: number;
};

type IdentifiedSegment = UnidentifiedSegment & { id: string };

export type WhisperTranscriptInput = {
  speaker: Speaker;
  document: unknown;
};

function issue<T>(code: string, path: string, message: string): ValidationResult<T> {
  return { ok: false, errors: [{ code, path, message }] };
}

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function milliseconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const converted = Math.round(value * 1_000);
  return Number.isSafeInteger(converted) ? converted : null;
}

function whisperWord(value: unknown): WhisperWord | null {
  const record = object(value);
  if (!record) return null;
  const start_ms = milliseconds(record.start);
  const end_ms = milliseconds(record.end);
  const text = typeof record.word === "string" ? record.word : null;
  if (start_ms === null || end_ms === null || end_ms <= start_ms || text === null) return null;
  return { start_ms, end_ms, text };
}

function whisperSegment(value: unknown): WhisperSegment | null {
  const record = object(value);
  if (!record) return null;
  const start_ms = milliseconds(record.start);
  const end_ms = milliseconds(record.end);
  const text = typeof record.text === "string" ? record.text : null;
  if (start_ms === null || end_ms === null || end_ms <= start_ms || text === null) return null;
  if (record.words === undefined) return { start_ms, end_ms, text, words: null };
  if (!Array.isArray(record.words)) return null;
  const words: WhisperWord[] = [];
  let previousStartMs = -1;
  for (const rawWord of record.words) {
    const parsed = whisperWord(rawWord);
    if (
      !parsed || parsed.start_ms < previousStartMs ||
      parsed.start_ms < start_ms || parsed.end_ms > end_ms
    ) return null;
    words.push(parsed);
    previousStartMs = parsed.start_ms;
  }
  return { start_ms, end_ms, text, words };
}

export function whisperSegments(document: unknown, path: string): ValidationResult<WhisperSegment[]> {
  const root = object(document);
  if (!root || !Array.isArray(root.segments)) return issue("invalid_whisper_json", path, "Whisper transcript must contain a segments array.");
  const segments: WhisperSegment[] = [];
  for (let index = 0; index < root.segments.length; index += 1) {
    const parsed = whisperSegment(root.segments[index]);
    if (!parsed) return issue("invalid_whisper_json", `${path}.segments[${index}]`, "Whisper segment fields must contain usable timestamps and text.");
    segments.push(parsed);
  }
  return { ok: true, value: segments };
}

export function timelineWindows(timeline: readonly TimelineEntry[]): TimelineWindow[] {
  const windows: TimelineWindow[] = [];
  for (const entry of timeline) {
    if (entry.type === "intro") {
      windows.push({ ...entry, phase: "intro", round: null, judged: false, speaker: null });
      continue;
    }
    if (entry.type === "outro") {
      windows.push({ ...entry, phase: "outro", round: null, judged: false, speaker: null });
      continue;
    }
    windows.push(
      { ...entry.for, phase: "judged", round: entry.number, judged: true, speaker: "for" },
      { ...entry.against, phase: "judged", round: entry.number, judged: true, speaker: "against" },
      { ...entry.grace, phase: "grace", round: entry.number, judged: false, speaker: null },
    );
  }
  return windows.sort((left, right) => left.start_ms - right.start_ms || left.end_ms - right.end_ms);
}

function containingWindow(windows: readonly TimelineWindow[], start_ms: number, end_ms: number): TimelineWindow | null {
  return windows.find((window) => start_ms >= window.start_ms && end_ms <= window.end_ms) ?? null;
}

function classifiedSegment(
  speaker: Speaker,
  window: TimelineWindow,
  start_ms: number,
  end_ms: number,
  text: string,
  source_index: number,
  piece_index: number,
): UnidentifiedSegment {
  return {
    speaker,
    start_ms,
    end_ms,
    text,
    phase: window.phase,
    round: window.round,
    judged: window.judged && speaker === window.speaker,
    source_index,
    piece_index,
  };
}

function speakerMatchesWindow(speaker: Speaker, window: TimelineWindow): boolean {
  return !window.judged || speaker === window.speaker;
}

function normalizedWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function splitSegment(
  speaker: Speaker,
  segment: WhisperSegment,
  windows: readonly TimelineWindow[],
  path: string,
  source_index: number,
): ValidationResult<UnidentifiedSegment[]> {
  if (!segment.words || segment.words.length === 0) {
    const window = containingWindow(windows, segment.start_ms, segment.end_ms);
    if (!window) return issue("unsplittable_boundary_segment", path, "A segment crossing a timeline boundary needs usable word timestamps.");
    if (!speakerMatchesWindow(speaker, window)) return issue("speaker_window_mismatch", path, "Speech inside a judged turn must come from that turn's scheduled debater.");
    return { ok: true, value: [classifiedSegment(speaker, window, segment.start_ms, segment.end_ms, segment.text, source_index, 0)] };
  }

  const pieces: UnidentifiedSegment[] = [];
  let words: WhisperWord[] = [];
  let currentWindow: TimelineWindow | null = null;
  const appendPiece = (): void => {
    if (!currentWindow || words.length === 0) return;
    const start_ms = Math.min(...words.map((word) => word.start_ms));
    const end_ms = Math.max(...words.map((word) => word.end_ms));
    pieces.push(classifiedSegment(speaker, currentWindow, start_ms, end_ms, words.map((word) => word.text).join(""), source_index, pieces.length));
    words = [];
  };

  for (const word of segment.words) {
    const window = containingWindow(windows, word.start_ms, word.end_ms);
    if (!window) return issue("unsplittable_boundary_segment", path, "A word crossing a timeline boundary cannot be classified safely.");
    if (!speakerMatchesWindow(speaker, window)) return issue("speaker_window_mismatch", path, "Speech inside a judged turn must come from that turn's scheduled debater.");
    if (currentWindow && currentWindow !== window) appendPiece();
    currentWindow = window;
    words.push(word);
  }
  appendPiece();
  const wholeWindow = containingWindow(windows, segment.start_ms, segment.end_ms);
  if (!wholeWindow && normalizedWhitespace(segment.text) !== normalizedWhitespace(segment.words.map((word) => word.text).join(""))) return issue("corrected_split_requires_word_edits", path, "Corrected segments crossing timeline boundaries require matching word-level edits.");
  if (wholeWindow) {
    const piece = pieces[0]!;
    return {
      ok: true,
      value: [{
        ...piece,
        ...(wholeWindow ? { start_ms: segment.start_ms, end_ms: segment.end_ms } : {}),
        text: segment.text,
      }],
    };
  }
  return { ok: true, value: pieces };
}

function speakerOrder(speaker: Speaker): number {
  return speaker === "host" ? 0 : speaker === "for" ? 1 : 2;
}

export function compareTranscriptSegments(left: TranscriptSegment, right: TranscriptSegment): number {
  return left.start_ms - right.start_ms || speakerOrder(left.speaker) - speakerOrder(right.speaker) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

function sourceOrder(left: UnidentifiedSegment, right: UnidentifiedSegment): number {
  return left.start_ms - right.start_ms || left.source_index - right.source_index || left.piece_index - right.piece_index;
}

function globalOrder(left: UnidentifiedSegment, right: UnidentifiedSegment): number {
  return left.start_ms - right.start_ms || speakerOrder(left.speaker) - speakerOrder(right.speaker) || sourceOrder(left, right);
}

export function mergeWhisperTranscripts(
  inputs: readonly WhisperTranscriptInput[],
  timeline: readonly TimelineEntry[],
): ValidationResult<TranscriptSegment[]> {
  const windows = timelineWindows(timeline);
  const pieces: UnidentifiedSegment[] = [];
  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
    const input = inputs[inputIndex]!;
    const parsed = whisperSegments(input.document, `inputs[${inputIndex}].document`);
    if (!parsed.ok) return parsed;
    for (let sourceIndex = 0; sourceIndex < parsed.value.length; sourceIndex += 1) {
      const split = splitSegment(input.speaker, parsed.value[sourceIndex]!, windows, `inputs[${inputIndex}].document.segments[${sourceIndex}]`, sourceIndex);
      if (!split.ok) return split;
      pieces.push(...split.value);
    }
  }

  const assigned: IdentifiedSegment[] = [];
  for (const speaker of ["host", "for", "against"] as const) {
    const speakerPieces = pieces.filter((piece) => piece.speaker === speaker).sort(sourceOrder);
    for (let index = 0; index < speakerPieces.length; index += 1) {
      assigned.push({ ...speakerPieces[index]!, id: `${speaker}-${String(index + 1).padStart(4, "0")}` });
    }
  }
  return {
    ok: true,
    value: assigned.sort(globalOrder).map(({ source_index: _sourceIndex, piece_index: _pieceIndex, ...segment }) => segment),
  };
}
