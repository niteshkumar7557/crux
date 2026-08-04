// The one way an email is created. Renders the template and writes a pending row.
//
// It deliberately does NOT check preferences, suppression or the ration — those
// are read at SEND time by jobs/email.ts. §20 promises that unsubscribing while a
// message is queued means it is not sent, and a queue-time check would break that
// promise for anything sitting in the outbox.
//
// Every call is best-effort and swallows its own errors: these run after the work
// they describe has committed, and a failed email must never roll back a verdict
// or a posted argument.
// Spec: game-theory.md §20

import pool from "../db/index.js";
import config from "../config/index.js";
import logger from "../lib/logger.js";
import { renderEmail, type EmailLinks, type TemplateData } from "./templates.logic.js";

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

const siteUrl = () => config.client_url ?? "http://localhost:3000";

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/u/${token}`;
}

export function linksFor(token: string): EmailLinks {
  return {
    siteUrl: siteUrl(),
    unsubscribeUrl: unsubscribeUrl(token),
    preferencesUrl: `${siteUrl()}/profile/email`,
  };
}

interface Recipient {
  id: number;
  email: string;
  unsubscribe_token: string | null;
}

// A row created before 0017 ran, or by a path that bypassed the default, has no
// token. Minted on demand rather than left null, or that user's mail would ship
// an unsubscribe link that 404s — worse than not sending at all.
async function ensureToken(db: Queryable, r: Recipient): Promise<string | null> {
  if (r.unsubscribe_token) return r.unsubscribe_token;
  try {
    const { rows } = await db.query(
      `UPDATE users
          SET unsubscribe_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        WHERE id = $1 AND unsubscribe_token IS NULL
        RETURNING unsubscribe_token`,
      [r.id],
    );
    if (rows[0]?.unsubscribe_token) return rows[0].unsubscribe_token as string;
    const { rows: reread } = await db.query(
      `SELECT unsubscribe_token FROM users WHERE id = $1`,
      [r.id],
    );
    return reread[0]?.unsubscribe_token ?? null;
  } catch (err) {
    logger.error({ err, userId: r.id }, "failed to mint unsubscribe token");
    return null;
  }
}

export async function queueEmail(
  userId: number,
  template: TemplateData,
  db: Queryable = pool,
): Promise<void> {
  try {
    const { rows } = await db.query(
      `SELECT id, email, unsubscribe_token FROM users WHERE id = $1`,
      [userId],
    );
    const recipient = rows[0] as Recipient | undefined;
    if (!recipient?.email) return;

    const token = await ensureToken(db, recipient);
    if (!token) return;

    const mail = renderEmail(template, linksFor(token));

    await db.query(
      `INSERT INTO email_outbox (user_id, category, to_email, subject, body_text, body_html)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, template.category, recipient.email, mail.subject, mail.text, mail.html],
    );
  } catch (err) {
    logger.error({ err, userId, category: template.category }, "queueEmail failed");
  }
}
