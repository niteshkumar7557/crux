CREATE TABLE arguments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT,
    content_keyword TEXT,
    for_analysis TEXT,
    against_analysis TEXT,
    affirmative INT DEFAULT 50,
    negative INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    domain_id INT NOT NULL,
    status       VARCHAR(12) NOT NULL DEFAULT 'live',   -- live | concluded
    closes_at    TIMESTAMP,     -- defined while posting
    concluded_at TIMESTAMP DEFAULT NULL,
    winner       VARCHAR(12) DEFAULT NULL,                           -- for | against | draw | walkover
    mvp_user_id  INT DEFAULT NULL,                           -- the user who made the most impact on the debate
    verdict_text TEXT DEFAULT NULL,                           -- the text of the verdict
    hot_extended BOOLEAN NOT NULL DEFAULT FALSE,
    heat              REAL      NOT NULL DEFAULT 0,     -- velocity·balance score
    featured          BOOLEAN   NOT NULL DEFAULT FALSE, -- on the Main Stage
    is_dotd           BOOLEAN   NOT NULL DEFAULT FALSE, -- the single Debate of the Day
    featured_at       TIMESTAMP DEFAULT NULL,                        -- stage-entry time (stable ordering)
    dotd_at           TIMESTAMP DEFAULT NULL,                        -- when crowned DotD (daily-rotation guard)
    votes INT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    FOREIGN KEY (mvp_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_arguments_status_closes ON arguments(status, closes_at);
CREATE INDEX idx_arguments_featured ON arguments(featured, heat DESC);