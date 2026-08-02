-- Trigram fingerprint: a sorted array of 32-bit trigram hashes, duplicates
-- preserved, so similarity scoring can merge-walk two fingerprints instead of
-- re-tokenising text on every comparison. Nullable and backfilled by
-- scripts/backfill-similarity-data.ts.
-- Spec: game-theory.md §8
ALTER TABLE arguments ADD COLUMN fingerprint INTEGER[];
