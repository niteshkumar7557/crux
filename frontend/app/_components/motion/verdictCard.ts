// The share card's model and its palette, mirrored as hex because satori cannot
// read CSS variables. Hand-synced with globals.css.
//
// Light is the default, and the share card's only option: a pasted link is opened
// by strangers who have no theme of their own, so it must not depend on who
// pasted it. The CERTIFICATE is different — it is downloaded by one person who
// has already chosen a theme, and it is theirs to keep — so the palette is a
// parameter here rather than a constant. See design-system.md.

import type { MatchState } from "@/app/motion/types";

export const LIGHT_TOKENS = {
  paper: "#f3edda", // --paper
  forSide: "#2f6b4f", // --for      (affirmative)
  againstSide: "#9c4a34", // --against  (negative)
  laurel: "#8f6e1f", // --laurel   (MVP)
  draw: "#857a55", // --draw
  muted: "#52685b", // --ink-soft (walkover / meta / rules)
  ink: "#244134", // --ink
  track: "#e2dac2", // the split-bar track, a shade under the paper
} as const;

// Mapped rather than `typeof LIGHT_TOKENS`: the `as const` above makes every
// value its own literal type, which no second palette could ever satisfy.
export type Palette = { [K in keyof typeof LIGHT_TOKENS]: string };

// [data-theme="dark"] in globals.css, one for one. The exception is `track`: in
// light it sits a shade UNDER the paper, and at night a darker groove reads as a
// hole punched in the page — so it inverts to a shade above, which is
// --paper-raised. Same relationship to the page, opposite direction.
export const DARK_TOKENS: Palette = {
  paper: "#0f1a15", // --paper
  forSide: "#63a882", // --for
  againstSide: "#c97757", // --against
  laurel: "#d4ac3a", // --laurel
  draw: "#a2966c", // --draw
  muted: "#a3b2a4", // --ink-soft
  ink: "#ece5d0", // --ink
  track: "#1b2c24", // --paper-raised, a shade OVER the page at night
};

// The share card and every existing caller import this, and must keep getting light.
export const TOKENS = LIGHT_TOKENS;

export function paletteFor(theme: "light" | "dark"): Palette {
  return theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
}

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

function labelsFor(
  p: Palette,
): Record<
  "for" | "against" | "draw" | "walkover",
  { label: string; accent: string }
> {
  return {
    for: { label: "AFFIRMATIVE WINS", accent: p.forSide },
    against: { label: "NEGATIVE WINS", accent: p.againstSide },
    draw: { label: "DRAW", accent: p.draw },
    walkover: { label: "UNOPPOSED", accent: p.muted },
  };
}

export function buildVerdictCard(
  state: MatchState,
  claimRaw: string,
  palette: Palette = LIGHT_TOKENS,
): VerdictCardModel {
  const claim = truncate(claimRaw, CLAIM_MAX);
  const split = { for: state.affirmative, against: state.negative };

  if (state.status === "live") {
    return {
      mode: "live",
      label: "LIVE",
      accent: palette.muted,
      score: null,
      split,
      mvpUsername: null,
      heroLine: claim,
      claim,
      liveNote: liveNoteFrom(state.closesAt),
    };
  }

  const winner = state.winner ?? "draw"; // null on a concluded row → draw
  const { label, accent } = labelsFor(palette)[winner];
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
