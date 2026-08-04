// Writes notifications, to both channels. Every fan-out here is best-effort and
// swallows its own errors: these are called after the work they describe has
// committed, and a failed nudge must never roll back a verdict or a posted
// argument.
//
// The email half is queued from HERE rather than from each caller, so the two
// channels can never drift into notifying different people about different
// things. Queueing does not decide whether an email is sent — preferences, the
// suppression list and the ration are read at send time by jobs/email.ts (§20).
// Spec: game-theory.md §20

import pool from "../db/index.js";
import { verdictMessage, oppositionMessage, replyMessage } from "./messages.js";
import { queueEmail } from "../emails/queue.js";

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

export async function createNotification(
  db: Queryable,
  n: {
    userId: number;
    type: string;
    motionId?: number | null;
    actor?: string | null;
    message: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO notifications (user_id, type, motion_id, actor, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [n.userId, n.type, n.motionId ?? null, n.actor ?? null, n.message],
  );
}

export async function notifyOpposition(
  motionId: number,
  side: string,
  actorId: number,
): Promise<void> {
  try {
    const actor =
      (await pool.query(`SELECT username FROM users WHERE id = $1`, [actorId]))
        .rows[0]?.username ?? "someone";
    const opp = await pool.query(
      `SELECT DISTINCT user_id FROM arguments
       WHERE motion_id = $1 AND side <> $2 AND user_id <> $3`,
      [motionId, side, actorId],
    );
    const author =
      (await pool.query(`SELECT user_id FROM motions WHERE id = $1`, [motionId]))
        .rows[0]?.user_id ?? null;

    const recipients = new Set<number>(opp.rows.map((r) => r.user_id as number));
    if (author && author !== actorId) recipients.add(author);
    recipients.delete(actorId);

    const claim =
      (await pool.query(`SELECT content FROM motions WHERE id = $1`, [motionId]))
        .rows[0]?.content ?? "";

    const message = oppositionMessage(actor);
    for (const userId of recipients) {
      await createNotification(pool, {
        userId,
        type: "opposition",
        motionId,
        actor,
        message,
      });
      await queueEmail(userId, {
        category: "opponent",
        data: { motionId, claim, actor },
      });
    }
  } catch (err) {
    console.error("notifyOpposition failed:", err);
  }
}

export async function notifyVerdict(
  motionId: number,
  results: { userId: number; outcome: string; isMvp: boolean; points: number }[],
): Promise<void> {
  try {
    const claim =
      (await pool.query(`SELECT content FROM motions WHERE id = $1`, [motionId]))
        .rows[0]?.content ?? "";

    for (const r of results) {
      await createNotification(pool, {
        userId: r.userId,
        type: "verdict",
        motionId,
        message: verdictMessage(r.outcome, r.isMvp),
      });
      // The three outcomes the template knows. Anything else is a bug upstream,
      // and sending "you drew" for it would be worse than sending nothing.
      if (r.outcome === "win" || r.outcome === "loss" || r.outcome === "draw") {
        await queueEmail(r.userId, {
          category: "verdict",
          data: {
            motionId,
            claim,
            outcome: r.outcome,
            isMvp: r.isMvp,
            points: r.points,
          },
        });
      }
    }
  } catch (err) {
    console.error("notifyVerdict failed:", err);
  }
}

export async function notifyReply(
  motionId: number,
  targetUserId: number,
  actorId: number,
  texts?: { yourArgument: string; theirArgument: string },
): Promise<void> {
  if (targetUserId === actorId) return;
  try {
    const actor =
      (await pool.query(`SELECT username FROM users WHERE id = $1`, [actorId]))
        .rows[0]?.username ?? "someone";
    await createNotification(pool, {
      userId: targetUserId,
      type: "reply",
      motionId,
      actor,
      message: replyMessage(actor),
    });

    const claim =
      (await pool.query(`SELECT content FROM motions WHERE id = $1`, [motionId]))
        .rows[0]?.content ?? "";

    await queueEmail(targetUserId, {
      category: "reply",
      data: {
        motionId,
        claim,
        actor,
        yourArgument: texts?.yourArgument ?? "",
        theirArgument: texts?.theirArgument ?? "",
      },
    });
  } catch (err) {
    console.error("notifyReply failed:", err);
  }
}
