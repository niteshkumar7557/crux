// The gatekeeper for a submitted programme.
//
// A manifest arrives as untrusted JSON from the local pipeline, and everything
// downstream — playback, judging, publication — assumes it is well formed. This
// checks that assumption once, here, field by field, and refuses anything it
// cannot vouch for.

import type {
  DebateSide,
  FinalExplanation,
  IntroTimeline,
  MediaProbe,
  OutroTimeline,
  PlaybackManifestV1,
  Point,
  PosterProbe,
  RoundResult,
  RoundTimeline,
  TimestampRange,
  TranscriptPhase,
  TranscriptSegment,
  ValidationResult,
  VideoDebateSubmissionV1,
} from "./manifest.types.js";

type ExpectedSubmission = {
  domains: readonly { id: number; name: string }[];
  roundOneOpener: DebateSide;
};

type UnknownRecord = Record<string, unknown>;

export type MediaProbeFacts = {
  duration_ms: number;
  byte_length: number;
  video_codec: string;
  video_profile: string;
  width: number;
  height: number;
  pixel_format: string;
  frame_rate: string;
  video_bitrate_bps: number;
  max_keyframe_interval_ms: number;
  faststart: boolean;
  audio_codec: string;
  audio_sample_rate_hz: number;
};

export type PosterProbeFacts = {
  format: string;
  width: number;
  height: number;
  byte_length: number;
};

const MAX_DURATION_MS = 600_000;
const MIN_JUDGED_TURN_MS = 29_900;
const MAX_JUDGED_TURN_MS = 30_100;
const MAX_TRANSCRIPT_SEGMENTS = 2_000;
const MAX_SEGMENT_ID_LENGTH = 64;
const MAX_TRANSCRIPT_TEXT_LENGTH = 1_000;
const MAX_POINT_TEXT_LENGTH = 180;
const MAX_RULING_LENGTH = 280;
const MAX_CRUX_LENGTH = 280;
const MAX_VERDICT_LENGTH = 700;
const MAX_POINTS_PER_SIDE = 4;
const H264_VIDEO_PROFILES = new Set([
  "Constrained Baseline", "Baseline", "Extended", "Main", "High", "High 10", "High 10 Intra",
  "High 4:2:2", "High 4:2:2 Intra", "High 4:4:4", "High 4:4:4 Predictive", "High 4:4:4 Intra",
  "CAVLC 4:4:4", "Scalable Baseline", "Scalable High", "Scalable High Intra", "Multiview High",
  "Stereo High", "Multiview Depth High", "Multiview Depth High Intra", "Enhanced Multiview Depth High",
]);

const issue = <T>(code: string, path: string, message: string): ValidationResult<T> => ({
  ok: false,
  errors: [{ code, path, message }],
});

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function array(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function rationalFrameRate(value: string): boolean {
  const match = /^(\d+)\/(\d+)$/.exec(value);
  if (!match) return false;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator) && numerator > 0 && denominator > 0;
}

function h264VideoProfile(value: string): boolean {
  return H264_VIDEO_PROFILES.has(value);
}

function side(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function exactKeys(record: UnknownRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function range(value: unknown): TimestampRange | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["start_ms", "end_ms"])) return null;
  const start_ms = integer(record.start_ms);
  const end_ms = integer(record.end_ms);
  return start_ms === null || end_ms === null ? null : { start_ms, end_ms };
}

function mediaProbe(value: unknown): MediaProbeFacts | null {
  const record = object(value);
  if (!record || !exactKeys(record, [
    "duration_ms", "byte_length", "video_codec", "video_profile", "width", "height",
    "pixel_format", "frame_rate", "video_bitrate_bps", "max_keyframe_interval_ms",
    "faststart", "audio_codec", "audio_sample_rate_hz",
  ])) return null;
  const duration_ms = integer(record.duration_ms);
  const byte_length = integer(record.byte_length);
  const video_profile = string(record.video_profile);
  const frame_rate = string(record.frame_rate);
  const video_bitrate_bps = integer(record.video_bitrate_bps);
  const max_keyframe_interval_ms = integer(record.max_keyframe_interval_ms);
  const video_codec = string(record.video_codec);
  const pixel_format = string(record.pixel_format);
  const audio_codec = string(record.audio_codec);
  const audio_sample_rate_hz = integer(record.audio_sample_rate_hz);
  const width = integer(record.width);
  const height = integer(record.height);
  if (
    duration_ms === null || byte_length === null || video_profile === null || frame_rate === null ||
    video_bitrate_bps === null || max_keyframe_interval_ms === null || video_codec === null ||
    pixel_format === null || audio_codec === null || audio_sample_rate_hz === null ||
    typeof record.faststart !== "boolean" || width === null || height === null
  ) return null;
  return {
    duration_ms, byte_length, video_codec, video_profile, width, height,
    pixel_format, frame_rate, video_bitrate_bps, max_keyframe_interval_ms,
    faststart: record.faststart, audio_codec, audio_sample_rate_hz,
  };
}

function acceptedMediaProbe(probe: MediaProbeFacts): MediaProbe {
  return {
    duration_ms: probe.duration_ms, byte_length: probe.byte_length, video_codec: "h264", video_profile: probe.video_profile,
    width: 1280, height: 720, pixel_format: "yuv420p", frame_rate: probe.frame_rate,
    video_bitrate_bps: probe.video_bitrate_bps, max_keyframe_interval_ms: probe.max_keyframe_interval_ms,
    faststart: true, audio_codec: "aac", audio_sample_rate_hz: 48_000,
  };
}

function posterProbe(value: unknown): PosterProbeFacts | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["format", "width", "height", "byte_length"])) return null;
  const byte_length = integer(record.byte_length);
  const format = string(record.format);
  const width = integer(record.width);
  const height = integer(record.height);
  return byte_length === null || format === null || width === null || height === null
    ? null
    : { format, width, height, byte_length };
}

export type MediaPackageFacts = {
  host: MediaProbeFacts;
  for: MediaProbeFacts;
  against: MediaProbeFacts;
  poster: PosterProbeFacts;
};

export type ValidatedMediaPackage = {
  host: MediaProbe;
  for: MediaProbe;
  against: MediaProbe;
  poster: PosterProbe;
};

export function validateMediaPackageV1(media: MediaPackageFacts): ValidationResult<ValidatedMediaPackage> {
  const tracks: Array<["host" | "for" | "against", MediaProbeFacts]> = [
    ["host", media.host], ["for", media.for], ["against", media.against],
  ];
  for (const [role, probe] of tracks) {
    const path = `media.${role}`;
    if (probe.video_codec !== "h264" || probe.width !== 1280 || probe.height !== 720 || probe.pixel_format !== "yuv420p") return issue("media_video", path, "All media must be 1280x720 H.264 yuv420p video.");
    if (!h264VideoProfile(probe.video_profile)) return issue("media_video_profile", path, "Media must use a recognized H.264 video profile.");
    if (!rationalFrameRate(probe.frame_rate)) return issue("media_frame_rate", path, "Media must use a positive rational frame rate.");
    if (probe.audio_codec !== "aac" || probe.audio_sample_rate_hz !== 48_000) return issue("media_audio", path, "Media must use AAC audio at 48 kHz.");
    if (probe.video_bitrate_bps < 2_000_000 || probe.video_bitrate_bps > 3_000_000) return issue("video_bitrate", path, "Media video bitrate must be between 2 and 3 Mbps.");
    if (probe.max_keyframe_interval_ms <= 0 || probe.max_keyframe_interval_ms > 2_100) return issue("media_keyframe_interval", path, "Media keyframe intervals must not exceed 2100 ms.");
    if (probe.faststart !== true) return issue("media_faststart", path, "Media must place the MP4 moov atom before mdat.");
    if (probe.duration_ms <= 0 || probe.duration_ms > MAX_DURATION_MS || probe.byte_length <= 0) return issue("media_duration", path, "Media durations and byte lengths must be positive, and media cannot exceed ten minutes.");
  }
  if (media.for.video_profile !== media.host.video_profile) return issue("media_video_profile", "media.for", "FOR video profile must match host.");
  if (media.against.video_profile !== media.host.video_profile) return issue("media_video_profile", "media.against", "AGAINST video profile must match host.");
  if (media.for.frame_rate !== media.host.frame_rate) return issue("media_frame_rate", "media.for", "FOR frame rate must match host.");
  if (media.against.frame_rate !== media.host.frame_rate) return issue("media_frame_rate", "media.against", "AGAINST frame rate must match host.");
  const durations = tracks.map(([, probe]) => probe.duration_ms);
  if (Math.max(...durations) - Math.min(...durations) > 100) {
    const role = media.for.duration_ms === Math.max(...durations) || media.for.duration_ms === Math.min(...durations) ? "for" : "against";
    return issue("media_duration", `media.${role}`, "Media durations must match each other within 100 ms.");
  }
  if (media.poster.format !== "webp" || media.poster.width !== 1600 || media.poster.height !== 900) return issue("poster_format", "media.poster", "Poster must be a 1600x900 WebP image.");
  if (media.poster.byte_length <= 0 || media.poster.byte_length > 500_000) return issue("poster_size", "media.poster", "Poster must be positive and cannot exceed 500 KB.");
  return {
    ok: true,
    value: {
      host: acceptedMediaProbe(media.host),
      for: acceptedMediaProbe(media.for),
      against: acceptedMediaProbe(media.against),
      poster: { format: "webp", width: 1600, height: 900, byte_length: media.poster.byte_length },
    },
  };
}

function timelineEntry(value: unknown): IntroTimeline | RoundTimeline | OutroTimeline | null {
  const record = object(value);
  if (!record || typeof record.type !== "string") return null;
  if (record.type === "intro" || record.type === "outro") {
    if (!exactKeys(record, ["type", "start_ms", "end_ms"])) return null;
    const timestamps = range({ start_ms: record.start_ms, end_ms: record.end_ms });
    return timestamps === null ? null : { type: record.type, ...timestamps };
  }
  if (record.type !== "round" || !exactKeys(record, ["type", "number", "domain", "opener", "for", "against", "grace"])) return null;
  const number = integer(record.number);
  const domain = string(record.domain);
  const opener = side(record.opener);
  const forRange = range(record.for);
  const against = range(record.against);
  const grace = range(record.grace);
  return number === null || domain === null || opener === null || forRange === null || against === null || grace === null
    ? null
    : { type: "round", number, domain, opener, for: forRange, against, grace };
}

function transcriptSegment(value: unknown): TranscriptSegment | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["id", "speaker", "start_ms", "end_ms", "text", "phase", "round", "judged"])) return null;
  const id = string(record.id);
  const speaker = record.speaker === "host" || record.speaker === "for" || record.speaker === "against"
    ? record.speaker
    : null;
  const start_ms = integer(record.start_ms);
  const end_ms = integer(record.end_ms);
  const text = string(record.text);
  const phase: TranscriptPhase | null = record.phase === "intro" || record.phase === "judged" || record.phase === "grace" || record.phase === "outro"
    ? record.phase
    : null;
  const parsedRound = record.round === null ? null : integer(record.round);
  if (record.round !== null && parsedRound === null) return null;
  return id === null || speaker === null || start_ms === null || end_ms === null || text === null || phase === null || typeof record.judged !== "boolean"
    ? null
    : { id, speaker, start_ms, end_ms, text, phase, round: parsedRound, judged: record.judged };
}

function point(value: unknown): Point | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["segment_id", "text"])) return null;
  const segment_id = string(record.segment_id);
  const text = string(record.text);
  return segment_id === null || text === null ? null : { segment_id, text };
}

function roundResult(value: unknown): RoundResult | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["number", "winner", "for_score", "against_score", "ruling", "points"])) return null;
  const number = integer(record.number);
  const winner = side(record.winner);
  const for_score = integer(record.for_score);
  const against_score = integer(record.against_score);
  const ruling = string(record.ruling);
  const points = object(record.points);
  if (!points || !exactKeys(points, ["for", "against"])) return null;
  const forPoints = array(points.for);
  const againstPoints = array(points.against);
  if (number === null || winner === null || for_score === null || against_score === null || ruling === null || !forPoints || !againstPoints) return null;
  const parsedFor: Point[] = [];
  const parsedAgainst: Point[] = [];
  for (const rawPoint of forPoints) {
    const parsed = point(rawPoint);
    if (!parsed) return null;
    parsedFor.push(parsed);
  }
  for (const rawPoint of againstPoints) {
    const parsed = point(rawPoint);
    if (!parsed) return null;
    parsedAgainst.push(parsed);
  }
  return { number, winner, for_score, against_score, ruling, points: { for: parsedFor, against: parsedAgainst } };
}

function finalExplanation(value: unknown): FinalExplanation | null {
  const record = object(value);
  if (!record || !exactKeys(record, ["winner", "round_score", "crux", "verdict"])) return null;
  const round_score = object(record.round_score);
  if (!round_score || !exactKeys(round_score, ["for", "against"])) return null;
  const winner = side(record.winner);
  const forScore = integer(round_score.for);
  const againstScore = integer(round_score.against);
  const crux = string(record.crux);
  const verdict = string(record.verdict);
  return winner === null || forScore === null || againstScore === null || crux === null || verdict === null
    ? null
    : { winner, round_score: { for: forScore, against: againstScore }, crux, verdict };
}

function invalidTimestamp(timeline: unknown[]): boolean {
  const ranges: unknown[] = [];
  for (const entry of timeline) {
    const record = object(entry);
    if (!record) continue;
    if (record.type === "round") ranges.push(record.for, record.against, record.grace);
    else ranges.push({ start_ms: record.start_ms, end_ms: record.end_ms });
  }
  for (const rawRange of ranges) {
    const parsed = range(rawRange);
    if (!parsed || parsed.start_ms < 0 || parsed.end_ms <= parsed.start_ms) return true;
  }
  return false;
}

function phaseWindows(timeline: readonly RoundTimeline[], intro: IntroTimeline, outro: OutroTimeline) {
  return [
    { phase: "intro" as const, round: null, judged: false, ...intro },
    ...timeline.flatMap((round) => [
      { phase: "judged" as const, round: round.number, judged: true, speaker: "for" as const, range: round.for },
      { phase: "judged" as const, round: round.number, judged: true, speaker: "against" as const, range: round.against },
      { phase: "grace" as const, round: round.number, judged: false, range: round.grace },
    ]),
    { phase: "outro" as const, round: null, judged: false, ...outro },
  ];
}

function findTranscriptWindow(
  segment: TranscriptSegment,
  rounds: readonly RoundTimeline[],
  intro: IntroTimeline,
  outro: OutroTimeline,
): { phase: TranscriptPhase; round: number | null; judged: boolean; speaker?: DebateSide } | null {
  for (const window of phaseWindows(rounds, intro, outro)) {
    const range = "range" in window ? window.range : window;
    if (segment.start_ms >= range.start_ms && segment.end_ms <= range.end_ms) {
      return {
        phase: window.phase,
        round: window.round,
        judged: window.judged,
        ...("speaker" in window ? { speaker: window.speaker } : {}),
      };
    }
  }
  return null;
}

function textWithin(value: string, max: number): boolean {
  return value.trim().length > 0 && value.length <= max;
}

export function validateSubmissionV1(
  raw: unknown,
  expected: ExpectedSubmission,
): ValidationResult<VideoDebateSubmissionV1> {
  const submission = object(raw);
  if (!submission) return issue("invalid_type", "$", "Submission must be an object.");
  if (submission.version !== 1) return issue("unsupported_version", "version", "Only version 1 is supported.");
  if (!exactKeys(submission, ["version", "duration_ms", "media", "timeline", "transcript", "rounds", "final"])) return issue("invalid_keys", "$", "Submission contains unsupported fields.");
  const duration_ms = integer(submission.duration_ms);
  if (duration_ms === null || duration_ms <= 0) return issue("invalid_timestamp", "duration_ms", "Duration must be a positive integer.");
  if (duration_ms > MAX_DURATION_MS) return issue("duration_limit", "duration_ms", "Duration cannot exceed ten minutes.");

  const media = object(submission.media);
  if (!media || !exactKeys(media, ["host", "for", "against", "poster"])) return issue("media_roles", "media", "Media must contain one host, FOR, and AGAINST role.");
  const parsedHost = mediaProbe(media.host);
  const parsedFor = mediaProbe(media.for);
  const parsedAgainst = mediaProbe(media.against);
  const poster = posterProbe(media.poster);
  if (!parsedHost || !parsedFor || !parsedAgainst || !poster) return issue("invalid_shape", "media", "Media probes do not match the V1 shape.");
  const mediaValidation = validateMediaPackageV1({ host: parsedHost, for: parsedFor, against: parsedAgainst, poster });
  if (!mediaValidation.ok) return mediaValidation;
  const { host, for: forMedia, against, poster: narrowedPoster } = mediaValidation.value;
  const mediaDurations = [host.duration_ms, forMedia.duration_ms, against.duration_ms];
  if (
    mediaDurations.some((probeDuration) => Math.abs(probeDuration - duration_ms) > 100) ||
    Math.max(...mediaDurations) - Math.min(...mediaDurations) > 100
  ) return issue("media_duration", "media", "Media durations must match each other and the programme duration within 100 ms.");

  const rawTimeline = array(submission.timeline);
  if (!rawTimeline) return issue("invalid_type", "timeline", "Timeline must be an array.");
  if (invalidTimestamp(rawTimeline)) return issue("invalid_timestamp", "timeline", "Timeline timestamps must be ordered integers.");
  const timeline: Array<IntroTimeline | RoundTimeline | OutroTimeline> = [];
  for (const entry of rawTimeline) {
    const parsed = timelineEntry(entry);
    if (!parsed) return issue("invalid_shape", "timeline", "Timeline entries do not match the V1 shape.");
    timeline.push(parsed);
  }
  if (timeline.length !== 7 || timeline[0]?.type !== "intro" || timeline[6]?.type !== "outro") return issue("timeline_shape", "timeline", "Timeline must contain intro, five rounds, and outro.");
  const intro = timeline[0];
  const outro = timeline[6];
  if (!intro || intro.type !== "intro" || !outro || outro.type !== "outro") return issue("timeline_shape", "timeline", "Timeline must contain intro and outro.");
  const timelineRounds: RoundTimeline[] = [];
  for (let index = 1; index <= 5; index += 1) {
    const round = timeline[index];
    if (!round || round.type !== "round") return issue("timeline_shape", `timeline[${index}]`, "Timeline entries 1 through 5 must be rounds.");
    timelineRounds.push(round);
  }
  let cursor = 0;
  if (intro.start_ms !== cursor) return issue("timeline_partition", "timeline[0].start_ms", "Timeline must begin at zero.");
  cursor = intro.end_ms;
  const domainNames = new Set(expected.domains.map((domain) => domain.name));
  const seenDomains = new Set<string>();
  for (let index = 0; index < timelineRounds.length; index += 1) {
    const round = timelineRounds[index]!;
    if (round.number !== index + 1) return issue("round_sequence", `timeline[${index + 1}].number`, "Rounds must be numbered one through five in order.");
    if (!domainNames.has(round.domain) || seenDomains.has(round.domain)) return issue("domain_set", `timeline[${index + 1}].domain`, "Rounds must use the five expected domains exactly once.");
    seenDomains.add(round.domain);
    const expectedOpener: DebateSide = index % 2 === 0 ? expected.roundOneOpener : expected.roundOneOpener === "for" ? "against" : "for";
    if (round.opener !== expectedOpener) return issue("opener_alternation", `timeline[${index + 1}].opener`, "Round openers must alternate from the recorded first opener.");
    const firstTurn = round.opener === "for" ? round.for : round.against;
    const secondTurn = round.opener === "for" ? round.against : round.for;
    if (firstTurn.start_ms !== cursor || firstTurn.end_ms !== secondTurn.start_ms || secondTurn.end_ms !== round.grace.start_ms) return issue("timeline_partition", `timeline[${index + 1}]`, "Timeline phases must form one contiguous programme.");
    if (
      round.for.end_ms - round.for.start_ms < MIN_JUDGED_TURN_MS || round.for.end_ms - round.for.start_ms > MAX_JUDGED_TURN_MS ||
      round.against.end_ms - round.against.start_ms < MIN_JUDGED_TURN_MS || round.against.end_ms - round.against.start_ms > MAX_JUDGED_TURN_MS
    ) return issue("judged_duration", `timeline[${index + 1}]`, "Each judged turn must be 30 seconds within 100 ms.");
    cursor = round.grace.end_ms;
  }
  if (seenDomains.size !== expected.domains.length) return issue("domain_set", "timeline", "Rounds must use the five expected domains exactly once.");
  if (outro.start_ms !== cursor || outro.end_ms !== duration_ms) return issue("timeline_partition", "timeline[6]", "Outro must complete the declared programme duration.");

  const rawTranscript = array(submission.transcript);
  if (!rawTranscript) return issue("invalid_type", "transcript", "Transcript must be an array.");
  if (rawTranscript.length > MAX_TRANSCRIPT_SEGMENTS) return issue("transcript_limit", "transcript", "Transcript cannot contain more than 2000 segments.");
  const transcript: TranscriptSegment[] = [];
  const transcriptById = new Map<string, TranscriptSegment>();
  for (let index = 0; index < rawTranscript.length; index += 1) {
    const segment = transcriptSegment(rawTranscript[index]);
    if (!segment) return issue("invalid_shape", `transcript[${index}]`, "Transcript segment does not match the V1 shape.");
    if (segment.id.length === 0 || segment.id.length > MAX_SEGMENT_ID_LENGTH || transcriptById.has(segment.id)) return issue("segment_id", `transcript[${index}].id`, "Transcript ids must be unique and no longer than 64 characters.");
    if (segment.text.length > MAX_TRANSCRIPT_TEXT_LENGTH) return issue("transcript_limit", `transcript[${index}].text`, "Transcript text cannot exceed 1000 characters.");
    if (segment.start_ms < 0 || segment.end_ms <= segment.start_ms || segment.end_ms > duration_ms) return issue("invalid_timestamp", `transcript[${index}]`, "Transcript timestamps must be positive ordered integers within the programme.");
    const window = findTranscriptWindow(segment, timelineRounds, intro, outro);
    if (!window || segment.phase !== window.phase || segment.round !== window.round || segment.judged !== window.judged || (window.judged && segment.speaker !== window.speaker)) return issue("transcript_scope", `transcript[${index}]`, "Transcript segment must belong to its declared programme phase.");
    transcript.push(segment);
    transcriptById.set(segment.id, segment);
  }

  const rawResults = array(submission.rounds);
  if (!rawResults) return issue("invalid_type", "rounds", "Round results must be an array.");
  if (rawResults.length !== 5) return issue("round_sequence", "rounds", "There must be five round results.");
  const rounds: RoundResult[] = [];
  const winners: DebateSide[] = [];
  for (let index = 0; index < rawResults.length; index += 1) {
    const result = roundResult(rawResults[index]);
    if (!result) return issue("invalid_shape", `rounds[${index}]`, "Round result does not match the V1 shape.");
    if (result.number !== index + 1) return issue("round_sequence", `rounds[${index}].number`, "Round results must be numbered one through five in order.");
    if (result.for_score < 0 || result.for_score > 100 || result.against_score < 0 || result.against_score > 100) return issue("score_range", `rounds[${index}]`, "Round scores must be between 0 and 100.");
    if (result.for_score === result.against_score) return issue("round_draw", `rounds[${index}]`, "A round score cannot be tied.");
    if (result.for_score + result.against_score !== 100) return issue("score_sum", `rounds[${index}]`, "Round scores must sum to 100.");
    if ((result.winner === "for") !== (result.for_score > result.against_score)) return issue("winner_score_mismatch", `rounds[${index}].winner`, "Winner must match the larger round score.");
    if (!textWithin(result.ruling, MAX_RULING_LENGTH)) return issue("string_limit", `rounds[${index}].ruling`, "Ruling must be non-blank and no longer than 280 characters.");
    const points: Record<DebateSide, Point[]> = { for: [], against: [] };
    for (const debateSide of ["for", "against"] as const) {
      const seenPointIds = new Set<string>();
      for (const rawPoint of result.points[debateSide]) {
        const text = rawPoint.text.trim();
        if (!textWithin(text, MAX_POINT_TEXT_LENGTH)) return issue("string_limit", `rounds[${index}].points.${debateSide}`, "Point text must be non-blank and no longer than 180 characters.");
        if (seenPointIds.has(rawPoint.segment_id)) continue;
        const cited = transcriptById.get(rawPoint.segment_id);
        if (!cited) return issue("unknown_segment", `rounds[${index}].points.${debateSide}`, "Point cites an unknown transcript segment.");
        if (cited.speaker !== debateSide || cited.round !== result.number) return issue("citation_scope", `rounds[${index}].points.${debateSide}`, "Point must cite the matching side and round.");
        if (!cited.judged || cited.phase !== "judged") return issue("citation_unjudged", `rounds[${index}].points.${debateSide}`, "Point must cite a judged transcript segment.");
        seenPointIds.add(rawPoint.segment_id);
        points[debateSide].push({ segment_id: rawPoint.segment_id, text });
      }
      if (points[debateSide].length > MAX_POINTS_PER_SIDE) return issue("point_limit", `rounds[${index}].points.${debateSide}`, "Each side may have at most four distinct points.");
    }
    rounds.push({
      number: result.number,
      winner: result.winner,
      for_score: result.for_score,
      against_score: result.against_score,
      ruling: result.ruling,
      points,
    });
    winners.push(result.winner);
  }

  const final = finalExplanation(submission.final);
  if (!final) return issue("invalid_shape", "final", "Final explanation does not match the V1 shape.");
  if (!textWithin(final.crux, MAX_CRUX_LENGTH) || !textWithin(final.verdict, MAX_VERDICT_LENGTH)) return issue("string_limit", "final", "Final explanation fields must be non-blank and within their limits.");
  const forWins = winners.filter((winner) => winner === "for").length;
  const againstWins = winners.length - forWins;
  const computedWinner: DebateSide = forWins > againstWins ? "for" : "against";
  if (final.winner !== computedWinner || final.round_score.for !== forWins || final.round_score.against !== againstWins) return issue("final_result_mismatch", "final", "Final result must match all five round winners.");

  return {
    ok: true,
    value: {
      version: 1,
      duration_ms,
      media: { host, for: forMedia, against, poster: narrowedPoster },
      timeline: [intro, timelineRounds[0]!, timelineRounds[1]!, timelineRounds[2]!, timelineRounds[3]!, timelineRounds[4]!, outro],
      transcript,
      rounds,
      final,
    },
  };
}

export function toPlaybackManifest(submission: VideoDebateSubmissionV1): PlaybackManifestV1 {
  const publicRounds: RoundTimeline[] = [];
  for (let index = 1; index < submission.timeline.length - 1; index += 1) {
    const entry = submission.timeline[index];
    if (!entry || entry.type !== "round") continue;
    publicRounds.push({
      type: "round",
      number: entry.number,
      domain: entry.domain,
      opener: entry.opener,
      for: { start_ms: entry.for.start_ms, end_ms: entry.for.end_ms },
      against: { start_ms: entry.against.start_ms, end_ms: entry.against.end_ms },
      grace: { start_ms: entry.grace.start_ms, end_ms: entry.grace.end_ms },
    });
  }
  const intro = submission.timeline[0];
  const outro = submission.timeline[submission.timeline.length - 1];
  if (!outro || outro.type !== "outro") throw new Error("V1 submission requires an outro.");
  return {
    version: submission.version,
    duration_ms: submission.duration_ms,
    timeline: [
      { type: "intro", start_ms: intro.start_ms, end_ms: intro.end_ms },
      ...publicRounds,
      { type: "outro", start_ms: outro.start_ms, end_ms: outro.end_ms },
    ],
    transcript: submission.transcript.map((segment) => ({
      id: segment.id,
      speaker: segment.speaker,
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      text: segment.text,
      phase: segment.phase,
      round: segment.round,
      judged: segment.judged,
    })),
    rounds: submission.rounds.map((round) => ({
      number: round.number,
      winner: round.winner,
      for_score: round.for_score,
      against_score: round.against_score,
      ruling: round.ruling,
      points: {
        for: round.points.for.map((point) => ({ segment_id: point.segment_id, text: point.text })),
        against: round.points.against.map((point) => ({ segment_id: point.segment_id, text: point.text })),
      },
    })),
    final: {
      winner: submission.final.winner,
      round_score: {
        for: submission.final.round_score.for,
        against: submission.final.round_score.against,
      },
      crux: submission.final.crux,
      verdict: submission.final.verdict,
    },
  };
}
