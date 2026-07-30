// Labels and classes for a settled outcome. Literal class strings — Tailwind cannot see runtime-built names.

export type Side = "for" | "against" | "draw" | "walkover";

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
  walkover: {
    label: "Unopposed",
    cls: "text-ink-soft",
    chip: "text-ink-soft border-ink-faint",
  },
};

export function settledSide(winner?: string | null) {
  return SETTLED_SIDES[(winner as Side) ?? "draw"] ?? SETTLED_SIDES.draw;
}
