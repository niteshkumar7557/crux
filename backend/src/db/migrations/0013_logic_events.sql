-- §12 Habit & Progression: a timestamped logic ledger so "logic earned this
-- season" is a windowed sum while the all-time logic_score stays monotonic.
CREATE TABLE logic_events (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount     INT NOT NULL,
    reason     VARCHAR(24) NOT NULL,   -- 'comment' | 'like' | 'verdict' | 'abuse' | 'seed'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logic_events_user_time ON logic_events(user_id, created_at);
