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

ALTER TABLE arguments ADD COLUMN domain_id INT REFERENCES domains(id);

UPDATE arguments SET domain_id = CASE
    WHEN LOWER(domain) IN ('technology', 'tech', 'ai', 'social media') THEN 1
    WHEN LOWER(domain) IN ('science', 'atmospheric science') THEN 2
    WHEN LOWER(domain) IN ('geopolitics', 'policy', 'politics', 'political science') THEN 3
    WHEN LOWER(domain) IN ('economics', 'finance', 'business') THEN 4
    WHEN LOWER(domain) IN ('environment', 'energy', 'climate policy', 'energy policy') THEN 5
    WHEN LOWER(domain) IN ('health', 'public health', 'medicine') THEN 6
    WHEN LOWER(domain) IN ('law', 'privacy', 'justice') THEN 7
    WHEN LOWER(domain) IN ('society', 'culture') THEN 8
    WHEN LOWER(domain) IN ('ethics', 'philosophy', 'ai ethics') THEN 9
    WHEN LOWER(domain) = 'education' THEN 10
    WHEN LOWER(domain) IN ('sports', 'gaming') THEN 11
    WHEN LOWER(domain) IN ('media', 'entertainment') THEN 12
    ELSE 8
END;

ALTER TABLE arguments ALTER COLUMN domain_id SET NOT NULL;

ALTER TABLE arguments DROP COLUMN domain;
