/**
 * §7/§14 — when to warn that a debate is heading for a walkover.
 *
 * A walkover pays NOBODY, the author included, so the risk has to be visible
 * while a reader can still fix it by arguing. But an empty side is also the
 * normal state of a young debate: warn from the first minute and the banner
 * fires on nearly every new statement until it becomes furniture. The window
 * is where an empty side stops being early and starts being the ending.
 *
 * Pure, and takes `now`, so the boundary is testable without waiting for it.
 */
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
  // Past the deadline the conclusion job simply has not run yet; there is no
  // longer anything a reader can do, so warning would only be a taunt.
  if (msLeft <= 0) return false;

  return msLeft <= WALKOVER_WARNING_HOURS * MS_PER_HOUR;
}

/** Which side needs an argument, or null when neither has spoken. */
export function emptySideLabel(
  forCount: number,
  againstCount: number,
): "FOR" | "AGAINST" | null {
  if (forCount === 0 && againstCount === 0) return null;
  return forCount === 0 ? "FOR" : "AGAINST";
}
