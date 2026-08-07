// Assembles and validates the canonical local video-debate submission manifest.

import { pathToFileURL } from "node:url";
import { validateSubmissionV1 } from "../../src/video-debates/manifest.logic.js";
import { compareTranscriptSegments } from "../../src/video-debates/transcript.logic.js";
import type {
  DebateSide,
  ValidationIssue,
  VideoDebateSubmissionV1,
} from "../../src/video-debates/manifest.types.js";
import { writeJsonAtomic } from "./io.js";
import {
  assertPackageOutputPath,
  PackagePathError,
  packagePaths,
  readPackageText,
  type VideoDebatePackagePaths,
} from "./paths.js";

type UnknownRecord = Record<string, unknown>;

type ExpectedSubmission = {
  domains: Array<{ id: number; name: string }>;
  roundOneOpener: DebateSide;
};

type PackageSources = {
  debate: unknown;
  boundaries: unknown;
  mediaProbes: unknown;
  transcript: unknown;
  judgment: unknown;
};

export class PackageValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super("Video debate package validation failed.");
  }
}

function fail(code: string, path: string, message: string): never {
  throw new PackageValidationError([{ code, path, message }]);
}

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function side(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function expectedSubmission(raw: unknown): ExpectedSubmission {
  const metadata = object(raw);
  if (!metadata || metadata.version !== 1 || !Array.isArray(metadata.rounds) || metadata.rounds.length !== 5) {
    return fail("invalid_shape", "metadata/debate.json", "Draft metadata does not match the V1 shape.");
  }
  const domains: ExpectedSubmission["domains"] = [];
  const domainIds = new Set<number>();
  let roundOneOpener: DebateSide | null = null;
  for (let index = 0; index < metadata.rounds.length; index += 1) {
    const round = object(metadata.rounds[index]);
    const number = round ? integer(round.number) : null;
    const domainId = round ? integer(round.domain_id) : null;
    const domain = round && typeof round.domain === "string" && round.domain.trim().length > 0
      ? round.domain
      : null;
    const opener = round ? side(round.opener) : null;
    if (number !== index + 1 || domainId === null || domainId <= 0 || !domain || !opener || domainIds.has(domainId)) {
      return fail("invalid_shape", `metadata/debate.json.rounds[${index}]`, "Draft round metadata does not match the V1 shape.");
    }
    if (roundOneOpener === null) roundOneOpener = opener;
    const expectedOpener = index % 2 === 0
      ? roundOneOpener
      : roundOneOpener === "for" ? "against" : "for";
    if (opener !== expectedOpener) {
      return fail("opener_alternation", `metadata/debate.json.rounds[${index}].opener`, "Draft round openers must alternate from Round 1.");
    }
    domainIds.add(domainId);
    domains.push({ id: domainId, name: domain });
  }
  if (roundOneOpener === null) {
    return fail("invalid_shape", "metadata/debate.json.rounds", "Draft metadata must contain five rounds.");
  }
  return { domains, roundOneOpener };
}

function rangeCandidate(value: unknown): UnknownRecord {
  const range = object(value);
  return {
    start_ms: range?.start_ms,
    end_ms: range?.end_ms,
  };
}

function mediaCandidate(value: unknown): UnknownRecord {
  const media = object(value);
  return {
    duration_ms: media?.duration_ms,
    byte_length: media?.byte_length,
    video_codec: media?.video_codec,
    video_profile: media?.video_profile,
    width: media?.width,
    height: media?.height,
    pixel_format: media?.pixel_format,
    frame_rate: media?.frame_rate,
    video_bitrate_bps: media?.video_bitrate_bps,
    max_keyframe_interval_ms: media?.max_keyframe_interval_ms,
    faststart: media?.faststart,
    audio_codec: media?.audio_codec,
    audio_sample_rate_hz: media?.audio_sample_rate_hz,
  };
}

function posterCandidate(value: unknown): UnknownRecord {
  const poster = object(value);
  return {
    format: poster?.format,
    width: poster?.width,
    height: poster?.height,
    byte_length: poster?.byte_length,
  };
}

function roundTimelineCandidate(value: unknown): UnknownRecord {
  const round = object(value);
  return {
    type: "round",
    number: round?.number,
    domain: round?.domain,
    opener: round?.opener,
    for: rangeCandidate(round?.for),
    against: rangeCandidate(round?.against),
    grace: rangeCandidate(round?.grace),
  };
}

function timelineCandidate(value: unknown): unknown {
  const boundaries = object(value);
  if (!boundaries || !Array.isArray(boundaries.rounds)) return boundaries?.rounds;
  return [
    { type: "intro", ...rangeCandidate(boundaries.intro) },
    ...boundaries.rounds.map(roundTimelineCandidate),
    { type: "outro", ...rangeCandidate(boundaries.outro) },
  ];
}

function transcriptCandidate(value: unknown): UnknownRecord {
  const segment = object(value);
  return {
    id: segment?.id,
    speaker: segment?.speaker,
    start_ms: segment?.start_ms,
    end_ms: segment?.end_ms,
    text: segment?.text,
    phase: segment?.phase,
    round: segment?.round,
    judged: segment?.judged,
  };
}

function pointCandidate(value: unknown): UnknownRecord {
  const point = object(value);
  return {
    segment_id: point?.segment_id,
    text: point?.text,
  };
}

function pointsCandidate(value: unknown): UnknownRecord {
  const points = object(value);
  return {
    for: Array.isArray(points?.for) ? points.for.map(pointCandidate) : points?.for,
    against: Array.isArray(points?.against) ? points.against.map(pointCandidate) : points?.against,
  };
}

function roundResultCandidate(value: unknown): UnknownRecord {
  const round = object(value);
  return {
    number: round?.number,
    winner: round?.winner,
    for_score: round?.for_score,
    against_score: round?.against_score,
    ruling: round?.ruling,
    points: pointsCandidate(round?.points),
  };
}

function finalCandidate(value: unknown): UnknownRecord {
  const final = object(value);
  const roundScore = object(final?.round_score);
  return {
    winner: final?.winner,
    round_score: {
      for: roundScore?.for,
      against: roundScore?.against,
    },
    crux: final?.crux,
    verdict: final?.verdict,
  };
}

export function assembleSubmissionV1(sources: PackageSources): unknown {
  const boundaries = object(sources.boundaries);
  const media = object(sources.mediaProbes);
  const judgment = object(sources.judgment);
  return {
    version: 1,
    duration_ms: boundaries?.duration_ms,
    media: {
      host: mediaCandidate(media?.host),
      for: mediaCandidate(media?.for),
      against: mediaCandidate(media?.against),
      poster: posterCandidate(media?.poster),
    },
    timeline: timelineCandidate(sources.boundaries),
    transcript: Array.isArray(sources.transcript)
      ? sources.transcript.map(transcriptCandidate)
      : sources.transcript,
    rounds: Array.isArray(judgment?.rounds)
      ? judgment.rounds.map(roundResultCandidate)
      : judgment?.rounds,
    final: finalCandidate(judgment?.final),
  };
}

export async function readJsonArtifact(root: string, path: string, label: string): Promise<unknown> {
  let source: string;
  try {
    source = await readPackageText(root, path, label);
  } catch (error) {
    if (error instanceof PackagePathError) throw new PackageValidationError([error.issue]);
    return fail("file_read", label, "Could not read the required JSON artifact.");
  }
  try {
    return JSON.parse(source);
  } catch {
    return fail("invalid_json", label, "Artifact is not valid JSON.");
  }
}

export function resolvePackagePaths(root: string | undefined): VideoDebatePackagePaths {
  if (!root) return fail("package_path", "$", "Missing absolute video debate package path.");
  try {
    return packagePaths(root);
  } catch {
    return fail("package_path", "$", "Video debate package path must be absolute and safe.");
  }
}

export async function packageExpectation(paths: VideoDebatePackagePaths): Promise<ExpectedSubmission> {
  return expectedSubmission(await readJsonArtifact(paths.root, paths.debate, "metadata/debate.json"));
}

async function readSources(paths: VideoDebatePackagePaths): Promise<PackageSources> {
  return {
    debate: await readJsonArtifact(paths.root, paths.debate, "metadata/debate.json"),
    boundaries: await readJsonArtifact(paths.root, paths.boundaries, "metadata/boundaries.json"),
    mediaProbes: await readJsonArtifact(paths.root, paths.mediaProbes, "metadata/media-probes.json"),
    transcript: await readJsonArtifact(paths.root, paths.transcript, "transcript/transcript.json"),
    judgment: await readJsonArtifact(paths.root, paths.judgment, "judgment/judgment.json"),
  };
}

export async function buildManifestPackage(root: string | undefined): Promise<VideoDebateSubmissionV1> {
  const paths = resolvePackagePaths(root);
  const sources = await readSources(paths);
  const expected = expectedSubmission(sources.debate);
  const validation = validateSubmissionV1(assembleSubmissionV1(sources), expected);
  if (!validation.ok) throw new PackageValidationError(validation.errors);
  const canonical = validateSubmissionV1({
    ...validation.value,
    transcript: [...validation.value.transcript].sort(compareTranscriptSegments),
  }, expected);
  if (!canonical.ok) throw new PackageValidationError(canonical.errors);
  try {
    await assertPackageOutputPath(paths.root, paths.manifest, "output/manifest.json");
  } catch (error) {
    if (error instanceof PackagePathError) throw new PackageValidationError([error.issue]);
    return fail("package_path", "output/manifest.json", "Manifest output must stay inside the package root without symbolic links.");
  }
  await writeJsonAtomic(paths.manifest, canonical.value);
  return canonical.value;
}

export function packageIssues(error: unknown): ValidationIssue[] {
  return error instanceof PackageValidationError
    ? error.issues
    : [{ code: "package_error", path: "$", message: error instanceof Error ? error.message : "Video debate package failed." }];
}

export function printPackageIssues(error: unknown): void {
  for (const item of packageIssues(error)) {
    process.stderr.write(`${item.code} ${item.path}: ${item.message}\n`);
  }
}

async function main(): Promise<void> {
  const manifest = await buildManifestPackage(process.argv[2]);
  process.stdout.write(`Built V${manifest.version} manifest with ${manifest.rounds.length} rounds and ${manifest.transcript.length} transcript segments.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    printPackageIssues(error);
    process.exitCode = 1;
  });
}
