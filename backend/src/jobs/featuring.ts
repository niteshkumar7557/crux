// Poller: the stage. Recompute heat, crown the Motion of the Day, refresh the
// featured set — IN THAT ORDER, because the MotD is picked by heat and then
// force-featured, and the hero query asks for featured AND is_motd. All three steps
// are set-based: the stage is a property of the whole table.
// Spec: game-theory.md §15

import pool from "../db/index.js";
import logger from "../lib/logger.js";
import {
  BALANCE_FLOOR,
  HEAT_WINDOW_HOURS,
  MAIN_STAGE_SIZE,
} from "./featuring.logic.js";
import config from "../config/index.js";

const TICK_MS = config.jobs.featuring_tick_ms;

let running = false;

// computeHeat() expressed in SQL so every live debate is rescored in one
// statement. The constants are imported, so the two can drift in shape but never
// in numbers. Only rows whose heat actually moved are written.
async function recomputeHeat(): Promise<void> {
  await pool.query(
    `
    WITH windowed AS (
      SELECT ag.id,
             COUNT(c.id)                                   AS recent,
             COUNT(c.id) FILTER (WHERE c.side = 'for')     AS for_n,
             COUNT(c.id) FILTER (WHERE c.side = 'against') AS against_n
      FROM motions ag
      LEFT JOIN arguments c
             ON c.motion_id = ag.id
            AND c.created_at >= NOW() - make_interval(hours => $2::int)
      WHERE ag.status = 'live'
      GROUP BY ag.id
    ),
    scored AS (
      SELECT id,
             COALESCE(
               recent * ($1::real + (1 - $1::real) *
                 (1 - ABS(for_n - against_n)::real / NULLIF(for_n + against_n, 0))),
               0
             )::real AS new_heat
      FROM windowed
    )
    UPDATE motions a
    SET heat = s.new_heat
    FROM scored s
    WHERE a.id = s.id AND a.heat IS DISTINCT FROM s.new_heat;
    `,
    [BALANCE_FLOOR, HEAT_WINDOW_HOURS],
  );
}

// Re-crowns when the reigning MotD is no longer live: the hero query only serves
// a live debate, so letting a concluded one hold the crown blanks the hero.
async function rotateMotd(): Promise<void> {
  const held = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM motions
       WHERE is_motd AND status = 'live'
         AND motd_at::date = (NOW() AT TIME ZONE 'UTC')::date
     ) AS crowned`,
  );
  if (held.rows[0].crowned) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE motions SET is_motd = FALSE WHERE is_motd = TRUE`,
    );
    const crowned = await client.query(
      `UPDATE motions SET is_motd = TRUE, motd_at = NOW()
       WHERE id = (
         SELECT id FROM motions
         WHERE status = 'live'
         ORDER BY heat DESC, pinned DESC, created_at DESC, id DESC
         LIMIT 1
       )
       RETURNING id`,
    );
    await client.query("COMMIT");
    if (crowned.rows.length > 0) {
      logger.info(
        { motionId: crowned.rows[0].id },
        "debate of the day crowned",
      );
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// The MotD is excluded from the ranking so the hero never eats a grid slot, and
// force-featured because the hero query asks for featured AND is_motd.
// `featured_at` is stamped only on entry, so ordering is stable while a debate
// keeps its slot.
async function refreshFeatured(): Promise<void> {
  await pool.query(
    `
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               ORDER BY heat DESC, created_at DESC, id DESC
             ) AS rn
      FROM motions
      WHERE status = 'live' AND NOT is_motd
    ),
    stage AS (
      SELECT a.id,
             (
               a.status = 'live'
               AND (a.pinned OR a.is_motd OR (r.rn IS NOT NULL AND r.rn <= $1))
             ) AS on_stage
      FROM motions a
      LEFT JOIN ranked r ON r.id = a.id
      WHERE a.status = 'live' OR a.featured OR a.featured_at IS NOT NULL
    )
    UPDATE motions a
    SET featured = s.on_stage,
        featured_at = CASE
          WHEN s.on_stage AND a.featured_at IS NULL THEN NOW()
          WHEN NOT s.on_stage THEN NULL
          ELSE a.featured_at
        END
    FROM stage s
    WHERE a.id = s.id
      AND (a.featured IS DISTINCT FROM s.on_stage
           OR (s.on_stage AND a.featured_at IS NULL)
           OR (NOT s.on_stage AND a.featured_at IS NOT NULL));
    `,
    [MAIN_STAGE_SIZE],
  );
}

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
    // Order matters: the MotD is picked by heat and then force-featured, so
    // crowning after refreshFeatured would leave a fresh hero unfeatured — and so
    // invisible — until the next tick.
    await recomputeHeat();
    await rotateMotd();
    await refreshFeatured();
  } catch (err) {
    logger.error({ err: String(err) }, "featuring tick failed");
  } finally {
    running = false;
  }
}

export function startFeaturingPoller(): void {
  logger.info({ tick_m: TICK_MS / 60_000 }, "featuring poller started");
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
