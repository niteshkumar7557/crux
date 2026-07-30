// Input checks for user text that reaches an LLM prompt. A missing field must never
// interpolate "undefined" into a prompt, and every character accepted here is one
// we pay for — the cap is the cost-control perimeter.

export type TextCheck =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export function checkText(
  raw: unknown,
  { field, max }: { field: string; max: number },
): TextCheck {
  if (typeof raw !== "string") return { ok: false, reason: `${field}_required` };
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: `${field}_required` };
  if (value.length > max) return { ok: false, reason: `${field}_too_long` };
  return { ok: true, value };
}

// Layer one of the low-effort gate (§9). Bare agreement and bare negation are
// short by nature — "yes, i agree", "no this is wrong" — so a length floor
// catches the commonest form of them for free, before any model call is spent.
// Layer two, the judge's "no_argument" verdict, catches the padded ones.
//
// The threshold is DELIBERATELY not disclosed on the product surface: no
// counter, no distinct error, no mention in /rules. A user who learns the number
// pads to 18 and buys themselves an LLM call; a user who does not gets the same
// "think more" either way. Callers MUST respond identically to both layers, or
// the difference between them becomes discoverable by probing.
export const MIN_ARGUMENT_CHARS = 18;

export function isTooShortToJudge(text: string): boolean {
  return text.trim().length < MIN_ARGUMENT_CHARS;
}
