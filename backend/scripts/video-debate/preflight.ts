// Reports every reason the merge will fail, in one pass, and proposes boundaries
// that land in gaps between words.
//
// mergeWhisperTranscripts stops at its first error, which is correct for a
// validator and miserable for an operator: eighty-odd problems get discovered one
// re-run at a time. This walks the same windows with the same parser and reports
// all of them at once.
//
// It also solves the arithmetic the runbook asks an operator to do by hand. Each
// judged turn must be 30 s within 100 ms and the programme must stay contiguous,
// so a boundary cannot be nudged on its own — the whole round slides. This searches
// that space and writes a proposal; it never overwrites metadata/boundaries.json.

import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import {
  timelineWindows,
  whisperSegments,
  type TimelineWindow,
  type WhisperSegment,
} from "../../src/video-debates/transcript.logic.js";
import type { DebateSide, TimelineEntry, TimestampRange } from "../../src/video-debates/manifest.types.js";
import { writeJsonAtomic } from "./io.js";
import { assertPackageOutputPath, packageChildPath, packagePaths, readPackageText } from "./paths.js";

export type Speaker = "host" | "for" | "against";

export type SpeechInterval = { start_ms: number; end_ms: number };

export type Straddle = {
  speaker: Speaker;
  segment_index: number;
  word_index: number | null;
  text: string;
  start_ms: number;
  end_ms: number;
  boundary_ms: number;
};

export type ForeignSpeech = {
  speaker: Speaker;
  segment_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  round: number;
  belongs_to: DebateSide;
};

export type Hallucination = {
  speaker: Speaker;
  segment_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  reason: string;
};

export type Track = { speaker: Speaker; segments: readonly WhisperSegment[] };

// A judged turn is 30 s with 100 ms of slack on either side.
const IDEAL_TURN_MS = 30_000;
const TURN_SLACK_MS = 100;
// How far a block start or grace end may move before the operator has to intervene.
const MAX_SHIFT_MS = 4_000;
// Grace has no required length, but a zero-length one is a boundary bug, not a phase.
const MIN_GRACE_MS = 200;

// Whisper invents these during silence. Isolated tracks are silent roughly two
// thirds of the time, so this is a routine occurrence, not an exotic failure.
const KNOWN_HALLUCINATIONS = [
  "thank you", "thanks for watching", "thank you.", "you", "bye", "bye.",
  "please subscribe", "subscribe", "thanks for watching!", "okay", "ok",
];
const PUNCTUATION_ONLY = /^[.…,!?\-\s]+$/u;
const MIN_CREDIBLE_SEGMENT_MS = 120;

function normalized(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

// The intervals a boundary may not cut through. Words when Whisper gave them,
// otherwise the segment, which is what splitSegment falls back to.
export function speechIntervals(segments: readonly WhisperSegment[]): SpeechInterval[] {
  const intervals: SpeechInterval[] = [];
  for (const segment of segments) {
    if (segment.words && segment.words.length > 0) {
      for (const word of segment.words) intervals.push({ start_ms: word.start_ms, end_ms: word.end_ms });
      continue;
    }
    intervals.push({ start_ms: segment.start_ms, end_ms: segment.end_ms });
  }
  return intervals;
}

export function edgeIsLegal(intervals: readonly SpeechInterval[], edge_ms: number): boolean {
  return !intervals.some((interval) => interval.start_ms < edge_ms && edge_ms < interval.end_ms);
}

// Nearest legal time to `target`, searching outward. `floor` keeps a grace end from
// being pulled back before the turn that precedes it.
export function nearestLegalEdge(
  intervals: readonly SpeechInterval[],
  target_ms: number,
  maxShift_ms: number,
  floor_ms = 0,
): number | null {
  for (let shift = 0; shift <= maxShift_ms; shift += 1) {
    const later = target_ms + shift;
    const earlier = target_ms - shift;
    if (later >= floor_ms && edgeIsLegal(intervals, later)) return later;
    if (shift > 0 && earlier >= floor_ms && edgeIsLegal(intervals, earlier)) return earlier;
  }
  return null;
}

// A turn end is only legal inside the 30 s allowance; prefer the one closest to 30 s.
export function chooseTurnEnd(intervals: readonly SpeechInterval[], start_ms: number): number | null {
  for (let shift = 0; shift <= TURN_SLACK_MS; shift += 1) {
    const longer = start_ms + IDEAL_TURN_MS + shift;
    const shorter = start_ms + IDEAL_TURN_MS - shift;
    if (edgeIsLegal(intervals, longer)) return longer;
    if (shift > 0 && edgeIsLegal(intervals, shorter)) return shorter;
  }
  return null;
}

export function findStraddles(track: Track, windows: readonly TimelineWindow[]): Straddle[] {
  const edges = [...new Set(windows.flatMap((window) => [window.start_ms, window.end_ms]))];
  const found: Straddle[] = [];
  const cut = (start_ms: number, end_ms: number): number | null =>
    edges.find((edge) => start_ms < edge && edge < end_ms) ?? null;

  track.segments.forEach((segment, segment_index) => {
    if (!segment.words || segment.words.length === 0) {
      const boundary_ms = cut(segment.start_ms, segment.end_ms);
      if (boundary_ms !== null) {
        found.push({
          speaker: track.speaker, segment_index, word_index: null,
          text: segment.text, start_ms: segment.start_ms, end_ms: segment.end_ms, boundary_ms,
        });
      }
      return;
    }
    segment.words.forEach((word, word_index) => {
      const boundary_ms = cut(word.start_ms, word.end_ms);
      if (boundary_ms === null) return;
      found.push({
        speaker: track.speaker, segment_index, word_index,
        text: word.text, start_ms: word.start_ms, end_ms: word.end_ms, boundary_ms,
      });
    });
  });
  return found;
}

// Speech landing in a judged turn that belongs to somebody else. The merger rejects
// it outright and no boundary change can rescue it.
//
// Checked per word, not per segment: splitSegment classifies each word on its own,
// so a segment that begins in its owner's turn and runs past the handover is still
// rejected even though the segment as a whole sits inside no single window.
export function findForeignSpeech(track: Track, windows: readonly TimelineWindow[]): ForeignSpeech[] {
  const found: ForeignSpeech[] = [];
  track.segments.forEach((segment, segment_index) => {
    const units = segment.words && segment.words.length > 0
      ? segment.words
      : [{ start_ms: segment.start_ms, end_ms: segment.end_ms, text: segment.text }];
    for (const unit of units) {
      const window = windows.find(
        (candidate) => unit.start_ms >= candidate.start_ms && unit.end_ms <= candidate.end_ms,
      );
      if (!window?.judged || window.speaker === null || window.speaker === track.speaker) continue;
      found.push({
        speaker: track.speaker, segment_index,
        start_ms: segment.start_ms, end_ms: segment.end_ms, text: segment.text,
        round: window.round ?? 0, belongs_to: window.speaker,
      });
      return;
    }
  });
  return found;
}

export function findHallucinations(track: Track): Hallucination[] {
  const found: Hallucination[] = [];
  track.segments.forEach((segment, segment_index) => {
    const text = normalized(segment.text);
    const duration = segment.end_ms - segment.start_ms;
    let reason: string | null = null;
    if (PUNCTUATION_ONLY.test(segment.text)) reason = "punctuation only";
    else if (KNOWN_HALLUCINATIONS.includes(text)) reason = "known Whisper filler on silence";
    else if (duration < MIN_CREDIBLE_SEGMENT_MS) reason = `implausibly short (${duration} ms)`;
    if (reason === null) return;
    found.push({
      speaker: track.speaker, segment_index,
      start_ms: segment.start_ms, end_ms: segment.end_ms, text: segment.text, reason,
    });
  });
  return found;
}

export type BoundaryRound = {
  number: number;
  domain: string;
  opener: DebateSide;
  for: TimestampRange;
  against: TimestampRange;
  grace: TimestampRange;
};

export type BoundaryDocument = {
  version: 1;
  duration_ms: number;
  intro: TimestampRange;
  rounds: BoundaryRound[];
  outro: TimestampRange;
};

export type Proposal =
  | { ok: true; value: BoundaryDocument; moved: { label: string; from: number; to: number }[] }
  | { ok: false; reason: string };

// Slides each round's judged block until all three of its edges land in gaps,
// keeping every turn inside the 30 s allowance and the programme contiguous. The
// block start is retried progressively later when a round cannot be satisfied,
// which is the manual move the runbook describes.
export function proposeBoundaries(
  boundaries: BoundaryDocument,
  intervals: readonly SpeechInterval[],
): Proposal {
  const moved: { label: string; from: number; to: number }[] = [];
  const note = (label: string, from: number, to: number): void => {
    if (from !== to) moved.push({ label, from, to });
  };

  // A round's block start IS the end of whatever came before it — the intro for
  // round 1, the previous grace otherwise. Choosing the two independently is what
  // opens a hole in the programme, so the preceding phase is closed here, after
  // the start is known, never before.
  const rounds: BoundaryRound[] = [];
  let floor = 1;
  let previousGrace: { round: BoundaryRound; original: number } | null = null;
  let introEnd: number | null = null;

  for (const round of boundaries.rounds) {
    const originalStart = round.opener === "for" ? round.for.start_ms : round.against.start_ms;
    let placed: { blockStart: number; firstEnd: number; secondEnd: number } | null = null;

    for (let shift = 0; shift <= MAX_SHIFT_MS && placed === null; shift += 1) {
      for (const blockStart of [originalStart + shift, originalStart - shift]) {
        if (blockStart < floor || !edgeIsLegal(intervals, blockStart)) continue;
        const firstEnd = chooseTurnEnd(intervals, blockStart);
        if (firstEnd === null) continue;
        const secondEnd = chooseTurnEnd(intervals, firstEnd);
        if (secondEnd === null) continue;
        placed = { blockStart, firstEnd, secondEnd };
        break;
      }
    }

    if (!placed) {
      return {
        ok: false,
        reason: `Round ${round.number}: no placement keeps both turns inside 30 s ±100 ms with every edge in a gap. `
          + "Somebody is speaking across the handover — edit that speech out, or re-cut the round.",
      };
    }

    if (previousGrace === null) {
      introEnd = placed.blockStart;
      note("intro.end_ms", boundaries.intro.end_ms, placed.blockStart);
    } else {
      previousGrace.round.grace = { ...previousGrace.round.grace, end_ms: placed.blockStart };
      note(`round ${previousGrace.round.number} grace end`, previousGrace.original, placed.blockStart);
    }

    const firstRange: TimestampRange = { start_ms: placed.blockStart, end_ms: placed.firstEnd };
    const secondRange: TimestampRange = { start_ms: placed.firstEnd, end_ms: placed.secondEnd };

    note(`round ${round.number} ${round.opener} start`, originalStart, placed.blockStart);
    note(`round ${round.number} turn handover`, round.opener === "for" ? round.for.end_ms : round.against.end_ms, placed.firstEnd);
    note(`round ${round.number} grace start`, round.grace.start_ms, placed.secondEnd);

    const built: BoundaryRound = {
      number: round.number, domain: round.domain, opener: round.opener,
      for: round.opener === "for" ? firstRange : secondRange,
      against: round.opener === "for" ? secondRange : firstRange,
      // Closed by the next round, or by the outro for round 5.
      grace: { start_ms: placed.secondEnd, end_ms: placed.secondEnd + MIN_GRACE_MS },
    };
    rounds.push(built);
    previousGrace = { round: built, original: round.grace.end_ms };
    floor = placed.secondEnd + MIN_GRACE_MS;
  }

  if (introEnd === null || previousGrace === null) return { ok: false, reason: "No rounds to place." };

  const lastGraceEnd = nearestLegalEdge(intervals, Math.max(previousGrace.original, floor), MAX_SHIFT_MS, floor);
  if (lastGraceEnd === null) return { ok: false, reason: "No legal end for the final grace period." };
  previousGrace.round.grace = { ...previousGrace.round.grace, end_ms: lastGraceEnd };
  note(`round ${previousGrace.round.number} grace end`, previousGrace.original, lastGraceEnd);

  if (boundaries.duration_ms <= lastGraceEnd) {
    return { ok: false, reason: `The rounds now end at ${lastGraceEnd} ms, at or past duration_ms ${boundaries.duration_ms}.` };
  }

  return {
    ok: true,
    moved,
    value: {
      version: 1,
      duration_ms: boundaries.duration_ms,
      intro: { start_ms: 0, end_ms: introEnd },
      rounds,
      outro: { start_ms: lastGraceEnd, end_ms: boundaries.duration_ms },
    },
  };
}

function timelineFrom(boundaries: BoundaryDocument): TimelineEntry[] {
  return [
    { type: "intro", ...boundaries.intro },
    ...boundaries.rounds.map((round): TimelineEntry => ({
      type: "round", number: round.number, domain: round.domain, opener: round.opener,
      for: round.for, against: round.against, grace: round.grace,
    })),
    { type: "outro", ...boundaries.outro },
  ];
}

function clock(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms % 1_000).padStart(3, "0")}`;
}

async function readJson(root: string, path: string, label: string): Promise<unknown> {
  return JSON.parse(await readPackageText(root, path, label));
}

function parsedSegments(document: unknown, label: string): WhisperSegment[] {
  const parsed = whisperSegments(document, label);
  if (!parsed.ok) throw new Error(`${label}: ${parsed.errors[0]?.message ?? "unreadable Whisper JSON"}`);
  return parsed.value;
}

export async function preflightPackage(root: string | undefined): Promise<boolean> {
  if (!root || !isAbsolute(root)) throw new Error("Missing absolute video debate package path.");
  const paths = packagePaths(root);
  const boundaries = await readJson(paths.root, paths.boundaries, "metadata/boundaries.json") as BoundaryDocument;

  const tracks: Track[] = [
    { speaker: "host", segments: parsedSegments(await readJson(paths.root, paths.rawHost, "host-isolated"), "transcript/raw/host-isolated.json") },
    { speaker: "for", segments: parsedSegments(await readJson(paths.root, paths.rawFor, "for"), "transcript/raw/for.json") },
    { speaker: "against", segments: parsedSegments(await readJson(paths.root, paths.rawAgainst, "against"), "transcript/raw/against.json") },
  ];

  const windows = timelineWindows(timelineFrom(boundaries));
  const write = (line: string): void => void process.stdout.write(`${line}\n`);

  const straddles = tracks.flatMap((track) => findStraddles(track, windows));
  const foreign = tracks.flatMap((track) => findForeignSpeech(track, windows));
  const hallucinations = tracks.flatMap((track) => findHallucinations(track));

  write(`\n== Boundary straddles (${straddles.length}) — a word the boundary cuts in half`);
  for (const item of straddles) {
    const at = item.word_index === null ? `segment[${item.segment_index}] (no words[])` : `segment[${item.segment_index}].words[${item.word_index}]`;
    write(`  ${item.speaker.padEnd(7)} ${at}  ${JSON.stringify(item.text)}`);
    write(`          spans ${clock(item.start_ms)}→${clock(item.end_ms)}, boundary at ${clock(item.boundary_ms)}`);
  }

  write(`\n== Foreign speech in a judged turn (${foreign.length}) — no boundary change can fix these`);
  for (const item of foreign) {
    write(`  ${item.speaker.padEnd(7)} segment[${item.segment_index}] ${clock(item.start_ms)}→${clock(item.end_ms)} inside round ${item.round} ${item.belongs_to}'s turn`);
    write(`          ${JSON.stringify(item.text.trim().slice(0, 80))}`);
  }

  write(`\n== Probable Whisper hallucinations (${hallucinations.length}) — delete before merging`);
  for (const item of hallucinations) {
    write(`  ${item.speaker.padEnd(7)} segment[${item.segment_index}] ${clock(item.start_ms)}→${clock(item.end_ms)}  ${item.reason}`);
    write(`          ${JSON.stringify(item.text.trim().slice(0, 60))}`);
  }

  const intervals = tracks.flatMap((track) => speechIntervals(track.segments));
  const proposal = proposeBoundaries(boundaries, intervals);
  write("\n== Proposed boundaries");
  if (!proposal.ok) {
    write(`  Could not produce one. ${proposal.reason}`);
  } else if (proposal.moved.length === 0) {
    write("  Every edge already sits in a gap. No change needed.");
  } else {
    for (const move of proposal.moved) {
      write(`  ${move.label.padEnd(28)} ${move.from} → ${move.to}  (${move.to - move.from >= 0 ? "+" : ""}${move.to - move.from} ms)`);
    }
    const target = packageChildPath(paths.root, "metadata/boundaries.proposed.json");
    await assertPackageOutputPath(paths.root, target, "metadata/boundaries.proposed.json");
    await writeJsonAtomic(target, proposal.value);
    write(`\n  Written to metadata/boundaries.proposed.json — review it, then replace boundaries.json yourself.`);
  }

  const blocking = straddles.length + foreign.length;
  write(`\n${blocking === 0 ? "No blocking problems." : `${blocking} blocking problem(s); ${hallucinations.length} suspected hallucination(s).`}`);
  write("Foreign speech and hallucinations are content problems: edit the raw JSON. Straddles are fixed by the proposal above.\n");
  return blocking === 0;
}

async function main(): Promise<void> {
  const clean = await preflightPackage(process.argv[2]);
  process.exitCode = clean ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Preflight failed."}\n`);
    process.exitCode = 1;
  });
}
