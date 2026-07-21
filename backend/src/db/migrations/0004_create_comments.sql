CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    argument_id INT NOT NULL,
    side VARCHAR(20) NOT NULL,          -- 'for' | 'against'
    content TEXT,
    -- §5: the specific OPPOSING comment this one answers. NULL = standalone.
    reply_to_comment_id INT DEFAULT NULL,
    -- §14: the logic this comment actually earned, so the arena can show it
    -- on the card and the pop-up has something to reconcile against.
    points INT NOT NULL DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (argument_id) REFERENCES arguments(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_comment_id) REFERENCES comments(id) ON DELETE SET NULL
);

CREATE INDEX idx_comments_argument ON comments(argument_id);
CREATE INDEX idx_comments_reply_to ON comments(reply_to_comment_id);
