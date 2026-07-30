// The fourth poller, and the only one that is NOT a setInterval: getUpdates blocks
// server-side for up to 30s, so a fixed interval would stack overlapping requests
// against the same offset. Self-rescheduling loop instead, with exponential backoff
// after a failure so a network blip cannot spin it hot.
//
// The offset lives in memory on purpose: Telegram retains unconfirmed updates for
// ~24h and tg_update_id UNIQUE makes a replayed batch a no-op, which is simpler than
// persisting and transactionally advancing an offset.
// Spec: game-theory.md §20

import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import {
  getUpdates,
  sendMessage,
  isTelegramConfigured,
} from "../lib/telegram.js";
import { parseDevUpdate, formatRelay, type DevReplyTarget } from "./telegram.logic.js";

const SWEEP_BATCH = 10;

const BACKOFF_START_MS = 1_000;
const BACKOFF_CEILING_MS = 60_000;

let offset: number | null = null;
let backoffMs = BACKOFF_START_MS;
let stopped = false;

async function resolveTarget(target: DevReplyTarget): Promise<number | null> {
  if (target.kind === "reply") {
    const { rows } = await pool.query(
      `SELECT user_id FROM dev_messages WHERE tg_message_id = $1`,
      [target.tgMessageId],
    );
    return rows[0]?.user_id ?? null;
  }
  const { rows } = await pool.query(`SELECT id FROM users WHERE username = $1`, [
    target.username,
  ]);
  return rows[0]?.id ?? null;
}

async function handleUpdate(update: unknown): Promise<void> {
  const parsed = parseDevUpdate(update, config.telegram.dev_chat_id!);

  // The offset advances past everything we saw, handled or not. An unacknowledged
  // update would be re-fetched forever, so one stranger with one sticker could
  // otherwise wedge the poller permanently.
  if (parsed.updateId !== null) offset = parsed.updateId + 1;

  if (!parsed.ok) {
    // `debug`, not `warn`: bot usernames are public, so strangers poking the bot
    // is expected traffic and must not be able to fill the logs.
    logger.debug({ reason: parsed.reason }, "telegram update ignored");
    return;
  }

  const userId = await resolveTarget(parsed.target);
  if (userId === null) {
    const who =
      parsed.target.kind === "username"
        ? `@${parsed.target.username}`
        : "that message";
    await sendMessage(`no user ${who} — nothing sent`).catch(() => {});
    return;
  }

  await pool.query(
    `INSERT INTO dev_messages (user_id, sender, body, tg_update_id)
     VALUES ($1, 'dev', $2, $3)
     ON CONFLICT (tg_update_id) DO NOTHING`,
    [userId, parsed.body, parsed.updateId],
  );
}

// Retries messages whose relay never landed, oldest first. This is what turns a
// Telegram outage into a delay instead of a loss — including the case where the
// bot was configured only after people had already written.
async function sweepUnrelayed(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT d.id, d.body, u.username
     FROM dev_messages d JOIN users u ON u.id = d.user_id
     WHERE d.sender = 'user' AND d.relayed_at IS NULL
     ORDER BY d.id ASC LIMIT $1`,
    [SWEEP_BATCH],
  );

  for (const row of rows) {
    const tgId = await sendMessage(formatRelay(row.username, row.body));
    if (tgId === null) return; // relay is off; the rest of the batch would fail too
    await pool.query(
      `UPDATE dev_messages SET tg_message_id = $1, relayed_at = NOW() WHERE id = $2`,
      [tgId, row.id],
    );
  }
}

async function pass(): Promise<void> {
  const updates = await getUpdates(offset);
  for (const update of updates) {
    await handleUpdate(update);
  }
  await sweepUnrelayed();
}

async function loop(): Promise<void> {
  if (stopped) return;
  try {
    await pass();
    backoffMs = BACKOFF_START_MS;
    setTimeout(() => void loop(), 0);
  } catch (err) {
    logger.error({ err: String(err), retryInMs: backoffMs }, "telegram poll failed");
    const wait = backoffMs;
    backoffMs = Math.min(backoffMs * 2, BACKOFF_CEILING_MS);
    setTimeout(() => void loop(), wait);
  }
}

export function startTelegramPoller(): void {
  if (!isTelegramConfigured()) {
    logger.info("telegram relay disabled (no bot token or dev chat id)");
    return;
  }
  logger.info({ timeout_s: config.telegram.poll_timeout_s }, "telegram poller started");
  void loop();
}

export function stopTelegramPoller(): void {
  stopped = true;
}
