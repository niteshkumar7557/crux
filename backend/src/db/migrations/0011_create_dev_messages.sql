-- One thread per user, relayed to a single Telegram chat. Postgres is the
-- record and Telegram is a view of it, so unread state and "the site works when
-- Telegram is down" are all our own rows. A thread is not a table: it is every
-- row for a user_id in created_at order. Spec: game-theory.md §20
CREATE TABLE dev_messages (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Named for the author, not a direction: 'in'/'out' only means something
    -- once you fix whose perspective you take, and this is read from both ends.
    sender        VARCHAR(4) NOT NULL CHECK (sender IN ('user','dev')),
    body          TEXT NOT NULL,
    -- Telegram's id for the relayed copy of a 'user' row. This is what makes
    -- swipe-reply resolvable back to a user.
    tg_message_id BIGINT,
    -- Why there is no offset table: Telegram re-delivers unconfirmed updates for
    -- ~24h, and UNIQUE here makes a replayed batch a no-op — simpler than
    -- persisting and transactionally advancing an offset.
    tg_update_id  BIGINT UNIQUE,
    -- 'user' rows only: NULL until the relay succeeded, so a failed relay is a
    -- delay rather than a loss — each poller tick re-sweeps them.
    relayed_at    TIMESTAMP,
    -- Only 'dev' rows are ever unread. You have read your own messages.
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_messages_user ON dev_messages(user_id, created_at);
-- Partial: lookups only ever care about rows carrying a Telegram id.
CREATE INDEX idx_dev_messages_tg   ON dev_messages(tg_message_id)
    WHERE tg_message_id IS NOT NULL;
CREATE INDEX idx_dev_messages_unrelayed ON dev_messages(id)
    WHERE sender = 'user' AND relayed_at IS NULL;
