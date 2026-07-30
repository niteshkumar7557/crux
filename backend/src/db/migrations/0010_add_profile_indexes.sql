-- Postgres does not auto-index foreign-key columns, and every profile query
-- filters on these. Against the stress seed the missing two were sequential
-- scans over 6M and 1M rows per profile view.
CREATE INDEX idx_arguments_user ON arguments(user_id);
CREATE INDEX idx_motions_user ON motions(user_id);

-- Shared by the profile's global-rank count and the leaderboard's ordering.
CREATE INDEX idx_users_logic_score ON users(logic_score DESC, id ASC);
