// Cross-entity search: motions, domains, users.

import type { Response, Request } from "express";
import pool from "../db/index.js";

const RESULT_LIMIT = 5;

function toLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function searchAll(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!q) {
    return res.status(200).json({ motions: [], domains: [], users: [] });
  }

  const pattern = toLikePattern(q);

  try {
    const [motions, domains, users] = await Promise.all([
      pool.query(
        `
                SELECT a.id, a.content, d.name AS domain, u.username
                FROM motions a
                JOIN users u ON u.id = a.user_id
                JOIN domains d ON d.id = a.domain_id
                WHERE a.content ILIKE $1 ESCAPE '\\'
                ORDER BY a.id DESC
                LIMIT $2;
            `,
        [pattern, RESULT_LIMIT],
      ),
      pool.query(
        `
                SELECT d.name AS domain, COUNT(*)::int AS "motionCount"
                FROM motions a
                JOIN domains d ON d.id = a.domain_id
                WHERE d.name ILIKE $1 ESCAPE '\\'
                GROUP BY d.name
                ORDER BY "motionCount" DESC
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
      motions: motions.rows,
      domains: domains.rows,
      users: users.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ motions: [], domains: [], users: [] });
  }
}
