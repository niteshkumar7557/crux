import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { writeJsonAtomic } from "./io.js";
import { assertPackageInputPath, packagePaths, readPackageText } from "./paths.js";

// Whisper derives a segment's start/end from the decoder's token alignment but its
// word timestamps from a separate cross-attention alignment, so the two disagree by
// up to a few hundred milliseconds at the edges of a segment. The merge validator
// requires every word to lie inside its own segment, which real whisper output does
// not guarantee, so the pipeline reconciles the two before the contract sees them.
//
// Only widening is allowed. A segment's span grows to cover the words it already
// contains; no word is moved and no speech is ever cut out of a segment. That keeps
// the widened span more truthful than the one whisper declared, and leaves the
// merger's boundary splitting working off untouched word timestamps.
//
// Whisper also emits zero-duration words for very short tokens, which the contract
// reads as an unusable timestamp. Those get the smallest span the format can express
// rather than being dropped, because a dropped word takes its segment down with it.

type UnknownRecord = Record<string, unknown>;

// One millisecond: the resolution the merge contract rounds to.
const MIN_SPAN_SECONDS = 0.001;

export interface NormalizationReport {
  segments: number;
  adjusted: number;
  wordsRepaired: number;
}

export interface NormalizedDocument {
  document: unknown;
  report: NormalizationReport;
}

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function seconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// The validator compares rounded milliseconds, so the comparison here has to round
// the same way. The chosen bound is written back as the original number rather than
// a recomputed one, so normalization never introduces float noise of its own.
function milliseconds(value: number): number {
  return Math.round(value * 1_000);
}

function alignSegment(value: unknown): { segment: unknown; adjusted: boolean; wordsRepaired: number } {
  const unchanged = { segment: value, adjusted: false, wordsRepaired: 0 };
  const segment = object(value);
  if (!segment) return unchanged;
  const start = seconds(segment.start);
  const end = seconds(segment.end);
  if (start === null || end === null) return unchanged;

  let wordsRepaired = 0;
  let earliest = start;
  let latest = end;
  const words = Array.isArray(segment.words)
    ? segment.words.map((rawWord) => {
      const word = object(rawWord);
      if (!word) return rawWord;
      const wordStart = seconds(word.start);
      let wordEnd = seconds(word.end);
      if (wordStart === null || wordEnd === null) return rawWord;
      if (milliseconds(wordEnd) <= milliseconds(wordStart)) {
        wordEnd = wordStart + MIN_SPAN_SECONDS;
        wordsRepaired += 1;
      }
      if (milliseconds(wordStart) < milliseconds(earliest)) earliest = wordStart;
      if (milliseconds(wordEnd) > milliseconds(latest)) latest = wordEnd;
      return wordEnd === word.end ? rawWord : { ...word, end: wordEnd };
    })
    : null;

  // A wordless segment has nothing to widen towards, so give it the minimum span.
  if (words === null && milliseconds(end) <= milliseconds(start)) {
    return { segment: { ...segment, end: start + MIN_SPAN_SECONDS }, adjusted: true, wordsRepaired: 0 };
  }
  if (words === null || (earliest === start && latest === end && wordsRepaired === 0)) return unchanged;
  return { segment: { ...segment, start: earliest, end: latest, words }, adjusted: true, wordsRepaired };
}

export function alignSegmentBoundsToWords(document: unknown): NormalizedDocument | null {
  const root = object(document);
  if (!root || !Array.isArray(root.segments)) return null;
  let adjusted = 0;
  let wordsRepaired = 0;
  const segments = root.segments.map((value) => {
    const result = alignSegment(value);
    if (result.adjusted) adjusted += 1;
    wordsRepaired += result.wordsRepaired;
    return result.segment;
  });
  return { document: { ...root, segments }, report: { segments: segments.length, adjusted, wordsRepaired } };
}

async function normalizeFile(root: string, path: string, label: string): Promise<NormalizationReport> {
  await assertPackageInputPath(root, path, label);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readPackageText(root, path, label));
  } catch (error) {
    throw error instanceof Error && !(error instanceof SyntaxError)
      ? error
      : new Error(`Could not parse JSON in ${label}.`);
  }
  const normalized = alignSegmentBoundsToWords(parsed);
  if (!normalized) throw new Error(`${label} does not contain a whisper segments array.`);
  if (normalized.report.adjusted > 0) await writeJsonAtomic(path, normalized.document);
  process.stdout.write(`${label}: ${normalized.report.adjusted} of ${normalized.report.segments} segments adjusted, ${normalized.report.wordsRepaired} zero-duration words repaired.\n`);
  return normalized.report;
}

export async function normalizeTranscriptPackage(root: string | undefined): Promise<NormalizationReport> {
  if (!root || !isAbsolute(root)) throw new Error("Missing absolute video debate package path.");
  const paths = packagePaths(root);
  const reports = [
    await normalizeFile(paths.root, paths.rawHost, "transcript/raw/host-isolated.json"),
    await normalizeFile(paths.root, paths.rawFor, "transcript/raw/for.json"),
    await normalizeFile(paths.root, paths.rawAgainst, "transcript/raw/against.json"),
  ];
  return reports.reduce(
    (total, report) => ({
      segments: total.segments + report.segments,
      adjusted: total.adjusted + report.adjusted,
      wordsRepaired: total.wordsRepaired + report.wordsRepaired,
    }),
    { segments: 0, adjusted: 0, wordsRepaired: 0 },
  );
}

async function main(): Promise<void> {
  await normalizeTranscriptPackage(process.argv[2]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Transcript normalization failed."}\n`);
    process.exitCode = 1;
  });
}
