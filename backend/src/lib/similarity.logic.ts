// Trigram-overlap similarity — the one scoring function shared by every
// "is this the same thing" check in the document: the judge's retrieval
// (which own-side arguments to show), the reworded-argument warning, and the
// live-motion shortlist. One scoring function, used in all three places.
// Spec: game-theory.md §8

import { normaliseArgument, CROSS_USER_MIN_LENGTH } from "./duplicate.logic.js";

// Provisional as of 2026-08-01 — calibrated only against small synthetic
// seed data via scripts/calibrate-similarity.ts (142 own-side pairs; a clean
// gap with nothing scoring between 0.40 and 0.90, so 0.75/0.45 sit inside it
// by luck of synthetic data, not by evidence of the real distribution). Real
// traffic frequently fills gaps synthetic data can't produce — re-run that
// script against production data once real arguments exist, and update this
// comment with the date and the number it produces before trusting this pair
// in a user-facing block/warn decision at scale.
export const SIMILAR_THRESHOLD = 0.75;
export const UNCERTAIN_THRESHOLD = 0.45;

// Same number as the cross-user repost floor, deliberately — one number in
// the spec instead of two. Below this many normalised characters a trigram
// score is noise: two unrelated short posts can score high by accident.
export const SIMILARITY_MIN_LENGTH = CROSS_USER_MIN_LENGTH;

export const MOTION_SHORTLIST_SIZE = 5;
export const MOTION_SHORTLIST_FLOOR = 0.2;

// A sorted array of 32-bit trigram hashes, WITH duplicates preserved. Keeping
// duplicates (rather than deduping into a set) is what lets a merge-walk do
// multiset Dice scoring — a repeated chunk in both texts counts as shared
// once per occurrence in the smaller side, not once total.
export type Fingerprint = number[];

// FNV-1a, 32-bit. Not cryptographic — a fast, well-distributed hash for
// packing a 3-character chunk into a Postgres INTEGER column.
function hashTrigram(chunk: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < chunk.length; i++) {
    h ^= chunk.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0; // fits a signed 32-bit INTEGER column
}

export function fingerprintOf(text: string): Fingerprint {
  const n = normaliseArgument(text);
  if (n.length < 3) return [];
  const hashes: number[] = [];
  for (let i = 0; i <= n.length - 3; i++) {
    hashes.push(hashTrigram(n.slice(i, i + 3)));
  }
  hashes.sort((a, b) => a - b);
  return hashes;
}

// score = 2 × |shared chunks| / (|chunks in A| + |chunks in B|), computed by
// merging two sorted arrays in O(|A| + |B|) — never re-tokenising either
// side. This is why a stored fingerprint column pays for itself: comparing
// becomes set arithmetic over data already in hand.
export function diceFromFingerprints(a: Fingerprint, b: Fingerprint): number {
  const total = a.length + b.length;
  if (total === 0) return 0;
  let i = 0;
  let j = 0;
  let shared = 0;
  while (i < a.length && j < b.length) {
    const av = a[i] as number;
    const bv = b[j] as number;
    if (av === bv) {
      shared++;
      i++;
      j++;
    } else if (av < bv) {
      i++;
    } else {
      j++;
    }
  }
  return (2 * shared) / total;
}

export function diceScore(a: string, b: string): number {
  return diceFromFingerprints(fingerprintOf(a), fingerprintOf(b));
}

export interface SimilarityMatch<T> {
  item: T;
  score: number;
}

// Score every candidate against the query fingerprint, keep the top `limit`
// at or above `floor`. Ties keep the candidates' input order (stable sort) —
// pass candidates pre-ordered for whatever tie-break the caller wants (e.g.
// newest-first for "ties broken by recency").
export function findSimilar<T>(
  queryFingerprint: Fingerprint,
  candidates: { item: T; fingerprint: Fingerprint }[],
  opts: { limit: number; floor: number },
): SimilarityMatch<T>[] {
  return candidates
    .map((c) => ({
      item: c.item,
      score: diceFromFingerprints(queryFingerprint, c.fingerprint),
    }))
    .filter((m) => m.score >= opts.floor)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);
}

export type RewordedAction = "skipped" | "none" | "shadow" | "warn";

export interface RewordedCheck<T> {
  action: RewordedAction;
  top: SimilarityMatch<T> | null;
}

// The decision behind §8's reworded-argument gate. Below the length floor the
// check is skipped outright — short texts produce too few trigrams for a
// score to mean anything. Otherwise: nothing clearing UNCERTAIN_THRESHOLD is
// "none"; between UNCERTAIN and SIMILAR is the shadow band (log only, never
// shown); at or above SIMILAR is "warn". Pure — the caller does the DB fetch
// for the excerpt and builds the HTTP response.
export function evaluateReworded<T>(
  newText: string,
  candidates: { item: T; fingerprint: Fingerprint }[],
): RewordedCheck<T> {
  if (normaliseArgument(newText).length < SIMILARITY_MIN_LENGTH) {
    return { action: "skipped", top: null };
  }
  const ranked = findSimilar(fingerprintOf(newText), candidates, {
    limit: 1,
    floor: UNCERTAIN_THRESHOLD,
  });
  const top = ranked[0] ?? null;
  if (!top) return { action: "none", top: null };
  if (top.score >= SIMILAR_THRESHOLD) return { action: "warn", top };
  return { action: "shadow", top };
}

// §3's "ids are never trusted" rule (motion similarity shares it with the
// argument case): the model's duplicate_of is honoured only if it names an
// id that was actually in the shortlist sent to it. Anything else —
// invented, hallucinated, or simply not a clean integer — is null. Pure; the
// caller does the shortlist lookup for the 409 body.
export function resolveDuplicateOf(raw: unknown, shortlistIds: number[]): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  return shortlistIds.includes(n) ? n : null;
}
