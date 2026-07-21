CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    argument_id INT NOT NULL,
    side VARCHAR(20) NOT NULL,
    content TEXT,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (argument_id) REFERENCES arguments(id) ON DELETE CASCADE
)