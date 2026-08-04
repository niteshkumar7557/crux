-- Queued email, its delivery record, and who has asked not to receive it.
-- ADDITIVE — see codebase-guide.md §4.
-- Spec: game-theory.md §20

-- Nothing sends inline. A producer writes a row here and returns; jobs/email.ts
-- drains it. That is what gives retries, an audit trail, a rate the provider can
-- live with, and one code path shared by the automated triggers and the operator
-- broadcast.
CREATE TABLE email_outbox (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(24) NOT NULL,   -- welcome|verdict|reply|opponent|season|announcement
    to_email        VARCHAR(255) NOT NULL,
    subject         TEXT NOT NULL,
    body_text       TEXT NOT NULL,
    body_html       TEXT NOT NULL,
    -- pending -> sending -> sent | failed (5 attempts) | skipped (suppressed,
    -- opted out, or over the ration). "sending" is the claim: a row is flipped to
    -- it inside the claiming transaction, so a crash mid-send leaves it visible
    -- rather than silently re-sent. "skipped" is kept rather than deleted —
    -- "why did I not get that email" is a real question and this answers it.
    status          VARCHAR(12) NOT NULL DEFAULT 'pending',
    skip_reason     VARCHAR(32),
    attempts        INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ses_message_id  TEXT,
    last_error      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMP
);

-- The poller's claim query.
CREATE INDEX idx_email_outbox_due
    ON email_outbox (next_attempt_at) WHERE status = 'pending';

-- The 24-hour ration count, which reads only sent rows of the rationed categories.
CREATE INDEX idx_email_outbox_ration
    ON email_outbox (user_id, sent_at) WHERE status = 'sent';

-- Keyed on the ADDRESS, not the user: a bounce is a property of a mailbox, and
-- the same mailbox may outlive the account that first reached it.
CREATE TABLE email_suppressions (
    email      VARCHAR(255) PRIMARY KEY,
    reason     VARCHAR(24) NOT NULL,        -- hard_bounce | complaint | manual
    detail     TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-category consent, plus one global switch. Defaults are TRUE: these are
-- account-triggered notifications about the user's own activity, and the whole
-- opt-out surface ships in the same release.
ALTER TABLE users
    ADD COLUMN email_verdicts      BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_replies       BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_opponents     BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_season        BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_announcements BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    -- A per-user random value rather than an HMAC, so one-click unsubscribe needs
    -- no signing secret to rotate, and revoking a leaked link is one UPDATE.
    ADD COLUMN unsubscribe_token   TEXT UNIQUE;

-- Two UUIDs, dashes stripped: 64 hex characters, 256 bits, from the same CSPRNG
-- gen_random_bytes would use — and core since PG13, so this needs no pgcrypto
-- extension and therefore no superuser on a managed host.
UPDATE users
   SET unsubscribe_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 WHERE unsubscribe_token IS NULL;
