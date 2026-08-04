// The fifth poller: drains email_outbox.
//
// The re-check is the point of the whole design. Preferences, suppression and the
// ration are read HERE, at send time — not when the row was queued. §20 promises
// that unsubscribing while a message is pending means it is not sent, and this is
// the only place that promise can be kept.
//
// Rows are claimed with FOR UPDATE SKIP LOCKED so two overlapping ticks — or two
// containers during a deploy — cannot send the same message twice.
// Spec: game-theory.md §20

import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { makeSesTransport } from "../emails/ses.js";
import {
  decideSend,
  isDead,
  isRationed,
  nextAttemptDelayMs,
  preferenceColumn,
  isEmailCategory,
  RATION_WINDOW_HOURS,
} from "../emails/budget.logic.js";
import { unsubscribeUrl } from "../emails/queue.js";

export const sesTransport = makeSesTransport(config.ses);

const TICK_MS = config.jobs.email_tick_ms;
const BATCH = config.jobs.email_batch;

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const client = await pool.connect();
    let claimed: any[];
    try {
      await client.query("BEGIN");
      // Claimed by flipping status, so a crash between here and the send leaves
      // the row in 'sending' rather than re-queued — visible, and not silently
      // sent twice.
      const { rows } = await client.query(
        `UPDATE email_outbox
            SET status = 'sending'
          WHERE id IN (
            SELECT id FROM email_outbox
             WHERE status = 'pending' AND next_attempt_at <= NOW()
             ORDER BY id
             FOR UPDATE SKIP LOCKED
             LIMIT $1
          )
        RETURNING id, user_id, category, to_email, subject, body_text, body_html, attempts`,
        [BATCH],
      );
      claimed = rows;
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    for (const row of claimed) {
      await deliver(row);
    }
  } catch (err) {
    logger.error({ err }, "email poller tick failed");
  } finally {
    running = false;
  }
}

async function deliver(row: any): Promise<void> {
  const category = String(row.category);
  if (!isEmailCategory(category)) {
    await pool.query(
      `UPDATE email_outbox SET status = 'skipped', skip_reason = 'unknown_category' WHERE id = $1`,
      [row.id],
    );
    return;
  }

  try {
    const column = preferenceColumn(category);
    // The column name comes from a closed lookup keyed by a narrowed category —
    // never from the row — so it cannot be attacker-influenced.
    const prefSelect = column ? `u.${column}` : "TRUE";

    const { rows: ctx } = await pool.query(
      `SELECT u.email_enabled,
              ${prefSelect} AS category_enabled,
              u.unsubscribe_token,
              EXISTS (SELECT 1 FROM email_suppressions s WHERE s.email = $2) AS suppressed,
              (SELECT COUNT(*)::int FROM email_outbox o
                WHERE o.user_id = $1
                  AND o.status = 'sent'
                  AND o.category IN ('reply','opponent')
                  AND o.sent_at > NOW() - ($3 || ' hours')::interval) AS sent_in_window
         FROM users u WHERE u.id = $1`,
      [row.user_id, row.to_email, String(RATION_WINDOW_HOURS)],
    );

    if (ctx.length === 0) {
      await pool.query(
        `UPDATE email_outbox SET status = 'skipped', skip_reason = 'no_user' WHERE id = $1`,
        [row.id],
      );
      return;
    }

    const c = ctx[0];
    const verdict = decideSend({
      category,
      suppressed: Boolean(c.suppressed),
      globallyEnabled: Boolean(c.email_enabled),
      categoryEnabled: Boolean(c.category_enabled),
      sentInWindow: Number(c.sent_in_window ?? 0),
    });

    if (!verdict.send) {
      await pool.query(
        `UPDATE email_outbox SET status = 'skipped', skip_reason = $2 WHERE id = $1`,
        [row.id, verdict.reason],
      );
      return;
    }

    const result = await sesTransport.send({
      to: row.to_email,
      subject: row.subject,
      text: row.body_text,
      html: row.body_html,
      // Transactional mail carries no unsubscribe: there is nothing to
      // unsubscribe from, and offering one implies a subscription exists.
      ...(category === "welcome" || !c.unsubscribe_token
        ? {}
        : { unsubscribeUrl: unsubscribeUrl(c.unsubscribe_token) }),
    });

    if (result.ok) {
      await pool.query(
        `UPDATE email_outbox
            SET status = 'sent', sent_at = NOW(), ses_message_id = $2, last_error = NULL
          WHERE id = $1`,
        [row.id, result.messageId],
      );
      return;
    }

    await failed(row, result.error, result.retryable);
  } catch (err) {
    await failed(row, err instanceof Error ? err.message : String(err), true);
  }
}

async function failed(row: any, error: string, retryable: boolean): Promise<void> {
  const attempts = Number(row.attempts ?? 0) + 1;
  const giveUp = !retryable || isDead(attempts);
  try {
    await pool.query(
      `UPDATE email_outbox
          SET status = $2,
              attempts = $3,
              last_error = $4,
              next_attempt_at = NOW() + ($5 || ' milliseconds')::interval
        WHERE id = $1`,
      [
        row.id,
        giveUp ? "failed" : "pending",
        attempts,
        error.slice(0, 1000),
        String(nextAttemptDelayMs(attempts)),
      ],
    );
  } catch (err) {
    logger.error({ err, id: row.id }, "could not record an email failure");
  }
}

export function startEmailPoller(): void {
  // Nothing to drain into. Rows keep accumulating and send when it is configured,
  // rather than being dropped or failing five times against a wall.
  if (!sesTransport.configured) {
    logger.info("email poller not started — SES is not configured");
    return;
  }
  logger.info({ tickMs: TICK_MS, batch: BATCH }, "email poller started");
  setInterval(() => void tick(), TICK_MS);
}

// A tick left mid-flight by a crash or a deploy leaves rows in 'sending'. They
// are re-queued once on boot: a duplicate notification is a far smaller harm than
// a verdict email that never arrives.
export async function requeueStuckEmails(): Promise<void> {
  try {
    const { rows } = await pool.query(
      `UPDATE email_outbox
          SET status = 'pending'
        WHERE status = 'sending' AND created_at < NOW() - INTERVAL '10 minutes'
        RETURNING id`,
    );
    if (rows.length > 0) {
      logger.warn({ count: rows.length }, "re-queued emails left mid-send");
    }
  } catch (err) {
    logger.error({ err }, "could not re-queue stuck emails");
  }
}
