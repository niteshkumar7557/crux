// Narrows a linked user's published video appearances into an editorial projection.
//
// This is deliberately not a debate_results row: there is no outcome, no MVP flag and
// no logic amount, because a video appearance never enters ranked standing.

import type { DebateSide, ParticipantRole } from "./manifest.types.js";

export interface VideoAppearance {
  slug: string;
  motion: string;
  role: ParticipantRole;
  winner: DebateSide;
  roundScore: Record<DebateSide, number>;
  /** null for the host, who has no side to win with. */
  sideWon: boolean | null;
  durationMs: number;
  publishedAt: string;
  domains: string[];
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

function integer(value: unknown): number | null {
  const narrowed = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
  return typeof narrowed === "number" && Number.isSafeInteger(narrowed) ? narrowed : null;
}

function side(value: unknown): DebateSide | null {
  return value === "for" || value === "against" ? value : null;
}

function role(value: unknown): ParticipantRole | null {
  return value === "host" || value === "for" || value === "against" ? value : null;
}

function timestamp(value: unknown): string | null {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function domainNames(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const names = value.filter((entry): entry is string => typeof entry === "string");
  return names.length === value.length ? names : null;
}

function toAppearance(value: unknown): VideoAppearance | null {
  const row = record(value);
  if (row.status !== "published") return null;

  const participantRole = role(row.role);
  const winner = side(row.final_winner);
  const forWins = integer(row.for_round_wins);
  const againstWins = integer(row.against_round_wins);
  const durationMs = integer(row.duration_ms);
  const publishedAt = timestamp(row.published_at);
  const domains = domainNames(row.domains);
  if (
    !participantRole || !winner || forWins === null || againstWins === null ||
    durationMs === null || publishedAt === null || domains === null ||
    typeof row.slug !== "string" || typeof row.motion !== "string"
  ) {
    return null;
  }

  return {
    slug: row.slug,
    motion: row.motion,
    role: participantRole,
    winner,
    roundScore: { for: forWins, against: againstWins },
    sideWon: participantRole === "host" ? null : participantRole === winner,
    durationMs,
    publishedAt,
    domains,
  };
}

export function toVideoAppearances(rows: readonly unknown[]): VideoAppearance[] {
  return rows.flatMap((row) => {
    const appearance = toAppearance(row);
    return appearance === null ? [] : [appearance];
  });
}
