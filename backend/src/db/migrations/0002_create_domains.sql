CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) UNIQUE NOT NULL
);

INSERT INTO domains (id, name) VALUES
    (1, 'Technology & AI'),
    (2, 'Science'),
    (3, 'Politics & Governance'),
    (4, 'Economics & Business'),
    (5, 'Environment & Energy'),
    (6, 'Health & Medicine'),
    (7, 'Law & Justice'),
    (8, 'Society & Culture'),
    (9, 'Ethics & Philosophy'),
    (10, 'Education'),
    (11, 'Sports & Gaming'),
    (12, 'Media & Entertainment');

SELECT setval(pg_get_serial_sequence('domains', 'id'), 12);
