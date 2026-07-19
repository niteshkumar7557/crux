import type { Request, Response } from "express";
import pool from "../db/index.js";

// POST /arena/vote/:id — toggle the current user's vote on a live debate.
export async function toggleVote(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const argumentId = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(argumentId)) return res.status(400).json({ error: "Bad id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const argRes = await client.query(
      `SELECT status FROM arguments WHERE id = $1 FOR UPDATE`,
      [argumentId],
    );
    if (argRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }
    if (argRes.rows[0].status !== "live") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "not_live" });
    }
    const existing = await client.query(
      `SELECT id FROM debate_votes WHERE user_id = $1 AND argument_id = $2`,
      [userId, argumentId],
    );
    let voted: boolean;
    if (existing.rows.length > 0) {
      await client.query(
        `DELETE FROM debate_votes WHERE user_id = $1 AND argument_id = $2`,
        [userId, argumentId],
      );
      await client.query(
        `UPDATE arguments SET votes = GREATEST(votes - 1, 0) WHERE id = $1`,
        [argumentId],
      );
      voted = false;
    } else {
      await client.query(
        `INSERT INTO debate_votes (user_id, argument_id) VALUES ($1, $2)`,
        [userId, argumentId],
      );
      await client.query(`UPDATE arguments SET votes = votes + 1 WHERE id = $1`, [argumentId]);
      voted = true;
    }
    const cnt = await client.query(`SELECT votes FROM arguments WHERE id = $1`, [argumentId]);
    await client.query("COMMIT");
    return res.status(200).json({ votes: cnt.rows[0].votes, voted });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal DB Error!" });
  } finally {
    client.release();
  }
}

// GET /arena/vote/:id — the current user's vote state for the arena button.
export async function getVote(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const argumentId = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(argumentId)) return res.status(400).json({ error: "Bad id" });
  try {
    const v = await pool.query(`SELECT votes FROM arguments WHERE id = $1`, [argumentId]);
    if (v.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const mine = await pool.query(
      `SELECT 1 FROM debate_votes WHERE user_id = $1 AND argument_id = $2`,
      [userId, argumentId],
    );
    return res.status(200).json({ votes: v.rows[0].votes, voted: mine.rows.length > 0 });
  } catch {
    return res.status(500).json({ error: "Internal DB Error!" });
  }
}
