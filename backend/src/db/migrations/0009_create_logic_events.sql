-- §8/§10: the timestamped logic ledger. "Logic earned this season" is a
-- windowed SUM(amount) over every row; the all-time users.logic_score is
-- updated only for rows where season_only = FALSE. That is how a loss can
-- cost you the monthly race without ever touching your career total.
CREATE TABLE logic_events (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INT NOT NULL,
    reason      VARCHAR(24) NOT NULL,  -- comment | like | verdict | loss | abuse | seed
    season_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logic_events_user_time ON logic_events(user_id, created_at);
