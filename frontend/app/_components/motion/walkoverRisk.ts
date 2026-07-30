// When to warn that a debate is heading for a walkover. Frontend-only: it changes
// WHEN the warning shows, never a payout. Warning from the first minute would fire
// on nearly every new motion until the banner became furniture.
// Spec: game-theory.md §11, §19

export const WALKOVER_WARNING_HOURS = 6;

const MS_PER_HOUR = 3_600_000;

export interface WalkoverInput {
  status: string;
  closesAt: string | null;
  forCount: number;
  againstCount: number;
  now: number;
}

export function atWalkoverRisk({
  status,
  closesAt,
  forCount,
  againstCount,
  now,
}: WalkoverInput): boolean {
  if (status !== "live") return false;
  if (forCount > 0 && againstCount > 0) return false;
  if (!closesAt) return false;

  const closes = new Date(closesAt).getTime();
  if (Number.isNaN(closes)) return false;

  const msLeft = closes - now;
  if (msLeft <= 0) return false;

  return msLeft <= WALKOVER_WARNING_HOURS * MS_PER_HOUR;
}

export function emptySideLabel(
  forCount: number,
  againstCount: number,
): "FOR" | "AGAINST" | null {
  if (forCount === 0 && againstCount === 0) return null;
  return forCount === 0 ? "FOR" : "AGAINST";
}
