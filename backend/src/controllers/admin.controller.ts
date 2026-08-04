// The admin pin and the hand-crowned Motion of the Day. Both are live-only: the stage
// exists to send readers somewhere they can still argue.
// Authorisation is the router's job (authMiddleware + requireRole).
// Spec: game-theory.md §15

import type { Request, Response } from "express";
import pool from "../db/index.js";
import logger from "../lib/logger.js";
import { queueEmail } from "../emails/queue.js";
import { checkText } from "../lib/validate.js";

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

// ── Broadcast ────────────────────────────────────────────────────────────────
// Writes one `announcement` row per eligible recipient into the same outbox every
// automated trigger uses, and returns. Delivery, retries, suppression and the
// per-category opt-out are the poller's job — this endpoint decides only WHO and
// WHAT, never whether a particular person is reachable.
// Spec: game-theory.md §20

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;

// Everyone who has not turned announcements off. Suppression is deliberately NOT
// filtered here: it is re-read at send time, so a bounce recorded between the
// preview and the send is still honoured.
const RECIPIENTS_SQL = `
  SELECT id FROM users
   WHERE email_enabled = TRUE
     AND email_announcements = TRUE
     AND email IS NOT NULL
   ORDER BY id`;

async function loadMotion(motionId: number) {
  const { rows } = await pool.query(
    `SELECT a.id, a.content, a.status, a.closes_at, d.name AS domain,
            (SELECT COUNT(*)::int FROM arguments c WHERE c.motion_id = a.id) AS arguments
       FROM motions a JOIN domains d ON d.id = a.domain_id
      WHERE a.id = $1`,
    [motionId],
  );
  return rows[0] ?? null;
}

// GET /admin/broadcast/preview?motionId= — the audience count and the motion, so
// the number of people about to be emailed is on screen before the button is.
export async function broadcastPreview(req: Request, res: Response) {
  const motionId = parseId(req.query.motionId as string | undefined);
  if (motionId === null) return res.status(400).json({ error: "invalid motion id" });

  try {
    const motion = await loadMotion(motionId);
    if (!motion) return res.status(404).json({ error: "debate not found" });

    const [{ rows: eligible }, { rows: total }] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM (${RECIPIENTS_SQL}) r`),
      pool.query(`SELECT COUNT(*)::int AS n FROM users`),
    ]);

    res.status(200).json({
      motion,
      recipients: eligible[0].n,
      optedOut: total[0].n - eligible[0].n,
    });
  } catch (err) {
    logger.error({ err }, "broadcastPreview failed");
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

export async function sendBroadcast(req: Request, res: Response) {
  const motionId = parseId(req.body?.motionId ? String(req.body.motionId) : undefined);
  if (motionId === null) return res.status(400).json({ error: "invalid motion id" });

  const subject = checkText(req.body?.subject, { field: "subject", max: SUBJECT_MAX });
  if (!subject.ok) return res.status(400).json({ error: subject.reason });

  const message = checkText(req.body?.message, { field: "message", max: MESSAGE_MAX });
  if (!message.ok) return res.status(400).json({ error: message.reason });

  try {
    const motion = await loadMotion(motionId);
    if (!motion) return res.status(404).json({ error: "debate not found" });

    const { rows: recipients } = await pool.query(RECIPIENTS_SQL);

    let queued = 0;
    for (const r of recipients) {
      await queueEmail(r.id, {
        category: "announcement",
        data: {
          motionId,
          claim: String(motion.content ?? ""),
          subject: subject.value,
          message: message.value,
        },
      });
      queued++;
    }

    logger.info({ motionId, queued, by: req.user!.id }, "broadcast queued");
    res.status(200).json({ queued });
  } catch (err) {
    logger.error({ err }, "sendBroadcast failed");
    res.status(500).json({ error: "Internal DB Error!" });
  }
}
