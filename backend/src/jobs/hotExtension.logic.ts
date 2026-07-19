// §8.1 hot-extension — a debate heating up in its final hours gets one automatic
// extension so a live swing isn't cut off mid-argument.

/** Look-back window for comment velocity, and the trailing window before close. */
export const HOT_WINDOW_HOURS = 2;
/** Comments within the window that qualify a debate as "hot". */
export const HOT_THRESHOLD = 5;
/** How much a qualifying debate's close is pushed back (once). */
export const HOT_EXTENSION_HOURS = 6;

/**
 * Predicate mirroring the poller's set-based UPDATE: extend only when velocity
 * meets the threshold and the debate has never been extended before.
 */
export function shouldHotExtend(
  commentsInWindow: number,
  alreadyExtended: boolean,
): boolean {
  return !alreadyExtended && commentsInWindow >= HOT_THRESHOLD;
}
