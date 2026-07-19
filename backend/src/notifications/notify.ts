import pool from "../db/index.js";
import { verdictMessage, oppositionMessage } from "./messages.js";

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

export async function createNotification(
  db: Queryable,
  n: {
    userId: number;
    type: string;
    argumentId?: number | null;
    actor?: string | null;
    message: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO notifications (user_id, type, argument_id, actor, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [n.userId, n.type, n.argumentId ?? null, n.actor ?? null, n.message],
  );
}

// Best-effort: a new participant joined a debate → tell the opposing side and
// the debate's author "a challenger showed up". Never throws into the caller.
export async function notifyOpposition(
  argumentId: number,
  side: string,
  actorId: number,
): Promise<void> {
  try {
    const actor =
      (await pool.query(`SELECT username FROM users WHERE id = $1`, [actorId]))
        .rows[0]?.username ?? "someone";
    const opp = await pool.query(
      `SELECT DISTINCT user_id FROM comments
       WHERE argument_id = $1 AND side <> $2 AND user_id <> $3`,
      [argumentId, side, actorId],
    );
    const author =
      (await pool.query(`SELECT user_id FROM arguments WHERE id = $1`, [argumentId]))
        .rows[0]?.user_id ?? null;

    const recipients = new Set<number>(opp.rows.map((r) => r.user_id as number));
    if (author && author !== actorId) recipients.add(author);
    recipients.delete(actorId);

    const message = oppositionMessage(actor);
    for (const userId of recipients) {
      await createNotification(pool, {
        userId,
        type: "opposition",
        argumentId,
        actor,
        message,
      });
    }
  } catch (err) {
    console.error("notifyOpposition failed:", err);
  }
}

// Best-effort verdict fan-out to every participant. Call after the conclusion
// transaction has committed.
export async function notifyVerdict(
  argumentId: number,
  results: { userId: number; outcome: string; isMvp: boolean }[],
  isUpset: boolean,
): Promise<void> {
  try {
    for (const r of results) {
      await createNotification(pool, {
        userId: r.userId,
        type: "verdict",
        argumentId,
        message: verdictMessage(r.outcome, r.isMvp, isUpset),
      });
    }
  } catch (err) {
    console.error("notifyVerdict failed:", err);
  }
}
