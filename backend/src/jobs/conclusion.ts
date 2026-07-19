import pool from "../db/index.js";
import { concludeDebate } from "../ai/verdict.js";
import {
  HOT_WINDOW_HOURS,
  HOT_THRESHOLD,
  HOT_EXTENSION_HOURS,
} from "./hotExtension.logic.js";

const TICK_MS = 60_000;
const BATCH = 20;
let running = false;

// §8.1 — before concluding due debates, give one automatic extension to any live
// debate in its final HOT_WINDOW_HOURS whose comment velocity is high. Set-based:
// one UPDATE handles the whole batch; hot_extended = TRUE makes it fire at most once.
async function hotExtendTick(): Promise<void> {
  const res = await pool.query(
    `UPDATE arguments a
        SET closes_at = closes_at + ($1 || ' hours')::INTERVAL,
            hot_extended = TRUE
      WHERE a.status = 'live'
        AND a.hot_extended = FALSE
        AND a.closes_at > NOW()
        AND a.closes_at <= NOW() + ($2 || ' hours')::INTERVAL
        AND (SELECT COUNT(*) FROM comments c
              WHERE c.argument_id = a.id
                AND c.created_at >= NOW() - ($2 || ' hours')::INTERVAL) >= $3`,
    [HOT_EXTENSION_HOURS, HOT_WINDOW_HOURS, HOT_THRESHOLD],
  );
  if (res.rowCount) {
    console.log(`🔥 hot-extended ${res.rowCount} debate(s) by ${HOT_EXTENSION_HOURS}h`);
  }
}

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
    try {
      await hotExtendTick(); // extend hot debates before the due-conclusion sweep
    } catch (err) {
      console.error("❌ hot-extension pass failed:", err); // never block conclusions
    }
    const due = await pool.query(
      `SELECT id FROM arguments
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
        // concludeDebate already logged + rolled back; move on.
      }
    }
  } catch (err) {
    console.error("❌ conclusion poller tick failed:", err);
  } finally {
    running = false;
  }
}

export function startConclusionPoller(): void {
  console.log("⏱  conclusion poller started (60s)");
  void tick();
  setInterval(() => void tick(), TICK_MS);
}
