// Poller: concludes debates past closes_at. FOR UPDATE SKIP LOCKED, so an overlapping
// tick picks up different rows rather than blocking.
// Spec: game-theory.md §4, §11

import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { concludeDebate } from "../ai/verdict.js";

const TICK_MS = config.jobs.conclusion_tick_ms;
const BATCH = config.jobs.conclusion_batch;
let running = false;

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
    const due = await pool.query(
      `SELECT id FROM motions
       WHERE status = 'live' AND closes_at <= NOW()
       ORDER BY closes_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH],
    );
    for (const row of due.rows) {
      try {
        await concludeDebate(row.id);
      } catch {
        // concludeDebate already logged and rolled back; move on.
      }
    }
  } catch (err) {
    logger.error({ err: String(err) }, "conclusion tick failed");
  } finally {
    running = false;
  }
}

export function startConclusionPoller(): void {
  logger.info({ tick_s: TICK_MS / 1000 }, "conclusion poller started");
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
