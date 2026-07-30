// The inbox. Every handler is scoped to req.user.id, so there is nothing to
// authorise beyond being signed in.
// Spec: game-theory.md §20

import type { Request, Response } from "express";
import pool from "../db/index.js";

export async function listNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const items = await pool.query(
      `SELECT id, type, motion_id, actor, message, is_read, created_at
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

export async function clearNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}

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
