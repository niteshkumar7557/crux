CREATE TABLE motions (
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

    -- lifecycle (§3, §7)
    status       VARCHAR(12) NOT NULL DEFAULT 'live',  -- live | concluded
    closes_at    TIMESTAMP,                            -- set to NOW() + 48h on insert
    concluded_at TIMESTAMP DEFAULT NULL,
    winner       VARCHAR(12) DEFAULT NULL,             -- for | against | draw | walkover
    margin       INT DEFAULT NULL,                     -- |affirmative - negative|
    mvp_user_id  INT DEFAULT NULL,                     -- winning side only (§7)
    verdict_text TEXT DEFAULT NULL,

    -- the stage (§11)
    heat        REAL      NOT NULL DEFAULT 0,     -- velocity x side balance
    featured    BOOLEAN   NOT NULL DEFAULT FALSE, -- on the Main Stage
    pinned      BOOLEAN   NOT NULL DEFAULT FALSE, -- admin pin, forces featured
    is_motd     BOOLEAN   NOT NULL DEFAULT FALSE, -- the single Motion of the Day
    featured_at TIMESTAMP DEFAULT NULL,           -- stage-entry time (stable ordering)
    motd_at     TIMESTAMP DEFAULT NULL,           -- crowned-at (daily-rotation guard)

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    FOREIGN KEY (mvp_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_motions_status_closes ON motions(status, closes_at);
CREATE INDEX idx_motions_featured ON motions(featured, heat DESC);
