-- Editorial video debates are separate from Arena scoring and history.

CREATE TABLE video_debates (
    id                    SERIAL PRIMARY KEY,
    slug                  VARCHAR(120) NOT NULL UNIQUE,
    motion                TEXT NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'media_uploaded', 'validated', 'published')),
    media_id              UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    poster_object_key     TEXT NOT NULL,
    poster_probe          JSONB,
    poster_etag           TEXT,
    poster_checked_at     TIMESTAMP,
    duration_ms           INT CHECK (duration_ms BETWEEN 1 AND 600000),
    manifest_version      SMALLINT CHECK (manifest_version IS NULL OR manifest_version >= 1),
    transcript            JSONB,
    intro_start_ms        INT CHECK (intro_start_ms IS NULL OR intro_start_ms >= 0),
    intro_end_ms          INT CHECK (intro_end_ms IS NULL OR intro_end_ms >= 0),
    outro_start_ms        INT CHECK (outro_start_ms IS NULL OR outro_start_ms >= 0),
    outro_end_ms          INT CHECK (outro_end_ms IS NULL OR outro_end_ms >= 0),
    final_winner          VARCHAR(8) CHECK (final_winner IN ('for', 'against')),
    for_round_wins        SMALLINT CHECK (for_round_wins BETWEEN 0 AND 5),
    against_round_wins    SMALLINT CHECK (against_round_wins BETWEEN 0 AND 5),
    final_crux            TEXT,
    final_verdict         TEXT,
    submission_hash       CHAR(64),
    draft_revision        INT NOT NULL DEFAULT 1 CHECK (draft_revision >= 1),
    validated_revision    INT CHECK (validated_revision IS NULL OR validated_revision >= 1),
    validation_errors     JSONB NOT NULL DEFAULT '[]'::jsonb,
    validated_at          TIMESTAMP,
    published_at          TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by            INT REFERENCES users(id) ON DELETE SET NULL,
    validated_by          INT REFERENCES users(id) ON DELETE SET NULL,
    published_by          INT REFERENCES users(id) ON DELETE SET NULL,
    CHECK (intro_start_ms IS NULL OR intro_end_ms IS NULL OR intro_start_ms < intro_end_ms),
    CHECK (outro_start_ms IS NULL OR outro_end_ms IS NULL OR outro_start_ms < outro_end_ms),
    CHECK (for_round_wins IS NULL OR against_round_wins IS NULL
           OR for_round_wins + against_round_wins = 5)
);

CREATE TABLE video_debate_participants (
    id                    SERIAL PRIMARY KEY,
    video_debate_id       INT NOT NULL REFERENCES video_debates(id) ON DELETE CASCADE,
    role                  VARCHAR(8) NOT NULL CHECK (role IN ('host', 'for', 'against')),
    user_id               INT REFERENCES users(id) ON DELETE SET NULL,
    display_name          VARCHAR(80) NOT NULL,
    avatar_url            TEXT,
    mp4_object_key        TEXT NOT NULL,
    media_probe           JSONB,
    media_byte_length     BIGINT CHECK (media_byte_length IS NULL OR media_byte_length >= 1),
    media_etag            TEXT,
    media_checked_at      TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (video_debate_id, role)
);

CREATE TABLE video_debate_rounds (
    id                    SERIAL PRIMARY KEY,
    video_debate_id       INT NOT NULL REFERENCES video_debates(id) ON DELETE CASCADE,
    round_number          SMALLINT NOT NULL CHECK (round_number BETWEEN 1 AND 5),
    domain_id             INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    opener                VARCHAR(8) NOT NULL CHECK (opener IN ('for', 'against')),
    for_start_ms          INT CHECK (for_start_ms IS NULL OR for_start_ms >= 0),
    for_end_ms            INT CHECK (for_end_ms IS NULL OR for_end_ms >= 0),
    against_start_ms      INT CHECK (against_start_ms IS NULL OR against_start_ms >= 0),
    against_end_ms        INT CHECK (against_end_ms IS NULL OR against_end_ms >= 0),
    grace_start_ms        INT CHECK (grace_start_ms IS NULL OR grace_start_ms >= 0),
    grace_end_ms          INT CHECK (grace_end_ms IS NULL OR grace_end_ms >= 0),
    winner                VARCHAR(8) CHECK (winner IN ('for', 'against')),
    for_score             SMALLINT,
    against_score         SMALLINT,
    ruling                TEXT,
    for_points            JSONB,
    against_points        JSONB,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (video_debate_id, round_number),
    UNIQUE (video_debate_id, domain_id),
    CHECK (for_start_ms IS NULL OR for_end_ms IS NULL OR for_start_ms < for_end_ms),
    CHECK (against_start_ms IS NULL OR against_end_ms IS NULL OR against_start_ms < against_end_ms),
    CHECK (grace_start_ms IS NULL OR grace_end_ms IS NULL OR grace_start_ms < grace_end_ms),
    CHECK (
        (for_score IS NULL AND against_score IS NULL)
        OR (
            for_score IS NOT NULL
            AND against_score IS NOT NULL
            AND for_score BETWEEN 0 AND 100
            AND against_score BETWEEN 0 AND 100
            AND for_score + against_score = 100
            AND for_score <> against_score
        )
    )
);

CREATE INDEX idx_video_debates_public
    ON video_debates (published_at DESC, id DESC)
    WHERE status = 'published';

CREATE INDEX idx_video_debate_participants_user
    ON video_debate_participants (user_id, video_debate_id)
    WHERE user_id IS NOT NULL;
