// Compact settled-verdict labels for feed cards, mirroring VerdictBanner's
// RULINGS. Literal class strings so Tailwind's scanner keeps them; red only
// ever means "against".
export type Side = "for" | "against" | "draw" | "walkover";

export const SETTLED_SIDES: Record<Side, { label: string; cls: string }> = {
  for: { label: "Affirmative", cls: "text-primary" },
  against: { label: "Negative", cls: "text-secondary" },
  draw: { label: "Draw", cls: "text-tertiary" },
  walkover: { label: "Unopposed", cls: "text-outline" },
};

export function settledSide(winner?: string | null) {
  return SETTLED_SIDES[(winner as Side) ?? "draw"] ?? SETTLED_SIDES.draw;
}
