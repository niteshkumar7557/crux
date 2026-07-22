// §11 The stage — pure ranking maths. No I/O.

/**
 * §15: "Main Stage size — ~4 + the Debate of the Day". This is the ~4: the
 * featured debates that sit *below* the hero, so the stage holds
 * MAIN_STAGE_SIZE + 1 (plus any admin pins).
 */
export const MAIN_STAGE_SIZE = 4;

/** Look-back window for comment velocity. An eighth of a debate's 48h life. */
export const HEAT_WINDOW_HOURS = 6;

/**
 * Floor on the balance factor, so a one-sided debate still ranks above dead.
 * Deliberately low: §11 requires a 50/50 fight at 10 comments to outrank a
 * 90/10 blowout at 20, which only holds while the floor is under 1/3.
 */
export const BALANCE_FLOOR = 0.25;

/**
 * §11 — heat = comment velocity x side balance.
 *
 * Balance is what makes this a *contest* ranking rather than a popularity
 * ranking: a debate split 50/50 scores its full velocity, while a 90/10
 * pile-on is discounted toward BALANCE_FLOOR. The stage should showcase
 * fights, not landslides.
 *
 * All three counts come from the same HEAT_WINDOW_HOURS window — heat measures
 * what a debate is doing *now*, not what it once did. The velocity term is
 * passed separately from the side counts so the two §11 factors stay legible.
 *
 * The poller recomputes this set-based in SQL for every live debate at once;
 * this function is the tested statement of the formula that SQL mirrors.
 */
export function computeHeat(
  commentsInWindow: number,
  forInWindow: number,
  againstInWindow: number,
): number {
  if (
    !Number.isFinite(commentsInWindow) ||
    !Number.isFinite(forInWindow) ||
    !Number.isFinite(againstInWindow)
  ) {
    return 0;
  }

  const total = forInWindow + againstInWindow;
  if (total <= 0 || commentsInWindow <= 0) return 0;

  const evenness = 1 - Math.abs(forInWindow - againstInWindow) / total; // 1 = perfect
  const balance = BALANCE_FLOOR + (1 - BALANCE_FLOOR) * evenness;
  return commentsInWindow * balance;
}
