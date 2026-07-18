import type { MatchState } from "@/app/argument/types";

// satori (inside next/og) cannot read CSS custom properties, so the
// globals.css design tokens are mirrored here as hex. Keep in sync with
// globals.css. Each key names its --color-* token.
export const TOKENS = {
  bg: "#131314", // --color-background / surface
  cyan: "#a4e6ff", // --color-primary  (affirmative / for)
  red: "#ffb3b2", // --color-secondary (negative / against)
  amber: "#ffd690", // --color-tertiary (draw / MVP)
  outline: "#859399", // --color-outline (walkover / muted / meta)
  onSurface: "#e5e2e3", // --color-on-surface
  onSurfaceVariant: "#bbc9cf", // --color-on-surface-variant
  track: "#1c1b1c", // --color-surface-container-low (split-bar track)
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
  for: { label: "AFFIRMATIVE WINS", accent: TOKENS.cyan },
  against: { label: "NEGATIVE WINS", accent: TOKENS.red },
  draw: { label: "DRAW", accent: TOKENS.amber },
  walkover: { label: "UNOPPOSED", accent: TOKENS.outline },
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
      accent: TOKENS.outline,
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
