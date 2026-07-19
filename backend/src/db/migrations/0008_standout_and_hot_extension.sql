-- §8.3 losing-side standout nod + §8.1 hot-extension flags.
ALTER TABLE debate_results
    ADD COLUMN is_standout BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE arguments
    ADD COLUMN hot_extended BOOLEAN NOT NULL DEFAULT FALSE;
