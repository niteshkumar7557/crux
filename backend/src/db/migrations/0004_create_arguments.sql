-- One contribution to one side. Spec: game-theory.md §6, §7
CREATE TABLE arguments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    motion_id INT NOT NULL,
    side VARCHAR(20) NOT NULL,          -- 'for' | 'against'
    content TEXT,
    -- §6: the specific OPPOSING argument this one answers. NULL = standalone.
    reply_to_argument_id INT DEFAULT NULL,
    -- §19: what this argument earned, stored so the arena can show it without
    -- recomputing and the points pop-up has something to reconcile against.
    points INT NOT NULL DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (motion_id) REFERENCES motions(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_argument_id) REFERENCES arguments(id) ON DELETE SET NULL
);

CREATE INDEX idx_arguments_motion ON arguments(motion_id);
CREATE INDEX idx_arguments_reply_to ON arguments(reply_to_argument_id);
