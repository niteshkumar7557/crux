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

// The mirror of registerLike: pull the row, decrement the count, and reverse
// the +2 the author was paid. Idempotent — un-liking what you never liked is a
// no-op, so a double click or a stale button can't drive the count negative or
// claw back logic twice.
export async function removeLike(req: Request, res: Response) {
  const { comment_id } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows: commentRows } = await pool.query(
      `SELECT user_id FROM comments WHERE id = $1`,
      [comment_id],
    );
    if (commentRows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    const post_user_id = commentRows[0].user_id;

    const { rowCount } = await pool.query(
      `DELETE FROM likes WHERE user_id = $1 AND comment_id = $2`,
      [user_id, comment_id],
    );
    if (!rowCount) {
      return res.status(200).json({ message: "Not Liked!" });
    }

    await pool.query(
      `UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = $1`,
      [comment_id],
    );
    await awardLogic(pool, post_user_id, -2, "unlike");
    res.status(200).json({ message: "Successful!" });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

// §5 like state on load: the JWT lives in localStorage, so the SSR comment
// fetch can't know the viewer. The arena calls this after mount to fill the
// hearts the viewer already tapped.
export async function listMyLikes(req: Request, res: Response) {
  const { argumentId } = req.params;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT l.comment_id
       FROM likes l
       JOIN comments c ON c.id = l.comment_id
       WHERE l.user_id = $1 AND c.argument_id = $2`,
      [user_id, Number(argumentId)],
    );
    res
      .status(200)
      .json({ likedCommentIds: rows.map((r) => Number(r.comment_id)) });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}
