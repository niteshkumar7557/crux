// Poller: awards a finished season. Idempotent twice over — the already-filed check,
// and UNIQUE (season_key, rank). Safe to run hourly forever, and safe to run twice.
// Spec: game-theory.md §14

import pool from "../db/index.js";
import logger from "../lib/logger.js";
import { awardsForSeason, previousSeason } from "./seasonRollover.logic.js";
import { createNotification } from "../notifications/notify.js";
import { seasonAwardMessage } from "../notifications/messages.js";
import { queueEmail } from "../emails/queue.js";
import config from "../config/index.js";

const TICK_MS = config.jobs.season_rollover_tick_ms;
let running = false;

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
    const season = previousSeason();
    if (!season) return;

    const filed = await pool.query(
      `SELECT 1 FROM season_awards WHERE season_key = $1 LIMIT 1`,
      [season.key],
    );
    if (filed.rows.length > 0) return;

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
      logger.info(
        { season: season.key, number: season.number },
        "season closed with nobody to award",
      );
      return;
    }

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
        // Queued inside the same transaction as the award: if the rollover rolls
        // back, the email that announces it goes with it.
        await queueEmail(
          a.userId,
          { category: "season", data: { title: a.title, rank: a.rank } },
          client,
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    logger.info(
      {
        season: season.key,
        number: season.number,
        awards: awards.map((a) => `#${a.rank} user ${a.userId}`),
      },
      "season awarded",
    );
  } catch (err) {
    logger.error({ err: String(err) }, "season rollover tick failed");
  } finally {
    running = false;
  }
}

export function startSeasonRolloverPoller(): void {
  logger.info({ tick_m: TICK_MS / 60_000 }, "season rollover poller started");
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
