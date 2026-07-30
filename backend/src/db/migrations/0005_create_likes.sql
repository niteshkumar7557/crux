-- One row per (user, argument); deleted on unlike. Spec: game-theory.md §10
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    argument_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (argument_id) REFERENCES arguments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);