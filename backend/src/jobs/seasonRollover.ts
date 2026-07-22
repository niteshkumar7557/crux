import pool from "../db/index.js";
import { awardsForSeason, previousSeason } from "./seasonRollover.logic.js";
import { createNotification } from "../notifications/notify.js";
import { seasonAwardMessage } from "../notifications/messages.js";
import config from "../config/index.js";

// §10 Season end. Hourly is plenty — the trigger is a month boundary, and the
// only cost of firing an hour late is an hour's delay on a badge.
//
// The job is idempotent by construction: it does nothing once the finished
// season already has awards on file, and the INSERT carries
// ON CONFLICT (season_key, rank) besides. It is safe to run every hour forever,
// and safe to run twice at once.

const TICK_MS = config.jobs.season_rollover_tick_ms;
let running = false;

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
    const season = previousSeason();
    // Null before Season 0 closes — there is no pre-launch month to win.
    if (!season) return;

    const filed = await pool.query(
      `SELECT 1 FROM season_awards WHERE season_key = $1 LIMIT 1`,
      [season.key],
    );
    if (filed.rows.length > 0) return;

    // The final board for that month, on the same window and tiebreak the live
    // season board used, so the snapshot matches what players actually saw.
    // Season-only rows (the §8 loss penalty) count here exactly as they did
    // there: they cost the month, not the career.
    const board = await pool.query(
      `SELECT le.user_id AS "userId", SUM(le.amount)::int AS "seasonLogic"
       FROM logic_events le
       WHERE le.created_at >= $1 AND le.created_at < $2
       GROUP BY le.user_id
       HAVING SUM(le.amount) > 0
       ORDER BY SUM(le.amount) DESC, le.user_id ASC
       LIMIT 3`,
      [season.start, season.end],
    );

    const awards = awardsForSeason(board.rows, season.number, season.key);
    if (awards.length === 0) {
      console.log(`🏁 Season ${season.number} (${season.key}) closed with nobody to award`);
      return;
    }

    // One transaction for all three: a partial write would leave the
    // already-filed check above returning true, and ranks 2 and 3 would never
    // be awarded at all.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const a of awards) {
        await client.query(
          `INSERT INTO season_awards
             (season_key, season_number, user_id, rank, title, frame, season_logic)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (season_key, rank) DO NOTHING`,
          [
            a.seasonKey,
            a.seasonNumber,
            a.userId,
            a.rank,
            a.title,
            a.frame,
            a.seasonLogic,
          ],
        );
        await createNotification(client, {
          userId: a.userId,
          type: "season",
          message: seasonAwardMessage(a.title, a.rank),
        });
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    console.log(
      `🏆 Season ${season.number} (${season.key}) awarded: ` +
        awards.map((a) => `#${a.rank} user ${a.userId}`).join(", "),
    );
  } catch (err) {
    console.error("❌ season rollover tick failed:", err);
  } finally {
    running = false;
  }
}

export function startSeasonRolloverPoller(): void {
  console.log(`⏱  season rollover poller started (${TICK_MS / 60_000}m)`);
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
