// How big the type may be so that it still fits the box it is given.
//
// Satori does not clip on overflow — it shrinks every sibling and then draws the
// text over whatever follows it. A fixed headline size therefore turns a long
// referee line into a headline printed straight through the quote beneath it.
// Sizing from the content is the fix; the manual scales below are the escape
// hatch when an editor disagrees with the arithmetic.
//
// The ratios are calibrated against satori's own line breaking, not against raw
// glyph advance. Averaging character widths is not enough: text wraps at word
// boundaries, so a line ending in CURRICULUM wastes most of its width, and the
// character-average model predicted five lines where satori laid out seven.
// These values reproduce satori's real break points for the display face at 70,
// 80, 100 and 116px. They are rounded UP — over-estimating width costs a
// slightly smaller headline, under-estimating it costs an overlap.

export const CHAR_RATIO = {
  display: 0.475, // Anton, uppercase, including its tracking
  serif: 0.5, // Newsreader
  body: 0.55, // Space Grotesk
} as const;

export type Face = keyof typeof CHAR_RATIO;

// Presets offered in the console, as multipliers on the fitted size. `auto` is
// the fitted size itself.
export const SIZE_SCALES = {
  auto: 1,
  xs: 0.72,
  sm: 0.86,
  md: 1,
  lg: 1.16,
  xl: 1.34,
} as const;

export type SizeStep = keyof typeof SIZE_SCALES;

export const SIZE_STEPS = Object.keys(SIZE_SCALES) as SizeStep[];

export function isSizeStep(value: unknown): value is SizeStep {
  return typeof value === "string" && value in SIZE_SCALES;
}

/** Characters that fit on one line at this size. At least one, always. */
export function charsPerLine(face: Face, width: number, size: number): number {
  if (size <= 0 || width <= 0) return 1;
  return Math.max(1, Math.floor(width / (size * CHAR_RATIO[face])));
}

/**
 * Lines the text wraps to at this size, breaking at word boundaries the way
 * satori does. A word longer than the line breaks inside itself.
 */
export function linesAt(text: string, face: Face, width: number, size: number): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const cpl = charsPerLine(face, width, size);
  let lines = 1;
  let filled = 0;

  for (const word of words) {
    const withWord = filled === 0 ? word.length : filled + 1 + word.length;
    if (withWord <= cpl) {
      filled = withWord;
      continue;
    }
    lines++;
    filled = word.length;
    // A single word wider than the line: it breaks across as many as it needs.
    while (filled > cpl) {
      lines++;
      filled -= cpl;
    }
  }

  return lines;
}

/** Rendered height of the text at this size. */
export function heightAt(
  text: string,
  face: Face,
  width: number,
  size: number,
  lineHeight: number,
): number {
  return linesAt(text, face, width, size) * size * lineHeight;
}

export interface FitInput {
  text: string;
  face: Face;
  /** Width of the box the text wraps inside. */
  width: number;
  /** Height the text may not exceed. */
  height: number;
  lineHeight: number;
  max: number;
  min: number;
}

/**
 * The largest whole size in [min, max] whose wrapped height fits `height`.
 * Returns `min` when even that overflows — a floor is more honest than type too
 * small to read, and the caller has already capped the text length.
 */
export function fitFontSize(input: FitInput): number {
  const { text, face, width, height, lineHeight, max, min } = input;
  const ceiling = Math.max(min, Math.round(max));
  const floor = Math.max(1, Math.round(min));
  if (text.length === 0) return ceiling;

  for (let size = ceiling; size > floor; size--) {
    if (heightAt(text, face, width, size, lineHeight) <= height) return size;
  }
  return floor;
}

/** Applies an editor's preset to a fitted size. */
export function scaled(size: number, step: SizeStep | undefined): number {
  return Math.max(1, Math.round(size * SIZE_SCALES[step ?? "auto"]));
}

/**
 * Fit, then apply the editor's preset.
 * `auto` leaves the fitted size alone; every other step is a deliberate override
 * and may overflow, which is the editor's call to make.
 */
export function fitScaled(input: FitInput, step: SizeStep | undefined): number {
  return scaled(fitFontSize(input), step);
}

/** The serif motion line, fitted to the room above whatever follows it. */
export function fitMotion(
  motion: string,
  box: { width: number; height: number } | undefined,
  max: number,
  step: SizeStep | undefined,
): number {
  if (!box) return scaled(max, step);
  return fitScaled(
    { text: motion, face: "serif", width: box.width, height: box.height, lineHeight: 1.08, max, min: Math.round(max * 0.55) },
    step,
  );
}

/** The italic ruling, fitted so it cannot reach the MVP line or the CTA band. */
export function fitRuling(
  ruling: string,
  box: { width: number; height: number } | undefined,
  max: number,
  step: SizeStep | undefined,
): number {
  if (!box) return scaled(max, step);
  return fitScaled(
    { text: ruling, face: "serif", width: box.width, height: box.height, lineHeight: 1.42, max, min: Math.round(max * 0.55) },
    step,
  );
}
