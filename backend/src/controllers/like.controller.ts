import type { Request, Response } from "express";
import pool from "../db/index.js";
import { awardLogic } from "../economy/logic.js";

export async function registerLike(req: Request, res: Response) {
  const { comment_id } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows: commentRows } = await pool.query(
      `SELECT user_id FROM comments WHERE id = $1`,
      [comment_id]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const post_user_id = commentRows[0].user_id;

    const { rows } = await pool.query(
      `
                SELECT id FROM likes
                WHERE user_id = $1 AND comment_id = $2;
            `,
      [user_id, comment_id],
    );
    if (rows.length > 0) {
      return res.status(200).json({ message: "Already Liked!" });
    }
    await pool.query(
      `
                INSERT INTO likes(user_id ,comment_id) VALUES ($1,$2);
            `,
      [user_id, comment_id],
    );
    await pool.query(
      `
                UPDATE comments
                SET likes = likes + 1
                WHERE id = $1;
            `,
      [comment_id],
    );
    await awardLogic(pool, post_user_id, 2, "like");
    res.status(201).json({ message: "Successful!" });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}
