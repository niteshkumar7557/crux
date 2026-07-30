-- One thread per user, relayed to a single Telegram chat. Postgres is the
-- record; Telegram is a view of it — so unread state, per-user threads and
-- "the site still works when Telegram is down" are all our own rows.
--
-- A thread is not a table: it is every row for a user_id in created_at order.
CREATE TABLE dev_messages (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Who wrote it. Named for the author rather than a direction: 'in'/'out'
    -- only means something once you fix whose perspective you are taking, and
    -- this table is read from both ends.
    sender        VARCHAR(4) NOT NULL CHECK (sender IN ('user','dev')),
    body          TEXT NOT NULL,
    -- Telegram's own id for the relayed copy of a 'user' row. This is what
    -- makes swipe-reply work: an incoming reply carries
    -- reply_to_message.message_id, which resolves through here to a user.
    tg_message_id BIGINT,
    -- Telegram's update id for a 'dev' row, and the reason there is no offset
    -- table. Telegram retains unconfirmed updates for ~24h, so a crash between
    -- fetching a batch and finishing it re-delivers that batch on restart;
    -- inserting with ON CONFLICT DO NOTHING makes the replay a no-op, which is
    -- strictly simpler than persisting and transactionally advancing an offset.
    tg_update_id  BIGINT UNIQUE,
    -- 'user' rows: NULL until the relay to Telegram succeeded, so a failed
    -- relay is a delay rather than a loss — each poller tick re-sweeps them.
    -- Never set on 'dev' rows; they arrived FROM Telegram.
    relayed_at    TIMESTAMP,
    -- Only 'dev' rows are ever unread. You have read your own messages.
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_messages_user ON dev_messages(user_id, created_at);
-- Partial: most lookups only ever care about rows that carry a Telegram id.
CREATE INDEX idx_dev_messages_tg   ON dev_messages(tg_message_id)
    WHERE tg_message_id IS NOT NULL;
CREATE INDEX idx_dev_messages_unrelayed ON dev_messages(id)
    WHERE sender = 'user' AND relayed_at IS NULL;
