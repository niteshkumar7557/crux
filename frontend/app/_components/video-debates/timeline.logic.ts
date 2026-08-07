// Given "where is the programme right now, in milliseconds", this answers three
// questions: who is speaking, how the three video tiles should be arranged, and
// what the reader is allowed to have seen by now.
//
// Every answer is recomputed from that one number and nothing is remembered, so
// seeking backwards un-reveals exactly what seeking forwards revealed.

import type {
  DebateSide,
  ParticipantRole,
  PlaybackManifestV1,
  RoundTimeline,
} from "@/app/video-debates/types";

export type ActivePhase =
  | { type: "intro"; speaker: "host"; round: null; domain: null }
  | { type: "judged"; speaker: DebateSide; round: number; domain: string }
  | { type: "grace"; speaker: null; round: number; domain: string }
  | { type: "outro"; speaker: "host"; round: null; domain: null };

export interface StageLayout {
  mode: "single" | "grace";
  primary: ParticipantRole[];
  contextual: ParticipantRole[];
}

export interface RevealState {
  active: ActivePhase;
  visiblePointIds: string[];
  revealedRoundNumbers: number[];
  roundScore: Record<DebateSide, number>;
  finalVisible: boolean;
}

const STAGE_ORDER: readonly ParticipantRole[] = ["host", "for", "against"];

const INTRO: ActivePhase = { type: "intro", speaker: "host", round: null, domain: null };
const OUTRO: ActivePhase = { type: "outro", speaker: "host", round: null, domain: null };

function opposing(side: DebateSide): DebateSide {
  return side === "for" ? "against" : "for";
}

function timelineRounds(manifest: PlaybackManifestV1): RoundTimeline[] {
  return manifest.timeline.filter((entry): entry is RoundTimeline => entry.type === "round");
}

// Every reveal is a pure function of this clamped value, so a reverse seek hides
// what a forward seek showed without any remembered state.
function playheadMs(manifest: PlaybackManifestV1, atMs: number): number {
  if (!Number.isFinite(atMs) || atMs < 0) return 0;
  return Math.min(atMs, manifest.duration_ms);
}

function activeAtMs(manifest: PlaybackManifestV1, timeMs: number): ActivePhase {
  const intro = manifest.timeline[0];
  if (timeMs < intro.end_ms) return INTRO;
  for (const round of timelineRounds(manifest)) {
    if (timeMs < round.grace.start_ms) {
      const first = round.opener === "for" ? round.for : round.against;
      const speaker = timeMs < first.end_ms ? round.opener : opposing(round.opener);
      return { type: "judged", speaker, round: round.number, domain: round.domain };
    }
    if (timeMs < round.grace.end_ms) {
      return { type: "grace", speaker: null, round: round.number, domain: round.domain };
    }
  }
  return OUTRO;
}

export function revealAt(manifest: PlaybackManifestV1, atMs: number): RevealState {
  const timeMs = playheadMs(manifest, atMs);
  const rounds = timelineRounds(manifest);
  const revealedRoundNumbers = rounds
    .filter((round) => timeMs >= round.grace.end_ms)
    .map((round) => round.number);
  const revealed = new Set(revealedRoundNumbers);

  const segmentStarts = new Map(manifest.transcript.map((segment) => [segment.id, segment.start_ms]));
  const roundScore: Record<DebateSide, number> = { for: 0, against: 0 };
  const visiblePointIds: string[] = [];
  for (const result of manifest.rounds) {
    if (revealed.has(result.number)) roundScore[result.winner] += 1;
    for (const point of [...result.points.for, ...result.points.against]) {
      const startMs = segmentStarts.get(point.segment_id);
      if (startMs !== undefined && timeMs >= startMs) visiblePointIds.push(point.segment_id);
    }
  }

  const finalRound = rounds[rounds.length - 1];
  return {
    active: activeAtMs(manifest, timeMs),
    visiblePointIds,
    revealedRoundNumbers,
    roundScore,
    finalVisible: finalRound !== undefined && timeMs >= finalRound.grace.end_ms,
  };
}

export function layoutAt(manifest: PlaybackManifestV1, atMs: number): StageLayout {
  const active = activeAtMs(manifest, playheadMs(manifest, atMs));
  if (active.type === "grace") {
    return { mode: "grace", primary: ["for", "against"], contextual: ["host"] };
  }
  return {
    mode: "single",
    primary: [active.speaker],
    contextual: STAGE_ORDER.filter((role) => role !== active.speaker),
  };
}
