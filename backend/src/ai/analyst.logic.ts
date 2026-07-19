export type Side = "for" | "against";

export const NONE_YET = "(none yet)";

export interface AnalystPromptInput {
  statement: string;
  side: Side;
  author: string;
  forAnalysis: string | null;
  againstAnalysis: string | null;
  ownIsFirst: boolean;
  comment: string;
}

function orNoneYet(text: string | null): string {
  return text && text.trim().length > 0 ? text : NONE_YET;
}

export function buildAnalystPrompt(input: AnalystPromptInput): string {
  const { statement, side, author, forAnalysis, againstAnalysis, ownIsFirst, comment } =
    input;

  const ownRaw = side === "for" ? forAnalysis : againstAnalysis;
  const opponentRaw = side === "for" ? againstAnalysis : forAnalysis;

  const own = ownIsFirst ? NONE_YET : orNoneYet(ownRaw);
  const opponent = orNoneYet(opponentRaw);

  return `STATEMENT: "${statement}"
SIDE: ${side.toUpperCase()}
AUTHOR: ${author}
OWN SIDE ANALYSIS: ${own}
OPPONENT ANALYSIS: ${opponent}
COMMENT: "${comment}"`;
}

export const REPEAT_GRACE = 3;

// §8.5 #3 "deflate the ratchet": a user's first REPEAT_GRACE comments in a
// debate score full; every comment after that is halved (never below 1).
export function applyRepeatDecay(points: number, priorCount: number): number {
  if (priorCount < REPEAT_GRACE) return points;
  return Math.max(1, Math.floor(points / 2));
}

// §9.3 scarce-side surge: a comment on the trailing side (strictly fewer
// comments than the opponent) earns 1.5× logic. Applied after the 1–8 clamp
// and repeat-decay; may exceed 8 — that is the deliberate surge price.
export const UNDERDOG_MULTIPLIER = 1.5;

export function applyUnderdogMultiplier(
  points: number,
  ownSideCount: number,
  oppSideCount: number,
): number {
  return ownSideCount < oppSideCount
    ? Math.round(points * UNDERDOG_MULTIPLIER)
    : points;
}
