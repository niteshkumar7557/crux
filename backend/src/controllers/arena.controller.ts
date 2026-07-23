import type { Response, Request } from "express";
import pool from "../db/index.js";
import config from "../config/index.js";
import {
  currentSeasonStart,
  seasonNumber,
  seasonKey,
  daysLeftInSeason,
} from "../economy/season.logic.js";

export async function getPrimaryCardData(req: Request, res: Response) {
  try {
    const argument = await pool.query(`
                SELECT a.id, a.user_id, a.content, a.domain_id, a.affirmative, a.negative,
                       a.status, a.closes_at, a.is_dotd
                FROM arguments a
                WHERE a.status = 'live' AND a.featured = TRUE AND a.is_dotd = TRUE;
            `);
    if (argument.rows.length === 0) {
      return res.status(200).json({});
    }
    const domain = await pool.query(
      `
                SELECT name FROM domains WHERE id = $1;
            `,
      [argument.rows[0].domain_id],
    );
    const user = await pool.query(
      `
                SELECT username, avatar FROM users WHERE id = $1;
            `,
      [argument.rows[0].user_id],
    );
    const comments = await pool.query(
      `
                SELECT COUNT(id) FROM comments WHERE argument_id = $1;
            `,
      [argument.rows[0].id],
    );

    res.status(200).json({
      domain: domain.rows[0].name,
      argumentId: argument.rows[0].id,
      username: user.rows[0].username,
      avatar: user.rows[0].avatar,
      content: argument.rows[0].content,
      affirmative: argument.rows[0].affirmative,
      negative: argument.rows[0].negative,
      status: argument.rows[0].status,
      closesAt: argument.rows[0].closes_at,
      isDotd: argument.rows[0].is_dotd,
      count_comments: parseInt(comments.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(200).json({});
  }
}

export async function getSecondaryCardsData(req: Request, res: Response) {
  try {
    const argument = await pool.query(`
                SELECT
                    u.username,
                    u.avatar,
                    d.name AS domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS argumentId,
                    a.status,
                    a.closes_at AS "closesAt",
                    COUNT(DISTINCT c.user_id)::int AS active_minds
                FROM arguments a
                JOIN users u ON a.user_id = u.id
                JOIN domains d ON d.id = a.domain_id
                LEFT JOIN comments c ON c.argument_id = a.id
                WHERE a.featured = TRUE AND a.is_dotd = FALSE
                GROUP BY a.id, u.username, u.avatar, d.name, a.content, a.affirmative, a.negative
                ORDER BY a.featured_at ASC NULLS LAST
                LIMIT 6;
            `);
    if (argument.rows.length === 0) {
      return res.status(200).json({});
    }

    res.status(200).json(argument.rows);
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
            FROM arguments a
            JOIN domains d ON d.id = a.domain_id
            LEFT JOIN comments c ON c.argument_id = a.id
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
                RANK () OVER (ORDER BY logic_score DESC, id ASC) AS rank
            FROM users
            ORDER BY 
                logic_score DESC,
                id ASC
            LIMIT 3;
        `);

    const data3 = await pool.query(`
                SELECT
                    (SELECT ROUND(SUM(logic_score)::int) FROM users) AS "logicStacked",
                    (SELECT COUNT(*)::int FROM arguments) AS "activeArenas"
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

/**
 * Both boards are a window onto a capped ranking, not the whole user table:
 * `leaderboard_rows` still decides how deep the board goes, and paging walks
 * that same depth. So the constant keeps the meaning it always had.
 */
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

/** Ranked users, capped — the denominator both boards page through. */
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

    // Rank over everyone first, then take the capped board, then the page —
    // so a rank means the same thing on page 3 as it does on page 1.
    const standings = await pool.query(
      `
            WITH board AS (
                SELECT
                    u.id,
                    u.name,
                    u.username,
                    u.avatar,
                    u.logic_score AS "logicScore",
                    RANK () OVER (ORDER BY u.logic_score DESC, u.id ASC)::int AS rank,
                    COALESCE(a.count, 0)::int AS "statementCount",
                    COALESCE(c.count, 0)::int AS "argumentCount"
                FROM users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS count FROM arguments GROUP BY user_id
                ) a ON a.user_id = u.id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS count FROM comments GROUP BY user_id
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

// §10 Season board: ranks logic EARNED this season (the windowed ledger sum),
// so everyone starts at 0 each month and a hot newcomer races veterans fairly.
export async function getSeasonLeaderboard(req: Request, res: Response) {
  const { cap, pageSize } = leaderboardPaging(req);
  let { page } = leaderboardPaging(req);
  // §14's season strip reads these unconditionally, so they are assembled
  // before anything can fail and reused on the error path.
  const meta = {
    season: seasonNumber(),
    seasonKey: seasonKey(),
    daysLeft: daysLeftInSeason(),
  };
  try {
    const start = currentSeasonStart();
    const total = await rankedTotal(cap);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const standings = await pool.query(
      `WITH board AS (
         SELECT u.id, u.name, u.username, u.avatar,
                COALESCE(SUM(le.amount) FILTER (WHERE le.created_at >= $1), 0)::int AS "seasonLogic",
                RANK() OVER (
                  ORDER BY COALESCE(SUM(le.amount) FILTER (WHERE le.created_at >= $1), 0) DESC
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

// §11 SEO: flat list of every debate (id + claim + keyword) for the sitemap.
export async function getSitemapData(_req: Request, res: Response) {
  try {
    const r = await pool.query(
      `SELECT id, content, content_keyword, status
       FROM arguments ORDER BY id DESC LIMIT ${config.limits.sitemap_rows}`,
    );
    res.status(200).json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(200).json([]);
  }
}

export async function getStatements(req: Request, res: Response) {
  try {
    const domainId = Number.parseInt(String(req.query.domainId ?? ""), 10);
    const hasDomain = Number.isInteger(domainId) && domainId > 0;

    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const hasKeyword = keyword.length > 0;

    // §11 the archive reads the settled record: `status` splits live from
    // concluded, `outcome` narrows to one ruling. Both are validated against a
    // closed list rather than interpolated — an unknown value is ignored, not
    // passed to SQL.
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
      `SELECT COUNT(*)::int AS total FROM arguments a ${where};`,
      filterParams,
    );
    const total: number = totalResult.rows[0].total;

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const statements = await pool.query(
      `
                SELECT
                    u.username,
                    u.avatar,
                    d.name AS domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS argumentId,
                    a.status,
                    a.closes_at AS "closesAt",
                    a.winner,
                    a.margin,
                    a.created_at AT TIME ZONE 'UTC' AS time,
                    COALESCE(c.count, 0)::int AS "argumentNum"
                FROM arguments a
                JOIN users u ON a.user_id = u.id
                JOIN domains d ON d.id = a.domain_id
                LEFT JOIN (
                    SELECT argument_id, COUNT(*) AS count
                    FROM comments c
                    GROUP BY argument_id
                ) c ON a.id = c.argument_id
                ${where}
                ORDER BY a.id DESC
                LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
            `,
      [...filterParams, pageSize, (page - 1) * pageSize],
    );

    res
      .status(200)
      .json({ statements: statements.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(200).json({ statements: [], total: 0, page: 1, pageSize: 12 });
  }
}
