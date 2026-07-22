import pool from "../db/index.js";
import {
  BALANCE_FLOOR,
  HEAT_WINDOW_HOURS,
  MAIN_STAGE_SIZE,
} from "./featuring.logic.js";
import config from "../config/index.js";

const TICK_MS = config.jobs.featuring_tick_ms;

// §11 The stage. Every tick recomputes heat, crowns the Debate of the Day, and
// refreshes the featured set. All three steps are set-based: the stage is a
// property of the whole table, and the stress dataset has a million rows.
//
// Timestamps in this schema are naive and the database runs UTC (Etc/UTC), so
// "the current UTC day" is just today's date here.

let running = false;

/**
 * §11 — heat = comment velocity x side balance, over HEAT_WINDOW_HOURS.
 *
 * This is `computeHeat()` from featuring.logic.ts expressed in SQL so every
 * live debate is rescored in one statement. The constants come from that
 * module, so the two can only drift in shape, never in numbers.
 *
 * Only rows whose heat actually moved are written — a no-op tick must not
 * rewrite the table.
 */
async function recomputeHeat(): Promise<void> {
  await pool.query(
    `
    WITH windowed AS (
      SELECT ag.id,
             COUNT(c.id)                                   AS recent,
             COUNT(c.id) FILTER (WHERE c.side = 'for')     AS for_n,
             COUNT(c.id) FILTER (WHERE c.side = 'against') AS against_n
      FROM arguments ag
      LEFT JOIN comments c
             ON c.argument_id = ag.id
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
    UPDATE arguments a
    SET heat = s.new_heat
    FROM scored s
    WHERE a.id = s.id AND a.heat IS DISTINCT FROM s.new_heat;
    `,
    [BALANCE_FLOOR, HEAT_WINDOW_HOURS],
  );
}

/**
 * §11 — one Debate of the Day, crowned once per UTC day.
 *
 * Re-crowns when the reigning DotD is no longer live: `getPrimaryCardData`
 * only serves a live hero, so letting a concluded debate hold the crown would
 * blank the home hero for the rest of the day.
 */
async function rotateDotd(): Promise<void> {
  const held = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM arguments
       WHERE is_dotd AND status = 'live'
         AND dotd_at::date = (NOW() AT TIME ZONE 'UTC')::date
     ) AS crowned`,
  );
  if (held.rows[0].crowned) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE arguments SET is_dotd = FALSE WHERE is_dotd = TRUE`,
    );
    const crowned = await client.query(
      `UPDATE arguments SET is_dotd = TRUE, dotd_at = NOW()
       WHERE id = (
         SELECT id FROM arguments
         WHERE status = 'live'
         ORDER BY heat DESC, pinned DESC, created_at DESC, id DESC
         LIMIT 1
       )
       RETURNING id`,
    );
    await client.query("COMMIT");
    if (crowned.rows.length > 0) {
      console.log(`👑 Debate of the Day → ${crowned.rows[0].id}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * §11/§15 — the featured set is the Debate of the Day, the MAIN_STAGE_SIZE
 * hottest live debates below it, and every admin pin regardless of heat.
 *
 * The DotD is excluded from the ranking so the hero never eats a grid slot,
 * and is force-featured because the home hero query asks for
 * `featured = TRUE AND is_dotd = TRUE`. Concluded debates leave the stage.
 *
 * `featured_at` is stamped only on entry, so the grid's ordering stays stable
 * while a debate keeps its slot.
 */
async function refreshFeatured(): Promise<void> {
  await pool.query(
    `
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               ORDER BY heat DESC, created_at DESC, id DESC
             ) AS rn
      FROM arguments
      WHERE status = 'live' AND NOT is_dotd
    ),
    stage AS (
      SELECT a.id,
             (
               a.status = 'live'
               AND (a.pinned OR a.is_dotd OR (r.rn IS NOT NULL AND r.rn <= $1))
             ) AS on_stage
      FROM arguments a
      LEFT JOIN ranked r ON r.id = a.id
      WHERE a.status = 'live' OR a.featured OR a.featured_at IS NOT NULL
    )
    UPDATE arguments a
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
    // Order matters: the DotD is picked by heat, and is then force-featured.
    // Crowning after refreshFeatured would leave a fresh hero unfeatured — and
    // so invisible — until the next tick.
    await recomputeHeat();
    await rotateDotd();
    await refreshFeatured();
  } catch (err) {
    console.error("❌ featuring poller tick failed:", err);
  } finally {
    running = false;
  }
}

export function startFeaturingPoller(): void {
  console.log(`⏱  featuring poller started (${TICK_MS / 60_000}m)`);
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
