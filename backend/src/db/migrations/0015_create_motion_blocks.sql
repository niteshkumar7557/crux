-- Per-motion posting blocks, with a reason, an audit trail and a lift record.
-- A table and not a bare COUNT because blocks will come from several reasons
-- over time — the argument cap is only the first — and a table gives every
-- block a reason, a timestamp, a lift record and a note, which "why can't I
-- post here" needs and a count query never could.
-- Spec: game-theory.md §22
CREATE TABLE motion_blocks (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL,
    motion_id   INT NOT NULL,

    -- Why the block exists. Today only 'argument_limit'.
    -- Future values are added here, never overloaded into notes.
    reason      VARCHAR(32) NOT NULL,

    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Lift record. lifted_at IS NULL means the block is ACTIVE.
    lifted_at   TIMESTAMP DEFAULT NULL,
    lifted_by   INT DEFAULT NULL,          -- admin user id
    allowance   INT DEFAULT NULL,          -- new total argument allowance on lift
    note        TEXT DEFAULT NULL,         -- developer's reasoning, for the audit trail

    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (motion_id) REFERENCES motions(id) ON DELETE CASCADE,
    FOREIGN KEY (lifted_by) REFERENCES users(id)   ON DELETE SET NULL
);

-- The hot path: "is this user blocked on this motion right now?"
CREATE UNIQUE INDEX idx_motion_blocks_active
    ON motion_blocks(user_id, motion_id)
    WHERE lifted_at IS NULL;

-- The admin queue.
CREATE INDEX idx_motion_blocks_pending
    ON motion_blocks(created_at DESC)
    WHERE lifted_at IS NULL;
