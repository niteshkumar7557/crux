// §15: a side wins only when the margin EXCEEDS this. With the two shares
// summing to 100, |for - against| <= 5 is exactly `for` in [47.5, 52.5] — so
// the draw is a BAND on a split bar, not a knife edge at the midpoint.
//
// design-system.md §2 requires that band to be marked on every split bar. It
// lives here rather than inside one component because the debate page's
// probability bar and the arena feed's score bar must agree on where it falls;
// two copies of the number would eventually disagree.
export const DRAW_MARGIN = 5;
export const DRAW_BAND_START = 50 - DRAW_MARGIN / 2;
export const DRAW_BAND_END = 50 + DRAW_MARGIN / 2;

/** Inline geometry for the band overlay, as percentages of the bar. */
export const drawBandStyle = {
  left: `${DRAW_BAND_START}%`,
  width: `${DRAW_BAND_END - DRAW_BAND_START}%`,
};
