// Everything the feed, the sidebar, both leaderboards, the archive and the sitemap
// read. All of it fails soft to an empty payload: a broken panel beats a broken page.
// Spec: game-theory.md §14, §15

import type { Response, Request } from "express";
import pool from "../db/index.js";
import config from "../config/index.js";
import {
  currentSeasonStart,
  currentSeasonEnd,
  seasonNumber,
  seasonKey,
  daysLeftInSeason,
} from "../economy/season.logic.js";

export async function getPrimaryCardData(req: Request, res: Response) {
  try {
    const motion = await pool.query(`
                SELECT a.id, a.user_id, a.content, a.domain_id, a.affirmative, a.negative,
                       a.status, a.closes_at, a.is_motd
                FROM motions a
                WHERE a.status = 'live' AND a.featured = TRUE AND a.is_motd = TRUE;
            `);
    if (motion.rows.length === 0) {
      return res.status(200).json({});
    }
    const domain = await pool.query(
      `
                SELECT name FROM domains WHERE id = $1;
            `,
      [motion.rows[0].domain_id],
    );
    const user = await pool.query(
      `
                SELECT username, avatar FROM users WHERE id = $1;
            `,
      [motion.rows[0].user_id],
    );
    const argumentCountRes = await pool.query(
      `
                SELECT COUNT(id) FROM arguments WHERE motion_id = $1;
            `,
      [motion.rows[0].id],
    );

    res.status(200).json({
      domain: domain.rows[0].name,
      motionId: motion.rows[0].id,
      username: user.rows[0].username,
      avatar: user.rows[0].avatar,
      content: motion.rows[0].content,
      affirmative: motion.rows[0].affirmative,
      negative: motion.rows[0].negative,
      status: motion.rows[0].status,
      closesAt: motion.rows[0].closes_at,
      isMotd: motion.rows[0].is_motd,
      count_arguments: parseInt(argumentCountRes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(200).json({});
  }
}

export async function getSecondaryCardsData(req: Request, res: Response) {
  try {
    const motion = await pool.query(`
                SELECT
                    u.username,
                    u.avatar,
                    d.name AS domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS motionId,
                    a.status,
                    a.closes_at AS "closesAt",
                    COUNT(DISTINCT c.user_id)::int AS active_minds
                FROM motions a
                JOIN users u ON a.user_id = u.id
                JOIN domains d ON d.id = a.domain_id
                LEFT JOIN arguments c ON c.motion_id = a.id
                -- NOTE: this LIMIT is independent of MAIN_STAGE_SIZE in
                -- jobs/featuring.logic.ts. Raising that constant alone renders
                -- nothing extra — see codebase-guide.md §8.
                WHERE a.featured = TRUE AND a.is_motd = FALSE
                GROUP BY a.id, u.username, u.avatar, d.name, a.content, a.affirmative, a.negative
                ORDER BY a.featured_at ASC NULLS LAST
                LIMIT 6;
            `);
    if (motion.rows.length === 0) {
      return res.status(200).json({});
    }

    res.status(200).json(motion.rows);
  } catch (err) {
    console.error(err);
    res.status(200).json({});
  }
}

export async function getSidebarData(req: Request, res: Response) {
  try {
    const data1 = await pool.query(`
            SELECT
                d.name AS topic,
                ROUND(AVG(a.affirmative - a.negative))::numeric AS "changePercentage",
                COUNT(DISTINCT c.id)::int AS arguments,
                COUNT(DISTINCT a.id)::int AS "liveBattles"
            FROM motions a
            JOIN domains d ON d.id = a.domain_id
            LEFT JOIN arguments c ON c.motion_id = a.id
            GROUP BY d.name
            ORDER BY arguments DESC
            LIMIT 3;
        `);

    const data2 = await pool.query(`
            SELECT
                name,
                username,
                avatar,
                logic_score AS "logicScore",
                id,
                ROW_NUMBER() OVER (ORDER BY logic_score DESC, id ASC) AS rank
            FROM users
            ORDER BY
                logic_score DESC,
                id ASC
            LIMIT 3;
        `);

    const data3 = await pool.query(`
                SELECT
                    (SELECT ROUND(SUM(logic_score)::int) FROM users) AS "logicStacked",
                    (SELECT COUNT(*)::int FROM motions) AS "activeArenas"
            `);

    if (
      data1.rows.length === 0 ||
      data2.rows.length === 0 ||
      data3.rows.length === 0
    ) {
      return res.status(200).json([]);
    }

    res
      .status(200)
      .json({ data1: data1.rows, data2: data2.rows, data3: data3.rows });
  } catch (err) {
    console.error(err);
    res.status(200).json([]);
  }
}

const LEADERBOARD_PAGE_SIZE = 20;

function leaderboardPaging(req: Request) {
  const cap = config.limits.leaderboard_rows;
  let pageSize = Number.parseInt(String(req.query.pageSize ?? ""), 10);
  if (!Number.isInteger(pageSize)) pageSize = LEADERBOARD_PAGE_SIZE;
  pageSize = Math.min(Math.max(pageSize, 1), 50);

  let page = Number.parseInt(String(req.query.page ?? ""), 10);
  if (!Number.isInteger(page) || page < 1) page = 1;

  return { cap, page, pageSize };
}

async function rankedTotal(cap: number): Promise<number> {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM users`);
  return Math.min(rows[0].total, cap);
}

export async function getLeaderboardData(req: Request, res: Response) {
  const { cap, pageSize } = leaderboardPaging(req);
  let { page } = leaderboardPaging(req);
  try {
    const total = await rankedTotal(cap);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const standings = await pool.query(
      `
            -- Rank over everyone first, then take the capped board, then the
            -- page — so a rank means the same thing on page 3 as on page 1.
            WITH board AS (
                SELECT
                    u.id,
                    u.name,
                    u.username,
                    u.avatar,
                    u.logic_score AS "logicScore",
                    ROW_NUMBER() OVER (ORDER BY u.logic_score DESC, u.id ASC)::int AS rank,
                    COALESCE(a.count, 0)::int AS "motionCount",
                    COALESCE(c.count, 0)::int AS "argumentCount"
                FROM users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS count FROM motions GROUP BY user_id
                ) a ON a.user_id = u.id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS count FROM arguments GROUP BY user_id
                ) c ON c.user_id = u.id
                ORDER BY u.logic_score DESC, u.id ASC
                LIMIT $1
            )
            SELECT * FROM board ORDER BY rank ASC, id ASC LIMIT $2 OFFSET $3;
        `,
      [cap, pageSize, (page - 1) * pageSize],
    );

    res
      .status(200)
      .json({ rows: standings.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(200).json({ rows: [], total: 0, page: 1, pageSize });
  }
}

export async function getSeasonLeaderboard(req: Request, res: Response) {
  const { cap, pageSize } = leaderboardPaging(req);
  let { page } = leaderboardPaging(req);
  const meta = {
    season: seasonNumber(),
    seasonKey: seasonKey(),
    daysLeft: daysLeftInSeason(),
    endsAt: currentSeasonEnd().toISOString(),
  };
  try {
    const start = currentSeasonStart();
    const total = await rankedTotal(cap);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const standings = await pool.query(
      // ROW_NUMBER, not RANK, and the id tiebreak is load-bearing: a season opens
      // with every user on 0, and a RANK without a unique key put all of them at
      // rank 1. Positions on a board are distinct by definition — the function
      // enforces that rather than a tiebreak column someone can drop.
      `WITH board AS (
         SELECT u.id, u.name, u.username, u.avatar,
                COALESCE(SUM(le.amount) FILTER (WHERE le.created_at >= $1), 0)::int AS "seasonLogic",
                ROW_NUMBER() OVER (
                  ORDER BY COALESCE(SUM(le.amount) FILTER (WHERE le.created_at >= $1), 0) DESC,
                           u.id ASC
                )::int AS rank
         FROM users u
         LEFT JOIN logic_events le ON le.user_id = u.id
         GROUP BY u.id, u.name, u.username, u.avatar
         ORDER BY "seasonLogic" DESC, u.id ASC
         LIMIT $2
       )
       SELECT * FROM board ORDER BY rank ASC, id ASC LIMIT $3 OFFSET $4`,
      [start, cap, pageSize, (page - 1) * pageSize],
    );
    res
      .status(200)
      .json({ ...meta, rows: standings.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(200).json({ ...meta, rows: [], total: 0, page: 1, pageSize });
  }
}

export async function getSitemapData(_req: Request, res: Response) {
  try {
    const r = await pool.query(
      // created_at/closes_at feed the sitemap's <lastmod>, which is the one hint
      // Google still acts on — it schedules recrawls by it.
      `SELECT id, content, content_keyword, status, created_at, closes_at
       FROM motions ORDER BY id DESC LIMIT ${config.limits.sitemap_rows}`,
    );
    res.status(200).json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(200).json([]);
  }
}

export async function getMotions(req: Request, res: Response) {
  try {
    const domainId = Number.parseInt(String(req.query.domainId ?? ""), 10);
    const hasDomain = Number.isInteger(domainId) && domainId > 0;

    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const hasKeyword = keyword.length > 0;

    // Both filters are validated against a closed list rather than interpolated:
    // an unknown value is ignored, never passed to SQL.
    const STATUSES = ["live", "concluded"];
    const OUTCOMES = ["for", "against", "draw", "walkover"];
    const status = String(req.query.status ?? "");
    const hasStatus = STATUSES.includes(status);
    const outcome = String(req.query.outcome ?? "");
    const hasOutcome = OUTCOMES.includes(outcome);

    let pageSize = Number.parseInt(String(req.query.pageSize ?? ""), 10);
    if (!Number.isInteger(pageSize)) pageSize = 12;
    pageSize = Math.min(Math.max(pageSize, 1), 50);

    let page = Number.parseInt(String(req.query.page ?? ""), 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    const filterParams: (number | string)[] = [];
    const conds: string[] = [];
    if (hasDomain) {
      filterParams.push(domainId);
      conds.push(`a.domain_id = $${filterParams.length}`);
    }
    if (hasKeyword) {
      filterParams.push(keyword);
      conds.push(`LOWER(a.content_keyword) = LOWER($${filterParams.length})`);
    }
    if (hasStatus) {
      filterParams.push(status);
      conds.push(`a.status = $${filterParams.length}`);
    }
    if (hasOutcome) {
      filterParams.push(outcome);
      conds.push(`a.winner = $${filterParams.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM motions a ${where};`,
      filterParams,
    );
    const total: number = totalResult.rows[0].total;

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const motions = await pool.query(
      `
                SELECT
                    u.username,
                    u.avatar,
                    d.name AS domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS motionId,
                    a.status,
                    a.closes_at AS "closesAt",
                    a.winner,
                    a.margin,
                    a.created_at AT TIME ZONE 'UTC' AS time,
                    a.concluded_at AT TIME ZONE 'UTC' AS "concludedAt",
                    COALESCE(c.count, 0)::int AS "argumentNum"
                FROM motions a
                JOIN users u ON a.user_id = u.id
                JOIN domains d ON d.id = a.domain_id
                LEFT JOIN (
                    SELECT motion_id, COUNT(*) AS count
                    FROM arguments c
                    GROUP BY motion_id
                ) c ON a.id = c.motion_id
                ${where}
                ORDER BY a.id DESC
                LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
            `,
      [...filterParams, pageSize, (page - 1) * pageSize],
    );

    res
      .status(200)
      .json({ motions: motions.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(200).json({ motions: [], total: 0, page: 1, pageSize: 12 });
  }
}
