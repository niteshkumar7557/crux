import pool from "../db/index.js";
import { concludeDebate } from "../ai/verdict.js";

const TICK_MS = 60_000;
const BATCH = 20;
let running = false;

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  running = true;
  try {
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
