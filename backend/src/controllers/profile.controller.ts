// The profile, split in two: a server-rendered shell (identity and standing) and a
// client-fetched activity payload, so nothing slow blocks first paint.
// Spec: game-theory.md §13, §14

import type { Response, Request } from "express";
import pool from "../db/index.js";
import {
  currentSeasonStart,
  seasonNumber,
  daysLeftInSeason,
} from "../economy/season.logic.js";
import { validateUsername } from "../lib/username.logic.js";
import config from "../config/index.js";
import { fillLedgerWeeks } from "../lib/ledger.logic.js";

// §13 tier ladder. Duplicated in frontend/app/_utils/logicScore.ts — change both.
function convertLogicScore(score: number) {
  let reputation = "beginner";
  if (score >= 400) {
    reputation = "master";
  } else if (score >= 300) {
    reputation = "expert";
  } else if (score >= 200) {
    reputation = "skilled";
  } else if (score >= 100) {
    reputation = "intermediate";
  }

  return { reputation };
}

async function findByUsername(raw: string | string[] | undefined) {
  if (typeof raw !== "string") return null;

  const check = validateUsername(raw);
  if (!check.ok) return null;

  const { rows } = await pool.query(
    `SELECT id, name, username, description, logic_score, avatar
     FROM users WHERE username = $1;`,
    [check.value],
  );
  return rows[0] ?? null;
}

export async function getUsernameById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: "not_found" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT username FROM users WHERE id = $1;`,
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    res.status(200).json({ username: rows[0].username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}

export async function getProfileShell(req: Request, res: Response) {
  try {
    const user = await findByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: "not_found" });

    const logic = Number(user.logic_score);

    const [rankRes, recordRes, seasonRes, titlesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM users
         WHERE logic_score > $1 OR (logic_score = $1 AND id < $2);`,
        [logic, user.id],
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE outcome = 'win')::int  AS wins,
                COUNT(*) FILTER (WHERE outcome = 'loss')::int AS losses,
                COUNT(*) FILTER (WHERE outcome = 'draw')::int AS draws,
                COUNT(*) FILTER (WHERE is_mvp)::int           AS "mvpCount"
         FROM debate_results WHERE user_id = $1;`,
        [user.id],
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS n FROM logic_events
         WHERE user_id = $1 AND created_at >= $2;`,
        [user.id, currentSeasonStart()],
      ),
      pool.query(
        `SELECT season_key AS "seasonKey", season_number AS "seasonNumber",
                rank, title, frame
         FROM season_awards WHERE user_id = $1
         ORDER BY season_number DESC, rank ASC;`,
        [user.id],
      ),
    ]);

    const tier = convertLogicScore(logic);
    const record = recordRes.rows[0];

    res.status(200).json({
      identity: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.description,
      },
      standing: {
        logic,
        tier: tier.reputation,
        globalRank: Number(rankRes.rows[0].rank),
        record: {
          wins: record.wins,
          losses: record.losses,
          draws: record.draws,
        },
        mvpCount: record.mvpCount,
      },
      season: {
        number: seasonNumber(),
        logic: seasonRes.rows[0].n,
        daysLeft: daysLeftInSeason(),
      },
      titles: titlesRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}

export async function getProfileActivity(req: Request, res: Response) {
  try {
    const user = await findByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: "not_found" });

    const weeks = config.limits.profile_ledger_weeks;

    const [ledgerRes, craftRes, bestRes, liveRes, historyRes] =
      await Promise.all([
        pool.query(
          // to_char rather than a bare DATE: node-pg parses a DATE column into a JS
        // Date at local midnight, which shifts the day under a negative UTC
        // offset. Text sidesteps that, and fillLedgerWeeks keys off it unchanged.
        `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS "weekStart",
                  SUM(amount)::int AS amount
           FROM logic_events
           WHERE user_id = $1
             AND created_at >= NOW() - make_interval(weeks => $2::int)
           GROUP BY 1 ORDER BY 1;`,
          [user.id, weeks],
        ),
        pool.query(
          `SELECT COUNT(*)::int                                                AS arguments,
                  COUNT(*) FILTER (WHERE reply_to_argument_id IS NOT NULL)::int AS replies,
                  COALESCE(ROUND(AVG(points)::numeric, 1), 0)::float           AS "avgLogic",
                  (SELECT COUNT(*) FROM motions WHERE user_id = $1)::int     AS motions
           FROM arguments WHERE user_id = $1;`,
          [user.id],
        ),
        pool.query(
          `SELECT c.points, c.motion_id AS "motionId", a.content AS claim
           FROM arguments c JOIN motions a ON a.id = c.motion_id
           WHERE c.user_id = $1
           ORDER BY c.points DESC, c.id DESC LIMIT 1;`,
          [user.id],
        ),
        pool.query(
          `SELECT a.id, a.content AS claim, a.closes_at AS "closesAt",
                  (a.user_id = $1) AS "isAuthor",
                  (SELECT c.side FROM arguments c
                    WHERE c.motion_id = a.id AND c.user_id = $1
                    ORDER BY c.id ASC LIMIT 1) AS side
           FROM motions a
           WHERE a.status = 'live'
             AND (a.user_id = $1
                  OR EXISTS (SELECT 1 FROM arguments c
                              WHERE c.motion_id = a.id AND c.user_id = $1))
           ORDER BY a.closes_at ASC LIMIT $2;`,
          [user.id, config.limits.profile_live_rows],
        ),
        pool.query(
          `SELECT r.motion_id AS "motionId", a.content AS claim, r.side,
                  r.outcome, r.is_mvp AS "isMvp", a.margin,
                  r.created_at AS "concludedAt"
           FROM debate_results r JOIN motions a ON a.id = r.motion_id
           WHERE r.user_id = $1
           ORDER BY r.created_at DESC LIMIT $2;`,
          [user.id, config.limits.profile_history_rows],
        ),
      ]);

    const craft = craftRes.rows[0];

    res.status(200).json({
      ledger: fillLedgerWeeks(ledgerRes.rows, weeks),
      craft: {
        arguments: craft.arguments,
        replies: craft.replies,
        avgLogic: craft.avgLogic,
        motions: craft.motions,
        best: bestRes.rows[0] ?? null,
      },
      live: liveRes.rows,
      history: historyRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}

export const BIO_MAX = 280;

export async function updateBio(req: Request, res: Response) {
  const bio = String(req.body?.bio ?? "").trim();
  if (bio.length > BIO_MAX) {
    return res.status(400).json({ error: "bio_too_long" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users SET description = $1 WHERE id = $2
       RETURNING description AS bio;`,
      [bio, req.user!.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    res.status(200).json({ bio: rows[0].bio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}
