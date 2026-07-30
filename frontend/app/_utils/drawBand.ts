// The draw band's geometry, read by both split bars so the feed and the debate page
// cannot disagree about where a draw begins. Duplicates DRAW_MARGIN from
// backend/src/ai/verdict.logic.ts — the frontend cannot import it. Change both.
// Spec: game-theory.md §11

export const DRAW_MARGIN = 5;
export const DRAW_BAND_START = 50 - DRAW_MARGIN / 2;
export const DRAW_BAND_END = 50 + DRAW_MARGIN / 2;

export const drawBandStyle = {
  left: `${DRAW_BAND_START}%`,
  width: `${DRAW_BAND_END - DRAW_BAND_START}%`,
};
