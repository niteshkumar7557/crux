// Admin surface for participation-cap blocks. Authorisation is the router's
// job (authMiddleware + requireRole("admin")), matching admin.controller.ts.
// Spec: game-theory.md §22
import type { Request, Response } from "express";
import pool from "../db/index.js";
import { checkText } from "../lib/validate.js";

export async function listBlocks(req: Request, res: Response) {
  try {
    const { rows: blocks } = await pool.query(
      `SELECT b.id, b.reason, b.created_at,
              u.id AS user_id, u.username,
              m.id AS motion_id, m.content AS motion_content
       FROM motion_blocks b
       JOIN users u ON u.id = b.user_id
       JOIN motions m ON m.id = b.motion_id
       WHERE b.lifted_at IS NULL
       ORDER BY b.created_at DESC`,
    );

    // The whole point of this screen: "were these five spam or genuine"
    // must be answerable without going hunting, so every block carries the
    // full text and score of every argument that user posted on that motion.
    for (const block of blocks) {
      const { rows: args } = await pool.query(
        `SELECT id, content, points, created_at
         FROM arguments
         WHERE motion_id = $1 AND user_id = $2
         ORDER BY created_at ASC`,
        [block.motion_id, block.user_id],
      );
      block.arguments = args;
    }

    res.status(200).json({ blocks });
  } catch (err) {
    console.error("❌ listBlocks failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function liftBlock(req: Request, res: Response) {
  const adminId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid block id" });
  }

  const allowanceRaw = req.body?.allowance;
  const allowance = Number(allowanceRaw);
  if (!Number.isInteger(allowance) || allowance <= 0) {
    return res.status(400).json({ error: "allowance must be a positive integer" });
  }
  // The audit trail is worthless empty, so require it.
  const note = checkText(req.body?.note, { field: "note", max: 2000 });
  if (!note.ok) return res.status(400).json({ error: note.reason });

  try {
    const { rows } = await pool.query(
      `UPDATE motion_blocks
       SET lifted_at = NOW(), lifted_by = $1, allowance = $2, note = $3
       WHERE id = $4 AND lifted_at IS NULL
       RETURNING id`,
      [adminId, allowance, note.value, id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "block not found or already lifted" });
    }
    res.status(200).json({ lifted: true, allowance });
  } catch (err) {
    console.error("❌ liftBlock failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  }
}
