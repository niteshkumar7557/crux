-- §9 Slice A: Main Stage / Undercard — heat-driven curation flags.
ALTER TABLE arguments
    ADD COLUMN heat              REAL      NOT NULL DEFAULT 0,     -- velocity·balance score
    ADD COLUMN featured          BOOLEAN   NOT NULL DEFAULT FALSE, -- on the Main Stage
    ADD COLUMN featured_override BOOLEAN   NOT NULL DEFAULT FALSE, -- manual pin (SQL/seed)
    ADD COLUMN is_dotd           BOOLEAN   NOT NULL DEFAULT FALSE, -- the single Debate of the Day
    ADD COLUMN featured_at       TIMESTAMP,                        -- stage-entry time (stable ordering)
    ADD COLUMN dotd_at           TIMESTAMP;                        -- when crowned DotD (daily-rotation guard)

CREATE INDEX idx_arguments_featured ON arguments(featured, heat DESC);
