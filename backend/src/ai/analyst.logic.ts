// Argument scoring and the judge's prompt body. Pure.
//
// scoreArgument runs the documented order — clamp to 2-10, then apply the
// standalone cap — and returns the whole breakdown, not just the number, because
// the user is shown the arithmetic.
// Spec: game-theory.md §7, §16, §19

export type Side = "for" | "against";

export const NONE_YET = "(none yet)";

export const SCORE_MIN = 2;
export const SCORE_MAX = 10;
export const STANDALONE_CAP = 7;

// The win split is bounded as a SANITY check, not a judgement one: it stops a
// malformed response corrupting the row, and stops a live debate rendering as
// 0/100, which reads as "over" rather than "losing badly". Movement between
// these ends is deliberately unconstrained — a decisive argument moves the bar
// as far as it deserves.
export const AFFIRMATIVE_MIN = 2;
export const AFFIRMATIVE_MAX = 98;

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
  priorAffirmative: number | null;
  priorNegative: number | null;
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

  // The judge UPDATES this number rather than re-deriving it cold each time —
  // re-deriving is what made the bar swing for no visible reason.
  const aff = input.priorAffirmative ?? 50;
  const neg = input.priorNegative ?? 100 - aff;

  return `MOTION: "${motion}"
PRIOR SPLIT: FOR ${aff} / AGAINST ${neg}
SIDE: ${side.toUpperCase()}
AUTHOR: ${author}
OWN SIDE ANALYSIS: ${own}
OPPONENT ANALYSIS: ${opponent}
OWN SIDE ARGUMENTS:
${buildOwnSideBlock(input.ownSideArguments)}${idBlock}${replyBlock}
ARGUMENT: "${argument}"`;
}

export interface ScoreInput {
  rawPoints: number;
  isReply: boolean;
  opponentHasArguments: boolean;
}

export interface ScoreBreakdown {
  points: number;
  judged: number;
  capped: boolean;
}

function clampScore(points: number): number {
  if (!Number.isFinite(points)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(points)));
}

export function scoreArgument(input: ScoreInput): ScoreBreakdown {
  const judged = clampScore(input.rawPoints);

  // A standalone caps at 7 — unless the opposing side is empty, in which case
  // there was nothing to reply to and the cap would be unfair.
  const capped =
    !input.isReply && input.opponentHasArguments && judged > STANDALONE_CAP;

  return { points: capped ? STANDALONE_CAP : judged, judged, capped };
}

// The judge's win split, bounded. null means "the model gave us nothing usable",
// and the caller leaves the split untouched rather than failing a post that has
// already been committed.
export function clampAffirmative(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(AFFIRMATIVE_MAX, Math.max(AFFIRMATIVE_MIN, Math.round(n)));
}
