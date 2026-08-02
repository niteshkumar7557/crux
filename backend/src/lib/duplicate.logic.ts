// Verbatim repost detection. The caller finds candidates via an indexed
// (motion_id, content_hash) lookup (see argument.controller.ts) instead of
// loading every argument on the motion — this module's job is unchanged:
// given the small set of hash-matching candidates, decide self vs. other and
// apply the cross-user length floor. Paraphrase is the analyst's job, not
// this module's.
// Spec: game-theory.md §8

import crypto from "crypto";

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

// 16-byte truncated SHA-256 of the normalised content — no collision anxiety
// at this scale. Shared by argument.controller.ts (compute-and-store on
// insert, lookup-by-hash on post) and scripts/backfill-similarity-data.ts
// (backfill existing rows) — the two must never diverge.
export function contentHash(text: string): Buffer {
  return crypto.createHash("sha256").update(normaliseArgument(text)).digest().subarray(0, 16);
}
