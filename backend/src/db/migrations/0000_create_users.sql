-- Identity. logic_score is the all-time skill number (game-theory.md §13);
-- `description` is the bio, and is ALSO written by the Debater Profiler.
-- `role` is carried in the JWT and guarded by requireRole.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) DEFAULT 'user',
    name VARCHAR(20) NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL,
    logic_score INT DEFAULT 0,
    description TEXT DEFAULT 'Post some Motions to get to know about you.',
    email VARCHAR(50) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    avatar TEXT DEFAULT NULL
);