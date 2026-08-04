-- Google sign-in, account linking, and the link prompt's own state.
--
-- ADDITIVE, and it has to be: production holds real accounts, so this ALTERs
-- rather than editing 0000 in place. See codebase-guide.md §4.
-- Spec: game-theory.md §13

ALTER TABLE users
    -- Google's stable subject id. The email can change on a Google account; this
    -- cannot, so it is what an existing link is matched on.
    ADD COLUMN google_sub                  TEXT UNIQUE,
    -- The address Google verified, kept even when it differs from users.email —
    -- otherwise a later change to either is impossible to explain.
    ADD COLUMN google_email                VARCHAR(255),
    ADD COLUMN google_linked_at            TIMESTAMP,
    -- §13: the prompt asks at most three times, snoozing a week between.
    ADD COLUMN google_prompt_dismissals    INT NOT NULL DEFAULT 0,
    ADD COLUMN google_prompt_snoozed_until TIMESTAMP;

-- An account that has only ever signed in with Google has no password to store.
-- A placeholder hash would be a credential nobody chose and every such account
-- shared, so the column goes nullable instead — and every reader of it must now
-- treat NULL as "no password login", because bcrypt.compare throws on one.
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;

-- Both of these are too narrow for what Google supplies, and both were already
-- too narrow for a determined human: an address may be up to 254 characters, and
-- 20 characters does not hold "Alexandra Konstantinopoulos". Today a name of 21
-- characters does not fail validation — it reaches the INSERT and returns a 500.
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN name  TYPE VARCHAR(60);
