import { describe, expect, it } from "vitest";
import { toVideoDebateDetail, toVideoDebateListItem } from "./public.logic.js";

const urls = {
  host: "https://media.crux.test/video-debates/media-1/host.mp4",
  for: "https://media.crux.test/video-debates/media-1/for.mp4",
  against: "https://media.crux.test/video-debates/media-1/against.mp4",
  poster: "https://media.crux.test/video-debates/media-1/poster.webp",
};

const debateRow = {
  id: 41,
  slug: "applied-learning",
  motion: "Schools should replace final exams with project work.",
  status: "published",
  media_id: "f3a3d5a8-4839-49a2-a35b-29ec9b03b001",
  poster_object_key: "video-debates/private/poster.webp",
  duration_ms: 480_000,
  manifest_version: 1,
  transcript: [
    {
      id: "for-0001",
      speaker: "for",
      start_ms: 31_000,
      end_ms: 32_000,
      text: "Applied learning improves retention.",
      phase: "judged",
      round: 1,
      judged: true,
    },
  ],
  intro_start_ms: 0,
  intro_end_ms: 30_000,
  outro_start_ms: 455_000,
  outro_end_ms: 480_000,
  final_winner: "for",
  for_round_wins: 3,
  against_round_wins: 2,
  final_crux: "Whether assessment should reward application or recall.",
  final_verdict: "FOR connected assessment to demonstrated application.",
  published_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-02T10:00:00.000Z",
  draft_revision: 7,
  validated_revision: 7,
  validation_errors: [{ code: "old-error" }],
  created_by: 501,
  validated_by: 502,
  published_by: 503,
};

const participants = [
  {
    role: "host",
    user_id: null,
    username: null,
    display_name: "Mira Shah",
    avatar_url: "https://images.crux.test/mira.webp",
    mp4_object_key: "video-debates/private/host.mp4",
  },
  {
    role: "for",
    user_id: 91,
    username: "ada",
    display_name: "Ada Mensah",
    avatar_url: "https://images.crux.test/ada.webp",
    mp4_object_key: "video-debates/private/for.mp4",
  },
  {
    role: "against",
    user_id: 92,
    username: null,
    display_name: "Noah Rao",
    avatar_url: null,
    mp4_object_key: "video-debates/private/against.mp4",
  },
];

const rounds = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  const start = 30_000 + index * 85_000;
  const opener = number % 2 === 1 ? "for" : "against";
  const first = { start_ms: start, end_ms: start + 30_000 };
  const second = { start_ms: start + 30_000, end_ms: start + 60_000 };
  return {
    round_number: number,
    domain: ["Education", "Economics", "Ethics", "Society", "Technology"][index],
    opener,
    for_start_ms: opener === "for" ? first.start_ms : second.start_ms,
    for_end_ms: opener === "for" ? first.end_ms : second.end_ms,
    against_start_ms: opener === "against" ? first.start_ms : second.start_ms,
    against_end_ms: opener === "against" ? first.end_ms : second.end_ms,
    grace_start_ms: start + 60_000,
    grace_end_ms: start + 85_000,
    winner: number % 2 === 1 ? "for" : "against",
    for_score: number % 2 === 1 ? 62 : 42,
    against_score: number % 2 === 1 ? 38 : 58,
    ruling: `Round ${number} ruling.`,
    for_points: number === 1
      ? [{ segment_id: "for-0001", text: "Applied learning improves retention." }]
      : [],
    against_points: [],
    domain_id: number,
  };
});

describe("public video debate mapper", () => {
  it("maps participant snapshots and optional linked usernames without user ids", () => {
    const item = toVideoDebateListItem(debateRow, participants, rounds, urls);

    expect(item.participants).toEqual([
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
    ]);
    expect(JSON.stringify(item)).not.toContain("user_id");
    expect(JSON.stringify(item)).not.toContain("\"userId\"");
  });

  it("returns FOR and AGAINST labels while keeping lowercase enum values in JSON", () => {
    const detail = toVideoDebateDetail({ debate: debateRow, participants, rounds }, urls);

    expect(detail.debate.participants.find((participant) => participant.role === "for")?.label).toBe("FOR");
    expect(detail.debate.participants.find((participant) => participant.role === "against")?.label).toBe("AGAINST");
    expect(detail.debate.winner).toBe("for");
    expect(detail.manifest.final.winner).toBe("for");
    expect(detail.manifest.timeline[1]).toMatchObject({ type: "round", opener: "for" });
  });

  it("constructs media and poster URLs but exposes no object keys or media id", () => {
    const detail = toVideoDebateDetail({ debate: debateRow, participants, rounds }, urls);
    const json = JSON.stringify(detail);

    expect(detail.debate.posterUrl).toBe(urls.poster);
    expect(detail.debate.media).toEqual({ host: urls.host, for: urls.for, against: urls.against });
    expect(detail.debate.captionsPath).toBe("/video-debates/applied-learning/captions.vtt");
    expect(json).not.toContain("object_key");
    expect(json).not.toContain("private/");
    expect(json).not.toContain("media_id");
    expect(json).not.toContain("f3a3d5a8-4839-49a2-a35b-29ec9b03b001");
  });

  it("rebuilds exactly seven timeline entries and five round results", () => {
    const { manifest } = toVideoDebateDetail({ debate: debateRow, participants, rounds }, urls);

    expect(manifest.timeline).toHaveLength(7);
    expect(manifest.timeline.map((entry) => entry.type)).toEqual([
      "intro", "round", "round", "round", "round", "round", "outro",
    ]);
    expect(manifest.rounds).toHaveLength(5);
    expect(manifest.rounds.map((round) => round.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses the stored transcript and shared PlaybackManifestV1 shape", () => {
    const { manifest } = toVideoDebateDetail({ debate: debateRow, participants, rounds }, urls);

    expect(manifest).toMatchObject({
      version: 1,
      duration_ms: 480_000,
      transcript: debateRow.transcript,
      final: {
        winner: "for",
        round_score: { for: 3, against: 2 },
        crux: debateRow.final_crux,
        verdict: debateRow.final_verdict,
      },
    });
  });

  it("does not include draft revision, validation errors, or admin ids", () => {
    const json = JSON.stringify(toVideoDebateDetail({ debate: debateRow, participants, rounds }, urls));

    for (const forbidden of [
      "draft_revision", "validated_revision", "validation_errors", "created_by",
      "validated_by", "published_by", "old-error", "501", "502", "503",
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });
});
