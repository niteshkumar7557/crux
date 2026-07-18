-- §8 Conclusion Engine: timed-match lifecycle + W–L record economy.
ALTER TABLE arguments
    ADD COLUMN status       VARCHAR(12) NOT NULL DEFAULT 'live',   -- live | concluded
    ADD COLUMN closes_at    TIMESTAMP,
    ADD COLUMN concluded_at TIMESTAMP,
    ADD COLUMN winner       VARCHAR(12),                           -- for | against | draw | walkover
    ADD COLUMN margin       INT,
    ADD COLUMN mvp_user_id  INT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN verdict_text TEXT;

-- Dev phase: no legacy data matters, but keep any present rows valid.
UPDATE arguments SET closes_at = NOW() + INTERVAL '48 hours' WHERE closes_at IS NULL;

CREATE INDEX idx_arguments_status_closes ON arguments(status, closes_at);

CREATE TABLE debate_results (
    id           SERIAL PRIMARY KEY,
    argument_id  INT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    side         VARCHAR(12) NOT NULL,   -- 'for' | 'against'
    outcome      VARCHAR(8)  NOT NULL,   -- 'win' | 'loss' | 'draw'
    is_mvp       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (argument_id, user_id)
);

CREATE INDEX idx_debate_results_user ON debate_results(user_id);
