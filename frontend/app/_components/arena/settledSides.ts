// Compact settled-verdict labels for feed cards, mirroring VerdictBanner's
// RULINGS. Literal class strings so Tailwind's scanner keeps them; terracotta
// only ever means "against", and the draw wears the same neutral as the band
// on the split bars.
export type Side = "for" | "against" | "draw" | "walkover";

// `cls` is the bare text colour; `chip` is the bordered badge a feed card wears
// in place of a countdown once it has settled.
export const SETTLED_SIDES: Record<
  Side,
  { label: string; cls: string; chip: string }
> = {
  for: {
    label: "Affirmative",
    cls: "text-side-for",
    chip: "text-side-for border-side-for/40",
  },
  against: {
    label: "Negative",
    cls: "text-side-against",
    chip: "text-side-against border-side-against/40",
  },
  draw: {
    label: "Draw",
    cls: "text-side-draw",
    chip: "text-side-draw border-side-draw/40",
  },
  // Nobody argued, so nobody scored — it reads as an absence, not a result.
  walkover: {
    label: "Unopposed",
    cls: "text-ink-soft",
    chip: "text-ink-soft border-ink-faint",
  },
};

export function settledSide(winner?: string | null) {
  return SETTLED_SIDES[(winner as Side) ?? "draw"] ?? SETTLED_SIDES.draw;
}
