// Canvas sizes and the two colour literals the social kit needs beyond the share
// card's palette. Everything else comes from verdictCard.ts, which already
// mirrors globals.css as hex because satori cannot read CSS variables.
//
// Light only, and deliberately: a social post is read by strangers who have no
// theme of their own. See design-system.md §12.

import { LIGHT_TOKENS, type Palette } from "@/app/_components/motion/verdictCard";

export const PALETTE: Palette = LIGHT_TOKENS;

// --paper-plate. Not in the share card's palette because nothing it draws sits
// on a plate.
export const PLATE_CREAM = "#faf6e8";

// --ink-faint is ink at 16%; satori wants it literal.
export const HAIRLINE = "rgba(36,65,52,0.16)";

export const SIZES = {
  "ig-cover": { width: 1080, height: 1350 },
  "ig-argument": { width: 1080, height: 1350 },
  "ig-verdict": { width: 1080, height: 1350 },
  "ig-story": { width: 1080, height: 1920 },
  "ig-live": { width: 1080, height: 1350 },
  "li-verdict": { width: 1080, height: 1350 },
  "x-verdict": { width: 1600, height: 900 },
  "x-live": { width: 1600, height: 900 },
} as const;

export type TemplateName = keyof typeof SIZES;

// Instagram draws its own UI over these bands on a 1080x1920 story. Nothing
// load-bearing goes inside them.
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 250;
