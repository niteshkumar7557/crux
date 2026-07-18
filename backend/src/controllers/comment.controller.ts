import type { Request, Response } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";

const MODERATOR_ANALYST_SYSTEM_PROMPT = `You are CRUX ANALYST for a debate arena. A statement has a FOR and an AGAINST side, each with a running analysis. A user posted a new comment on one side. First moderate the comment, then score it and update that side's analysis.

Return JSON: {"abused":boolean,"points":number,"newAnalysis":string}

abused — true if the comment contains hate speech or slurs (any language, including romanized Hindi profanity), threats, sexually explicit content, spam or gibberish, or targets the person instead of the argument ("shut up", "you're an idiot", "nobody asked you"). Forceful attacks on the argument itself are acceptable ("this reasoning collapses under scrutiny"). If abused is true, set points to 0 and newAnalysis to "" and stop.

points — integer 4-8. 8: genuinely new angle backed by logic, data, or analogy. 6-7: sound substance that advances the case. 4-5: relevant but surface-level or repeats the existing analysis. Subtract 1 for a clear logical fallacy or direct paraphrase of existing analysis; never below 4.

newAnalysis — Markdown, max 130 words, replacing the side's analysis. Every claim must trace to something a user actually said — invent nothing, no editorializing. Names are always the commenter's real username, never topic labels.
Structure: an opening paragraph (no heading) of 2-3 sentences synthesizing the users' strongest points, crediting contributors inline ("As {name} pointed out..."); then "### Key Arguments" with one bullet per distinct point, format "**{name}** — the point in one sharp sentence". Keep strong points from the existing analysis, add the new comment's point, silently drop weak or repeated ones.`;

const PROBABILITY_SYSTEM_PROMPT = `You judge which side of a debate currently holds the stronger position, given the statement and each side's analysis.

Return JSON: {"affirmative":int,"negative":int} — two integers summing to exactly 100, each between 20 and 80. Judge only evidence quality, logical soundness, and specificity of the analyses — not your own opinion. Balanced = 50/50; clearly dominant = 65/35 or beyond.`;

async function updateProbability(argumentId: number) {
  const { rows } = await pool.query(
    `
            SELECT content, for_analysis, against_analysis
            FROM arguments
            WHERE id = $1;
        `,
    [argumentId],
  );

  const userPrompt = `STATEMENT: ${rows[0].content}

FOR analysis: ${rows[0].for_analysis}
AGAINST analysis: ${rows[0].against_analysis}`;

  const parsed = await llmJson({
    system: PROBABILITY_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 2000,
  });

  const affirmative = Math.round(parsed.affirmative);
  const negative = 100 - affirmative;

  await pool.query(
    `
            UPDATE arguments
            SET affirmative = $1,
                negative = $2
            WHERE id = $3
        `,
    [affirmative, negative, argumentId],
  );
}

async function moderateAndAnalyze(
  argumentId: number,
  side: string,
  userId: string,
  input: string,
  first: boolean = false,
) {
  const data1 = await pool.query(
    `
            SELECT content FROM arguments WHERE id = $1;
        `,
    [argumentId],
  );
  const data2 = await pool.query(
    `
            SELECT name FROM users WHERE id = $1;
        `,
    [userId],
  );
  const data3 = await pool.query(
    `
                SELECT ${side}_analysis
                FROM arguments
                WHERE id = $1;
            `,
    [argumentId],
  );
  const argumentContent = data1.rows[0].content;
  const name = data2.rows[0].name;
  const oldAnalysis =
    side === "for"
      ? data3.rows[0].for_analysis
      : data3.rows[0].against_analysis;

  const userPrompt = first
    ? `STATEMENT: "${argumentContent}"
SIDE: ${side.toUpperCase()}
AUTHOR: ${name}
COMMENT: "${input}"`
    : `STATEMENT: "${argumentContent}"
SIDE: ${side.toUpperCase()}
EXISTING ANALYSIS:
${oldAnalysis}
NEW COMMENT AUTHOR: ${name}
COMMENT: "${input}"`;

  const parsed = await llmJson({
    system: MODERATOR_ANALYST_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 3000,
  });

  return parsed as {
    abused: boolean;
    points: number;
    newAnalysis: string;
  };
}

export async function getComments(req: Request, res: Response) {
  const { id } = req.params;
  const comments = await pool.query(
    `
            SELECT c.id AS comment_id, u.username, u.avatar, c.side, u.logic_score, c.content, c.likes, u.id AS post_user_id
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.argument_id = $1;
        `,
    [Number(id)],
  );
  res.status(200).json({ comments: comments.rows });
}

async function postComment(req: Request, res: Response, side: "for" | "against") {
  const { id } = req.params;
  const { userId, input } = req.body;
  const argumentId = Number(id);

  try {
    // Arena is read-only once concluded.
    const statusRes = await pool.query(
      `SELECT status FROM arguments WHERE id = $1`,
      [argumentId],
    );
    if (statusRes.rows.length === 0) {
      return res.status(404).json({ error: "Argument not found." });
    }
    if (statusRes.rows[0].status !== "live") {
      return res.status(409).json({ reason: "locked" });
    }

    // Commit-to-one-side: the user's first comment locks their side for this debate.
    const sideRes = await pool.query(
      `SELECT side FROM comments WHERE argument_id = $1 AND user_id = $2 LIMIT 1`,
      [argumentId, userId],
    );
    if (sideRes.rows.length > 0 && sideRes.rows[0].side !== side) {
      return res.status(409).json({ reason: "side_locked" });
    }

    const { rows: existing } = await pool.query(
      `
            SELECT id FROM comments WHERE argument_id = $1 AND side = $2;
            `,
      [argumentId, side],
    );
    const first = existing.length === 0;

    const { abused, points, newAnalysis } = await moderateAndAnalyze(
      argumentId,
      side,
      userId,
      input,
      first,
    );

    if (abused) {
      await pool.query(
        `
                    UPDATE users
                    SET logic_score = logic_score - 4
                    WHERE id = $1;
                `,
        [userId],
      );
      return res.status(201).json({ abused: true });
    }

    await pool.query(
      `
            INSERT INTO comments(argument_id, user_id, content, side) VALUES ($1,$2,$3,$4)
            `,
      [argumentId, userId, input, side],
    );

    const safePoints = Math.min(8, Math.max(4, Math.round(points)));
    await pool.query(
      `
            UPDATE users
            SET logic_score = logic_score + $2
            WHERE id = $1;
        `,
      [userId, safePoints],
    );

    if (newAnalysis) {
      await pool.query(
        `
            UPDATE arguments
            SET ${side}_analysis = $1
            WHERE id = $2;
        `,
        [newAnalysis, argumentId],
      );
    }

    const { rows } = await pool.query(
      `
        SELECT
            COUNT(CASE WHEN side = 'for' THEN 1 END) AS for_count,
            COUNT(CASE WHEN side = 'against' THEN 1 END) AS against_count
        FROM comments
        WHERE argument_id = $1;
    `,
      [argumentId],
    );

    const forCount = Number(rows[0].for_count);
    const againstCount = Number(rows[0].against_count);

    if (forCount >= 1 && againstCount >= 1) {
      await updateProbability(argumentId);
    }

    res.status(201).json({ message: "Successfully comment posted!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error in comment posting!" });
  }
}

export async function postAffirmativeComment(req: Request, res: Response) {
  return postComment(req, res, "for");
}

export async function postNegativeComment(req: Request, res: Response) {
  return postComment(req, res, "against");
}
