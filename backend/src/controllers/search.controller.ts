import type { Response, Request } from "express";
import pool from "../db/index.js";

const RESULT_LIMIT = 5;

function toLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function searchAll(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!q) {
    return res.status(200).json({ statements: [], domains: [], users: [] });
  }

  const pattern = toLikePattern(q);

  try {
    const [statements, domains, users] = await Promise.all([
      pool.query(
        `
                SELECT a.id, a.content, a.domain, u.username
                FROM arguments a
                JOIN users u ON u.id = a.user_id
                WHERE a.content ILIKE $1 ESCAPE '\\'
                ORDER BY a.id DESC
                LIMIT $2;
            `,
        [pattern, RESULT_LIMIT],
      ),
      pool.query(
        `
                SELECT domain, COUNT(*)::int AS "statementCount"
                FROM arguments
                WHERE domain ILIKE $1 ESCAPE '\\'
                GROUP BY domain
                ORDER BY "statementCount" DESC
                LIMIT $2;
            `,
        [pattern, RESULT_LIMIT],
      ),
      pool.query(
        `
                SELECT id, username
                FROM users
                WHERE username ILIKE $1 ESCAPE '\\'
                ORDER BY logic_score DESC
                LIMIT $2;
            `,
        [pattern, RESULT_LIMIT],
      ),
    ]);

    res.status(200).json({
      statements: statements.rows,
      domains: domains.rows,
      users: users.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ statements: [], domains: [], users: [] });
  }
}
