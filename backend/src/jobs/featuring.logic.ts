// heat = argument velocity x side balance, over a rolling window. Pure; the poller
// mirrors this formula in SQL and imports these constants, so the two can drift in
// shape but never in numbers.
// Spec: game-theory.md §15

export const MAIN_STAGE_SIZE = 4;

export const HEAT_WINDOW_HOURS = 6;

export const BALANCE_FLOOR = 0.25;

export function computeHeat(
  argumentsInWindow: number,
  forInWindow: number,
  againstInWindow: number,
): number {
  if (
    !Number.isFinite(argumentsInWindow) ||
    !Number.isFinite(forInWindow) ||
    !Number.isFinite(againstInWindow)
  ) {
    return 0;
  }

  const total = forInWindow + againstInWindow;
  if (total <= 0 || argumentsInWindow <= 0) return 0;

  const evenness = 1 - Math.abs(forInWindow - againstInWindow) / total; // 1 = perfect
  const balance = BALANCE_FLOOR + (1 - BALANCE_FLOOR) * evenness;
  return argumentsInWindow * balance;
}
