export type DebateSide = "for" | "against";
export type ParticipantRole = "host" | DebateSide;
export type Speaker = ParticipantRole;
export type TranscriptPhase = "intro" | "judged" | "grace" | "outro";

export interface TimestampRange {
  start_ms: number;
  end_ms: number;
}

export interface MediaProbe {
  duration_ms: number;
  byte_length: number;
  video_codec: "h264";
  video_profile: string;
  width: 1280;
  height: 720;
  pixel_format: "yuv420p";
  frame_rate: string;
  video_bitrate_bps: number;
  max_keyframe_interval_ms: number;
  faststart: true;
  audio_codec: "aac";
  audio_sample_rate_hz: 48000;
}

export interface PosterProbe {
  format: "webp";
  width: 1600;
  height: 900;
  byte_length: number;
}

export interface IntroTimeline extends TimestampRange {
  type: "intro";
}

export interface RoundTimeline {
  type: "round";
  number: number;
  domain: string;
  opener: DebateSide;
  for: TimestampRange;
  against: TimestampRange;
  grace: TimestampRange;
}

export interface OutroTimeline extends TimestampRange {
  type: "outro";
}

export type TimelineEntry = IntroTimeline | RoundTimeline | OutroTimeline;

export interface TranscriptSegment {
  id: string;
  speaker: Speaker;
  start_ms: number;
  end_ms: number;
  text: string;
  phase: TranscriptPhase;
  round: number | null;
  judged: boolean;
}

export interface Point {
  segment_id: string;
  text: string;
}

export interface RoundResult {
  number: number;
  winner: DebateSide;
  for_score: number;
  against_score: number;
  ruling: string;
  points: Record<DebateSide, Point[]>;
}

export interface FinalExplanation {
  winner: DebateSide;
  round_score: Record<DebateSide, number>;
  crux: string;
  verdict: string;
}

export interface VideoDebateSubmissionV1 {
  version: 1;
  duration_ms: number;
  media: Record<ParticipantRole, MediaProbe> & { poster: PosterProbe };
  timeline: [IntroTimeline, ...RoundTimeline[], OutroTimeline];
  transcript: TranscriptSegment[];
  rounds: RoundResult[];
  final: FinalExplanation;
}

export interface PlaybackManifestV1
  extends Omit<VideoDebateSubmissionV1, "media"> {}

export interface VideoDebateDraftParticipantV1 {
  role: ParticipantRole;
  display_name: string;
  avatar_url: string | null;
  username?: string;
}

export interface VideoDebateDraftRoundV1 {
  number: number;
  domain_id: number;
  domain: string;
  opener: DebateSide;
}

export interface VideoDebateDraftMetadataV1 {
  version: 1;
  draft_id: string;
  media_id: string;
  motion: string;
  slug: string;
  participants: VideoDebateDraftParticipantV1[];
  rounds: VideoDebateDraftRoundV1[];
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationIssue[] };

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}
