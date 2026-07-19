-- §9.3 upset bonus: track each side's lowest forecast, flag a win-from-behind.
ALTER TABLE arguments
    ADD COLUMN for_low     SMALLINT NOT NULL DEFAULT 100,  -- lowest affirmative % ever seen
    ADD COLUMN against_low SMALLINT NOT NULL DEFAULT 100,  -- lowest negative % ever seen
    ADD COLUMN is_upset    BOOLEAN  NOT NULL DEFAULT FALSE; -- winner won from behind
