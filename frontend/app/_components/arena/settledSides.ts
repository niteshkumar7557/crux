// Compact settled-verdict labels for feed cards, mirroring VerdictBanner's
// RULINGS. Literal class strings so Tailwind's scanner keeps them; red only
// ever means "against".
export type Side = "for" | "against" | "draw" | "walkover";

// `cls` is the bare text colour; `chip` is the bordered badge a feed card wears
// in place of a countdown once it has settled.
export const SETTLED_SIDES: Record<
  Side,
  { label: string; cls: string; chip: string }
> = {
  for: {
    label: "Affirmative",
    cls: "text-primary",
    chip: "text-primary border-primary/30",
  },
  against: {
    label: "Negative",
    cls: "text-secondary",
    chip: "text-secondary border-secondary/30",
  },
  draw: {
    label: "Draw",
    cls: "text-tertiary",
    chip: "text-tertiary border-tertiary/30",
  },
  walkover: {
    label: "Unopposed",
    cls: "text-outline",
    chip: "text-outline border-outline/30",
  },
};

export function settledSide(winner?: string | null) {
  return SETTLED_SIDES[(winner as Side) ?? "draw"] ?? SETTLED_SIDES.draw;
}
