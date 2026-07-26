// Pure input checks for user text that reaches an LLM prompt. A missing field
// must never interpolate "undefined" into a prompt, and every char accepted
// here is a char we pay for — the cap is the cost-control perimeter.
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
