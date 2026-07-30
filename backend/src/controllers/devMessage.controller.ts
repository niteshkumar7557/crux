// "Talk to the developer" — one thread per user. Postgres is the record and Telegram
// is a view of it, so a relay outage is a delay rather than a loss: the row saves,
// relayed_at stays NULL, and the poller's sweep delivers it later.
// Spec: game-theory.md §20

import type { Request, Response } from "express";
import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { checkText } from "../lib/validate.js";
import { sendMessage } from "../lib/telegram.js";
import { formatRelay } from "../jobs/telegram.logic.js";

const THREAD_LIMIT = 100;

export async function listMessages(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    // The inner DESC takes the NEWEST hundred and the outer ASC hands them back in
    // reading order. A single ASC LIMIT would cap the oldest hundred and freeze a
    // long thread at its beginning.
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

    // Best-effort, never throwing into the response. The row is already saved, so
    // a relay outage is a delay and not a loss: relayed_at stays NULL and the
    // poller's sweep picks it up.
    await relay(userId, row.id, checked.value);

    return res.status(201).json({ item: row });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function markMessagesRead(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
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
    if (tgId === null) return;

    await pool.query(
      `UPDATE dev_messages SET tg_message_id = $1, relayed_at = NOW() WHERE id = $2`,
      [tgId, rowId],
    );
  } catch (err) {
    logger.warn({ err: String(err), rowId }, "dev message relay failed");
  }
}
