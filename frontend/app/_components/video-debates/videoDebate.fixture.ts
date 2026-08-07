// Frozen public-response fixture for player logic and development surfaces.

import type {
  DebateSide,
  RoundResult,
  RoundTimeline,
  VideoDebateDetailResponse,
} from "@/app/video-debates/types";

const domains = ["Education", "Economics", "Ethics", "Society", "Technology"];

function timelineRound(
  number: number,
  opener: DebateSide,
  startMs: number,
): RoundTimeline {
  const first = { start_ms: startMs, end_ms: startMs + 30_000 };
  const second = { start_ms: startMs + 30_000, end_ms: startMs + 60_000 };
  return {
    type: "round",
    number,
    domain: domains[number - 1],
    opener,
    for: opener === "for" ? first : second,
    against: opener === "against" ? first : second,
    grace: { start_ms: startMs + 60_000, end_ms: startMs + 85_000 },
  };
}

function result(
  number: number,
  winner: DebateSide,
  forScore: number,
  againstScore: number,
  points: RoundResult["points"] = { for: [], against: [] },
): RoundResult {
  return {
    number,
    winner,
    for_score: forScore,
    against_score: againstScore,
    ruling: `Round ${number} went to ${winner.toUpperCase()} on the stronger domain-specific case.`,
    points,
  };
}

export const videoDebateFixture = {
  debate: {
    slug: "applied-learning",
    motion: "Schools should replace final exams with project work.",
    posterUrl: "https://media.crux.test/poster.webp",
    durationMs: 480_000,
    participants: [
      {
        role: "host",
        label: "HOST",
        displayName: "Mira Shah",
        avatarUrl: "https://images.crux.test/mira.webp",
      },
      {
        role: "for",
        label: "FOR",
        displayName: "Ada Mensah",
        avatarUrl: "https://images.crux.test/ada.webp",
        username: "ada",
      },
      {
        role: "against",
        label: "AGAINST",
        displayName: "Noah Rao",
        avatarUrl: null,
      },
    ],
    winner: "for",
    roundScore: { for: 3, against: 2 },
    domains,
    publishedAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    media: {
      host: "https://media.crux.test/host.mp4",
      for: "https://media.crux.test/for.mp4",
      against: "https://media.crux.test/against.mp4",
    },
    captionsPath: "/video-debates/applied-learning/captions.vtt",
  },
  manifest: {
    version: 1,
    duration_ms: 480_000,
    timeline: [
      { type: "intro", start_ms: 0, end_ms: 30_000 },
      timelineRound(1, "for", 30_000),
      timelineRound(2, "against", 115_000),
      timelineRound(3, "for", 200_000),
      timelineRound(4, "against", 285_000),
      timelineRound(5, "for", 370_000),
      { type: "outro", start_ms: 455_000, end_ms: 480_000 },
    ],
    transcript: [
      {
        id: "host-intro-0001",
        speaker: "host",
        start_ms: 0,
        end_ms: 2_000,
        text: "Five domains will test one motion.",
        phase: "intro",
        round: null,
        judged: false,
      },
      {
        id: "for-r1-0001",
        speaker: "for",
        start_ms: 30_000,
        end_ms: 32_000,
        text: "Applied learning improves retention.",
        phase: "judged",
        round: 1,
        judged: true,
      },
      {
        id: "against-r1-0001",
        speaker: "against",
        start_ms: 60_000,
        end_ms: 62_000,
        text: "Exams provide a common standard.",
        phase: "judged",
        round: 1,
        judged: true,
      },
      {
        id: "host-r1-grace-0001",
        speaker: "host",
        start_ms: 90_000,
        end_ms: 92_000,
        text: "The first ruling follows after this pause.",
        phase: "grace",
        round: 1,
        judged: false,
      },
      {
        id: "against-r2-0001",
        speaker: "against",
        start_ms: 115_000,
        end_ms: 117_000,
        text: "Comparable assessment protects access.",
        phase: "judged",
        round: 2,
        judged: true,
      },
      {
        id: "for-r4-0001",
        speaker: "for",
        start_ms: 315_000,
        end_ms: 317_000,
        text: "Projects reward collaboration as well as recall.",
        phase: "judged",
        round: 4,
        judged: true,
      },
      {
        id: "for-r5-0001",
        speaker: "for",
        start_ms: 370_000,
        end_ms: 372_000,
        text: "Modern tools make authentic assessment practical.",
        phase: "judged",
        round: 5,
        judged: true,
      },
      {
        id: "host-outro-0001",
        speaker: "host",
        start_ms: 455_000,
        end_ms: 458_000,
        text: "The final verdict is now part of the record.",
        phase: "outro",
        round: null,
        judged: false,
      },
    ],
    rounds: [
      result(1, "for", 62, 38, {
        for: [{ segment_id: "for-r1-0001", text: "Applied learning improves retention." }],
        against: [],
      }),
      result(2, "against", 42, 58, {
        for: [],
        against: [{ segment_id: "against-r2-0001", text: "Comparable assessment protects access." }],
      }),
      result(3, "for", 61, 39),
      result(4, "against", 47, 53, {
        for: [{ segment_id: "for-r4-0001", text: "Projects reward collaboration." }],
        against: [],
      }),
      result(5, "for", 60, 40, {
        for: [{ segment_id: "for-r5-0001", text: "Authentic assessment is practical." }],
        against: [],
      }),
    ],
    final: {
      winner: "for",
      round_score: { for: 3, against: 2 },
      crux: "Whether assessment should reward demonstrated application or recall.",
      verdict: "FOR won three domains by connecting learning to application.",
    },
  },
} satisfies VideoDebateDetailResponse;
