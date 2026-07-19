-- §9.2 community-vote candidate surface: per-user votes + denormalized count.
CREATE TABLE debate_votes (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    argument_id INT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, argument_id)
);
CREATE INDEX idx_debate_votes_argument ON debate_votes(argument_id);

ALTER TABLE arguments ADD COLUMN votes INT NOT NULL DEFAULT 0;
