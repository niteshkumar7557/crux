// Public video-debate response contracts duplicated at the frontend HTTP boundary.

export type DebateSide = "for" | "against";
export type ParticipantRole = "host" | DebateSide;
export type TranscriptPhase = "intro" | "judged" | "grace" | "outro";

export interface TimestampRange {
  start_ms: number;
  end_ms: number;
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
  speaker: ParticipantRole;
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

export interface PlaybackManifestV1 {
  version: 1;
  duration_ms: number;
  timeline: [IntroTimeline, ...RoundTimeline[], OutroTimeline];
  transcript: TranscriptSegment[];
  rounds: RoundResult[];
  final: FinalExplanation;
}

export interface PublicParticipant {
  role: ParticipantRole;
  label: "HOST" | "FOR" | "AGAINST";
  displayName: string;
  avatarUrl: string | null;
  username?: string;
}

export interface VideoDebateListItem {
  slug: string;
  motion: string;
  posterUrl: string;
  durationMs: number;
  participants: PublicParticipant[];
  winner: DebateSide;
  roundScore: Record<DebateSide, number>;
  domains: string[];
  publishedAt: string;
  updatedAt: string;
}

// Detail adds the custom-domain media URLs and the same-origin captions path; the
// list response carries neither.
export interface VideoDebatePublic extends VideoDebateListItem {
  media: Record<ParticipantRole, string>;
  captionsPath: string;
}

export interface VideoDebateListResponse {
  debates: VideoDebateListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VideoDebateDetailResponse {
  debate: VideoDebatePublic;
  manifest: PlaybackManifestV1;
}

export function captionTrackSrc(captionsPath: string): string {
  return `/api${captionsPath}`;
}
