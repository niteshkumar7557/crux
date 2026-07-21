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