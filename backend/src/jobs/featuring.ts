import pool from "../db/index.js";
import {
  FEATURED_SLOTS,
  FEATURING_TICK_MS,
  VOTE_WEIGHT,
  shouldRotateDotd,
} from "./featuring.logic.js";

let running = false;

// a. Recompute heat for every live debate: velocity(last 24h) * (0.5 + 0.5*balance).
async function recomputeHeat(): Promise<void> {
  await pool.query(`
    UPDATE arguments a SET heat =
      h.recent * (0.5 + 0.5 * COALESCE(
        LEAST(h.aff, h.neg)::real / NULLIF(GREATEST(h.aff, h.neg), 0), 0))
    FROM (
      SELECT ag.id,
        COUNT(*) FILTER (WHERE c.created_at >= NOW() - INTERVAL '24 hours') AS recent,
        COUNT(*) FILTER (WHERE c.side = 'for')     AS aff,
        COUNT(*) FILTER (WHERE c.side = 'against') AS neg
      FROM arguments ag
      LEFT JOIN comments c ON c.argument_id = ag.id
      WHERE ag.status = 'live'
      GROUP BY ag.id
    ) h
    WHERE a.id = h.id AND a.status = 'live';
  `);
}

// b. Featured = override rows OR the top-N live debates by heat. Stamp/clear featured_at.
async function refreshFeatured(): Promise<void> {
  await pool.query(
    `
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY (heat + $2 * votes) DESC, id ASC) AS rn
      FROM arguments WHERE status = 'live'
    )
    UPDATE arguments a SET
      featured = (a.featured_override OR r.rn <= $1),
      featured_at = CASE
        WHEN (a.featured_override OR r.rn <= $1) AND a.featured_at IS NULL THEN NOW()
        WHEN NOT (a.featured_override OR r.rn <= $1) THEN NULL
        ELSE a.featured_at
      END
    FROM ranked r
    WHERE a.id = r.id;
    `,
    [FEATURED_SLOTS + 1, VOTE_WEIGHT], // +1 so the DotD hero doesn't consume a grid slot
  );
}

// c. Crown a Debate of the Day at most once per calendar day.
async function rotateDotd(): Promise<void> {
  const crowned = (
    await pool.query(
      `SELECT EXISTS(SELECT 1 FROM arguments WHERE dotd_at::date = CURRENT_DATE) AS crowned`,
    )
  ).rows[0].crowned as boolean;
  if (!shouldRotateDotd(crowned)) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE arguments SET is_dotd = FALSE WHERE is_dotd = TRUE`);
    await client.query(
      `UPDATE arguments SET is_dotd = TRUE, dotd_at = NOW()
       WHERE id = (
         SELECT id FROM arguments WHERE status = 'live'
         ORDER BY (heat + $1 * votes) DESC, featured_override DESC, id ASC LIMIT 1
       )`,
      [VOTE_WEIGHT],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const [label, step] of [
      ["heat recompute", recomputeHeat],
      ["featured refresh", refreshFeatured],
      ["DotD rotation", rotateDotd],
    ] as const) {
      try {
        await step();
      } catch (err) {
        console.error(`❌ featuring ${label} failed:`, err);
      }
    }
  } finally {
    running = false;
  }
}

export function startFeaturingPoller(): void {
  console.log("🎟  featuring poller started (5m)");
  void tick();
  setInterval(() => void tick(), FEATURING_TICK_MS);
}
