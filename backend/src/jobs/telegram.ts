import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import {
  getUpdates,
  sendMessage,
  isTelegramConfigured,
} from "../lib/telegram.js";
import { parseDevUpdate, formatRelay, type DevReplyTarget } from "./telegram.logic.js";

// The fourth background job, and the only one that is NOT a setInterval.
//
// `getUpdates` blocks for up to poll_timeout_s by design, so a fixed interval
// would stack overlapping in-flight requests against the same offset. This is a
// self-rescheduling loop instead: immediately again after a good pass,
// exponential backoff after a bad one, so a network blip cannot spin it hot.

/** Unrelayed user messages retried per pass. Bounded so a long backlog drains
 *  over several passes instead of holding one open indefinitely. */
const SWEEP_BATCH = 10;

const BACKOFF_START_MS = 1_000;
const BACKOFF_CEILING_MS = 60_000;

/**
 * Where to resume from. In memory only: Telegram itself retains unconfirmed
 * updates for ~24h, so a restart re-delivers whatever the last pass had not
 * acknowledged, and `tg_update_id UNIQUE` makes re-handling a no-op. That pair
 * is strictly simpler than persisting an offset and advancing it
 * transactionally.
 */
let offset: number | null = null;
let backoffMs = BACKOFF_START_MS;
let stopped = false;

/** Resolves who a reply is addressed to, or null if nobody. */
async function resolveTarget(target: DevReplyTarget): Promise<number | null> {
  if (target.kind === "reply") {
    const { rows } = await pool.query(
      `SELECT user_id FROM dev_messages WHERE tg_message_id = $1`,
      [target.tgMessageId],
    );
    return rows[0]?.user_id ?? null;
  }
  // Usernames are lowercased at write time by validateUsername and the handle
  // arrives already normalized, so this hits the unique index directly — a
  // LOWER(username) = LOWER($1) would not.
  const { rows } = await pool.query(`SELECT id FROM users WHERE username = $1`, [
    target.username,
  ]);
  return rows[0]?.id ?? null;
}

async function handleUpdate(update: unknown): Promise<void> {
  const parsed = parseDevUpdate(update, config.telegram.dev_chat_id!);

  // The offset advances past everything we saw, handled or not. An update left
  // unacknowledged would be re-fetched forever, so one stranger sending one
  // sticker could otherwise wedge the poller permanently.
  if (parsed.updateId !== null) offset = parsed.updateId + 1;

  if (!parsed.ok) {
    // `debug`, not `warn`: bot usernames are public, so a stranger poking the
    // bot is expected traffic and must not be able to fill the logs.
    logger.debug({ reason: parsed.reason }, "telegram update ignored");
    return;
  }

  const userId = await resolveTarget(parsed.target);
  if (userId === null) {
    // Answered out loud, deliberately. A silently swallowed reply is
    // indistinguishable from a delivered one, which is the worst failure mode
    // this feature has.
    const who =
      parsed.target.kind === "username"
        ? `@${parsed.target.username}`
        : "that message";
    await sendMessage(`no user ${who} — nothing sent`).catch(() => {});
    return;
  }

  // A username target with no history is allowed rather than guarded against:
  // it opens a thread the developer started, which is how you follow up on
  // something a user reported elsewhere. That capability is free here.
  await pool.query(
    `INSERT INTO dev_messages (user_id, sender, body, tg_update_id)
     VALUES ($1, 'dev', $2, $3)
     ON CONFLICT (tg_update_id) DO NOTHING`,
    [userId, parsed.body, parsed.updateId],
  );
}

/**
 * Retries user messages whose relay never landed, oldest first. This is what
 * turns a Telegram outage into a delay instead of a loss — including the case
 * where the bot was configured only after people had already written.
 */
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
    // Straight back into the next long poll: the wait happens server-side.
    setTimeout(() => void loop(), 0);
  } catch (err) {
    logger.error({ err: String(err), retryInMs: backoffMs }, "telegram poll failed");
    const wait = backoffMs;
    backoffMs = Math.min(backoffMs * 2, BACKOFF_CEILING_MS);
    setTimeout(() => void loop(), wait);
  }
}

/**
 * Starts the relay, or says why it didn't. Safe to call unconditionally.
 *
 * Single replica only: two would both long-poll and split updates
 * non-deterministically between them. `tg_update_id UNIQUE` prevents duplicate
 * rows, so the cost is a wasted fetch rather than a wrong thread — but the
 * `numReplicas = 1` in railway.toml is what keeps it a non-issue.
 */
export function startTelegramPoller(): void {
  if (!isTelegramConfigured()) {
    // Not a warning: this is the normal state in dev and CI, and the web side
    // of the feature works completely without it.
    logger.info("telegram relay disabled (no bot token or dev chat id)");
    return;
  }
  logger.info({ timeout_s: config.telegram.poll_timeout_s }, "telegram poller started");
  void loop();
}

/** Test/shutdown hook: stops the loop rescheduling itself. */
export function stopTelegramPoller(): void {
  stopped = true;
}
