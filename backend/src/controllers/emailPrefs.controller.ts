// Email preferences: the signed-in panel, and the one-click unsubscribe that
// works without a login.
//
// The token route requires no session on purpose. A one-click unsubscribe that
// asks someone to sign in first is one they will report as spam instead, and
// Gmail's List-Unsubscribe-Post is a machine POST with no session at all.
// Spec: game-theory.md §20

import type { Request, Response } from "express";
import pool from "../db/index.js";
import logger from "../lib/logger.js";

// The column per toggle, as a closed lookup. A key that is not here is ignored,
// so no request body can name a column.
const TOGGLES: Record<string, string> = {
  verdicts: "email_verdicts",
  replies: "email_replies",
  opponents: "email_opponents",
  season: "email_season",
  announcements: "email_announcements",
  all: "email_enabled",
};

const SELECT_PREFS = `SELECT email_enabled AS all, email_verdicts AS verdicts,
                             email_replies AS replies, email_opponents AS opponents,
                             email_season AS season, email_announcements AS announcements,
                             unsubscribe_token
                        FROM users WHERE id = $1`;

export async function getEmailPrefs(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(SELECT_PREFS, [req.user!.id]);
    if (rows.length === 0) return res.status(404).json({ error: "user not found" });
    const { unsubscribe_token, ...prefs } = rows[0];
    res.status(200).json({ prefs });
  } catch (err) {
    logger.error({ err }, "getEmailPrefs failed");
    res.status(500).json({ error: "failed to load your email settings" });
  }
}

export async function updateEmailPrefs(req: Request, res: Response) {
  const body = req.body;
  if (typeof body !== "object" || body === null) {
    return res.status(400).json({ error: "nothing to change" });
  }

  const sets: string[] = [];
  const params: unknown[] = [req.user!.id];

  for (const [key, column] of Object.entries(TOGGLES)) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value !== "boolean") continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: "nothing to change" });
  }

  try {
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, params);
    const { rows } = await pool.query(SELECT_PREFS, [req.user!.id]);
    const { unsubscribe_token, ...prefs } = rows[0];
    res.status(200).json({ prefs });
  } catch (err) {
    logger.error({ err }, "updateEmailPrefs failed");
    res.status(500).json({ error: "failed to save your email settings" });
  }
}

// GET  /email/unsubscribe/:token — what the link in a footer opens.
// POST /email/unsubscribe/:token — what Gmail's one-click sends.
//
// Both turn everything off. A footer link that opened a preference form would be
// one more step between "make it stop" and it stopping.
export async function unsubscribeByToken(req: Request, res: Response) {
  const token = String(req.params.token ?? "");
  if (token.length < 16) return res.status(404).json({ error: "unknown link" });

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET email_enabled = FALSE
        WHERE unsubscribe_token = $1
        RETURNING email`,
      [token],
    );
    if (rows.length === 0) return res.status(404).json({ error: "unknown link" });
    res.status(200).json({ unsubscribed: true });
  } catch (err) {
    logger.error({ err }, "unsubscribeByToken failed");
    res.status(500).json({ error: "could not unsubscribe you" });
  }
}
