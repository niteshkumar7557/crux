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

function convertLogicScore(score: number) {
  // §9 tier ladder. Duplicated in frontend/app/_utils/logicScore.ts — see
  // docs/CODEBASE_GUIDE.md §6a.
  // Beginner     -> B   0-49
  // Intermediate -> B+  50-99
  // Skilled      -> A   100-149
  // Expert       -> A+  150-199
  // Master       -> M   200+
  let reputation = "beginner";
  let grade = "B";
  if (score >= 200) {
    reputation = "master";
    grade = "M";
  } else if (score >= 150) {
    reputation = "expert";
    grade = "A+";
  } else if (score >= 100) {
    reputation = "skilled";
    grade = "A";
  } else if (score >= 50) {
    reputation = "intermediate";
    grade = "B+";
  }

  return { reputation, grade };
}

/**
 * Both profile endpoints take a username and neither trusts it: a segment
 * that cannot be a username is rejected before it reaches the database.
 * Returns the user row, or null for malformed and unknown handles alike —
 * they are the same 404 to a caller.
 */
async function findByUsername(raw: string | string[] | undefined) {
  // req.params values type as `string | string[] | undefined` under Express's
  // own ParamsDictionary (see admin.controller.ts's parseId for the same
  // guard) — a single-segment route never actually produces the array case,
  // but the type checker doesn't know that, and an unexpected shape here is
  // just another malformed handle: same 404.
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

/** Resolves a legacy numeric profile id to its username, for the redirect. */
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

/**
 * The dossier shell — identity and standing (§9). Server-rendered, so it is
 * kept to one lookup plus four parallel queries.
 */
export async function getProfileShell(req: Request, res: Response) {
  try {
    const user = await findByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: "not_found" });

    const logic = Number(user.logic_score);

    const [rankRes, recordRes, seasonRes, titlesRes] = await Promise.all([
      // Mirrors the leaderboard's RANK() OVER (ORDER BY logic_score DESC,
      // id ASC) exactly, without sorting the whole table. The previous
      // hand-rolled version reported a 0-logic user as rank #1.
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
      // §10: logic earned inside the current season window.
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS n FROM logic_events
         WHERE user_id = $1 AND created_at >= $2;`,
        [user.id, currentSeasonStart()],
      ),
      // §10: permanent, stacking titles — every one ever earned, newest first.
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
        grade: tier.grade,
        globalRank: Number(rankRes.rows[0].rank),
        record: {
          wins: record.wins,
          losses: record.losses,
          draws: record.draws,
        },
        mvpCount: record.mvpCount,
      },
      // §14 puts the season window on the profile as well as the leaderboard.
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

/**
 * Everything earned — the ledger, craft stats, live debates and concluded
 * history. Fetched client-side after mount so none of it blocks first paint;
 * nothing here is worth indexing.
 */
export async function getProfileActivity(req: Request, res: Response) {
  try {
    const user = await findByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: "not_found" });

    const weeks = config.limits.profile_ledger_weeks;

    const [ledgerRes, craftRes, bestRes, liveRes, historyRes] =
      await Promise.all([
        // §8: the ledger includes season-only rows (the -5 loss penalty), so a
        // week can net negative. That is the honest reading of the month.
        // to_char (not a bare date_trunc DATE) is deliberate: node-pg parses a
        // DATE column into a JS Date at local midnight, which can shift the
        // day by one under a negative UTC offset. Text sidesteps that, and
        // fillLedgerWeeks below keys off the string unchanged.
        pool.query(
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
                  COUNT(*) FILTER (WHERE reply_to_comment_id IS NOT NULL)::int AS replies,
                  COALESCE(ROUND(AVG(points)::numeric, 1), 0)::float           AS "avgLogic",
                  (SELECT COUNT(*) FROM arguments WHERE user_id = $1)::int     AS statements
           FROM comments WHERE user_id = $1;`,
          [user.id],
        ),
        pool.query(
          `SELECT c.points, c.argument_id AS "argumentId", a.content AS claim
           FROM comments c JOIN arguments a ON a.id = c.argument_id
           WHERE c.user_id = $1
           ORDER BY c.points DESC, c.id DESC LIMIT 1;`,
          [user.id],
        ),
        // One row per live debate they are in, carrying both facts: whether
        // they authored it, and the side their FIRST comment locked (§4).
        pool.query(
          `SELECT a.id, a.content AS claim, a.closes_at AS "closesAt",
                  (a.user_id = $1) AS "isAuthor",
                  (SELECT c.side FROM comments c
                    WHERE c.argument_id = a.id AND c.user_id = $1
                    ORDER BY c.id ASC LIMIT 1) AS side
           FROM arguments a
           WHERE a.status = 'live'
             AND (a.user_id = $1
                  OR EXISTS (SELECT 1 FROM comments c
                              WHERE c.argument_id = a.id AND c.user_id = $1))
           ORDER BY a.closes_at ASC LIMIT $2;`,
          [user.id, config.limits.profile_live_rows],
        ),
        pool.query(
          `SELECT r.argument_id AS "argumentId", a.content AS claim, r.side,
                  r.outcome, r.is_mvp AS "isMvp", a.margin,
                  r.created_at AS "concludedAt"
           FROM debate_results r JOIN arguments a ON a.id = r.argument_id
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
        statements: craft.statements,
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

/**
 * §9 says a profile carries "an AI-written blurb describing how you think".
 * §12 defines five AI personas and none of them writes it, so v1 ships an
 * owner-editable bio and the blurb is deferred (docs/future-features.md).
 */
export const BIO_MAX = 280;

export async function updateBio(req: Request, res: Response) {
  const bio = String(req.body?.bio ?? "").trim();
  if (bio.length > BIO_MAX) {
    return res.status(400).json({ error: "bio_too_long" });
  }

  try {
    // users.description is TEXT, so the cap is enforced here and mirrored in
    // the editor's counter.
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
