// The admin pin and the hand-crowned Motion of the Day. Both are live-only: the stage
// exists to send readers somewhere they can still argue.
// Authorisation is the router's job (authMiddleware + requireRole).
// Spec: game-theory.md §15

import type { Request, Response } from "express";
import pool from "../db/index.js";

function parseId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function togglePin(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "invalid motion id" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE motions SET pinned = NOT pinned
       WHERE id = $1 AND status = 'live'
       RETURNING pinned`,
      [id],
    );

    if (rows.length === 0) {
      const { rows: found } = await pool.query(
        `SELECT status FROM motions WHERE id = $1`,
        [id],
      );
      if (found.length === 0) {
        return res.status(404).json({ error: "debate not found" });
      }
      return res.status(409).json({ error: "debate is not live" });
    }

    res.status(200).json({ pinned: rows[0].pinned });
  } catch (err) {
    console.error("❌ togglePin failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function setMotd(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "invalid motion id" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT status FROM motions WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "debate not found" });
    }
    if (rows[0].status !== "live") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "debate is not live" });
    }

    await client.query(
      `UPDATE motions SET is_motd = FALSE WHERE is_motd = TRUE AND id <> $1`,
      [id],
    );
    await client.query(
      `UPDATE motions
       SET is_motd = TRUE,
           motd_at = NOW(),
           featured = TRUE,
           featured_at = COALESCE(featured_at, NOW())
       WHERE id = $1`,
      [id],
    );

    await client.query("COMMIT");
    res.status(200).json({ isMotd: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ setMotd failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  } finally {
    client.release();
  }
}
