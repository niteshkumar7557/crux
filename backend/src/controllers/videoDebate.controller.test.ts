import { describe, expect, it } from "vitest";
import { makeVideoDebateHandlers } from "./videoDebate.controller.js";
import type {
  VideoStorageFailure,
  VideoVerificationResult,
} from "../video-debates/videoStorage.js";

interface QueryCall {
  sql: string;
  values: readonly unknown[] | undefined;
}

function scriptedDb(...scripts: unknown[][]) {
  const calls: QueryCall[] = [];
  return {
    calls,
    async query(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      return { rows: scripts.shift() ?? [] };
    },
  };
}

function transactionalDb(
  queryResult: (sql: string, values: readonly unknown[] | undefined) => unknown[] = () => [],
) {
  const calls: QueryCall[] = [];
  const state = { released: false };
  const client = {
    async query(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      return { rows: queryResult(sql, values) };
    },
    release() {
      state.released = true;
    },
  };
  return {
    calls,
    state,
    async query(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      return { rows: queryResult(sql, values) };
    },
    async connect() {
      return client;
    },
  };
}

function response() {
  const state: { status: number; headers: Record<string, string>; body?: unknown; type?: string } = {
    status: 200,
    headers: {},
  };
  const res = {
    state,
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      state.status = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
    type(value: string) {
      state.type = value;
      return res;
    },
    send(body: unknown) {
      state.body = body;
      return res;
    },
  };
  return res;
}

const mediaId = "f3a3d5a8-4839-49a2-a35b-29ec9b03b001";
const store = {
  configured: true,
  keysFor(id: string) {
    return {
      host: `video-debates/${id}/host.mp4`,
      for: `video-debates/${id}/for.mp4`,
      against: `video-debates/${id}/against.mp4`,
      poster: `video-debates/${id}/poster.webp`,
    };
  },
  publicUrlsFor(id: string) {
    return {
      host: `https://media.crux.test/video-debates/${id}/host.mp4`,
      for: `https://media.crux.test/video-debates/${id}/for.mp4`,
      against: `https://media.crux.test/video-debates/${id}/against.mp4`,
      poster: `https://media.crux.test/video-debates/${id}/poster.webp`,
    };
  },
  async verify() {
    return {
      ok: true as const,
      receipts: {
        host: { byteLength: 10_000_000, etag: '"host"' },
        for: { byteLength: 10_000_000, etag: '"for"' },
        against: { byteLength: 10_000_000, etag: '"against"' },
        poster: { byteLength: 123_456, etag: '"poster"' },
      },
    };
  },
};
const logger = { error() {}, info() {} };

const draftMediaId = "11111111-2222-4333-8444-555555555555";
const draftDomains = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `Domain ${index + 1}`,
}));
const draftBody = {
  slug: "applied-learning",
  motion: "Schools should replace final exams with project work.",
  participants: [
    { role: "host", user_id: null, display_name: "Mira", avatar_url: null },
    { role: "for", user_id: 9, display_name: "Ada", avatar_url: "/avatars/ada.webp" },
    { role: "against", user_id: null, display_name: "Noah", avatar_url: null },
  ],
  rounds: draftDomains.map((domain, index) => ({
    number: index + 1,
    domain_id: domain.id,
    domain: domain.name,
    opener: index % 2 === 0 ? "for" : "against",
  })),
};

function draftDb(options: { unknownUser?: boolean; failParticipants?: boolean } = {}) {
  return transactionalDb((sql) => {
    if (/SELECT[\s\S]+FROM domains/i.test(sql)) return draftDomains;
    if (/SELECT[\s\S]+FROM users/i.test(sql)) {
      return options.unknownUser ? [] : [{ id: 9, username: "ada" }];
    }
    if (/INSERT INTO video_debates/i.test(sql)) return [{ id: 41 }];
    if (options.failParticipants && /INSERT INTO video_debate_participants/i.test(sql)) {
      throw new Error("participant insert failed");
    }
    return [];
  });
}

const debate = {
  id: 41,
  slug: "applied-learning",
  motion: "Schools should replace final exams with project work.",
  status: "published",
  media_id: mediaId,
  duration_ms: 480_000,
  manifest_version: 1,
  transcript: [{
    id: "host-0001", speaker: "host", start_ms: 0, end_ms: 1_000,
    text: "Welcome.", phase: "intro", round: null, judged: false,
  }],
  intro_start_ms: 0,
  intro_end_ms: 30_000,
  outro_start_ms: 455_000,
  outro_end_ms: 480_000,
  final_winner: "for",
  for_round_wins: 3,
  against_round_wins: 2,
  final_crux: "Application or recall.",
  final_verdict: "FOR won three rounds.",
  published_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-02T10:00:00.000Z",
  poster_object_key: "video-debates/private/poster.webp",
};
const participants = [
  { role: "host", username: null, display_name: "Mira", avatar_url: null, user_id: null },
  { role: "for", username: "ada", display_name: "Ada", avatar_url: null, user_id: 9 },
  { role: "against", username: null, display_name: "Noah", avatar_url: null, user_id: null },
];
const rounds = Array.from({ length: 5 }, (_, index) => ({
  round_number: index + 1,
  domain: `Domain ${index + 1}`,
  opener: index % 2 === 0 ? "for" : "against",
  for_start_ms: 30_000 + index * 85_000,
  for_end_ms: 60_000 + index * 85_000,
  against_start_ms: 60_000 + index * 85_000,
  against_end_ms: 90_000 + index * 85_000,
  grace_start_ms: 90_000 + index * 85_000,
  grace_end_ms: 115_000 + index * 85_000,
  winner: index % 2 === 0 ? "for" : "against",
  for_score: index % 2 === 0 ? 60 : 40,
  against_score: index % 2 === 0 ? 40 : 60,
  ruling: `Ruling ${index + 1}`,
  for_points: [],
  against_points: [],
}));

function manifestMediaProbe(duration_ms = 480_000) {
  return {
    duration_ms,
    byte_length: 10_000_000,
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

function manifestTimelineRound(
  number: number,
  domain: string,
  opener: "for" | "against",
  start_ms: number,
  end_ms: number,
) {
  const first = { start_ms, end_ms: start_ms + 30_000 };
  const second = { start_ms: first.end_ms, end_ms: first.end_ms + 30_000 };
  return {
    type: "round",
    number,
    domain,
    opener,
    for: opener === "for" ? first : second,
    against: opener === "against" ? first : second,
    grace: { start_ms: second.end_ms, end_ms },
  };
}

function manifestResult(
  number: number,
  winner: "for" | "against",
  for_score: number,
  against_score: number,
  segment_id?: string,
) {
  return {
    number,
    winner,
    for_score,
    against_score,
    ruling: `Ruling ${number}`,
    points: {
      for: segment_id ? [{ segment_id, text: "Applied learning improves retention." }] : [],
      against: [],
    },
  };
}

function validManifest(): Record<string, any> {
  return {
    version: 1,
    duration_ms: 480_000,
    media: {
      host: manifestMediaProbe(),
      for: manifestMediaProbe(),
      against: manifestMediaProbe(),
      poster: { format: "webp", width: 1600, height: 900, byte_length: 123_456 },
    },
    timeline: [
      { type: "intro", start_ms: 0, end_ms: 30_000 },
      manifestTimelineRound(1, "Domain 1", "for", 30_000, 115_000),
      manifestTimelineRound(2, "Domain 2", "against", 115_000, 200_000),
      manifestTimelineRound(3, "Domain 3", "for", 200_000, 285_000),
      manifestTimelineRound(4, "Domain 4", "against", 285_000, 370_000),
      manifestTimelineRound(5, "Domain 5", "for", 370_000, 455_000),
      { type: "outro", start_ms: 455_000, end_ms: 480_000 },
    ],
    transcript: [{
      id: "for-0001",
      speaker: "for",
      start_ms: 31_000,
      end_ms: 32_000,
      text: "Applied learning improves retention.",
      phase: "judged",
      round: 1,
      judged: true,
    }],
    rounds: [
      manifestResult(1, "for", 62, 38, "for-0001"),
      manifestResult(2, "against", 42, 58),
      manifestResult(3, "for", 61, 39),
      manifestResult(4, "against", 47, 53),
      manifestResult(5, "for", 60, 40),
    ],
    final: {
      winner: "for",
      round_score: { for: 3, against: 2 },
      crux: "Whether education should prioritize application over recall.",
      verdict: "FOR won three domains by connecting learning to application.",
    },
  };
}

const editableDebate = {
  id: 41,
  slug: draftBody.slug,
  motion: draftBody.motion,
  status: "validated",
  media_id: draftMediaId,
  draft_revision: 4,
  validated_revision: 4,
  submission_hash: "old-manifest-hash",
  validation_errors: [{ code: "old", path: "$", message: "Old issue" }],
};

const editableParticipants = draftBody.participants.map((participant, index) => ({
  id: index + 101,
  role: participant.role,
  user_id: participant.user_id,
  display_name: participant.display_name,
  avatar_url: participant.avatar_url,
  username: participant.user_id === 9 ? "ada" : null,
}));

function editorialDb(debateRow: Record<string, unknown> = editableDebate) {
  return transactionalDb((sql) => {
    if (/FROM video_debates/i.test(sql)) return [debateRow];
    if (/FROM video_debate_participants/i.test(sql)) return editableParticipants;
    if (/FROM video_debate_rounds/i.test(sql)) {
      return draftBody.rounds.map((round) => ({
        round_number: round.number,
        domain_id: round.domain_id,
        domain: round.domain,
        opener: round.opener,
      }));
    }
    if (/FROM users/i.test(sql)) return [{ id: 9, username: "ada" }];
    return [];
  });
}

describe("public video debate handlers", () => {
  it.each([
    [{ page: "0", pageSize: "0" }, [1, 0], 1, 1],
    [{ page: "2", pageSize: "999" }, [50, 50], 2, 50],
    [{ page: "no", pageSize: "no" }, [12, 0], 1, 12],
  ])("listVideoDebates clamps pageSize to 1 through 50 and returns a stable total", async (query, expectedPaging, page, pageSize) => {
    const db = scriptedDb([{ total: 73 }]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.listVideoDebates({ query }, res);

    expect(db.calls).toHaveLength(1);
    expect(db.calls[0]?.values).toEqual(expectedPaging);
    expect(res.state.body).toEqual({ debates: [], total: 73, page, pageSize });
  });

  it("listVideoDebates queries published rows only and aggregates the page without N+1", async () => {
    const db = scriptedDb([{ ...debate, participants, domains: rounds, total: 1 }]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.listVideoDebates({ query: {} }, res);

    expect(db.calls).toHaveLength(1);
    expect(db.calls.every((call) => /status\s*=\s*'published'/i.test(call.sql))).toBe(true);
    expect(res.state.body).toMatchObject({ total: 1, page: 1, pageSize: 12 });
  });

  it.each(["draft", "media_uploaded", "validated", "absent"])(
    "getVideoDebateBySlug returns 404 for %s rows",
    async () => {
      const db = scriptedDb([]);
      const res = response();
      const handlers = makeVideoDebateHandlers({ db, store, logger });

      await handlers.getVideoDebateBySlug({ params: { slug: "hidden" } }, res);

      expect(res.state.status).toBe(404);
      expect(db.calls).toHaveLength(1);
      expect(db.calls[0]?.sql).toMatch(/status\s*=\s*'published'/i);
    },
  );

  it("getVideoDebateBySlug returns the public mapper result for a published row", async () => {
    const db = scriptedDb([debate], participants, rounds);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getVideoDebateBySlug({ params: { slug: debate.slug } }, res);

    expect(db.calls).toHaveLength(3);
    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({
      debate: { slug: debate.slug, winner: "for" },
      manifest: { version: 1, duration_ms: 480_000 },
    });
  });

  it("detail exposes relative captionsPath and custom-domain media urls but no object keys", async () => {
    const db = scriptedDb([debate], participants, rounds);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getVideoDebateBySlug({ params: { slug: debate.slug } }, res);
    const json = JSON.stringify(res.state.body);

    expect(res.state.body).toMatchObject({
      debate: {
        captionsPath: `/video-debates/${debate.slug}/captions.vtt`,
        media: { host: `https://media.crux.test/video-debates/${mediaId}/host.mp4` },
      },
    });
    expect(json).not.toContain("object_key");
    expect(json).not.toContain("media_id");
    expect(json).not.toContain("\"mediaId\"");
  });

  it.each(["listVideoDebates", "getVideoDebateBySlug"] as const)(
    "%s returns a stable 503 when public video storage is unconfigured",
    async (name) => {
      const db = scriptedDb([{ total: 1 }], [debate], participants, rounds);
      const res = response();
      const handlers = makeVideoDebateHandlers({
        db,
        store: {
          configured: false,
          publicUrlsFor(): never { throw new Error("secret endpoint detail"); },
          async verify(): Promise<VideoVerificationResult> {
            return { ok: false, code: "video_storage_unconfigured", failures: [] };
          },
        },
        logger,
      });

      await handlers[name]({ query: {}, params: { slug: debate.slug } }, res);

      expect(res.state.status).toBe(503);
      expect(res.state.headers["cache-control"]).toBe("no-store");
      expect(res.state.body).toEqual({ error: "video_storage_unconfigured" });
      expect(JSON.stringify(res.state.body)).not.toContain("endpoint");
      expect(db.calls).toHaveLength(0);
    },
  );

  it("getVideoDebateCaptions returns shared WebVTT with text/vtt charset", async () => {
    const db = scriptedDb([{ transcript: debate.transcript }]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getVideoDebateCaptions({ params: { slug: debate.slug } }, res);

    expect(res.state.type).toBe("text/vtt; charset=utf-8");
    expect(res.state.body).toBe("WEBVTT\n\nhost-0001\n00:00:00.000 --> 00:00:01.000\nHOST: Welcome.\n");
    expect(db.calls[0]?.sql).toMatch(/status\s*=\s*'published'/i);
  });

  it("captions returns 404 for an unpublished row", async () => {
    const db = scriptedDb([]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getVideoDebateCaptions({ params: { slug: "draft" } }, res);

    expect(res.state.status).toBe(404);
    expect(db.calls).toHaveLength(1);
  });

  it("all public handlers set Cache-Control no-store, including errors", async () => {
    const handlerNames = [
      "listVideoDebates", "getVideoDebateBySlug", "getVideoDebateCaptions", "getVideoDebateSitemap",
    ] as const;

    for (const name of handlerNames) {
      const db = { async query() { throw new Error("database unavailable"); } };
      const res = response();
      const handlers = makeVideoDebateHandlers({ db, store, logger });
      await handlers[name]({ query: {}, params: { slug: "x" } }, res);
      expect(res.state.headers["cache-control"], name).toBe("no-store");
      expect(res.state.status, name).toBe(500);
    }
  });

  it("sitemap returns only slug and published/updated timestamps for published rows", async () => {
    const db = scriptedDb([{
      slug: debate.slug,
      published_at: debate.published_at,
      updated_at: debate.updated_at,
      media_id: mediaId,
      published_by: 503,
    }]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getVideoDebateSitemap({ query: {} }, res);

    expect(db.calls).toHaveLength(1);
    expect(db.calls[0]?.sql).toMatch(/status\s*=\s*'published'/i);
    expect(res.state.body).toEqual([{
      slug: debate.slug,
      publishedAt: debate.published_at,
      updatedAt: debate.updated_at,
    }]);
  });
});

describe("admin video debate draft handlers", () => {
  it.each([
    ["invalid slug", { ...draftBody, slug: "Not valid" }],
    ["blank motion", { ...draftBody, motion: "   " }],
    ["overlong motion", { ...draftBody, motion: "x".repeat(501) }],
    ["duplicate roles", {
      ...draftBody,
      participants: draftBody.participants.map((participant, index) => (
        index === 2 ? { ...participant, role: "for" } : participant
      )),
    }],
    ["duplicate domains", {
      ...draftBody,
      rounds: draftBody.rounds.map((round, index) => (
        index === 4 ? { ...round, domain_id: 1, domain: "Domain 1" } : round
      )),
    }],
  ])("create draft rejects invalid slug, blank/overlong motion, duplicate roles, duplicate domains, and unknown users: %s", async (_case, body) => {
    const db = draftDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body, user: { id: 3 } }, res);

    expect(res.state.status).toBe(422);
    expect(db.calls.some((call) => /INSERT INTO/i.test(call.sql))).toBe(false);
  });

  it("create draft rejects invalid slug, blank/overlong motion, duplicate roles, duplicate domains, and unknown users", async () => {
    const db = draftDb({ unknownUser: true });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toMatchObject({ error: "invalid_video_debate_draft" });
    expect(db.calls.map((call) => call.sql.trim())).toContain("ROLLBACK");
    expect(db.calls.some((call) => /INSERT INTO/i.test(call.sql))).toBe(false);
  });

  it("create draft inserts one debate, three participant snapshots, and five round shells in one transaction", async () => {
    const db = draftDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    const statements = db.calls.map((call) => call.sql.trim());
    expect(statements[0]).toBe("BEGIN");
    expect(statements.at(-1)).toBe("COMMIT");
    expect(statements.filter((sql) => /INSERT INTO video_debates/i.test(sql))).toHaveLength(1);
    expect(statements.filter((sql) => /INSERT INTO video_debate_participants/i.test(sql))).toHaveLength(1);
    expect(statements.filter((sql) => /INSERT INTO video_debate_rounds/i.test(sql))).toHaveLength(1);
    expect(res.state.status).toBe(201);
    expect(db.state.released).toBe(true);
  });

  it("create draft derives all four object keys from the generated media id", async () => {
    const db = draftDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    const debateInsert = db.calls.find((call) => /INSERT INTO video_debates/i.test(call.sql));
    const participantInsert = db.calls.find((call) => /INSERT INTO video_debate_participants/i.test(call.sql));
    expect(debateInsert?.values).toContain(`video-debates/${draftMediaId}/poster.webp`);
    expect(participantInsert?.values).toEqual(expect.arrayContaining([
      `video-debates/${draftMediaId}/host.mp4`,
      `video-debates/${draftMediaId}/for.mp4`,
      `video-debates/${draftMediaId}/against.mp4`,
    ]));
    expect(JSON.stringify([...db.calls])).not.toContain("caller-object-key");
  });

  it("create draft stores linked profile snapshots but accepts an unlinked editorial participant", async () => {
    const db = draftDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    const participantInsert = db.calls.find((call) => /INSERT INTO video_debate_participants/i.test(call.sql));
    expect(participantInsert?.values).toEqual(expect.arrayContaining([
      9, "Ada", "/avatars/ada.webp", null, "Noah",
    ]));
    expect(res.state.body).toMatchObject({
      metadata: {
        participants: [
          { role: "host", display_name: "Mira", avatar_url: null },
          { role: "for", display_name: "Ada", avatar_url: "/avatars/ada.webp", username: "ada" },
          { role: "against", display_name: "Noah", avatar_url: null },
        ],
      },
    });
  });

  it("create draft rolls back all rows when any insert fails", async () => {
    const db = draftDb({ failParticipants: true });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    const statements = db.calls.map((call) => call.sql.trim());
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((sql) => /INSERT INTO video_debate_rounds/i.test(sql))).toBe(false);
    expect(statements).not.toContain("COMMIT");
    expect(res.state.status).toBe(500);
    expect(db.state.released).toBe(true);
  });

  it("create draft response contains media id and exact rclone prefix but no credentials", async () => {
    const db = draftDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => draftMediaId });

    await handlers.createVideoDebateDraft({ body: draftBody, user: { id: 3 } }, res);

    expect(res.state.body).toMatchObject({
      mediaId: draftMediaId,
      rclonePrefix: `video-debates/${draftMediaId}/`,
      metadata: { version: 1, draft_id: "41", media_id: draftMediaId },
    });
    const json = JSON.stringify(res.state.body).toLowerCase();
    expect(json).not.toMatch(/access.?key|secret|credential|signed.?url|r2\.cloudflarestorage/);
  });
});

describe("public video debate playback events", () => {
  it("rejects an event for an unpublished or unknown slug", async () => {
    const db = scriptedDb([]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.recordVideoPlaybackEvent(
      { params: { slug: "hidden" }, body: { event: "play_start", at_ms: 0 } },
      res,
    );

    expect(res.state.status).toBe(404);
    expect(db.calls[0]?.sql).toMatch(/status\s*=\s*'published'/i);
  });

  it("rejects a body that does not narrow to one known event", async () => {
    const db = scriptedDb([{ id: 41, duration_ms: 480_000 }]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.recordVideoPlaybackEvent(
      { params: { slug: debate.slug }, body: { event: "seek", at_ms: 10 } },
      res,
    );

    expect(res.state.status).toBe(400);
    expect(res.state.body).toEqual({ error: "invalid_playback_event" });
  });

  it("handler logs one structured video_playback event and returns 204", async () => {
    const db = scriptedDb([{ id: 41, duration_ms: 480_000 }]);
    const res = response();
    const logged: { details: unknown; message: string | undefined }[] = [];
    const handlers = makeVideoDebateHandlers({
      db,
      store,
      logger: {
        error() {},
        info(details: unknown, message?: string) { logged.push({ details, message }); },
      },
    });

    await handlers.recordVideoPlaybackEvent(
      {
        params: { slug: debate.slug },
        body: {
          event: "buffer_end",
          role: "against",
          at_ms: 120_000,
          buffer_ms: 1_400,
          transcript: "Applied learning improves retention.",
          url: "https://media.crux.test/host.mp4",
        },
      },
      res,
    );

    expect(res.state.status).toBe(204);
    expect(logged).toHaveLength(1);
    expect(logged[0]?.message).toBe("video_playback");
    expect(logged[0]?.details).toEqual({
      videoDebateId: 41,
      event: "buffer_end",
      role: "against",
      atMs: 120_000,
      bufferMs: 1_400,
      online: null,
      connection: null,
    });
    expect(JSON.stringify(logged)).not.toMatch(/transcript|mp4/i);
    expect(db.calls.some((call) => /INSERT|UPDATE/i.test(call.sql))).toBe(false);
  });
});

describe("admin video debate metadata and manifest handlers", () => {
  it("admin list returns draft lifecycle rows without storage secrets", async () => {
    const db = scriptedDb([editableDebate]);
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.listAdminVideoDebates({}, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toEqual({ debates: [{
      id: 41,
      slug: draftBody.slug,
      motion: draftBody.motion,
      status: "validated",
      draftRevision: 4,
      validatedRevision: 4,
      submissionHash: "old-manifest-hash",
      validationIssues: [{ code: "old", path: "$", message: "Old issue" }],
    }] });
    expect(JSON.stringify(res.state.body)).not.toMatch(/object_key|credential|secret/i);
  });

  it("admin get returns downloadable draft metadata and exact media prefix", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.getAdminVideoDebate({ params: { id: "41" } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({
      debate: { id: 41, slug: draftBody.slug, status: "validated" },
      mediaId: draftMediaId,
      rclonePrefix: `video-debates/${draftMediaId}/`,
      metadata: { version: 1, draft_id: "41", rounds: draftBody.rounds },
    });
  });

  it("metadata patch permits slug and participant snapshot edits only before publication", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.patchVideoDebateMetadata({
      params: { id: "41" },
      body: {
        slug: "applied-learning-updated",
        participants: [{
          role: "for",
          user_id: 9,
          display_name: "Ada Updated",
          avatar_url: "/avatars/ada-new.webp",
        }],
      },
    }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({
      debate: { id: 41, slug: "applied-learning-updated", status: "media_uploaded" },
      metadata: { participants: [
        { role: "host", display_name: "Mira", avatar_url: null },
        { role: "for", display_name: "Ada Updated", avatar_url: "/avatars/ada-new.webp", username: "ada" },
        { role: "against", display_name: "Noah", avatar_url: null },
      ] },
    });
    expect(db.calls.some((call) => /UPDATE video_debate_participants/i.test(call.sql))).toBe(true);
  });

  it("metadata patch ignores body attempts to change motion, roles, domains, or opener", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.patchVideoDebateMetadata({
      params: { id: "41" },
      body: {
        slug: "applied-learning-updated",
        motion: "Caller cannot replace this.",
        roles: ["against", "host", "for"],
        domains: [99],
        opener: "against",
      },
    }, res);

    const updates = db.calls.filter((call) => /^\s*UPDATE/i.test(call.sql));
    expect(updates).toHaveLength(1);
    expect(updates[0]?.sql).not.toMatch(/\bmotion\s*=|\brole\s*=|\bdomain_id\s*=|\bopener\s*=/i);
    expect(res.state.body).toMatchObject({ metadata: { motion: draftBody.motion, rounds: draftBody.rounds } });
  });

  it("changed metadata increments revision and invalidates validated state", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.patchVideoDebateMetadata({
      params: { id: "41" },
      body: { slug: "applied-learning-updated" },
    }, res);

    expect(res.state.body).toMatchObject({
      debate: {
        status: "media_uploaded",
        draftRevision: 5,
        validatedRevision: null,
        submissionHash: "old-manifest-hash",
        validationIssues: [],
      },
    });
    const update = db.calls.find((call) => /UPDATE video_debates/i.test(call.sql));
    expect(update?.sql).toMatch(/validated_revision\s*=\s*NULL/i);
    expect(update?.sql).not.toMatch(/submission_hash\s*=/i);
  });

  it("identical metadata is idempotent", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.patchVideoDebateMetadata({
      params: { id: "41" },
      body: {
        slug: draftBody.slug,
        participants: draftBody.participants,
      },
    }, res);

    expect(db.calls.some((call) => /^\s*UPDATE/i.test(call.sql))).toBe(false);
    expect(res.state.body).toMatchObject({
      debate: { status: "validated", draftRevision: 4, validatedRevision: 4 },
    });
    expect(db.calls.map((call) => call.sql.trim()).at(-1)).toBe("COMMIT");
  });

  it("metadata patch narrows a non-object body before opening a transaction", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.patchVideoDebateMetadata({ params: { id: "41" }, body: ["invalid"] }, res);

    expect(res.state.status).toBe(422);
    expect(db.calls).toHaveLength(0);
  });

  it.each([
    ["metadata", "patchVideoDebateMetadata", { slug: "published-change" }],
    ["manifest", "putVideoDebateManifest", validManifest()],
  ] as const)("published %s mutations are rejected", async (_case, handler, body) => {
    const db = editorialDb({ ...editableDebate, status: "published" });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });

    await handlers[handler]({ params: { id: "41" }, body }, res);

    expect(res.state.status).toBe(409);
    expect(db.calls.some((call) => /^\s*UPDATE/i.test(call.sql))).toBe(false);
    expect(db.calls.map((call) => call.sql.trim()).at(-1)).toBe("ROLLBACK");
  });

  it("manifest put narrows unknown through validateSubmissionV1 before SQL", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });
    const raw = { ...validManifest(), raw_decode: { hidden: "do not persist" } };

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: raw }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toEqual({
      error: "invalid_video_debate_manifest",
      issues: [{ code: "invalid_keys", path: "$", message: "Submission contains unsupported fields." }],
    });
    expect(db.calls.some((call) => /^\s*UPDATE/i.test(call.sql))).toBe(false);
  });

  it.each([
    ["domains", (manifest: Record<string, any>) => { manifest.timeline[1].domain = "Unknown"; }, "domain_set"],
    ["domain order", (manifest: Record<string, any>) => {
      manifest.timeline[1].domain = "Domain 2";
      manifest.timeline[2].domain = "Domain 1";
    }, "domain_round_mismatch"],
    ["opener", (manifest: Record<string, any>) => { manifest.timeline[1].opener = "against"; }, "opener_alternation"],
  ])("manifest put requires domains and opener to match the immutable draft: %s", async (_case, mutate, code) => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });
    const manifest = validManifest();
    mutate(manifest);

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: manifest }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toMatchObject({ issues: [{ code }] });
    expect(db.calls.some((call) => /^\s*UPDATE/i.test(call.sql))).toBe(false);
  });

  it("manifest put replaces round result/timeline rows and transcript atomically", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: validManifest() }, res);

    const statements = db.calls.map((call) => call.sql.trim());
    expect(statements[0]).toBe("BEGIN");
    expect(statements.at(-1)).toBe("COMMIT");
    expect(statements.filter((sql) => /UPDATE video_debate_rounds/i.test(sql))).toHaveLength(5);
    expect(statements.filter((sql) => /UPDATE video_debate_participants/i.test(sql))).toHaveLength(3);
    const debateUpdate = db.calls.find((call) => /UPDATE video_debates/i.test(call.sql));
    expect(debateUpdate?.values).toContain(JSON.stringify(validManifest().transcript));
  });

  it("equal submission hash returns without incrementing revision", async () => {
    const db = editorialDb({ ...editableDebate, submission_hash: "same-manifest-hash" });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "same-manifest-hash" });

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: validManifest() }, res);

    expect(db.calls.some((call) => /^\s*UPDATE/i.test(call.sql))).toBe(false);
    expect(res.state.body).toMatchObject({
      debate: { status: "validated", draftRevision: 4, submissionHash: "same-manifest-hash" },
    });
  });

  it("changed valid manifest returns status media_uploaded and clears validation", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: validManifest() }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({
      debate: {
        status: "media_uploaded",
        draftRevision: 5,
        validatedRevision: null,
        submissionHash: "new-manifest-hash",
        validationIssues: [],
      },
    });
  });

  it("invalid manifest returns 422 with stable issues and writes no partial round", async () => {
    const db = editorialDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, hash: () => "new-manifest-hash" });
    const manifest = validManifest();
    manifest.rounds = manifest.rounds.slice(0, 4);

    await handlers.putVideoDebateManifest({ params: { id: "41" }, body: manifest }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toEqual({
      error: "invalid_video_debate_manifest",
      issues: [{ code: "round_sequence", path: "rounds", message: "There must be five round results." }],
    });
    expect(db.calls.some((call) => /UPDATE video_debate_rounds/i.test(call.sql))).toBe(false);
    expect(db.calls.map((call) => call.sql.trim()).at(-1)).toBe("ROLLBACK");
  });
});

function storedPublicationFixture(overrides: Record<string, unknown> = {}) {
  const manifest = validManifest();
  const debateRow = {
    ...debate,
    status: "media_uploaded",
    media_id: draftMediaId,
    transcript: manifest.transcript,
    draft_revision: 4,
    validated_revision: null,
    submission_hash: "stored-manifest-hash",
    validation_errors: [],
    poster_probe: manifest.media.poster,
    poster_etag: '"poster-old"',
    poster_checked_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
  const participantRows = editableParticipants.map((participant) => ({
    ...participant,
    media_probe: manifest.media[participant.role],
    media_byte_length: manifest.media[participant.role].byte_length,
    media_etag: `"${participant.role}-old"`,
    media_checked_at: "2026-08-01T00:00:00.000Z",
  }));
  const roundRows = manifest.rounds.map((result: Record<string, any>, index: number) => {
    const timeline = manifest.timeline[index + 1];
    return {
      round_number: result.number,
      domain_id: draftBody.rounds[index]!.domain_id,
      domain: timeline.domain,
      opener: timeline.opener,
      for_start_ms: timeline.for.start_ms,
      for_end_ms: timeline.for.end_ms,
      against_start_ms: timeline.against.start_ms,
      against_end_ms: timeline.against.end_ms,
      grace_start_ms: timeline.grace.start_ms,
      grace_end_ms: timeline.grace.end_ms,
      winner: result.winner,
      for_score: result.for_score,
      against_score: result.against_score,
      ruling: result.ruling,
      for_points: result.points.for,
      against_points: result.points.against,
    };
  });
  return { debateRow, participantRows, roundRows };
}

function publicationDb(overrides: Record<string, unknown> = {}) {
  const fixture = storedPublicationFixture(overrides);
  let lockRow: Record<string, unknown> = { ...fixture.debateRow };
  const db = transactionalDb((sql) => {
    if (/FROM video_debates/i.test(sql)) {
      return [/FOR UPDATE/i.test(sql) ? lockRow : fixture.debateRow];
    }
    if (/FROM video_debate_participants/i.test(sql)) return fixture.participantRows;
    if (/FROM video_debate_rounds/i.test(sql)) return fixture.roundRows;
    return [];
  });
  return {
    ...db,
    fixture,
    setLockRow(next: Record<string, unknown>) { lockRow = next; },
  };
}

function verifyingStore(result: VideoVerificationResult, events: string[] = []) {
  return {
    ...store,
    async verify() {
      events.push("verify");
      return result;
    },
  };
}

const verifiedReceipts = {
  host: { byteLength: 10_000_000, etag: '"host-new"' },
  for: { byteLength: 10_000_000, etag: '"for-new"' },
  against: { byteLength: 10_000_000, etag: '"against-new"' },
  poster: { byteLength: 123_456, etag: '"poster-new"' },
};

describe("admin video debate validation and publication handlers", () => {
  it("media check remains draft and reports all failures when one or more objects fail", async () => {
    const db = publicationDb({ status: "draft" });
    const failures: VideoStorageFailure[] = [
      { object: "host", code: "head_status" },
      { object: "against", code: "cors_origin" },
    ];
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({ ok: false, code: "video_storage_invalid", failures }),
      logger,
    });

    await handlers.checkVideoDebateMedia({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toEqual({ error: "video_storage_invalid", failures });
    expect(db.calls.some((call) => /UPDATE\s+video_debate/i.test(call.sql))).toBe(false);
  });

  it("media check stores etag, length, and checked_at only after all four pass", async () => {
    const db = publicationDb({ status: "draft" });
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({ ok: true, receipts: verifiedReceipts }),
      logger,
    });

    await handlers.checkVideoDebateMedia({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({ debate: { status: "media_uploaded" }, receipts: verifiedReceipts });
    expect(db.calls.filter((call) => /UPDATE video_debate_participants/i.test(call.sql))).toHaveLength(3);
    expect(db.calls.find((call) => /UPDATE video_debate_participants/i.test(call.sql))?.sql).toMatch(/media_checked_at\s*=\s*NOW\(\)/i);
    expect(db.calls.find((call) => /UPDATE video_debates/i.test(call.sql))?.sql).toMatch(/poster_checked_at\s*=\s*NOW\(\)/i);
  });

  it("validation refuses a missing manifest even when media exists", async () => {
    const db = publicationDb({ manifest_version: null, submission_hash: null });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.validateVideoDebate({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toMatchObject({ issues: [{ code: "manifest_missing" }] });
    expect(db.calls.some((call) => /validated_revision\s*=\s*draft_revision/i.test(call.sql))).toBe(false);
  });

  it("validation failure returns to media_uploaded with persisted error codes", async () => {
    const db = publicationDb();
    db.fixture.roundRows[0]!.for_score = 50;
    db.fixture.roundRows[0]!.against_score = 50;
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.validateVideoDebate({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toMatchObject({ debate: { status: "media_uploaded" }, issues: [{ code: "round_draw" }] });
    const update = db.calls.find((call) => /UPDATE video_debates/i.test(call.sql));
    expect(update?.values?.some((value) => typeof value === "string" && value.includes("round_draw"))).toBe(true);
  });

  it("validation pass records admin and matching validated revision", async () => {
    const db = publicationDb();
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({ ok: true, receipts: verifiedReceipts }),
      logger,
    });

    await handlers.validateVideoDebate({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({ debate: { status: "validated", draftRevision: 4, validatedRevision: 4 } });
    const update = db.calls.find((call) => /UPDATE video_debates/i.test(call.sql));
    expect(update?.sql).toMatch(/validated_by\s*=\s*\$\d+/i);
    expect(update?.values).toContain(7);
  });

  it("validation catches a now-missing object after a prior successful check", async () => {
    const db = publicationDb();
    const failure: VideoStorageFailure = { object: "poster", code: "head_status" };
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({ ok: false, code: "video_storage_invalid", failures: [failure] }),
      logger,
    });

    await handlers.validateVideoDebate({ params: { id: "41" }, user: { id: 7 } }, res);

    expect(res.state.status).toBe(422);
    expect(res.state.body).toMatchObject({ issues: [{ code: "head_status", path: "media.poster" }] });
    expect(db.calls.some((call) => /validation_errors/i.test(call.sql) && /UPDATE video_debates/i.test(call.sql))).toBe(true);
  });

  it.each([
    ["draft", 4, null],
    ["media_uploaded", 4, null],
    ["validated", 4, 3],
  ])("publish refuses %s or a stale validated revision", async (status, draftRevision, validatedRevision) => {
    const db = publicationDb({ status, draft_revision: draftRevision, validated_revision: validatedRevision });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(409);
    expect(db.calls.some((call) => /SET status\s*=\s*'published'/i.test(call.sql))).toBe(false);
  });

  it("publish performs R2 verification before opening the database transaction", async () => {
    const events: string[] = [];
    const base = publicationDb({ status: "validated", validated_revision: 4 });
    const db = {
      ...base,
      async connect() { events.push("connect"); return base.connect(); },
    };
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({ ok: true, receipts: verifiedReceipts }, events),
      logger,
    });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(events).toEqual(["verify", "connect"]);
  });

  it("publish refuses a failed recheck", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    const res = response();
    const handlers = makeVideoDebateHandlers({
      db,
      store: verifyingStore({
        ok: false,
        code: "video_storage_invalid",
        failures: [{ object: "host", code: "range_status" }] as VideoStorageFailure[],
      }),
      logger,
    });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(422);
    expect(db.calls.some((call) => /^\s*BEGIN/i.test(call.sql))).toBe(false);
  });

  it("publish locks and rechecks status and revision before setting published", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    db.setLockRow({ ...db.fixture.debateRow, status: "media_uploaded", draft_revision: 5, validated_revision: null });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(409);
    expect(res.state.body).toEqual({ error: "draft_changed" });
    expect(db.calls.some((call) => /SET status\s*=\s*'published'/i.test(call.sql))).toBe(false);
  });

  it("publish stores published_at and publisher exactly once", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(200);
    const updates = db.calls.filter((call) => /UPDATE video_debates/i.test(call.sql));
    expect(updates).toHaveLength(1);
    expect(updates[0]?.sql).toMatch(/published_at\s*=\s*NOW\(\)/i);
    expect(updates[0]?.values).toContain(8);
  });

  it("a second publish is idempotent and does not change published_at", async () => {
    const db = publicationDb({ status: "published", validated_revision: 4, published_at: "2026-08-03T00:00:00.000Z" });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(200);
    expect(db.calls.some((call) => /UPDATE video_debates/i.test(call.sql))).toBe(false);
  });

  it("publish executes no SQL against Arena economy tables", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.publishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(db.calls.map((call) => call.sql).join("\n")).not.toMatch(/\b(arguments|verdicts|stakes|balances|transactions|leaderboard|rankings)\b/i);
  });

  it("unpublish moves published to validated and does not delete or mutate R2 objects", async () => {
    const db = publicationDb({ status: "published", validated_revision: 4 });
    let verifies = 0;
    const noMutationStore = { ...store, async verify() { verifies += 1; return { ok: true as const, receipts: verifiedReceipts }; } };
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store: noMutationStore, logger });

    await handlers.unpublishVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({ debate: { status: "validated" } });
    expect(verifies).toBe(0);
    expect(db.calls.find((call) => /UPDATE video_debates/i.test(call.sql))?.sql).toMatch(/published_at\s*=\s*NULL/i);
  });

  it("rotate media requires an unpublished row and a new generated UUID", async () => {
    const db = publicationDb({ status: "published", validated_revision: 4 });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => "99999999-2222-4333-8444-555555555555" });

    await handlers.rotateVideoDebateMedia({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(409);
    expect(db.calls.some((call) => /UPDATE\s+video_debate/i.test(call.sql))).toBe(false);
  });

  it("rotate media replaces all four derived keys, clears receipts, returns draft, and never reuses old keys", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    const nextMediaId = "99999999-2222-4333-8444-555555555555";
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger, uuid: () => nextMediaId });

    await handlers.rotateVideoDebateMedia({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({ debate: { status: "draft", draftRevision: 5 }, mediaId: nextMediaId });
    const sqlAndValues = JSON.stringify(db.calls);
    expect(sqlAndValues).toContain(`video-debates/${nextMediaId}/host.mp4`);
    expect(sqlAndValues).toContain(`video-debates/${nextMediaId}/for.mp4`);
    expect(sqlAndValues).toContain(`video-debates/${nextMediaId}/against.mp4`);
    expect(sqlAndValues).toContain(`video-debates/${nextMediaId}/poster.webp`);
    expect(sqlAndValues).not.toContain(`video-debates/${draftMediaId}/host.mp4`);
    expect(db.calls.find((call) => /UPDATE video_debate_participants/i.test(call.sql))?.sql).toMatch(/media_etag\s*=\s*NULL/i);
  });

  it("admin preview uses the public detail mapper for a validated row", async () => {
    const db = publicationDb({ status: "validated", validated_revision: 4 });
    const res = response();
    const handlers = makeVideoDebateHandlers({ db, store, logger });

    await handlers.previewVideoDebate({ params: { id: "41" }, user: { id: 8 } }, res);

    expect(res.state.status).toBe(200);
    expect(res.state.body).toMatchObject({ debate: { slug: draftBody.slug }, manifest: { duration_ms: 480_000 } });
    expect(db.calls[0]?.sql).not.toMatch(/status\s*=\s*'published'/i);
  });
});
