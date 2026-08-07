import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { renderWebVtt } from "../../src/video-debates/captions.logic.js";
import { mergeWhisperTranscripts } from "../../src/video-debates/transcript.logic.js";
import type { DebateSide, TimelineEntry, TimestampRange, TranscriptSegment } from "../../src/video-debates/manifest.types.js";
import { writeJsonAtomic, writeTextAtomic } from "./io.js";
import { assertPackageOutputPath, packagePaths, readPackageText } from "./paths.js";

type UnknownRecord = Record<string, unknown>;

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function range(value: unknown): TimestampRange | null {
  const record = object(value);
  if (!record) return null;
  const start_ms = integer(record.start_ms);
  const end_ms = integer(record.end_ms);
  return start_ms === null || end_ms === null || start_ms < 0 || end_ms <= start_ms
    ? null
    : { start_ms, end_ms };
}

function side(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function boundaryTimeline(document: unknown): TimelineEntry[] | null {
  const root = object(document);
  const duration_ms = root ? integer(root.duration_ms) : null;
  if (!root || root.version !== 1 || duration_ms === null || duration_ms <= 0 || !Array.isArray(root.rounds) || root.rounds.length !== 5) return null;
  const intro = range(root.intro);
  const outro = range(root.outro);
  if (!intro || !outro || intro.start_ms !== 0) return null;
  const timeline: TimelineEntry[] = [{ type: "intro", ...intro }];
  let cursor = intro.end_ms;
  for (let index = 0; index < root.rounds.length; index += 1) {
    const rawRound = root.rounds[index];
    const record = object(rawRound);
    if (!record) return null;
    const number = integer(record.number);
    const domain = typeof record.domain === "string" ? record.domain : null;
    const opener = side(record.opener);
    const forRange = range(record.for);
    const against = range(record.against);
    const grace = range(record.grace);
    if (number === null || number !== index + 1 || domain === null || domain.trim().length === 0 || opener === null || !forRange || !against || !grace) return null;
    const firstTurn = opener === "for" ? forRange : against;
    const secondTurn = opener === "for" ? against : forRange;
    if (firstTurn.start_ms !== cursor || firstTurn.end_ms !== secondTurn.start_ms || secondTurn.end_ms !== grace.start_ms) return null;
    timeline.push({ type: "round", number, domain, opener, for: forRange, against, grace });
    cursor = grace.end_ms;
  }
  if (outro.start_ms !== cursor || outro.end_ms !== duration_ms) return null;
  timeline.push({ type: "outro", ...outro });
  return timeline;
}

async function readJson(root: string, path: string, label: string): Promise<unknown> {
  let source: string;
  try {
    source = await readPackageText(root, path, label);
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Could not read ${label}.`);
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(`Could not parse JSON in ${label}.`);
  }
}

function logCounts(segments: readonly TranscriptSegment[]): void {
  const speakers = { host: 0, for: 0, against: 0 };
  const phases = { intro: 0, judged: 0, grace: 0, outro: 0 };
  for (const segment of segments) {
    speakers[segment.speaker] += 1;
    phases[segment.phase] += 1;
  }
  process.stdout.write(`Merged ${segments.length} segments. speakers=${JSON.stringify(speakers)} phases=${JSON.stringify(phases)}\n`);
}

export async function mergeTranscriptPackage(root: string | undefined): Promise<TranscriptSegment[]> {
  if (!root || !isAbsolute(root)) throw new Error("Missing absolute video debate package path.");
  const paths = packagePaths(root);
  const timeline = boundaryTimeline(await readJson(paths.root, paths.boundaries, "metadata/boundaries.json"));
  if (!timeline) throw new Error("metadata/boundaries.json does not match the V1 boundary shape.");
  const result = mergeWhisperTranscripts([
    { speaker: "host", document: await readJson(paths.root, paths.rawHost, "transcript/raw/host-isolated.json") },
    { speaker: "for", document: await readJson(paths.root, paths.rawFor, "transcript/raw/for.json") },
    { speaker: "against", document: await readJson(paths.root, paths.rawAgainst, "transcript/raw/against.json") },
  ], timeline);
  if (!result.ok) {
    for (const error of result.errors) process.stderr.write(`${error.code} ${error.path}: ${error.message}\n`);
    throw new Error("Transcript merge validation failed.");
  }
  const captions = renderWebVtt(result.value);
  await assertPackageOutputPath(paths.root, paths.transcript, "transcript/transcript.json");
  await assertPackageOutputPath(paths.root, paths.captions, "output/captions.vtt");
  await writeJsonAtomic(paths.transcript, result.value);
  await writeTextAtomic(paths.captions, captions);
  logCounts(result.value);
  return result.value;
}

async function main(): Promise<void> {
  await mergeTranscriptPackage(process.argv[2]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Transcript merge failed."}\n`);
    process.exitCode = 1;
  });
}
