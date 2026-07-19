import type { Request, Response } from "express";
import pool from "../db/index.js";

// GET /notifications — the current user's recent inbox + unread count.
export async function listNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const items = await pool.query(
      `SELECT id, type, argument_id, actor, message, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [userId],
    );
    const unread = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return res.status(200).json({ items: items.rows, unread: unread.rows[0].n });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

// POST /notifications/read — mark the current user's notifications read.
export async function markRead(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}
