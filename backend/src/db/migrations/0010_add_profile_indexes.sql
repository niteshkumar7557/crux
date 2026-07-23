-- The profile page filters and aggregates by user across three tables.
-- Postgres does not auto-index foreign-key columns, so comments.user_id and
-- arguments.user_id were both unindexed — against the stress seed that is a
-- sequential scan over 6M and 1M rows per profile view.

-- Craft stats aggregate every comment by one author.
CREATE INDEX idx_comments_user ON comments(user_id);

-- Live debates and the statement count filter by author.
CREATE INDEX idx_arguments_user ON arguments(user_id);

-- The profile's global-rank count and the leaderboard's
-- ORDER BY logic_score DESC, id ASC LIMIT 50 share this ordering.
CREATE INDEX idx_users_logic_score ON users(logic_score DESC, id ASC);
