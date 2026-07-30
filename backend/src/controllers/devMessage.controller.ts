import type { Request, Response } from "express";
import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { checkText } from "../lib/validate.js";
import { sendMessage } from "../lib/telegram.js";
import { formatRelay } from "../jobs/telegram.logic.js";

// "Talk to the developer" — one thread per user. Every handler takes its user
// from `req.user.id` and never from the body, so there is nothing to authorise
// beyond being signed in: a caller can only ever address their own thread.

/** Newest hundred, oldest-first. See the note on the query below. */
const THREAD_LIMIT = 100;

// GET /messages — the caller's thread + their unread count.
export async function listMessages(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    // The inner DESC takes the *newest* hundred and the outer ASC hands them
    // back in reading order, so the client renders top-to-bottom without
    // reversing. A single ASC LIMIT would have capped the oldest hundred and
    // frozen a long thread at its beginning.
    const items = await pool.query(
      `SELECT id, sender, body, created_at FROM (
         SELECT id, sender, body, created_at
         FROM dev_messages WHERE user_id = $1
         ORDER BY id DESC LIMIT $2
       ) recent
       ORDER BY id ASC`,
      [userId, THREAD_LIMIT],
    );
    const unread = await pool.query(
      `SELECT COUNT(*)::int AS n FROM dev_messages
       WHERE user_id = $1 AND sender = 'dev' AND is_read = FALSE`,
      [userId],
    );
    // Who the user is talking to, so the panel can put a face on the other side
    // of the thread. Piggybacked on the poll rather than given its own endpoint:
    // it is a unique-index hit next to two queries that were already running,
    // and a second round trip for one row costs the client more than this costs
    // the database. Missing rows are not an error — see config.telegram.
    const dev = await pool.query(
      `SELECT username, avatar FROM users WHERE username = $1`,
      [config.telegram.dev_username],
    );
    return res.status(200).json({
      items: items.rows,
      unread: unread.rows[0].n,
      dev: dev.rows[0] ?? {
        username: config.telegram.dev_username,
        avatar: null,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

// POST /messages — write to the developer.
export async function sendDevMessage(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const checked = checkText(req.body?.body, {
    field: "message",
    max: config.limits.dev_message_chars,
  });
  if (!checked.ok) return res.status(400).json({ error: checked.reason });

  try {
    const inserted = await pool.query(
      `INSERT INTO dev_messages (user_id, sender, body)
       VALUES ($1, 'user', $2)
       RETURNING id, sender, body, created_at`,
      [userId, checked.value],
    );
    const row = inserted.rows[0];

    // Relayed best-effort, never throwing into the response — the same
    // convention as notifyOpposition. The row is already saved, so a Telegram
    // outage is a delay and not a loss: `relayed_at` stays NULL and the poller's
    // sweep picks it up. The user is told their message was received either way,
    // because it was.
    await relay(userId, row.id, checked.value);

    return res.status(201).json({ item: row });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

// POST /messages/read — mark the developer's replies read.
export async function markMessagesRead(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    // Never touches 'user' rows: you have read your own messages.
    await pool.query(
      `UPDATE dev_messages SET is_read = TRUE
       WHERE user_id = $1 AND sender = 'dev' AND is_read = FALSE`,
      [userId],
    );
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

/**
 * Pushes one saved row to Telegram and stamps it as relayed. Swallows every
 * failure by design — see the call site.
 *
 * The `@handle` line is built from the username in our own `users` table, never
 * from the message, so a user whose first line is "@someone_else" cannot make a
 * swipe-reply land in a stranger's thread.
 */
export async function relay(
  userId: number,
  rowId: number,
  body: string,
): Promise<void> {
  try {
    const username =
      (await pool.query(`SELECT username FROM users WHERE id = $1`, [userId]))
        .rows[0]?.username ?? null;
    if (!username) return;

    const tgId = await sendMessage(formatRelay(username, body));
    // null means the relay is switched off. `relayed_at` stays NULL, which is
    // right in both directions: nothing retries locally because the poller
    // isn't running either, and the day a token is configured the sweep
    // delivers the whole backlog on its first tick.
    if (tgId === null) return;

    await pool.query(
      `UPDATE dev_messages SET tg_message_id = $1, relayed_at = NOW() WHERE id = $2`,
      [tgId, rowId],
    );
  } catch (err) {
    logger.warn({ err: String(err), rowId }, "dev message relay failed");
  }
}
