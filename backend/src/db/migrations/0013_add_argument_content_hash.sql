-- SHA-256 of the normalised argument content, for an indexed exact-duplicate
-- lookup instead of a full-text scan. Nullable and backfilled by
-- scripts/backfill-similarity-data.ts. No uniqueness constraint here: the
-- repost rule differs by author and by length, so enforcement stays in code
-- (lib/duplicate.logic.ts) — this index is for lookup speed only.
-- Spec: game-theory.md §8
ALTER TABLE arguments ADD COLUMN content_hash BYTEA;

CREATE INDEX idx_arguments_motion_hash ON arguments(motion_id, content_hash);
