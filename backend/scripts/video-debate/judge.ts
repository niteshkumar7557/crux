// Validates a local debate package, runs the isolated judge, and atomically records its outputs.

import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { validateSubmissionV1 } from "../../src/video-debates/manifest.logic.js";
import type {
  DebateSide,
  RoundTimeline,
  TimelineEntry,
  VideoDebateDraftMetadataV1,
} from "../../src/video-debates/manifest.types.js";
import {
  runJudgment,
  type JudgmentAttempt,
  type JudgmentOutput,
} from "../../src/video-debates/judgment.logic.js";
import { writeJsonAtomic } from "./io.js";
import {
  assertPackageOutputPath,
  packageChildPath,
  packagePaths,
  readPackageText,
  type VideoDebatePackagePaths,
} from "./paths.js";
import { callJson, type JsonRequest } from "./provider.js";

type UnknownRecord = Record<string, unknown>;
type JsonCaller = (request: JsonRequest) => ReturnType<typeof callJson>;

const LOCAL_ROUND_MAX_TOKENS = 3_000;
const LOCAL_CLOSING_MAX_TOKENS = 1_000;

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function side(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function metadata(value: unknown): VideoDebateDraftMetadataV1 | null {
  const root = object(value);
  if (!root || root.version !== 1) return null;
  const draft_id = text(root.draft_id);
  const media_id = text(root.media_id);
  const motion = text(root.motion);
  const slug = text(root.slug);
  if (!draft_id || !media_id || !motion || !slug || !Array.isArray(root.participants) || root.participants.length !== 3 || !Array.isArray(root.rounds) || root.rounds.length !== 5) return null;

  const participants: VideoDebateDraftMetadataV1["participants"] = [];
  const roles = new Set<string>();
  for (const value of root.participants) {
    const participant = object(value);
    const role = participant && (participant.role === "host" || participant.role === "for" || participant.role === "against")
      ? participant.role
      : null;
    const display_name = participant ? text(participant.display_name) : null;
    const avatar_url = participant?.avatar_url === null || typeof participant?.avatar_url === "string"
      ? participant.avatar_url
      : undefined;
    const username = participant?.username;
    if (!role || !display_name || avatar_url === undefined || (username !== undefined && typeof username !== "string") || roles.has(role)) return null;
    roles.add(role);
    participants.push({
      role,
      display_name,
      avatar_url,
      ...(typeof username === "string" ? { username } : {}),
    });
  }
  if (roles.size !== 3) return null;

  const rounds: VideoDebateDraftMetadataV1["rounds"] = [];
  const domains = new Set<number>();
  for (let index = 0; index < root.rounds.length; index += 1) {
    const value = object(root.rounds[index]);
    const number = value ? integer(value.number) : null;
    const domain_id = value ? integer(value.domain_id) : null;
    const domain = value ? text(value.domain) : null;
    const opener = value ? side(value.opener) : null;
    if (number !== index + 1 || domain_id === null || domain_id <= 0 || !domain || !opener || domains.has(domain_id)) return null;
    if (index > 0) {
      const firstOpener = rounds[0]!.opener;
      const expectedOpener = index % 2 === 0
        ? firstOpener
        : firstOpener === "for" ? "against" : "for";
      if (opener !== expectedOpener) return null;
    }
    domains.add(domain_id);
    rounds.push({ number, domain_id, domain, opener });
  }
  return { version: 1, draft_id, media_id, motion, slug, participants, rounds };
}

function range(value: unknown): { start_ms: number; end_ms: number } | null {
  const record = object(value);
  const start_ms = record ? integer(record.start_ms) : null;
  const end_ms = record ? integer(record.end_ms) : null;
  return start_ms === null || end_ms === null ? null : { start_ms, end_ms };
}

function boundaries(value: unknown): { duration_ms: number; timeline: TimelineEntry[] } | null {
  const root = object(value);
  const duration_ms = root ? integer(root.duration_ms) : null;
  if (!root || root.version !== 1 || duration_ms === null || !Array.isArray(root.rounds) || root.rounds.length !== 5) return null;
  const intro = range(root.intro);
  const outro = range(root.outro);
  if (!intro || !outro) return null;
  const timeline: TimelineEntry[] = [{ type: "intro", ...intro }];
  for (const value of root.rounds) {
    const record = object(value);
    const number = record ? integer(record.number) : null;
    const domain = record ? text(record.domain) : null;
    const opener = record ? side(record.opener) : null;
    const forRange = record ? range(record.for) : null;
    const against = record ? range(record.against) : null;
    const grace = record ? range(record.grace) : null;
    if (number === null || !domain || !opener || !forRange || !against || !grace) return null;
    timeline.push({ type: "round", number, domain, opener, for: forRange, against, grace });
  }
  timeline.push({ type: "outro", ...outro });
  return { duration_ms, timeline };
}

function mediaProbe(duration_ms: number) {
  return {
    duration_ms,
    byte_length: 1,
    video_codec: "h264",
    video_profile: "High",
    width: 1280,
    height: 720,
    pixel_format: "yuv420p",
    frame_rate: "30/1",
    video_bitrate_bps: 2_500_000,
    max_keyframe_interval_ms: 2_000,
    faststart: true,
    audio_codec: "aac",
    audio_sample_rate_hz: 48_000,
  };
}

async function readJson(paths: VideoDebatePackagePaths, path: string, label: string): Promise<unknown> {
  let source: string;
  try {
    source = await readPackageText(paths.root, path, label);
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Could not read ${label}.`);
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(`Could not parse JSON in ${label}.`);
  }
}

async function judgmentInput(paths: VideoDebatePackagePaths) {
  const debate = metadata(await readJson(paths, paths.debate, "metadata/debate.json"));
  if (!debate) throw new Error("metadata/debate.json does not match the V1 draft metadata shape.");
  const boundaryDocument = boundaries(await readJson(paths, paths.boundaries, "metadata/boundaries.json"));
  if (!boundaryDocument) throw new Error("metadata/boundaries.json does not match the V1 boundary shape.");
  for (let index = 0; index < debate.rounds.length; index += 1) {
    const timelineRound = boundaryDocument.timeline[index + 1];
    const metadataRound = debate.rounds[index];
    if (!timelineRound || timelineRound.type !== "round" || !metadataRound || timelineRound.number !== metadataRound.number || timelineRound.domain !== metadataRound.domain || timelineRound.opener !== metadataRound.opener) {
      throw new Error(`metadata/boundaries.json round ${index + 1} does not match metadata/debate.json.`);
    }
  }
  const transcript = await readJson(paths, paths.transcript, "transcript/transcript.json");
  const pendingRounds = debate.rounds.map((round) => ({
    number: round.number,
    winner: "for",
    for_score: 60,
    against_score: 40,
    ruling: "Pending local judgment.",
    points: { for: [], against: [] },
  }));
  const validation = validateSubmissionV1({
    version: 1,
    duration_ms: boundaryDocument.duration_ms,
    media: {
      host: mediaProbe(boundaryDocument.duration_ms),
      for: mediaProbe(boundaryDocument.duration_ms),
      against: mediaProbe(boundaryDocument.duration_ms),
      poster: { format: "webp", width: 1600, height: 900, byte_length: 1 },
    },
    timeline: boundaryDocument.timeline,
    transcript,
    rounds: pendingRounds,
    final: {
      winner: "for",
      round_score: { for: 5, against: 0 },
      crux: "Pending local judgment.",
      verdict: "Pending local judgment.",
    },
  }, {
    domains: debate.rounds.map((round) => ({ id: round.domain_id, name: round.domain })),
    roundOneOpener: debate.rounds[0]!.opener,
  });
  if (!validation.ok) {
    const first = validation.errors[0];
    throw new Error(first ? `${first.code} ${first.path}: ${first.message}` : "Video judge input validation failed.");
  }
  return { motion: debate.motion, timeline: validation.value.timeline, transcript: validation.value.transcript };
}

function attemptArtifact(attempt: JudgmentAttempt): string {
  if (attempt.round === "closing") return `judgment/raw/closing-${String(attempt.attempt).padStart(2, "0")}.json`;
  return `judgment/raw/round-${String(attempt.round).padStart(2, "0")}-${attempt.kind}-${String(attempt.attempt).padStart(2, "0")}.json`;
}

async function writeAttempt(paths: VideoDebatePackagePaths, attempt: JudgmentAttempt): Promise<void> {
  const artifact = attemptArtifact(attempt);
  const path = packageChildPath(paths.root, artifact);
  await assertPackageOutputPath(paths.root, path, artifact);
  await writeJsonAtomic(path, {
    round: attempt.round,
    kind: attempt.kind,
    timestamp: attempt.timestamp,
    duration_ms: attempt.duration_ms,
    raw: attempt.raw,
    parsed: attempt.parsed,
    issues: attempt.issues,
    usage: attempt.usage ?? null,
  });
}

export async function judgePackage(root: string | undefined, provider: JsonCaller = callJson): Promise<JudgmentOutput> {
  if (!root || !isAbsolute(root)) throw new Error("Missing absolute video debate package path.");
  const paths = packagePaths(root);
  const input = await judgmentInput(paths);
  await assertPackageOutputPath(paths.root, paths.judgment, "judgment/judgment.json");
  const output = await runJudgment(
    (request) => provider({
      system: request.system,
      user: request.user,
      maxTokens: request.decision === "round" ? LOCAL_ROUND_MAX_TOKENS : LOCAL_CLOSING_MAX_TOKENS,
    }),
    input,
    (attempt) => writeAttempt(paths, attempt),
  );
  await writeJsonAtomic(paths.judgment, output);
  return output;
}

async function main(): Promise<void> {
  const output = await judgePackage(process.argv[2]);
  process.stdout.write(`Judged ${output.rounds.length} rounds; winner=${output.final.winner} score=${output.final.round_score.for}-${output.final.round_score.against}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Video judgment failed."}\n`);
    process.exitCode = 1;
  });
}
