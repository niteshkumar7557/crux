export type Side = "for" | "against";

export const NONE_YET = "(none yet)";

// §15 — the comment-scoring constants. These are the game.
export const SCORE_MIN = 1;
export const SCORE_MAX = 8;
/** §6: a standalone comment engages nothing specific, so it caps here. */
export const STANDALONE_CAP = 5;
/** §6: this many comments per debate score full; the rest are halved. */
export const FULL_VALUE_COMMENTS = 3;

/** §6: how many of the side's own comments the analyst is shown. */
export const OWN_SIDE_COMMENT_LIMIT = 12;
/** Each one trimmed to this — enough to recognise a point, not to re-read it. */
export const OWN_SIDE_COMMENT_MAX_CHARS = 400;

export interface ReplyTarget {
  username: string;
  content: string;
}

/** One comment already on the commenter's own side. */
export interface OwnSideComment {
  id: number;
  username: string;
  content: string;
}

export interface AnalystPromptInput {
  statement: string;
  side: Side;
  author: string;
  forAnalysis: string | null;
  againstAnalysis: string | null;
  ownIsFirst: boolean;
  comment: string;
  /** The opposing comment being answered, or null for a standalone. */
  replyTo: ReplyTarget | null;
  /** Everything already argued on this side, oldest first. */
  ownSideComments: OwnSideComment[];
}

function orNoneYet(text: string | null): string {
  return text && text.trim().length > 0 ? text : NONE_YET;
}

/**
 * The side's existing comments, each tagged with its real comment id. The ids
 * are what lets the analyst attribute a point to the exact comment it came
 * from; the text is what lets it recognise a repost that this module's
 * verbatim check could not (a reworded restatement).
 *
 * Only the most recent few, trimmed: a long debate would otherwise grow this
 * block without bound on a prompt that runs on every single comment.
 */
export function buildOwnSideBlock(comments: OwnSideComment[]): string {
  if (comments.length === 0) return NONE_YET;
  return comments
    .slice(-OWN_SIDE_COMMENT_LIMIT)
    .map((c) => {
      const text =
        c.content.length > OWN_SIDE_COMMENT_MAX_CHARS
          ? `${c.content.slice(0, OWN_SIDE_COMMENT_MAX_CHARS)}…`
          : c.content;
      return `[#${c.id}] @${c.username}: "${text}"`;
    })
    .join("\n");
}

export function buildAnalystPrompt(input: AnalystPromptInput): string {
  const { statement, side, author, ownIsFirst, comment, replyTo } = input;

  const ownRaw = side === "for" ? input.forAnalysis : input.againstAnalysis;
  const opponentRaw = side === "for" ? input.againstAnalysis : input.forAnalysis;

  const own = ownIsFirst ? NONE_YET : orNoneYet(ownRaw);
  const opponent = orNoneYet(opponentRaw);

  // The reply target is the single most important scoring signal (§13.1), so
  // it goes in its own labelled block rather than being folded into prose.
  const replyBlock = replyTo
    ? `\nREPLYING TO @${replyTo.username}: "${replyTo.content}"`
    : "";

  return `STATEMENT: "${statement}"
SIDE: ${side.toUpperCase()}
AUTHOR: ${author}
OWN SIDE ANALYSIS: ${own}
OPPONENT ANALYSIS: ${opponent}
OWN SIDE COMMENTS:
${buildOwnSideBlock(input.ownSideComments)}${replyBlock}
COMMENT: "${comment}"`;
}

export interface ProbabilityPromptInput {
  statement: string;
  /** arguments.affirmative — the split the debate currently shows. */
  priorAffirmative: number | null;
  priorNegative: number | null;
  forAnalysis: string | null;
  againstAnalysis: string | null;
  /** The comment that just landed — the delta the nudge reacts to. */
  latest: { username: string; side: Side; content: string };
}

/**
 * §12 — the Probability Judge's user message. Unlike the Analyst prompt this
 * one is *stateful*: it carries the PRIOR SPLIT and the comment that just
 * landed, so the judge nudges the bar from where it was instead of re-deriving
 * it cold. The prior defaults to 50/50 (the `arguments.affirmative/negative`
 * column default), so a null can never render a broken prompt.
 */
export function buildProbabilityPrompt(input: ProbabilityPromptInput): string {
  const aff = input.priorAffirmative ?? 50;
  const neg = input.priorNegative ?? 100 - aff;
  return `STATEMENT: "${input.statement}"
PRIOR SPLIT: FOR ${aff} / AGAINST ${neg}
LATEST COMMENT — @${input.latest.username} [${input.latest.side.toUpperCase()}]: "${input.latest.content}"

FOR analysis: ${orNoneYet(input.forAnalysis)}
AGAINST analysis: ${orNoneYet(input.againstAnalysis)}`;
}

export interface ScoreInput {
  /** The raw 1-8 the model returned. May be out of range or NaN. */
  rawPoints: number;
  /** True when this comment targets a specific opposing comment. */
  isReply: boolean;
  /** True when the opposing side already has at least one comment. */
  opponentHasComments: boolean;
  /** How many comments this user already made in this debate. */
  priorCount: number;
}

export interface ScoreBreakdown {
  /** The final award. */
  points: number;
  /** What the model scored it, after clamping to 1-8. */
  judged: number;
  /** True if the standalone cap bit. */
  capped: boolean;
  /** True if the repeat-decay halving bit. */
  halved: boolean;
}

function clampScore(points: number): number {
  if (!Number.isFinite(points)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(points)));
}

/**
 * §6 — the whole scoring pipeline, in the documented order:
 * clamp to 1-8, apply the standalone cap, then halve for repeats.
 *
 * The breakdown is returned (not just the number) because §14 requires the
 * user to be shown the arithmetic in the points pop-up. Every modifier that
 * bites must be nameable in the UI.
 */
export function scoreComment(input: ScoreInput): ScoreBreakdown {
  const judged = clampScore(input.rawPoints);

  // A standalone caps at 5 -- unless the opposing side is empty, in which
  // case there was nothing to reply to and the cap would be unfair.
  const capApplies =
    !input.isReply && input.opponentHasComments && judged > STANDALONE_CAP;
  const afterCap = capApplies ? STANDALONE_CAP : judged;

  const halveApplies = input.priorCount >= FULL_VALUE_COMMENTS;
  const points = halveApplies ? Math.max(1, Math.floor(afterCap / 2)) : afterCap;

  return { points, judged, capped: capApplies, halved: halveApplies };
}
