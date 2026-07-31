// How the certificate's two long texts are set, and the height budget that proves
// they still fit. Pure.
//
// The certificate carries the WHOLE ruling — it is a document someone keeps, and
// an ellipsis in the middle of a verdict is a defect. So nothing is truncated;
// the type shrinks instead. The bottom two steps of each ladder are insurance
// against content the product has never produced.
// Spec: game-theory.md §11

export interface Step {
  max: number;
  size: number;
}

export const VERDICT_STEPS: Step[] = [
  { max: 200, size: 32 },
  { max: 320, size: 27 },
  { max: 460, size: 23 },
  { max: 640, size: 20 },
  { max: 900, size: 17 },
  { max: Infinity, size: 14 },
];

export const CLAIM_STEPS: Step[] = [
  { max: 90, size: 56 },
  { max: 150, size: 46 },
  { max: 230, size: 38 },
  { max: 340, size: 31 },
  { max: 520, size: 25 },
  { max: Infinity, size: 20 },
];

export const VERDICT_LINE_HEIGHT = 1.45;
export const CLAIM_LINE_HEIGHT = 1.28;

// The motion's own ceiling, enforced at write time by checkText().
export const CLAIM_DB_MAX = 1000;
// verdict_text has no ceiling — it is whatever the judge returned. The judge is
// prompted for 60 words; this is three times that, and exists only so no row can
// push text off the page. It should never fire.
export const VERDICT_HARD_MAX = 1200;

function sizeFrom(steps: Step[], length: number): number {
  const step = steps.find((s) => length <= s.max);
  return (step ?? steps[steps.length - 1]).size;
}

export function verdictSize(length: number): number {
  return sizeFrom(VERDICT_STEPS, length);
}

export function claimSize(length: number): number {
  return sizeFrom(CLAIM_STEPS, length);
}

// --- the budget -----------------------------------------------------------
// satori exposes no measuring API a test can call, so an average glyph width per
// family stands in. Deliberately pessimistic, and the ladders leave real margin
// rather than asserting to the pixel.

export const GLYPH_RATIO = { serif: 0.46, body: 0.5, mono: 0.6 } as const;

// 1200 wide − 2×28 outer padding − 2×64 inner padding.
export const CONTENT_WIDTH = 1016;
// 1500 tall − the same paddings.
export const CONTENT_HEIGHT = 1316;
// Every fixed block in CertificateCard: header row, three rules, three section
// labels, the 76px verdict word, the split bar, both analysis columns at full
// height, the footer — plus the three spacers at their MINIMUM (24 + 24 + 20).
//
// The spacers are flexGrow, so on an ordinary certificate they expand well past
// those minimums and distribute the slack. The minimum is all that survives when
// the text is long, which is the only case this budget is about. Measured from
// the component, not guessed — if CertificateCard's fixed blocks change, this
// number has to change with them or the test stops meaning anything.
export const FIXED_CHROME = 835;

export function textHeight({
  length,
  size,
  lineHeight,
  ratio,
  width = CONTENT_WIDTH,
}: {
  length: number;
  size: number;
  lineHeight: number;
  ratio: number;
  width?: number;
}): number {
  const perLine = Math.max(1, Math.floor(width / (size * ratio)));
  return Math.ceil(length / perLine) * size * lineHeight;
}

export function fits(claimLength: number, verdictLength: number): boolean {
  const claim = textHeight({
    length: claimLength,
    size: claimSize(claimLength),
    lineHeight: CLAIM_LINE_HEIGHT,
    ratio: GLYPH_RATIO.serif,
  });
  const verdict = textHeight({
    length: verdictLength,
    size: verdictSize(verdictLength),
    lineHeight: VERDICT_LINE_HEIGHT,
    ratio: GLYPH_RATIO.serif,
  });
  return claim + verdict <= CONTENT_HEIGHT - FIXED_CHROME;
}
