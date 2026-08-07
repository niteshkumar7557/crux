// Judging a programme: what the model is shown, what it is allowed to return, and
// how five round rulings become one verdict.
//
// The model's reply is untrusted JSON like any other input, so it is narrowed field
// by field before a score is counted.
// Spec: game-theory.md §16

import type {
  DebateSide,
  FinalExplanation,
  Point,
  RoundResult,
  RoundTimeline,
  TimelineEntry,
  TranscriptSegment,
  ValidationIssue,
  ValidationResult,
} from "./manifest.types.js";
import { CLOSING_JUDGE_SYSTEM_PROMPT } from "./prompts/closing-judge.prompt.js";
import { ROUND_JUDGE_SYSTEM_PROMPT } from "./prompts/round-judge.prompt.js";
import { ROUND_TIE_BREAK_SYSTEM_PROMPT } from "./prompts/round-tie-break.prompt.js";

export const POINT_TEXT_MAX_CHARS = 180;
export const ROUND_RULING_MAX_CHARS = 280;
export const CLOSING_CRUX_MAX_CHARS = 280;
export const CLOSING_VERDICT_MAX_CHARS = 700;
export const MAX_POINTS_PER_SIDE = 4;

type UnknownRecord = Record<string, unknown>;

export type JudgmentSubmission = {
  motion: string;
  timeline: readonly TimelineEntry[];
  transcript: readonly TranscriptSegment[];
};

export type RoundJudgeInput = {
  motion: string;
  domain: string;
  segments: TranscriptSegment[];
};

export type ComputedFinalResult = Pick<FinalExplanation, "winner" | "round_score">;

export type ClosingJudgeInput = {
  motion: string;
  computed: ComputedFinalResult;
  rulings: Array<Pick<RoundResult, "number" | "ruling">>;
  segments: TranscriptSegment[];
};

export type TokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type JudgmentCallResponse = {
  raw: string;
  parsed: unknown;
  usage?: TokenUsage;
};

export type JudgmentCallRequest =
  | {
    decision: "round";
    round: number;
    kind: "normal" | "tiebreak";
    system: string;
    user: string;
  }
  | {
    decision: "closing";
    kind: "closing";
    system: string;
    user: string;
  };

export type JudgmentAttempt = {
  round: number | "closing";
  kind: "normal" | "tiebreak" | "closing";
  attempt: number;
  timestamp: string;
  duration_ms: number;
  raw: string;
  parsed: unknown;
  issues: ValidationIssue[];
  usage?: TokenUsage;
};

export type JudgmentOutput = {
  rounds: RoundResult[];
  final: FinalExplanation;
};

export type JudgmentCall = (request: JudgmentCallRequest) => Promise<JudgmentCallResponse>;
export type JudgmentAttemptHandler = (attempt: JudgmentAttempt) => void | Promise<void>;

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function issue<T>(code: string, path: string, message: string): ValidationResult<T> {
  return { ok: false, errors: [{ code, path, message }] };
}

function withinWindow(segment: TranscriptSegment, window: { start_ms: number; end_ms: number }): boolean {
  return segment.start_ms >= window.start_ms && segment.end_ms <= window.end_ms;
}

function cloneSegment(segment: TranscriptSegment): TranscriptSegment {
  return {
    id: segment.id,
    speaker: segment.speaker,
    start_ms: segment.start_ms,
    end_ms: segment.end_ms,
    text: segment.text,
    phase: segment.phase,
    round: segment.round,
    judged: segment.judged,
  };
}

export function roundJudgeInput(submission: JudgmentSubmission, roundNo: number): RoundJudgeInput {
  const round = submission.timeline.find(
    (entry): entry is RoundTimeline => entry.type === "round" && entry.number === roundNo,
  );
  if (!round) throw new RangeError(`Round ${roundNo} is not present in the timeline.`);

  const segments = submission.transcript
    .filter((segment) => {
      if (!segment.judged || segment.phase !== "judged" || segment.round !== roundNo) return false;
      if (segment.speaker === "for") return withinWindow(segment, round.for);
      if (segment.speaker === "against") return withinWindow(segment, round.against);
      return false;
    })
    .map(cloneSegment);

  return { motion: submission.motion, domain: round.domain, segments };
}

function scopeRound(scope: RoundJudgeInput): number | null {
  const roundNumbers = new Set(
    scope.segments
      .map((segment) => segment.round)
      .filter((round): round is number => Number.isInteger(round)),
  );
  if (roundNumbers.size !== 1) return null;
  return roundNumbers.values().next().value ?? null;
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function validScore(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 100;
}

function sanitizedPoints(
  raw: unknown,
  side: DebateSide,
  roundNo: number,
  segmentsById: ReadonlyMap<string, TranscriptSegment>,
): Point[] | null {
  if (!Array.isArray(raw)) return null;
  const points: Point[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (points.length === MAX_POINTS_PER_SIDE) break;
    const point = object(entry);
    if (!point || typeof point.segment_id !== "string") continue;
    const text = boundedText(point.text, POINT_TEXT_MAX_CHARS);
    if (!text || seen.has(point.segment_id)) continue;
    const segment = segmentsById.get(point.segment_id);
    if (
      !segment ||
      segment.speaker !== side ||
      segment.round !== roundNo ||
      !segment.judged ||
      segment.phase !== "judged"
    ) continue;
    seen.add(point.segment_id);
    points.push({ segment_id: point.segment_id, text });
  }
  return points;
}

export function sanitizeRoundJudgment(
  raw: unknown,
  scope: RoundJudgeInput,
): ValidationResult<RoundResult> {
  const result = object(raw);
  if (!result) return issue("invalid_type", "$", "Round judgment must be an object.");
  const roundNo = scopeRound(scope);
  if (roundNo === null) return issue("invalid_scope", "scope.segments", "Round scope must contain one judged round.");

  if (!validScore(result.for_score) || !validScore(result.against_score)) {
    return issue("invalid_score", "scores", "Round scores must be integers between 0 and 100.");
  }
  if (result.for_score + result.against_score !== 100) {
    return issue("score_sum", "scores", "Round scores must sum to 100.");
  }
  if (result.for_score === result.against_score) {
    return issue("round_draw", "scores", "Round scores cannot be equal.");
  }
  if (result.winner !== "for" && result.winner !== "against") {
    return issue("invalid_winner", "winner", "Round winner must be FOR or AGAINST.");
  }
  if ((result.winner === "for") !== (result.for_score > result.against_score)) {
    return issue("winner_score_mismatch", "winner", "Winner must match the larger score.");
  }
  const ruling = boundedText(result.ruling, ROUND_RULING_MAX_CHARS);
  if (!ruling) return issue("invalid_ruling", "ruling", "Ruling must be non-blank and within its limit.");

  const rawPoints = object(result.points);
  if (!rawPoints) return issue("invalid_points", "points", "Points must contain FOR and AGAINST arrays.");
  const segmentsById = new Map(scope.segments.map((segment) => [segment.id, segment]));
  const forPoints = sanitizedPoints(rawPoints.for, "for", roundNo, segmentsById);
  const againstPoints = sanitizedPoints(rawPoints.against, "against", roundNo, segmentsById);
  if (!forPoints || !againstPoints) {
    return issue("invalid_points", "points", "Points must contain FOR and AGAINST arrays.");
  }

  return {
    ok: true,
    value: {
      number: roundNo,
      winner: result.winner,
      for_score: result.for_score,
      against_score: result.against_score,
      ruling,
      points: { for: forPoints, against: againstPoints },
    },
  };
}

export function computeFinalResult(rounds: readonly RoundResult[]): ComputedFinalResult {
  if (rounds.length !== 5) throw new RangeError("A video debate result requires exactly five rounds.");
  const forWins = rounds.filter((round) => round.winner === "for").length;
  const againstWins = rounds.length - forWins;
  return {
    winner: forWins > againstWins ? "for" : "against",
    round_score: { for: forWins, against: againstWins },
  };
}

export function closingJudgeInput(
  submission: Pick<JudgmentSubmission, "motion" | "transcript">,
  rounds: readonly RoundResult[],
  computed: ComputedFinalResult,
): ClosingJudgeInput {
  if (rounds.length !== 5) throw new RangeError("Closing input requires five sanitized round rulings.");
  return {
    motion: submission.motion,
    computed: {
      winner: computed.winner,
      round_score: { for: computed.round_score.for, against: computed.round_score.against },
    },
    rulings: rounds.map((round) => ({ number: round.number, ruling: round.ruling })),
    segments: submission.transcript
      .filter((segment) =>
        segment.judged &&
        segment.phase === "judged" &&
        (segment.speaker === "for" || segment.speaker === "against") &&
        segment.round !== null &&
        segment.round >= 1 &&
        segment.round <= 5,
      )
      .map(cloneSegment),
  };
}

export function sanitizeClosing(
  raw: unknown,
  computed: ComputedFinalResult,
): ValidationResult<FinalExplanation> {
  const closing = object(raw);
  if (!closing) return issue("invalid_type", "$", "Closing must be an object.");
  const crux = boundedText(closing.crux, CLOSING_CRUX_MAX_CHARS);
  const verdict = boundedText(closing.verdict, CLOSING_VERDICT_MAX_CHARS);
  if (!crux || !verdict) {
    return issue("invalid_closing", "$", "Crux and verdict must be non-blank and within their limits.");
  }
  return {
    ok: true,
    value: {
      winner: computed.winner,
      round_score: { for: computed.round_score.for, against: computed.round_score.against },
      crux,
      verdict,
    },
  };
}

async function attempt<T>(
  call: JudgmentCall,
  request: JudgmentCallRequest,
  validate: (parsed: unknown) => ValidationResult<T>,
  onAttempt: JudgmentAttemptHandler,
  attemptNumber: number,
): Promise<ValidationResult<T>> {
  const timestamp = new Date().toISOString();
  const startedAt = Date.now();
  let response: JudgmentCallResponse;
  try {
    response = await call(request);
  } catch {
    const message = "Judgment provider call failed.";
    await onAttempt({
      round: request.decision === "round" ? request.round : "closing",
      kind: request.kind,
      attempt: attemptNumber,
      timestamp,
      duration_ms: Date.now() - startedAt,
      raw: "",
      parsed: null,
      issues: [{ code: "provider_error", path: "provider", message }],
    });
    throw new Error(message);
  }
  const result = validate(response.parsed);
  await onAttempt({
    round: request.decision === "round" ? request.round : "closing",
    kind: request.kind,
    attempt: attemptNumber,
    timestamp,
    duration_ms: Date.now() - startedAt,
    raw: response.raw,
    parsed: response.parsed,
    issues: result.ok ? [] : result.errors,
    ...(response.usage ? { usage: response.usage } : {}),
  });
  return result;
}

export async function runJudgment(
  call: JudgmentCall,
  submission: JudgmentSubmission,
  onAttempt: JudgmentAttemptHandler,
): Promise<JudgmentOutput> {
  const scopes = [1, 2, 3, 4, 5].map((round) => {
    const scope = roundJudgeInput(submission, round);
    if (scopeRound(scope) !== round) {
      throw new RangeError(`invalid_scope round ${round}: Round scope must contain judged transcript segments.`);
    }
    return scope;
  });
  const rounds: RoundResult[] = [];
  for (let round = 1; round <= 5; round += 1) {
    const scope = scopes[round - 1]!;
    const user = JSON.stringify(scope);
    let accepted: RoundResult | undefined;
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      const kind = attemptNumber <= 2 ? "normal" : "tiebreak";
      const result = await attempt(
        call,
        {
          decision: "round",
          round,
          kind,
          system: kind === "normal" ? ROUND_JUDGE_SYSTEM_PROMPT : ROUND_TIE_BREAK_SYSTEM_PROMPT,
          user,
        },
        (parsed) => sanitizeRoundJudgment(parsed, scope),
        onAttempt,
        kind === "normal" ? attemptNumber : 1,
      );
      if (result.ok) {
        accepted = result.value;
        break;
      }
    }
    if (!accepted) throw new Error(`Round ${round} remained invalid after its tie-break attempt.`);
    rounds.push(accepted);
  }

  const computed = computeFinalResult(rounds);
  const result = await attempt(
    call,
    {
      decision: "closing",
      kind: "closing",
      system: CLOSING_JUDGE_SYSTEM_PROMPT,
      user: JSON.stringify(closingJudgeInput(submission, rounds, computed)),
    },
    (parsed) => sanitizeClosing(parsed, computed),
    onAttempt,
    1,
  );
  if (!result.ok) throw new Error("Closing judgment was invalid.");
  return { rounds, final: result.value };
}
