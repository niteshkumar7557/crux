import type { Response, Request } from "express";
import pool from "../db/index.js";
import {
  currentSeasonStart,
  currentSeasonNumber,
  lpForResult,
  divisionForLP,
} from "../economy/season.logic.js";

function convertLogicScore(score: number) {
  // Beginner       -> B   0-50
  // Intermediate   -> B+  50-100
  // Skilled        -> A   100-150
  // Expert         -> A+  150-200
  // Master         -> M   200+
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

  return {
    reputation: reputation,
    grade: grade,
  };
}

export async function getProfileDataById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const data1 = await pool.query(
      `
                SELECT name, username, description, logic_score, avatar
                FROM users
                WHERE id = $1;
            `,
      [id],
    );
    const logicScore = Number(data1.rows[0].logic_score);

    const rankQuery = await pool.query(
      `
            SELECT COUNT(*) + 1 AS global_rank
            FROM users
            WHERE 
                CASE 
                    WHEN $2 > 0 THEN logic_score > $2
                    ELSE logic_score = 0 AND id < $1
                END;
        `,
      [id, logicScore],
    );

    const globalRank = Number(rankQuery.rows[0].global_rank);

    const recordRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE r.outcome = 'win')::int  AS wins,
         COUNT(*) FILTER (WHERE r.outcome = 'loss')::int AS losses,
         COUNT(*) FILTER (WHERE r.outcome = 'draw')::int AS draws,
         COUNT(*) FILTER (WHERE r.is_standout)::int      AS standouts
       FROM debate_results r JOIN arguments a ON a.id = r.argument_id
       WHERE r.user_id = $1`,
      [id],
    );
    const record = recordRes.rows[0] ?? {
      wins: 0,
      losses: 0,
      draws: 0,
      standouts: 0,
      upsets: 0,
    };

    // §12 progression: seasonal skill slice (windowed logic) + standing (LP → division).
    const seasonStart = new Date(currentSeasonStart());
    const seasonLogicRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS n FROM logic_events
       WHERE user_id = $1 AND created_at >= $2`,
      [id, seasonStart],
    );
    const lpRows = await pool.query(
      `SELECT r.outcome, r.is_mvp, r.is_standout
       FROM debate_results r JOIN arguments a ON a.id = r.argument_id
       WHERE r.user_id = $1 AND r.created_at >= $2`,
      [id, seasonStart],
    );
    const seasonLP = lpRows.rows.reduce(
      (sum, row) =>
        sum +
        lpForResult({
          outcome: row.outcome,
          isMvp: row.is_mvp,
          isStandout: row.is_standout,
          isUpset: row.is_upset,
        }),
      0,
    );
    const season = {
      number: currentSeasonNumber(),
      logic: seasonLogicRes.rows[0].n,
      lp: seasonLP,
      division: divisionForLP(seasonLP),
    };

    const userHeadInfo = {
      name: data1.rows[0].name,
      username: data1.rows[0].username,
      avatar: data1.rows[0].avatar,
      level: convertLogicScore(logicScore).reputation,
      description: data1.rows[0].description,
      reputation: data1.rows[0].logic_score,
      globalRank: globalRank,
      record: record,
      season: season,
    };

    const data2 = await pool.query(
      `
                SELECT affirmative
                FROM arguments
                WHERE user_id = $1;
            `,
      [id],
    );
    const scores: number[] = [];
    data2.rows.forEach((e) => scores.push(e.affirmative));
    const reputationBreakdownData = {
      data: scores,
    };

    const data3 = await pool.query(
      `
                SELECT id, content AS title
                FROM arguments
                WHERE user_id = $1 
                ORDER BY id DESC
                LIMIT 3;
            `,
      [id],
    );
    const activeStatementsData = data3.rows;

    res.status(200).json({
      userHeadInfo,
      reputationBreakdownData,
      activeStatementsData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}
