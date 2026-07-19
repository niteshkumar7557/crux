// §9 Slice A — Main Stage curation. Pure helpers; the featuring poller mirrors
// these formulas in set-based SQL, and these tests keep them documented.

/** Cards on the Main Stage (excluding the Debate of the Day hero). */
export const FEATURED_SLOTS = 4;
/** Look-back window for comment velocity. */
export const HEAT_WINDOW_HOURS = 24;
/** Featuring poller cadence. */
export const FEATURING_TICK_MS = 300_000; // 5 minutes

/**
 * Heat = recent comment velocity, discounted when the debate is one-sided.
 * balance = min(aff,neg)/max(aff,neg): 0 when a side is empty, 1 when even.
 * heat = velocity * (0.5 + 0.5*balance) — a fast lopsided debate earns half,
 * a balanced fast contest earns full, a dead debate is 0.
 */
export function computeHeat({
  recentComments,
  affComments,
  negComments,
}: {
  recentComments: number;
  affComments: number;
  negComments: number;
}): number {
  const max = Math.max(affComments, negComments);
  const balance = max === 0 ? 0 : Math.min(affComments, negComments) / max;
  return recentComments * (0.5 + 0.5 * balance);
}

/** Rotate the Debate of the Day only once per calendar day. */
export function shouldRotateDotd(alreadyCrownedToday: boolean): boolean {
  return !alreadyCrownedToday;
}

// §9.2 community votes: votes lift a debate's featuring rank on top of organic
// heat. One vote ≈ one heat point (tunable). Mirrored in the poller's SQL.
export const VOTE_WEIGHT = 1.0;

export function effectiveScore(heat: number, votes: number): number {
  return heat + VOTE_WEIGHT * votes;
}
