/**
 * §6 — repost detection, the layer that runs before the model is ever called.
 *
 * Two separate exploits, one comparison:
 *   - posting your own comment again to collect its score twice;
 *   - copying somebody else's comment and posting it as your own, which is the
 *     more valuable of the two because the text has already been proven to
 *     score well.
 *
 * This catches verbatim and near-verbatim reposts only — it is cheap,
 * deterministic and spends no tokens. A reworded restatement is the analyst
 * prompt's job (it is handed the side's comments and told to score a
 * restatement 1), not this module's.
 */

/**
 * Below this many normalised characters a repost is not worth refusing across
 * users: short agreements ("i agree", "exactly this") collide innocently, and
 * they score 1-2 anyway, so copying one gains nothing. Repeating *yourself* is
 * refused at any length.
 */
export const CROSS_USER_MIN_LENGTH = 40;

/**
 * The form two comments are compared in: case, punctuation and spacing are all
 * noise, and so are Latin accents (typing "cafe" for "café" is the same word).
 *
 * The character class keeps marks (`\p{M}`) as well as letters and numbers,
 * which is load-bearing rather than defensive: Devanagari matras are marks, not
 * letters, so `\p{L}\p{N}` alone turns "यह तर्क गलत है" into "यह तर क गलत ह" —
 * a mangling that would make two identical Hindi comments compare as different.
 * Latin combining accents are stripped explicitly just above, before the class
 * can preserve them.
 */
export function normaliseComment(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}

export interface PriorComment {
  userId: number;
  username: string;
  content: string;
}

export type DuplicateVerdict =
  | { duplicate: false }
  | { duplicate: true; of: "self" }
  | { duplicate: true; of: "other"; username: string };

const NOT_DUPLICATE: DuplicateVerdict = { duplicate: false };

/**
 * Compares one new comment against every comment already in the debate.
 *
 * Self-repeats win over cross-user matches: if you are reposting your own text
 * that is what you are told, even when somebody else happens to have posted
 * the same words first.
 */
export function findDuplicate(
  input: string,
  prior: PriorComment[],
  authorId: number,
): DuplicateVerdict {
  const needle = normaliseComment(input);
  if (needle.length === 0) return NOT_DUPLICATE;

  let byOther: PriorComment | null = null;

  for (const c of prior) {
    if (normaliseComment(c.content) !== needle) continue;
    if (c.userId === authorId) return { duplicate: true, of: "self" };
    // Keep looking — an own repost further down the list outranks this one.
    if (byOther === null) byOther = c;
  }

  if (byOther !== null && needle.length >= CROSS_USER_MIN_LENGTH) {
    return { duplicate: true, of: "other", username: byOther.username };
  }
  return NOT_DUPLICATE;
}
