// Argument scoring and the two per-argument prompt bodies. Pure.
//
// scoreArgument runs the documented order — clamp to 1-8, apply the standalone cap,
// then halve for repeats — and returns the whole breakdown, not just the number,
// because the user is shown the arithmetic.
// Spec: game-theory.md §7, §16, §19

export type Side = "for" | "against";

export const NONE_YET = "(none yet)";

export const SCORE_MIN = 1;
export const SCORE_MAX = 8;
export const STANDALONE_CAP = 5;
export const FULL_VALUE_ARGUMENTS = 3;

export const OWN_SIDE_ARGUMENT_LIMIT = 12;
export const OWN_SIDE_ARGUMENT_MAX_CHARS = 400;

export interface ReplyTarget {
  username: string;
  content: string;
}

export interface OwnSideArgument {
  id: number;
  username: string;
  content: string;
}

export interface AnalystPromptInput {
  motion: string;
  side: Side;
  author: string;
  ownAnalysis: string;
  opponentAnalysis: string;
  ownIsFirst: boolean;
  argument: string;
  replyTo: ReplyTarget | null;
  ownSideArguments: OwnSideArgument[];
  newArgumentId: number | null;
}

function orNoneYet(text: string | null): string {
  return text && text.trim().length > 0 ? text : NONE_YET;
}

export function buildOwnSideBlock(ownSide: OwnSideArgument[]): string {
  if (ownSide.length === 0) return NONE_YET;
  return ownSide
    .slice(-OWN_SIDE_ARGUMENT_LIMIT)
    .map((c) => {
      const text =
        c.content.length > OWN_SIDE_ARGUMENT_MAX_CHARS
          ? `${c.content.slice(0, OWN_SIDE_ARGUMENT_MAX_CHARS)}…`
          : c.content;
      return `[#${c.id}] @${c.username}: "${text}"`;
    })
    .join("\n");
}

export function buildAnalystPrompt(input: AnalystPromptInput): string {
  const { motion, side, author, ownIsFirst, argument, replyTo } = input;

  const own = ownIsFirst ? NONE_YET : orNoneYet(input.ownAnalysis);
  const opponent = orNoneYet(input.opponentAnalysis);

  // Without this the analyst can name the argument it just scored but cannot
  // cite it, so the newest point would be the only unlinked one on the panel.
  const idBlock =
    input.newArgumentId !== null ? `\nYOUR ARGUMENT ID: ${input.newArgumentId}` : "";

  // The reply target is the single most important scoring signal (§18), so it
  // gets its own labelled block rather than being folded into prose.
  const replyBlock = replyTo
    ? `\nREPLYING TO @${replyTo.username}: "${replyTo.content}"`
    : "";

  return `MOTION: "${motion}"
SIDE: ${side.toUpperCase()}
AUTHOR: ${author}
OWN SIDE ANALYSIS: ${own}
OPPONENT ANALYSIS: ${opponent}
OWN SIDE ARGUMENTS:
${buildOwnSideBlock(input.ownSideArguments)}${idBlock}${replyBlock}
ARGUMENT: "${argument}"`;
}

export interface ProbabilityPromptInput {
  motion: string;
  priorAffirmative: number | null;
  priorNegative: number | null;
  forAnalysis: string | null;
  againstAnalysis: string | null;
  latest: { username: string; side: Side; content: string };
}

export function buildProbabilityPrompt(input: ProbabilityPromptInput): string {
  const aff = input.priorAffirmative ?? 50;
  const neg = input.priorNegative ?? 100 - aff;
  return `MOTION: "${input.motion}"
PRIOR SPLIT: FOR ${aff} / AGAINST ${neg}
LATEST ARGUMENT — @${input.latest.username} [${input.latest.side.toUpperCase()}]: "${input.latest.content}"

FOR analysis: ${orNoneYet(input.forAnalysis)}
AGAINST analysis: ${orNoneYet(input.againstAnalysis)}`;
}

export interface ScoreInput {
  rawPoints: number;
  isReply: boolean;
  opponentHasArguments: boolean;
  priorCount: number;
}

export interface ScoreBreakdown {
  points: number;
  judged: number;
  capped: boolean;
  halved: boolean;
}

function clampScore(points: number): number {
  if (!Number.isFinite(points)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(points)));
}

export function scoreArgument(input: ScoreInput): ScoreBreakdown {
  const judged = clampScore(input.rawPoints);

  // A standalone caps at 5 — unless the opposing side is empty, in which case
  // there was nothing to reply to and the cap would be unfair.
  const capApplies =
    !input.isReply && input.opponentHasArguments && judged > STANDALONE_CAP;
  const afterCap = capApplies ? STANDALONE_CAP : judged;

  const halveApplies = input.priorCount >= FULL_VALUE_ARGUMENTS;
  const points = halveApplies ? Math.max(1, Math.floor(afterCap / 2)) : afterCap;

  return { points, judged, capped: capApplies, halved: halveApplies };
}
