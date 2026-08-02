// Participation-cap arithmetic. Pure — the DB query that finds the most
// recent LIFTED block for (user, motion) lives in argument.controller.ts and
// block.controller.ts; this module only does the arithmetic once that row
// (or its absence) is in hand.
// Spec: game-theory.md §22

export const ARGUMENT_LIMIT = 5;

// The number in a lift row is a TOTAL, not an increment — reading it later
// needs no arithmetic, and it's the number the admin actually reasoned about.
export function effectiveAllowance(mostRecentLift: { allowance: number } | null): number {
  return mostRecentLift ? mostRecentLift.allowance : ARGUMENT_LIMIT;
}

export function shouldBlock(countAfterInsert: number, allowance: number): boolean {
  return countAfterInsert >= allowance;
}
