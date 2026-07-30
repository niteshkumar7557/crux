// Likes, and their reversal. A like pays the author +2, so liking your own argument
// would be minting your own currency — refused here, because the missing UI button
// is not a rule. Both directions are idempotent.
// Spec: game-theory.md §10

import type { Request, Response } from "express";
import pool from "../db/index.js";
import { awardLogic } from "../economy/logic.js";

export async function registerLike(req: Request, res: Response) {
  const { argument_id } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows: argumentRows } = await pool.query(
      `SELECT user_id FROM arguments WHERE id = $1`,
      [argument_id]
    );

    if (argumentRows.length === 0) {
      return res.status(404).json({ error: "Argument not found" });
    }

    const post_user_id = argumentRows[0].user_id;

    // A like pays the author +2, so liking your own argument mints your own
    // currency. The UI hides the button; the rule lives here.
    if (Number(post_user_id) === Number(user_id)) {
      return res
        .status(403)
        .json({ reason: "self_like", error: "You can't like your own argument." });
    }

    const { rows } = await pool.query(
      `
                SELECT id FROM likes
                WHERE user_id = $1 AND argument_id = $2;
            `,
      [user_id, argument_id],
    );
    if (rows.length > 0) {
      return res.status(200).json({ message: "Already Liked!" });
    }
    await pool.query(
      `
                INSERT INTO likes(user_id ,argument_id) VALUES ($1,$2);
            `,
      [user_id, argument_id],
    );
    await pool.query(
      `
                UPDATE arguments
                SET likes = likes + 1
                WHERE id = $1;
            `,
      [argument_id],
    );
    await awardLogic(pool, post_user_id, 2, "like");
    res.status(201).json({ message: "Successful!" });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function removeLike(req: Request, res: Response) {
  const { argument_id } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows: argumentRows } = await pool.query(
      `SELECT user_id FROM arguments WHERE id = $1`,
      [argument_id],
    );
    if (argumentRows.length === 0) {
      return res.status(404).json({ error: "Argument not found" });
    }
    const post_user_id = argumentRows[0].user_id;

    const { rowCount } = await pool.query(
      `DELETE FROM likes WHERE user_id = $1 AND argument_id = $2`,
      [user_id, argument_id],
    );
    if (!rowCount) {
      return res.status(200).json({ message: "Not Liked!" });
    }

    await pool.query(
      `UPDATE arguments SET likes = GREATEST(likes - 1, 0) WHERE id = $1`,
      [argument_id],
    );
    // Reverse the +2. Idempotent — the DELETE above already returned 0 rows if
    // there was nothing to un-like, so logic cannot be clawed back twice.
    await awardLogic(pool, post_user_id, -2, "unlike");
    res.status(200).json({ message: "Successful!" });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function listMyLikes(req: Request, res: Response) {
  const { motionId } = req.params;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT l.argument_id
       FROM likes l
       JOIN arguments c ON c.id = l.argument_id
       WHERE l.user_id = $1 AND c.motion_id = $2`,
      [user_id, Number(motionId)],
    );
    res
      .status(200)
      .json({ likedArgumentIds: rows.map((r) => Number(r.argument_id)) });
  } catch (err) {
    res.status(500).json({ error: "Internal DB Error!" });
  }
}
