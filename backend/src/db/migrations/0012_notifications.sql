-- §10 Retention Layer 2: in-app return triggers (notifications inbox).
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(24) NOT NULL,   -- 'opposition' | 'verdict'
    argument_id INT REFERENCES arguments(id) ON DELETE CASCADE,
    actor       VARCHAR(50),            -- username that triggered it (nullable)
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
