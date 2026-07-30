// Verbatim repost detection, run before the model is ever called. Cheap,
// deterministic, no tokens. Paraphrase is the analyst's job, not this module's.
// Spec: game-theory.md §8

export const CROSS_USER_MIN_LENGTH = 40;

// Case, punctuation, spacing and Latin accents are all noise.
//
// Keeping marks (\p{M}) alongside letters and numbers is load-bearing, not
// defensive: Devanagari matras are marks, so \p{L}\p{N} alone would mangle
// "यह तर्क गलत है" and make two identical Hindi arguments compare as different.
export function normaliseArgument(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}

export interface PriorArgument {
  userId: number;
  username: string;
  content: string;
}

export type DuplicateVerdict =
  | { duplicate: false }
  | { duplicate: true; of: "self" }
  | { duplicate: true; of: "other"; username: string };

const NOT_DUPLICATE: DuplicateVerdict = { duplicate: false };

export function findDuplicate(
  input: string,
  prior: PriorArgument[],
  authorId: number,
): DuplicateVerdict {
  const needle = normaliseArgument(input);
  if (needle.length === 0) return NOT_DUPLICATE;

  let byOther: PriorArgument | null = null;

  for (const c of prior) {
    if (normaliseArgument(c.content) !== needle) continue;
    // Self-repeats win over cross-user matches: if you are reposting your own
    // text that is what you are told, even if somebody else posted it first.
    if (c.userId === authorId) return { duplicate: true, of: "self" };
    if (byOther === null) byOther = c;
  }

  if (byOther !== null && needle.length >= CROSS_USER_MIN_LENGTH) {
    return { duplicate: true, of: "other", username: byOther.username };
  }
  return NOT_DUPLICATE;
}
