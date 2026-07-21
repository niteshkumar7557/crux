CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) DEFAULT 'user',
    name VARCHAR(20) NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL,
    logic_score INT DEFAULT 0,
    description TEXT DEFAULT 'Post some Statements to get to know about you.',
    email VARCHAR(50) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    avatar TEXT DEFAULT NULL
);