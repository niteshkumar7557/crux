// The share card's model and its palette, mirrored as hex because satori cannot read
// CSS variables. Uses the LIGHT values on purpose — a certificate is a document you
// keep. Hand-synced with globals.css.

import type { MatchState } from "@/app/motion/types";

export const TOKENS = {
  paper: "#f3edda", // --paper
  forSide: "#2f6b4f", // --for      (affirmative)
  againstSide: "#9c4a34", // --against  (negative)
  laurel: "#8f6e1f", // --laurel   (MVP)
  draw: "#857a55", // --draw
  muted: "#52685b", // --ink-soft (walkover / meta / rules)
  ink: "#244134", // --ink
  track: "#e2dac2", // the split-bar track, a shade under the paper
} as const;

export const CLAIM_MAX = 90;
export const HERO_MAX = 180;

export type CardMode = "for" | "against" | "draw" | "walkover" | "live";

export interface VerdictCardModel {
  mode: CardMode;
  label: string;
  accent: string;
  score: string | null;
  split: { for: number; against: number } | null;
  mvpUsername: string | null;
  heroLine: string;
  claim: string;
  liveNote: string | null;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

function liveNoteFrom(closesAt: string | null): string {
  if (!closesAt) return "LIVE";
  const msLeft = new Date(closesAt).getTime() - Date.now();
  if (msLeft <= 0) return "LIVE · closing soon";
  const hours = Math.floor(msLeft / 3_600_000);
  return hours < 1 ? "LIVE · closing soon" : `LIVE · closes in ${hours}h`;
}

const LABELS: Record<
  "for" | "against" | "draw" | "walkover",
  { label: string; accent: string }
> = {
  for: { label: "AFFIRMATIVE WINS", accent: TOKENS.forSide },
  against: { label: "NEGATIVE WINS", accent: TOKENS.againstSide },
  draw: { label: "DRAW", accent: TOKENS.draw },
  walkover: { label: "UNOPPOSED", accent: TOKENS.muted },
};

export function buildVerdictCard(
  state: MatchState,
  claimRaw: string,
): VerdictCardModel {
  const claim = truncate(claimRaw, CLAIM_MAX);
  const split = { for: state.affirmative, against: state.negative };

  if (state.status === "live") {
    return {
      mode: "live",
      label: "LIVE",
      accent: TOKENS.muted,
      score: null,
      split,
      mvpUsername: null,
      heroLine: claim,
      claim,
      liveNote: liveNoteFrom(state.closesAt),
    };
  }

  const winner = state.winner ?? "draw"; // null on a concluded row → draw
  const { label, accent } = LABELS[winner];
  const isWalkover = winner === "walkover";
  const hero = truncate(state.verdictText ?? "", HERO_MAX);

  return {
    mode: winner,
    label,
    accent,
    score: isWalkover
      ? null
      : `${state.affirmative}–${state.negative} · margin ${state.margin ?? 0}`,
    split: isWalkover ? null : split,
    mvpUsername: isWalkover ? null : state.mvpUsername,
    heroLine: hero,
    claim,
    liveNote: null,
  };
}
