export type Side = "for" | "against";

export const NONE_YET = "(none yet)";

// §15 — the argument-scoring constants. These are the game.
export const SCORE_MIN = 1;
export const SCORE_MAX = 8;
/** §6: a standalone argument engages nothing specific, so it caps here. */
export const STANDALONE_CAP = 5;
/** §6: this many arguments per debate score full; the rest are halved. */
export const FULL_VALUE_ARGUMENTS = 3;

/** §6: how many of the side's own arguments the analyst is shown. */
export const OWN_SIDE_ARGUMENT_LIMIT = 12;
/** Each one trimmed to this — enough to recognise a point, not to re-read it. */
export const OWN_SIDE_ARGUMENT_MAX_CHARS = 400;

export interface ReplyTarget {
  username: string;
  content: string;
}

/** One argument already on the debater's own side. */
export interface OwnSideArgument {
  id: number;
  username: string;
  content: string;
}

export interface AnalystPromptInput {
  motion: string;
  side: Side;
  author: string;
  /**
   * The debater's own side, already rendered — with `[#id]` against each
   * attributed point, so a point the analyst keeps can keep its link.
   */
  ownAnalysis: string;
  /** The opposing side, rendered without ids: context, not material. */
  opponentAnalysis: string;
  ownIsFirst: boolean;
  argument: string;
  /** The opposing argument being answered, or null for a standalone. */
  replyTo: ReplyTarget | null;
  /** Everything already argued on this side, oldest first. */
  ownSideArguments: OwnSideArgument[];
  /**
   * The id the argument being scored WILL have. Reserved from the sequence
   * before the model runs, because the analyst has to be able to attribute a
   * point to an argument that has not been inserted yet.
   */
  newArgumentId: number | null;
}

function orNoneYet(text: string | null): string {
  return text && text.trim().length > 0 ? text : NONE_YET;
}

/**
 * The side's existing arguments, each tagged with its real argument id. The ids
 * are what lets the analyst attribute a point to the exact argument it came
 * from; the text is what lets it recognise a repost that this module's
 * verbatim check could not (a reworded restatement).
 *
 * Only the most recent few, trimmed: a long debate would otherwise grow this
 * block without bound on a prompt that runs on every single argument.
 */
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
  // cite it, so the newest point — the one the debater cares about — would
  // be the only unlinked one on the panel.
  const idBlock =
    input.newArgumentId !== null ? `\nYOUR ARGUMENT ID: ${input.newArgumentId}` : "";

  // The reply target is the single most important scoring signal (§13.1), so
  // it goes in its own labelled block rather than being folded into prose.
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
  /** motions.affirmative — the split the debate currently shows. */
  priorAffirmative: number | null;
  priorNegative: number | null;
  forAnalysis: string | null;
  againstAnalysis: string | null;
  /** The argument that just landed — the delta the nudge reacts to. */
  latest: { username: string; side: Side; content: string };
}

/**
 * §12 — the Probability Judge's user message. Unlike the Analyst prompt this
 * one is *stateful*: it carries the PRIOR SPLIT and the argument that just
 * landed, so the judge nudges the bar from where it was instead of re-deriving
 * it cold. The prior defaults to 50/50 (the `motions.affirmative/negative`
 * column default), so a null can never render a broken prompt.
 */
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
  /** The raw 1-8 the model returned. May be out of range or NaN. */
  rawPoints: number;
  /** True when this argument targets a specific opposing argument. */
  isReply: boolean;
  /** True when the opposing side already has at least one argument. */
  opponentHasArguments: boolean;
  /** How many arguments this user already made in this debate. */
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
export function scoreArgument(input: ScoreInput): ScoreBreakdown {
  const judged = clampScore(input.rawPoints);

  // A standalone caps at 5 -- unless the opposing side is empty, in which
  // case there was nothing to reply to and the cap would be unfair.
  const capApplies =
    !input.isReply && input.opponentHasArguments && judged > STANDALONE_CAP;
  const afterCap = capApplies ? STANDALONE_CAP : judged;

  const halveApplies = input.priorCount >= FULL_VALUE_ARGUMENTS;
  const points = halveApplies ? Math.max(1, Math.floor(afterCap / 2)) : afterCap;

  return { points, judged, capped: capApplies, halved: halveApplies };
}
