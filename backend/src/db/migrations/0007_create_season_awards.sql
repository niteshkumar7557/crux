-- §10: the only thing that survives a season. Permanent, stacking, status-only.
CREATE TABLE season_awards (
    id           SERIAL PRIMARY KEY,
    season_key   VARCHAR(7)  NOT NULL,  -- 'YYYY-MM', the month that was won
    season_number INT        NOT NULL,  -- 0-based; Season 0 is the launch month
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank         INT NOT NULL,          -- 1 | 2 | 3
    title        VARCHAR(48) NOT NULL,  -- 'Champion of Season 0'
    frame        VARCHAR(16) NOT NULL,  -- gold | silver | bronze
    season_logic INT NOT NULL,          -- the winning total, frozen
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (season_key, rank)
);
CREATE INDEX idx_season_awards_user ON season_awards(user_id);
