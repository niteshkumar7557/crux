// The space each template actually leaves its type, so socialFit can size to it.
//
// These are arithmetic on the Frame's own geometry, not magic numbers: a canvas
// less its outer margin, its 1.5px rule and its padding is the content box, and
// the furniture that always renders (the top row, the footer, the CTA band) comes
// off that before the flexible text is measured.

import { SIZES, type TemplateName } from "./socialTokens";

export const OUTER = 40;
export const RULE = 1.5;
export const PAD = 66;

/** The usable box inside Frame's margin, rule and padding. */
export function contentBox(
  template: TemplateName,
  pad: number = PAD,
  outer: number = OUTER,
): { width: number; height: number } {
  const { width, height } = SIZES[template];
  return {
    width: width - 2 * outer - 2 * RULE - 2 * pad,
    height: height - 2 * outer - 2 * RULE - 2 * pad,
  };
}

// Furniture on an argument slide that renders at a fixed height whatever the
// copy says: the side box row, the plain word and its 50px lead, the footer
// rule + gap + lockup, the quote's bottom margin, and the minimum flexible gap.
const ARG_TOP_ROW = 48;
const ARG_WORD = 50 + 30;
const ARG_FOOT = RULE + 28 + 34;
const ARG_QUOTE_MARGIN = 44;
const ARG_MIN_GAP = 56;
const ARG_HEADLINE_LEAD = 24;

export interface ArgumentBudget {
  width: number;
  /** Height the quote paragraph may occupy. */
  quote: number;
  /** Height the display headline may occupy. */
  headline: number;
}

/**
 * Splits an argument slide's height between the quote and the headline.
 * The quote is measured first because it is the author's verbatim words and is
 * already capped at QUOTE_MAX; the headline takes what is left.
 */
export function argumentBudget(quoteHeight: number, handleHeight: number): ArgumentBudget {
  const box = contentBox("ig-argument");
  const fixed =
    ARG_TOP_ROW + ARG_WORD + ARG_FOOT + ARG_QUOTE_MARGIN + ARG_MIN_GAP + ARG_HEADLINE_LEAD;
  return {
    width: box.width,
    quote: Math.max(0, box.height - fixed - ARG_TOP_ROW),
    headline: Math.max(0, box.height - fixed - quoteHeight - handleHeight),
  };
}

/**
 * The height a block of body copy needs, used to reserve room before the
 * headline is fitted into what remains.
 */
export function blockHeight(lines: number, size: number, lineHeight: number): number {
  return Math.ceil(lines * size * lineHeight);
}

// How much height the ruling may take on each verdict-bearing template, once its
// own furniture is accounted for. These are the numbers that were implicitly
// assumed before and never checked, which is how a long verdict pushed the CTA
// band on top of the story's own text.
export const RULING_BOX: Record<string, { width: number; height: number }> = {
  // plate row + winner line + split bar + MVP + CTA band, inside 1135px
  "ig-verdict": { width: contentBox("ig-verdict").width, height: 300 },
  // The tightest of the lot, and the one that was overflowing: 1920 less the two
  // safe bands, the motion, the plate, the display line, the score, the bar, the
  // MVP and the CTA leaves 196px. See the block arithmetic in StoryPoster.
  "ig-story": { width: contentBox("ig-story", 64).width, height: 190 },
  // 1135px less the motion, rule, plate row, bar, MVP and CTA leaves 232.
  "li-verdict": { width: contentBox("li-verdict").width, height: 225 },
  // the wide card's left column, which is flex 1.5 of the full width
  "x-verdict": { width: 780, height: 250 },
};

// The motion is the one line that must never be the display face, so it is set
// in the serif and fitted into the room above the plate.
export const MOTION_BOX: Record<string, { width: number; height: number }> = {
  "ig-cover": { width: contentBox("ig-cover").width, height: 430 },
  "ig-story": { width: contentBox("ig-story", 64).width, height: 210 },
  "li-verdict": { width: contentBox("li-verdict").width, height: 210 },
  "x-verdict": { width: 780, height: 190 },
  "ig-live": { width: contentBox("ig-live").width, height: 250 },
  "x-live": { width: 760, height: 190 },
};
