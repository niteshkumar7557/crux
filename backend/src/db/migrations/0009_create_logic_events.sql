-- The timestamped logic ledger. "Logic earned this season" is a windowed
-- SUM(amount) over these rows; users.logic_score is updated only where
-- season_only = FALSE. That is how a loss costs the month's race and never the
-- career total. Spec: game-theory.md §12, §14
CREATE TABLE logic_events (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INT NOT NULL,
    reason      VARCHAR(24) NOT NULL,  -- argument | like | verdict | loss | abuse | seed
    season_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logic_events_user_time ON logic_events(user_id, created_at);
