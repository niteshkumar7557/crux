// Turns database rows into the exact JSON the public pages receive.
//
// The stored draft carries editorial fields no reader should see, so this is the
// one place that decides what crosses the wire. Adding a field to the database
// does not publish it; adding it here does.

import type {
  DebateSide,
  ParticipantRole,
  PlaybackManifestV1,
  Point,
  RoundResult,
  RoundTimeline,
  TranscriptSegment,
} from "./manifest.types.js";
import type { VideoObjectMap } from "./videoStorage.js";

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

export interface VideoDebatePublic extends VideoDebateListItem {
  media: Record<ParticipantRole, string>;
  captionsPath: string;
}

export interface VideoDebateDetailResponse {
  debate: VideoDebatePublic;
  manifest: PlaybackManifestV1;
}

export interface VideoDebateDetailRows {
  debate: unknown;
  participants: readonly unknown[];
  rounds: readonly unknown[];
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid stored video debate row.");
  }
  return Object.fromEntries(Object.entries(value));
}

function text(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Invalid stored video debate text.");
  }
  return value;
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function integer(value: unknown): number {
  const narrowed = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
  if (typeof narrowed !== "number" || !Number.isSafeInteger(narrowed)) {
    throw new Error("Invalid stored video debate integer.");
  }
  return narrowed;
}

function timestamp(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== "string") throw new Error("Invalid stored video debate timestamp.");
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid stored video debate timestamp.");
  return parsed.toISOString();
}

function side(value: unknown): DebateSide {
  if (value !== "for" && value !== "against") {
    throw new Error("Invalid stored video debate side.");
  }
  return value;
}

function role(value: unknown): ParticipantRole {
  if (value !== "host" && value !== "for" && value !== "against") {
    throw new Error("Invalid stored video debate participant role.");
  }
  return value;
}

function labelFor(value: ParticipantRole): PublicParticipant["label"] {
  if (value === "host") return "HOST";
  return value === "for" ? "FOR" : "AGAINST";
}

function participantRows(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  throw new Error("Invalid stored video debate participants.");
}

function mapParticipants(values: readonly unknown[]): PublicParticipant[] {
  const order: Record<ParticipantRole, number> = { host: 0, for: 1, against: 2 };
  const mapped = values.map((value) => {
    const row = record(value);
    const participantRole = role(row.role);
    const username = nullableText(row.username);
    return {
      role: participantRole,
      label: labelFor(participantRole),
      displayName: text(row.display_name),
      avatarUrl: nullableText(row.avatar_url),
      ...(username === null ? {} : { username }),
    };
  }).sort((left, right) => order[left.role] - order[right.role]);

  if (
    mapped.length !== 3
    || mapped[0]?.role !== "host"
    || mapped[1]?.role !== "for"
    || mapped[2]?.role !== "against"
  ) {
    throw new Error("A public video debate requires host, for, and against participants.");
  }
  return mapped;
}

function domainNames(values: readonly unknown[]): string[] {
  return values.map((value) => {
    if (typeof value === "string") return text(value);
    const row = record(value);
    return text(row.domain ?? row.name);
  });
}

export function transcriptFromStored(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) throw new Error("Invalid stored video debate transcript.");
  return value.map((entry) => {
    const row = record(entry);
    const speaker = role(row.speaker);
    const phase = row.phase;
    if (phase !== "intro" && phase !== "judged" && phase !== "grace" && phase !== "outro") {
      throw new Error("Invalid stored video debate transcript phase.");
    }
    const round = row.round === null ? null : integer(row.round);
    if (typeof row.judged !== "boolean") throw new Error("Invalid stored video debate transcript flag.");
    return {
      id: text(row.id),
      speaker,
      start_ms: integer(row.start_ms),
      end_ms: integer(row.end_ms),
      text: text(row.text),
      phase,
      round,
      judged: row.judged,
    };
  });
}

function points(value: unknown): Point[] {
  if (!Array.isArray(value)) throw new Error("Invalid stored video debate points.");
  return value.map((entry) => {
    const row = record(entry);
    return { segment_id: text(row.segment_id), text: text(row.text) };
  });
}

function orderedRoundRows(values: readonly unknown[]): Record<string, unknown>[] {
  const rows = values.map(record).sort(
    (left, right) => integer(left.round_number) - integer(right.round_number),
  );
  if (rows.length !== 5 || rows.some((row, index) => integer(row.round_number) !== index + 1)) {
    throw new Error("A public video debate requires rounds 1 through 5.");
  }
  return rows;
}

function timelineRound(row: Record<string, unknown>): RoundTimeline {
  return {
    type: "round",
    number: integer(row.round_number),
    domain: text(row.domain),
    opener: side(row.opener),
    for: { start_ms: integer(row.for_start_ms), end_ms: integer(row.for_end_ms) },
    against: {
      start_ms: integer(row.against_start_ms),
      end_ms: integer(row.against_end_ms),
    },
    grace: { start_ms: integer(row.grace_start_ms), end_ms: integer(row.grace_end_ms) },
  };
}

function roundResult(row: Record<string, unknown>): RoundResult {
  return {
    number: integer(row.round_number),
    winner: side(row.winner),
    for_score: integer(row.for_score),
    against_score: integer(row.against_score),
    ruling: text(row.ruling),
    points: { for: points(row.for_points), against: points(row.against_points) },
  };
}

export function mediaIdFromVideoDebateRow(value: unknown): string {
  return text(record(value).media_id);
}

export function toVideoDebateListItem(
  value: unknown,
  participantValues: readonly unknown[],
  domainValues: readonly unknown[],
  urls: VideoObjectMap<string>,
): VideoDebateListItem {
  const row = record(value);
  const domains = domainNames(domainValues);
  if (domains.length !== 5) throw new Error("A public video debate requires five domains.");
  return {
    slug: text(row.slug),
    motion: text(row.motion),
    posterUrl: text(urls.poster),
    durationMs: integer(row.duration_ms),
    participants: mapParticipants(participantValues),
    winner: side(row.final_winner),
    roundScore: {
      for: integer(row.for_round_wins),
      against: integer(row.against_round_wins),
    },
    domains,
    publishedAt: timestamp(row.published_at),
    updatedAt: timestamp(row.updated_at),
  };
}

export function toVideoDebateDetail(
  rows: VideoDebateDetailRows,
  urls: VideoObjectMap<string>,
): VideoDebateDetailResponse {
  const debateRow = record(rows.debate);
  const roundRows = orderedRoundRows(rows.rounds);
  const listItem = toVideoDebateListItem(debateRow, rows.participants, roundRows, urls);
  const version = integer(debateRow.manifest_version);
  if (version !== 1) throw new Error("Unsupported stored playback manifest version.");

  const manifest: PlaybackManifestV1 = {
    version: 1,
    duration_ms: integer(debateRow.duration_ms),
    timeline: [
      {
        type: "intro",
        start_ms: integer(debateRow.intro_start_ms),
        end_ms: integer(debateRow.intro_end_ms),
      },
      ...roundRows.map(timelineRound),
      {
        type: "outro",
        start_ms: integer(debateRow.outro_start_ms),
        end_ms: integer(debateRow.outro_end_ms),
      },
    ],
    transcript: transcriptFromStored(debateRow.transcript),
    rounds: roundRows.map(roundResult),
    final: {
      winner: side(debateRow.final_winner),
      round_score: {
        for: integer(debateRow.for_round_wins),
        against: integer(debateRow.against_round_wins),
      },
      crux: text(debateRow.final_crux),
      verdict: text(debateRow.final_verdict),
    },
  };

  return {
    debate: {
      ...listItem,
      media: { host: text(urls.host), for: text(urls.for), against: text(urls.against) },
      captionsPath: `/video-debates/${encodeURIComponent(listItem.slug)}/captions.vtt`,
    },
    manifest,
  };
}

export function participantsFromAggregate(value: unknown): readonly unknown[] {
  return participantRows(value);
}

export function domainsFromAggregate(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  throw new Error("Invalid stored video debate domains.");
}
