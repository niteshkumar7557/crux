import { describe, expect, it } from "vitest";
import {
  CLOSING_CRUX_MAX_CHARS,
  CLOSING_VERDICT_MAX_CHARS,
  MAX_POINTS_PER_SIDE,
  POINT_TEXT_MAX_CHARS,
  ROUND_RULING_MAX_CHARS,
  closingJudgeInput,
  computeFinalResult,
  roundJudgeInput,
  runJudgment,
  sanitizeClosing,
  sanitizeRoundJudgment,
} from "./judgment.logic.js";
import type {
  DebateSide,
  RoundResult,
  TimelineEntry,
  TranscriptSegment,
} from "./manifest.types.js";
import { CLOSING_JUDGE_SYSTEM_PROMPT } from "./prompts/closing-judge.prompt.js";
import { ROUND_JUDGE_SYSTEM_PROMPT } from "./prompts/round-judge.prompt.js";
import { ROUND_TIE_BREAK_SYSTEM_PROMPT } from "./prompts/round-tie-break.prompt.js";

const timeline: TimelineEntry[] = [
  { type: "intro", start_ms: 0, end_ms: 10_000 },
  roundTimeline(1, "Education", "for", 10_000),
  roundTimeline(2, "Economics & Business", "against", 80_000),
  roundTimeline(3, "Ethics & Philosophy", "for", 150_000),
  roundTimeline(4, "Society & Culture", "against", 220_000),
  roundTimeline(5, "Technology & AI", "for", 290_000),
  { type: "outro", start_ms: 360_000, end_ms: 370_000 },
];

const transcript: TranscriptSegment[] = [
  segment("host-intro", "host", 1_000, "Welcome to the debate.", "intro", null, false),
  segment("for-r1-1", "for", 11_000, "Applied work shows durable understanding.", "judged", 1, true),
  segment("against-r1-1", "against", 41_000, "Exams provide a consistent comparison.", "judged", 1, true),
  segment("for-grace-r1", "for", 71_000, "A grace-period reply.", "grace", 1, false),
  segment("against-r2-1", "against", 81_000, "Round two begins here.", "judged", 2, true),
  segment("for-r2-1", "for", 111_000, "Round two continues here.", "judged", 2, true),
  segment("for-r3-1", "for", 151_000, "Round three FOR.", "judged", 3, true),
  segment("against-r3-1", "against", 181_000, "Round three AGAINST.", "judged", 3, true),
  segment("against-r4-1", "against", 221_000, "Round four AGAINST opens.", "judged", 4, true),
  segment("for-r4-1", "for", 251_000, "Round four FOR responds.", "judged", 4, true),
  segment("for-r5-1", "for", 291_000, "Round five is still judged.", "judged", 5, true),
  segment("against-r5-1", "against", 321_000, "The final response is still judged.", "judged", 5, true),
  segment("host-outro", "host", 361_000, "Thank you.", "outro", null, false),
];

const submission = {
  motion: "Coursework should replace final examinations.",
  timeline,
  transcript,
};

describe("roundJudgeInput", () => {
  it("round one input contains no host, grace, intro, outro, or later-round text", () => {
    const input = roundJudgeInput(submission, 1);

    expect(input).toEqual({
      motion: "Coursework should replace final examinations.",
      domain: "Education",
      segments: [transcript[1], transcript[2]],
    });
    expect(JSON.stringify(input)).not.toContain("Welcome to the debate");
    expect(JSON.stringify(input)).not.toContain("grace-period");
    expect(JSON.stringify(input)).not.toContain("Round two");
    expect(JSON.stringify(input)).not.toContain("Thank you");
  });

  it("round five is built even when one side already has three wins", () => {
    const submissionWithEarlyWin = {
      ...submission,
      rounds: [roundResult(1, "for"), roundResult(2, "for"), roundResult(3, "for")],
    };
    const input = roundJudgeInput(submissionWithEarlyWin, 5);

    expect(input.domain).toBe("Technology & AI");
    expect(input.segments.map((entry) => entry.id)).toEqual(["for-r5-1", "against-r5-1"]);
  });

  it("keeps speaking order as transcript metadata without adding a rubric preference", () => {
    const input = roundJudgeInput(submission, 2);

    expect(input.segments.map((entry) => entry.speaker)).toEqual(["against", "for"]);
    expect(Object.keys(input)).toEqual(["motion", "domain", "segments"]);
    expect(ROUND_JUDGE_SYSTEM_PROMPT).toContain("Speaking order is not a scoring advantage");
  });
});

describe("sanitizeRoundJudgment", () => {
  const scope = roundJudgeInput({
    ...submission,
    transcript: [
      ...transcript,
      segment("for-r1-2", "for", 12_000, "A second supported point.", "judged", 1, true),
      segment("for-r1-3", "for", 13_000, "A third supported point.", "judged", 1, true),
      segment("for-r1-4", "for", 14_000, "A fourth supported point.", "judged", 1, true),
      segment("for-r1-5", "for", 15_000, "A fifth supported point.", "judged", 1, true),
    ],
  }, 1);

  it("narrows malformed model output without throwing", () => {
    const inheritedModelFields = Object.create(validRaw()) as unknown;
    for (const raw of [null, [], "not an object", { winner: "for" }, { ...validRaw(), points: null }, inheritedModelFields]) {
      expect(() => sanitizeRoundJudgment(raw, scope)).not.toThrow();
      expect(sanitizeRoundJudgment(raw, scope).ok).toBe(false);
    }
  });

  it("rejects a missing winner, 50-50 split, non-integers, and non-100 sum", () => {
    const { winner: _winner, ...missingWinner } = validRaw();
    const invalid = [
      missingWinner,
      { ...validRaw(), for_score: 50, against_score: 50 },
      { ...validRaw(), for_score: 62.5, against_score: 37.5 },
      { ...validRaw(), for_score: 61, against_score: 38 },
    ];

    expect(invalid.map((raw) => sanitizeRoundJudgment(raw, scope).ok)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("rejects a winner inconsistent with the larger score", () => {
    expect(sanitizeRoundJudgment({ ...validRaw(), winner: "against" }, scope).ok).toBe(false);
  });

  it("drops invented, cross-side, cross-round, unjudged, duplicate, and fifth points", () => {
    const raw = validRaw();
    raw.points.for = [
      { segment_id: "invented", text: "Invented." },
      { segment_id: "against-r1-1", text: "Cross-side." },
      { segment_id: "for-r2-1", text: "Cross-round." },
      { segment_id: "for-grace-r1", text: "Unjudged." },
      { segment_id: "for-r1-1", text: "First real point." },
      { segment_id: "for-r1-1", text: "Duplicate citation." },
      { segment_id: "for-r1-2", text: "Second real point." },
      { segment_id: "for-r1-3", text: "Third real point." },
      { segment_id: "for-r1-4", text: "Fourth real point." },
      { segment_id: "for-r1-5", text: "Fifth real point." },
    ];

    const outcome = sanitizeRoundJudgment(raw, scope);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.points.for).toEqual([
      { segment_id: "for-r1-1", text: "First real point." },
      { segment_id: "for-r1-2", text: "Second real point." },
      { segment_id: "for-r1-3", text: "Third real point." },
      { segment_id: "for-r1-4", text: "Fourth real point." },
    ]);
  });

  it("resolves point timing and speaker only from real transcript ids", () => {
    const raw = validRaw();
    raw.points.for = [{
      segment_id: "for-r1-1",
      text: "Applied work demonstrates understanding.",
      speaker: "host",
      round: 5,
      start_ms: 1,
      end_ms: 2,
    }];

    const outcome = sanitizeRoundJudgment(raw, scope);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.points.for[0]).toEqual({
      segment_id: "for-r1-1",
      text: "Applied work demonstrates understanding.",
    });
    expect(scope.segments.find((entry) => entry.id === outcome.value.points.for[0]?.segment_id)).toMatchObject({
      speaker: "for",
      round: 1,
      start_ms: 11_000,
      end_ms: 12_000,
    });
  });

  it("enforces the literal output-shape caps", () => {
    expect({
      point: POINT_TEXT_MAX_CHARS,
      ruling: ROUND_RULING_MAX_CHARS,
      crux: CLOSING_CRUX_MAX_CHARS,
      verdict: CLOSING_VERDICT_MAX_CHARS,
      pointsPerSide: MAX_POINTS_PER_SIDE,
    }).toEqual({ point: 180, ruling: 280, crux: 280, verdict: 700, pointsPerSide: 4 });

    const accepted = validRaw();
    accepted.ruling = "r".repeat(280);
    accepted.points.for = [{ segment_id: "for-r1-1", text: "p".repeat(180) }];
    expect(sanitizeRoundJudgment(accepted, scope).ok).toBe(true);

    expect(sanitizeRoundJudgment({ ...validRaw(), ruling: "r".repeat(281) }, scope).ok).toBe(false);
    const tooLongPoint = validRaw();
    tooLongPoint.points.for = [{ segment_id: "for-r1-1", text: "p".repeat(181) }];
    const dropped = sanitizeRoundJudgment(tooLongPoint, scope);
    expect(dropped.ok).toBe(true);
    if (dropped.ok) expect(dropped.value.points.for).toEqual([]);
  });
});

describe("match result and closing", () => {
  it("computes literal 3-2, 4-1, and 5-0 results from exactly five winners", () => {
    expect(computeFinalResult(winners("for", "against", "for", "against", "for"))).toEqual({
      winner: "for",
      round_score: { for: 3, against: 2 },
    });
    expect(computeFinalResult(winners("against", "against", "against", "for", "against"))).toEqual({
      winner: "against",
      round_score: { for: 1, against: 4 },
    });
    expect(computeFinalResult(winners("for", "for", "for", "for", "for"))).toEqual({
      winner: "for",
      round_score: { for: 5, against: 0 },
    });
    expect(() => computeFinalResult(winners("for", "for", "against", "against"))).toThrow();
  });

  it("never trusts a closing winner or round score", () => {
    const computed = { winner: "for" as const, round_score: { for: 3, against: 2 } };
    const outcome = sanitizeClosing({
      winner: "against",
      round_score: { for: 0, against: 5 },
      crux: "Whether consistent comparison outweighs applied understanding.",
      verdict: "FOR carried three domains by meeting the motion's burden more directly.",
    }, computed);

    expect(outcome).toEqual({
      ok: true,
      value: {
        winner: "for",
        round_score: { for: 3, against: 2 },
        crux: "Whether consistent comparison outweighs applied understanding.",
        verdict: "FOR carried three domains by meeting the motion's burden more directly.",
      },
    });
  });

  it("rejects blank or overlong closing crux and verdict", () => {
    const computed = { winner: "for" as const, round_score: { for: 3, against: 2 } };
    const valid = { crux: "c".repeat(280), verdict: "v".repeat(700) };

    expect(sanitizeClosing(valid, computed).ok).toBe(true);
    expect(sanitizeClosing({ ...valid, crux: "   " }, computed).ok).toBe(false);
    expect(sanitizeClosing({ ...valid, crux: "c".repeat(281) }, computed).ok).toBe(false);
    expect(sanitizeClosing({ ...valid, verdict: "" }, computed).ok).toBe(false);
    expect(sanitizeClosing({ ...valid, verdict: "v".repeat(701) }, computed).ok).toBe(false);
  });

  it("builds closing input from the computed result, five rulings, and judged transcript only", () => {
    const rounds = winners("for", "against", "for", "against", "for");
    const computed = computeFinalResult(rounds);
    const input = closingJudgeInput(submission, rounds, computed);

    expect(input.computed).toEqual({ winner: "for", round_score: { for: 3, against: 2 } });
    expect(input.rulings).toEqual(rounds.map((entry) => ({ number: entry.number, ruling: entry.ruling })));
    expect(input.segments).toHaveLength(10);
    expect(input.segments.every((entry) => entry.judged && entry.phase === "judged")).toBe(true);
    expect(JSON.stringify(input)).not.toContain("Welcome to the debate");
    expect(JSON.stringify(input)).not.toContain("grace-period");
    expect(JSON.stringify(input)).not.toContain("Thank you");
  });
});

describe("runJudgment", () => {
  it("preflights every round scope before the first provider call or attempt record", async () => {
    const calls: number[] = [];
    const attempts: number[] = [];
    const missingRoundFive = {
      ...submission,
      transcript: submission.transcript.filter((entry) => entry.round !== 5),
    };

    await expect(runJudgment(async (request) => {
      if (request.decision === "round") calls.push(request.round);
      return response(request.decision === "round" ? validRaw() : validClosing());
    }, missingRoundFive, async (attempt) => {
      attempts.push(attempt.attempt);
    })).rejects.toThrow("invalid_scope round 5: Round scope must contain judged transcript segments.");

    expect(calls).toEqual([]);
    expect(attempts).toEqual([]);
  });

  it("calls rounds 1 through 5 even after an early third win", async () => {
    const seenRounds: number[] = [];
    const result = await runJudgment(async (request) => {
      if (request.decision === "closing") return response(validClosing());
      seenRounds.push(request.round);
      return response(validRaw("for"));
    }, submission, async () => {});

    expect(seenRounds).toEqual([1, 2, 3, 4, 5]);
    expect(result.rounds.map((round) => round.winner)).toEqual(["for", "for", "for", "for", "for"]);
  });

  it("retries one malformed normal response then accepts a valid response", async () => {
    const attempts: Array<{ round: number | "closing"; kind: string; issues: string[] }> = [];
    let roundOneCalls = 0;
    const result = await runJudgment(async (request) => {
      if (request.decision === "closing") return response(validClosing());
      if (request.round === 1 && roundOneCalls++ === 0) return response({ winner: "for" });
      return response(validRaw(request.round % 2 === 0 ? "against" : "for"));
    }, submission, async (attempt) => {
      attempts.push({
        round: attempt.round,
        kind: attempt.kind,
        issues: attempt.issues.map((entry) => entry.code),
      });
    });

    expect(attempts.slice(0, 2)).toEqual([
      { round: 1, kind: "normal", issues: ["invalid_score"] },
      { round: 1, kind: "normal", issues: [] },
    ]);
    expect(result.rounds[0]?.winner).toBe("for");
  });

  it("uses the tiebreak prompt only after two invalid normal results", async () => {
    const calls: Array<{ system: string; user: string }> = [];
    let roundOneCalls = 0;
    await runJudgment(async (request) => {
      calls.push({ system: request.system, user: request.user });
      if (request.decision === "closing") return response(validClosing());
      if (request.round === 1 && roundOneCalls++ < 2) return response(drawRaw());
      return response(validRaw("for"));
    }, submission, async () => {});

    expect(calls.slice(0, 3).map((call) => call.system)).toEqual([
      ROUND_JUDGE_SYSTEM_PROMPT,
      ROUND_JUDGE_SYSTEM_PROMPT,
      ROUND_TIE_BREAK_SYSTEM_PROMPT,
    ]);
    expect(calls[0]?.user).toBe(calls[1]?.user);
    expect(calls[1]?.user).toBe(calls[2]?.user);
  });

  it("stops without closing when a round remains invalid", async () => {
    const decisions: string[] = [];
    const run = runJudgment(async (request) => {
      decisions.push(request.decision);
      return response(drawRaw());
    }, submission, async () => {});

    await expect(run).rejects.toThrow("Round 1 remained invalid after its tie-break attempt");
    expect(decisions).toEqual(["round", "round", "round"]);
  });

  it("records one safe attempt and stops when the provider call throws", async () => {
    const attempts: Array<{
      round: number | "closing";
      kind: string;
      raw: string;
      parsed: unknown;
      issues: Array<{ code: string; path: string; message: string }>;
    }> = [];
    let calls = 0;

    const run = runJudgment(async () => {
      calls += 1;
      throw new Error("secret-provider-detail");
    }, submission, async (attempt) => {
      attempts.push({
        round: attempt.round,
        kind: attempt.kind,
        raw: attempt.raw,
        parsed: attempt.parsed,
        issues: attempt.issues,
      });
    });

    await expect(run).rejects.toThrow("Judgment provider call failed.");
    expect(calls).toBe(1);
    expect(attempts).toEqual([{
      round: 1,
      kind: "normal",
      raw: "",
      parsed: null,
      issues: [{ code: "provider_error", path: "provider", message: "Judgment provider call failed." }],
    }]);
    expect(JSON.stringify(attempts)).not.toContain("secret-provider-detail");
  });

  it("calls closing once with the code-computed winner and five rulings", async () => {
    const closingInputs: unknown[] = [];
    const result = await runJudgment(async (request) => {
      if (request.decision === "closing") {
        closingInputs.push(JSON.parse(request.user));
        return response({
          winner: "against",
          round_score: { for: 0, against: 5 },
          ...validClosing(),
        });
      }
      return response(validRaw(request.round === 2 || request.round === 4 ? "against" : "for"));
    }, submission, async () => {});

    expect(closingInputs).toEqual([{
      motion: submission.motion,
      computed: { winner: "for", round_score: { for: 3, against: 2 } },
      rulings: [1, 2, 3, 4, 5].map((number) => ({
        number,
        ruling: number === 2 || number === 4
          ? "AGAINST made the stronger domain case."
          : "FOR made the stronger domain case.",
      })),
      segments: transcript.filter((entry) => entry.judged),
    }]);
    expect(result.final).toEqual({
      winner: "for",
      round_score: { for: 3, against: 2 },
      ...validClosing(),
    });
  });
});

describe("video judgment prompts", () => {
  it("puts decoded claims and comparison before numeric scores and winner", () => {
    const keys = [
      "for_decoded_claim",
      "against_decoded_claim",
      "comparison",
      "for_score",
      "against_score",
      "winner",
      "ruling",
      "points",
    ];
    const positions = keys.map((key) => ROUND_JUDGE_SYSTEM_PROMPT.indexOf(`\"${key}\"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it("states the approved rubric in order and forbids every unapproved tie-break preference", () => {
    const criteria = [
      "relevance to the assigned domain",
      "logical soundness and support",
      "handling of the motion's burden under that domain",
      "specificity and material significance",
    ];
    const positions = criteria.map((criterion) => ROUND_JUDGE_SYSTEM_PROMPT.indexOf(criterion));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    for (const forbidden of ["grace", "speaking order", "length", "polish", "accent", "fluency"]) {
      expect(ROUND_JUDGE_SYSTEM_PROMPT.toLowerCase()).toContain(forbidden);
    }
  });

  it("keeps tie-break input scope unchanged and requires a non-equal split", () => {
    expect(ROUND_TIE_BREAK_SYSTEM_PROMPT).toContain("only the motion, assigned domain, and the same two judged transcript windows");
    expect(ROUND_TIE_BREAK_SYSTEM_PROMPT).toContain("must not be equal");
    expect(ROUND_TIE_BREAK_SYSTEM_PROMPT).toContain("Speaking order is not a scoring advantage");
  });

  it("allows closing to return only crux and verdict after a computed result", () => {
    expect(CLOSING_JUDGE_SYSTEM_PROMPT).toContain("code-computed winner and round score");
    expect(CLOSING_JUDGE_SYSTEM_PROMPT).toContain('{"crux":"...","verdict":"..."}');
    expect(CLOSING_JUDGE_SYSTEM_PROMPT).not.toContain('"winner":');
    expect(CLOSING_JUDGE_SYSTEM_PROMPT).not.toContain('"round_score":');
  });
});

function roundTimeline(number: number, domain: string, opener: DebateSide, start_ms: number) {
  const first = { start_ms, end_ms: start_ms + 30_000 };
  const second = { start_ms: start_ms + 30_000, end_ms: start_ms + 60_000 };
  return {
    type: "round" as const,
    number,
    domain,
    opener,
    for: opener === "for" ? first : second,
    against: opener === "against" ? first : second,
    grace: { start_ms: start_ms + 60_000, end_ms: start_ms + 70_000 },
  };
}

function segment(
  id: string,
  speaker: TranscriptSegment["speaker"],
  start_ms: number,
  text: string,
  phase: TranscriptSegment["phase"],
  round: number | null,
  judged: boolean,
): TranscriptSegment {
  return { id, speaker, start_ms, end_ms: start_ms + 1_000, text, phase, round, judged };
}

function validRaw(winner: DebateSide = "for"): Record<string, any> {
  return {
    for_decoded_claim: "FOR says applied work is a better measure.",
    against_decoded_claim: "AGAINST says examinations compare students consistently.",
    comparison: "Whether application or comparability better satisfies assessment's burden.",
    for_score: winner === "for" ? 62 : 38,
    against_score: winner === "against" ? 62 : 38,
    winner,
    ruling: `${winner.toUpperCase()} made the stronger domain case.`,
    points: { for: [], against: [] },
  };
}

function drawRaw(): Record<string, any> {
  return { ...validRaw(), for_score: 50, against_score: 50 };
}

function validClosing() {
  return {
    crux: "Whether application outweighs consistent comparison.",
    verdict: "FOR prevailed in three domains by meeting their burdens more directly.",
  };
}

function response(parsed: unknown) {
  return { raw: JSON.stringify(parsed), parsed, usage: { prompt_tokens: 100, completion_tokens: 50 } };
}

function roundResult(number: number, winner: DebateSide): RoundResult {
  return {
    number,
    winner,
    for_score: winner === "for" ? 60 : 40,
    against_score: winner === "against" ? 60 : 40,
    ruling: `Round ${number} goes to ${winner.toUpperCase()}.`,
    points: { for: [], against: [] },
  };
}

function winners(...sides: DebateSide[]): RoundResult[] {
  return sides.map((side, index) => roundResult(index + 1, side));
}
