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

// §6 diminishing returns: a user's first REPEAT_GRACE comments in a debate
// score full; every comment after that is halved (never below 1).
export function applyRepeatDecay(points: number, priorCount: number): number {
  if (priorCount < REPEAT_GRACE) return points;
  return Math.max(1, Math.floor(points / 2));
}
