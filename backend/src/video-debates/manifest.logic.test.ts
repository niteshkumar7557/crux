import { describe, expect, it } from "vitest";
import { toPlaybackManifest, validateSubmissionV1 } from "./manifest.logic.js";

const expected = {
  domains: [
    { id: 1, name: "Education" },
    { id: 2, name: "Economics & Business" },
    { id: 3, name: "Ethics & Philosophy" },
    { id: 4, name: "Society & Culture" },
    { id: 5, name: "Technology & AI" },
  ],
  roundOneOpener: "for" as const,
};

const validSubmission = (): Record<string, any> => ({
  version: 1,
  duration_ms: 480_000,
  media: {
    host: mediaProbe(480_000),
    for: mediaProbe(480_000),
    against: mediaProbe(480_000),
    poster: { format: "webp", width: 1600, height: 900, byte_length: 123_456 },
  },
  timeline: [
    { type: "intro", start_ms: 0, end_ms: 30_000 },
    round(1, "Education", "for", 30_000, 115_000),
    round(2, "Economics & Business", "against", 115_000, 200_000),
    round(3, "Ethics & Philosophy", "for", 200_000, 285_000),
    round(4, "Society & Culture", "against", 285_000, 370_000),
    round(5, "Technology & AI", "for", 370_000, 455_000),
    { type: "outro", start_ms: 455_000, end_ms: 480_000 },
  ],
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
  rounds: [
    result(1, "for", 62, 38, "for-0001"),
    result(2, "against", 42, 58),
    result(3, "for", 61, 39),
    result(4, "against", 47, 53),
    result(5, "for", 60, 40),
  ],
  final: {
    winner: "for",
    round_score: { for: 3, against: 2 },
    crux: "Whether education should prioritize application over recall.",
    verdict: "FOR won three domains by connecting learning to application.",
  },
});

function mediaProbe(duration_ms: number) {
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

function round(
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

function result(
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
    ruling: "The winning side made the stronger case.",
    points: {
      for: segment_id ? [{ segment_id, text: "Applied learning improves retention." }] : [],
      against: [],
    },
  };
}

describe("validateSubmissionV1", () => {
  it("accepts a complete seven-part V1 timeline", () => {
    const outcome = validateSubmissionV1(validSubmission(), expected);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.timeline).toHaveLength(7);
    expect(outcome.value.rounds).toHaveLength(5);
    expect(
      outcome.value.timeline.flatMap((entry) =>
        entry.type === "round" ? [entry.for, entry.against, entry.grace] : [],
      ),
    ).toHaveLength(15);
  });

  it("rejects a timeline without explicit intro and outro", () => {
    const submission = validSubmission();
    submission.timeline = submission.timeline.slice(1, -1);

    expect(issueCode(submission)).toBe("timeline_shape");
  });

  it("rejects any round number outside the exact 1 through 5 sequence", () => {
    const submission = validSubmission();
    submission.timeline[2] = { ...submission.timeline[2], number: 4 };

    expect(issueCode(submission)).toBe("round_sequence");
  });

  it("rejects an unsafe media byte length before persistence", () => {
    const submission = validSubmission();
    submission.media.host.byte_length = Number.MAX_SAFE_INTEGER + 1;

    expect(issueCode(submission)).toBe("invalid_shape");
  });

  it("rejects duplicate or unknown domains", () => {
    const duplicate = validSubmission();
    duplicate.timeline[2] = { ...duplicate.timeline[2], domain: "Education" };
    const unknown = validSubmission();
    unknown.timeline[2] = { ...unknown.timeline[2], domain: "Law" };

    expect(issueCode(duplicate)).toBe("domain_set");
    expect(issueCode(unknown)).toBe("domain_set");
  });

  it("rejects a non-alternating opener sequence", () => {
    const submission = validSubmission();
    submission.timeline[2] = { ...submission.timeline[2], opener: "for" };

    expect(issueCode(submission)).toBe("opener_alternation");
  });

  it("rejects duplicate participant media roles", () => {
    const submission = validSubmission();
    Object.assign(submission.media, { operator: mediaProbe(480_000) });

    expect(issueCode(submission)).toBe("media_roles");
  });

  it("rejects a duration over ten minutes", () => {
    const submission = validSubmission();
    submission.duration_ms = 600_001;

    expect(issueCode(submission)).toBe("duration_limit");
  });

  it("rejects media probes whose pairwise duration spread exceeds 100 ms", () => {
    const submission = validSubmission();
    submission.media.host.duration_ms = 479_900;
    submission.media.for.duration_ms = 480_100;

    expect(issueCode(submission)).toBe("media_duration");
  });

  it("requires h264 1280x720 yuv420p video on all three tracks", () => {
    const wrongCodec = validSubmission();
    wrongCodec.media.host.video_codec = "hevc";
    const wrongDimensions = validSubmission();
    wrongDimensions.media.for.width = 1920;
    const wrongPixelFormat = validSubmission();
    wrongPixelFormat.media.against.pixel_format = "yuv444p";

    expect(issueCode(wrongCodec)).toBe("media_video");
    expect(issueCode(wrongDimensions)).toBe("media_video");
    expect(issueCode(wrongPixelFormat)).toBe("media_video");
  });

  it("requires matching rational frame rates", () => {
    const malformed = validSubmission();
    malformed.media.host.frame_rate = "not-a-rate";
    const mismatched = validSubmission();
    mismatched.media.against.frame_rate = "30000/1001";

    expect(issueCode(malformed)).toBe("media_frame_rate");
    expect(issueCode(mismatched)).toBe("media_frame_rate");
  });

  it("requires matching non-blank video profiles", () => {
    const submission = validSubmission();
    submission.media.against.video_profile = "Main";

    expect(issueCode(submission)).toBe("media_video_profile");
  });

  it("accepts recognized H.264 profiles beyond the initial five-profile set", () => {
    const submission = validSubmission();
    submission.media.host.video_profile = "High 10";
    submission.media.for.video_profile = "High 10";
    submission.media.against.video_profile = "High 10";

    expect(issueCode(submission)).toBeNull();
  });

  it("requires aac 48khz audio on all three tracks", () => {
    const wrongCodec = validSubmission();
    wrongCodec.media.host.audio_codec = "opus";
    const wrongSampleRate = validSubmission();
    wrongSampleRate.media.for.audio_sample_rate_hz = 44_100;

    expect(issueCode(wrongCodec)).toBe("media_audio");
    expect(issueCode(wrongSampleRate)).toBe("media_audio");
  });

  it("requires durations within 100ms and none over ten minutes", () => {
    const spread = validSubmission();
    spread.media.against.duration_ms = 480_101;
    const overLimit = validSubmission();
    overLimit.duration_ms = 600_000;
    overLimit.media.host.duration_ms = 600_001;
    overLimit.media.for.duration_ms = 600_001;
    overLimit.media.against.duration_ms = 600_001;

    expect(issueCode(spread)).toBe("media_duration");
    expect(issueCode(overLimit)).toBe("media_duration");
  });

  it("requires a maximum keyframe interval no greater than 2100ms", () => {
    const submission = validSubmission();
    submission.media.for.max_keyframe_interval_ms = 2_101;

    expect(issueCode(submission)).toBe("media_keyframe_interval");
  });

  it("requires a video bitrate between 2 and 3 Mbps", () => {
    const tooLow = validSubmission();
    tooLow.media.host.video_bitrate_bps = 1_999_999;
    const tooHigh = validSubmission();
    tooHigh.media.for.video_bitrate_bps = 3_000_001;

    expect(issueCode(tooLow)).toBe("video_bitrate");
    expect(issueCode(tooHigh)).toBe("video_bitrate");
  });

  it("requires the MP4 moov atom to precede mdat for faststart delivery", () => {
    const submission = validSubmission();
    submission.media.host.faststart = false;

    expect(issueCode(submission)).toBe("media_faststart");
  });

  it("requires a 1600x900 webp poster no larger than 500kb", () => {
    const wrongFormat = validSubmission();
    wrongFormat.media.poster.format = "png";
    const tooLarge = validSubmission();
    tooLarge.media.poster.byte_length = 500_001;

    expect(issueCode(wrongFormat)).toBe("poster_format");
    expect(issueCode(tooLarge)).toBe("poster_size");
  });

  it("rejects blank media profiles and frame rates plus non-positive bitrates and keyframe intervals", () => {
    const blankProfile = validSubmission();
    blankProfile.media.host.video_profile = "   ";
    const garbageProfile = validSubmission();
    garbageProfile.media.host.video_profile = "not-a-profile";
    garbageProfile.media.for.video_profile = "not-a-profile";
    garbageProfile.media.against.video_profile = "not-a-profile";
    const blankFrameRate = validSubmission();
    blankFrameRate.media.for.frame_rate = "";
    const zeroBitrate = validSubmission();
    zeroBitrate.media.against.video_bitrate_bps = 0;
    const negativeKeyframeInterval = validSubmission();
    negativeKeyframeInterval.media.host.max_keyframe_interval_ms = -1;

    expect(issueCode(blankProfile)).toBe("media_video_profile");
    expect(issueCode(garbageProfile)).toBe("media_video_profile");
    expect(issueCode(blankFrameRate)).toBe("media_frame_rate");
    expect(issueCode(zeroBitrate)).toBe("video_bitrate");
    expect(issueCode(negativeKeyframeInterval)).toBe("media_keyframe_interval");
  });

  it("rejects a non-positive or non-integer timestamp", () => {
    const zero = validSubmission();
    zero.timeline[0] = { ...zero.timeline[0], end_ms: 0 };
    const fractional = validSubmission();
    fractional.timeline[1] = {
      ...fractional.timeline[1],
      for: { ...fractional.timeline[1].for, end_ms: 60_000.5 },
    };

    expect(issueCode(zero)).toBe("invalid_timestamp");
    expect(issueCode(fractional)).toBe("invalid_timestamp");
  });

  it("rejects more than 2000 transcript segments or segment text over 1000 characters", () => {
    const tooMany = validSubmission();
    tooMany.transcript = Array.from({ length: 2001 }, (_, index) => ({
      ...tooMany.transcript[0],
      id: `for-${index}`,
    }));
    const tooLong = validSubmission();
    tooLong.transcript[0] = { ...tooLong.transcript[0], text: "x".repeat(1001) };

    expect(issueCode(tooMany)).toBe("transcript_limit");
    expect(issueCode(tooLong)).toBe("transcript_limit");
  });

  it("rejects transcript ids over 64 characters or duplicate ids", () => {
    const tooLong = validSubmission();
    tooLong.transcript[0] = { ...tooLong.transcript[0], id: "x".repeat(65) };
    const duplicate = validSubmission();
    duplicate.transcript.push({ ...duplicate.transcript[0] });

    expect(issueCode(tooLong)).toBe("segment_id");
    expect(issueCode(duplicate)).toBe("segment_id");
  });

  it("rejects a transcript debater whose speaker disagrees with the timed turn", () => {
    const submission = validSubmission();
    submission.transcript[0].speaker = "against";

    expect(issueCode(submission)).toBe("transcript_scope");
  });

  it("accepts explicit null rounds for canonical intro and outro transcript segments", () => {
    const submission = validSubmission();
    submission.transcript.push(
      {
        id: "host-intro",
        speaker: "host",
        start_ms: 1_000,
        end_ms: 2_000,
        text: "Welcome to the debate.",
        phase: "intro",
        round: null,
        judged: false,
      },
      {
        id: "host-outro",
        speaker: "host",
        start_ms: 456_000,
        end_ms: 457_000,
        text: "Thank you both.",
        phase: "outro",
        round: null,
        judged: false,
      },
    );

    const outcome = validateSubmissionV1(submission, expected);

    expect(outcome.ok).toBe(true);
  });

  it("rejects a non-integer transcript round as an invalid shape", () => {
    const submission = validSubmission();
    submission.transcript[0].round = "1";

    expect(issueCode(submission)).toBe("invalid_shape");
  });

  it("rejects a null round on a judged segment through phase-window scope validation", () => {
    const submission = validSubmission();
    submission.transcript[0].round = null;

    expect(issueCode(submission)).toBe("transcript_scope");
  });

  it("rejects 50-50 and every tied round split", () => {
    const fiftyFifty = validSubmission();
    fiftyFifty.rounds[0] = result(1, "for", 50, 50, "for-0001");
    const otherTie = validSubmission();
    otherTie.rounds[0] = result(1, "for", 40, 40, "for-0001");

    expect(issueCode(fiftyFifty)).toBe("round_draw");
    expect(issueCode(otherTie)).toBe("round_draw");
  });

  it("rejects scores that do not sum to 100", () => {
    const submission = validSubmission();
    submission.rounds[0] = result(1, "for", 61, 38, "for-0001");

    expect(issueCode(submission)).toBe("score_sum");
  });

  it("rejects round scores outside the 100-point range", () => {
    const submission = validSubmission();
    submission.rounds[0] = result(1, "against", -1, 101, "for-0001");

    expect(issueCode(submission)).toBe("score_range");
  });

  it("rejects a winner that disagrees with the larger score", () => {
    const submission = validSubmission();
    submission.rounds[0] = result(1, "against", 62, 38, "for-0001");

    expect(issueCode(submission)).toBe("winner_score_mismatch");
  });

  it("rejects a final result that disagrees with all five winners", () => {
    const submission = validSubmission();
    submission.final = {
      ...submission.final,
      winner: "against",
      round_score: { for: 2, against: 3 },
    };

    expect(issueCode(submission)).toBe("final_result_mismatch");
  });

  it("rejects an invented point segment id", () => {
    const submission = validSubmission();
    submission.rounds[0].points.for = [{ segment_id: "made-up", text: "A point." }];

    expect(issueCode(submission)).toBe("unknown_segment");
  });

  it("rejects a citation from the wrong side or round", () => {
    const wrongSide = validSubmission();
    wrongSide.transcript.push({
      id: "against-0001",
      speaker: "against",
      start_ms: 61_000,
      end_ms: 62_000,
      text: "The opposing case is incomplete.",
      phase: "judged",
      round: 1,
      judged: true,
    });
    wrongSide.rounds[0].points.for = [{ segment_id: "against-0001", text: "A point." }];
    const wrongRound = validSubmission();
    wrongRound.transcript.push({
      id: "against-0002",
      speaker: "against",
      start_ms: 116_000,
      end_ms: 117_000,
      text: "The economic argument needs evidence.",
      phase: "judged",
      round: 2,
      judged: true,
    });
    wrongRound.rounds[0].points.against = [{ segment_id: "against-0002", text: "A point." }];

    expect(issueCode(wrongSide)).toBe("citation_scope");
    expect(issueCode(wrongRound)).toBe("citation_scope");
  });

  it("rejects a citation outside a judged window", () => {
    const submission = validSubmission();
    submission.transcript.push({
      id: "for-grace-0001",
      speaker: "for",
      start_ms: 91_000,
      end_ms: 92_000,
      text: "A graceful follow-up.",
      phase: "grace",
      round: 1,
      judged: false,
    });
    submission.rounds[0].points.for = [{ segment_id: "for-grace-0001", text: "A point." }];

    expect(issueCode(submission)).toBe("citation_unjudged");
  });

  it("rejects more than four points on one side", () => {
    const submission = validSubmission();
    const segments = Array.from({ length: 5 }, (_, index) => ({
      id: `for-point-${index}`,
      speaker: "for" as const,
      start_ms: 31_000 + index * 1_000,
      end_ms: 31_500 + index * 1_000,
      text: `Point ${index}.`,
      phase: "judged" as const,
      round: 1,
      judged: true,
    }));
    submission.transcript = segments;
    submission.rounds[0].points.for = segments.map((segment) => ({
      segment_id: segment.id,
      text: segment.text,
    }));

    expect(issueCode(submission)).toBe("point_limit");
  });

  it("public projection contains no media probes, object keys, hashes, or raw model fields", () => {
    const outcome = validateSubmissionV1(validSubmission(), expected);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    Object.assign(outcome.value.media.host, {
      object_key: "video-debates/private/host.mp4",
      sha256: "secret-hash",
    });
    Object.assign(outcome.value.rounds[0]!, {
      for_decoded_claim: "Operator-only raw model field.",
    });

    const publicJson = JSON.stringify(toPlaybackManifest(outcome.value));

    expect(publicJson).not.toContain("media");
    expect(publicJson).not.toContain("object_key");
    expect(publicJson).not.toContain("secret-hash");
    expect(publicJson).not.toContain("for_decoded_claim");
  });
});

function issueCode(raw: unknown): string | null {
  const outcome = validateSubmissionV1(raw, expected);
  return outcome.ok ? null : outcome.errors[0]?.code ?? null;
}
