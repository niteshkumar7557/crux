import type { Response, Request } from "express";
import pool from "../db/index.js";

export async function getActiveCardData(req: Request, res: Response) {
  try {
    const argument = await pool.query(`
                SELECT id, user_id, content, domain, affirmative, negative
                FROM arguments a
                ORDER BY a.id DESC
                LIMIT 1;
            `);
    if (argument.rows.length === 0) {
      return res.status(200).json({});
    }
    const user = await pool.query(
      `
                SELECT username FROM users WHERE id = $1;
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
      domain: argument.rows[0].domain,
      argumentId: argument.rows[0].id,
      username: user.rows[0].username,
      content: argument.rows[0].content,
      affirmative: argument.rows[0].affirmative,
      negative: argument.rows[0].negative,
      count_comments: parseInt(comments.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(200).json({});
  }
}

export async function getTrendingCardData(req: Request, res: Response) {
  try {
    const argument = await pool.query(`
                SELECT 
                    u.username,
                    a.domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS argumentId,
                    COUNT(DISTINCT c.user_id)::int AS active_minds
                FROM arguments a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN comments c ON c.argument_id = a.id
                GROUP BY a.id, u.username, a.domain, a.content, a.affirmative, a.negative
                ORDER BY a.id DESC
                LIMIT 7;
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

export async function getNewestCardData(req: Request, res: Response) {
  try {
    const argument = await pool.query(`
                SELECT 
                    u.username,
                    a.domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS argumentId,
                    a.created_at AT TIME ZONE 'UTC' AS time,
                    COALESCE(c.count, 0)::int AS "argumentNum"
                FROM arguments a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN (
                    SELECT argument_id, COUNT(*) AS count
                    FROM comments c
                    GROUP BY argument_id
                ) c ON a.id = c.argument_id
                ORDER BY a.id DESC
                LIMIT 20;
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
                a.domain AS topic,
                ROUND(AVG(a.affirmative - a.negative))::numeric AS "changePercentage",
                COUNT(DISTINCT c.id)::int AS arguments,
                COUNT(DISTINCT a.id)::int AS "liveBattles"
            FROM arguments a
            LEFT JOIN comments c ON c.argument_id = a.id
            GROUP BY a.domain
            ORDER BY arguments DESC
            LIMIT 3;
        `);

    const data2 = await pool.query(`
            SELECT 
                name,
                logic_score AS "logicScore",
                id,
                RANK() OVER (ORDER BY logic_score DESC, id ASC) AS RANK
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
