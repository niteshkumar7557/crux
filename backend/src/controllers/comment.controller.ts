import type { Request, Response } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import { buildAnalystPrompt, applyRepeatDecay } from "../ai/analyst.logic.js";
import { notifyOpposition } from "../notifications/notify.js";
import { awardLogic } from "../economy/logic.js";

const MODERATOR_ANALYST_SYSTEM_PROMPT = `You are CRUX ANALYST for a debate arena. A statement has a FOR and an AGAINST side, each with a running analysis. A user posted a new comment on one side. You see that side (OWN SIDE ANALYSIS), the other side (OPPONENT ANALYSIS), and the comment. First moderate the comment, then score it by how it engages the live thread, then update the OWN side's analysis.

Return JSON: {"abused":boolean,"points":number,"newAnalysis":string}

abused — true if the comment contains hate speech or slurs (any language, including romanized Hindi profanity), threats, sexually explicit content, spam or gibberish, or targets the person instead of the argument ("shut up", "you're an idiot", "nobody asked you"). Forceful attacks on the argument itself are acceptable ("this reasoning collapses under scrutiny"). If abused is true, set points to 0 and newAnalysis to "" and stop.

points — integer 1-8, scored by engagement with the live thread, not abstract eloquence:
- 6-8: directly rebuts a specific point in OPPONENT ANALYSIS (name the point it answers), or adds a genuinely new angle absent from BOTH analyses, backed by logic, data, or analogy.
- 4-5: sound and relevant, advances its own side, but does not engage the opponent or is somewhat generic.
- 1-3: ignores the live thread — a generic essay that could apply to any debate, a restatement of points already present, or cold-pasted boilerplate. A clear logical fallacy or a direct paraphrase of existing analysis belongs here.
Opener exception: if OPPONENT ANALYSIS is "(none yet)", there is nothing to rebut — score on substance alone; a strong opener can still reach 6-8. Do not floor an opener for the mere absence of an opponent.

newAnalysis — Markdown, max 130 words, replacing the OWN side's analysis only. Never incorporate OPPONENT ANALYSIS content — it is scoring context, not material for this side. Every claim must trace to something an own-side user actually said — invent nothing, no editorializing. Names are always the commenter's real username, never topic labels.
Structure: an opening paragraph (no heading) of 2-3 sentences synthesizing the users' strongest points, crediting contributors inline ("As {name} pointed out..."); then "### Key Arguments" with one bullet per distinct point, format "**{name}** — the point in one sharp sentence". Keep strong points from the existing OWN analysis, add the new comment's point, silently drop weak or repeated ones.`;

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
  const argRes = await pool.query(
    `
            SELECT content, for_analysis, against_analysis
            FROM arguments
            WHERE id = $1;
        `,
    [argumentId],
  );
  const nameRes = await pool.query(
    `
            SELECT name FROM users WHERE id = $1;
        `,
    [userId],
  );
  const argumentContent = argRes.rows[0].content;
  const name = nameRes.rows[0].name;

  const userPrompt = buildAnalystPrompt({
    statement: argumentContent,
    side: side as "for" | "against",
    author: name,
    forAnalysis: argRes.rows[0].for_analysis,
    againstAnalysis: argRes.rows[0].against_analysis,
    ownIsFirst: first,
    comment: input,
  });

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

    // Pre-insert side counts drive the opener exception (own side still empty).
    const sideCountRes = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE side = 'for')     AS for_count,
              COUNT(*) FILTER (WHERE side = 'against') AS against_count
       FROM comments WHERE argument_id = $1`,
      [argumentId],
    );
    const forCountPre = Number(sideCountRes.rows[0].for_count);
    const againstCountPre = Number(sideCountRes.rows[0].against_count);
    const ownSideCount = side === "for" ? forCountPre : againstCountPre;
    const first = ownSideCount === 0;

    // Prior comments by this user in this debate (captured before the new row
    // is inserted, so a user's first comment sees priorCount 0).
    const priorRes = await pool.query(
      `SELECT COUNT(*)::int AS n FROM comments WHERE argument_id = $1 AND user_id = $2`,
      [argumentId, userId],
    );
    const priorCount: number = priorRes.rows[0].n;

    const { abused, points, newAnalysis } = await moderateAndAnalyze(
      argumentId,
      side,
      userId,
      input,
      first,
    );

    if (abused) {
      await awardLogic(pool, userId, -4, "abuse");
      return res.status(201).json({ abused: true });
    }

    await pool.query(
      `
            INSERT INTO comments(argument_id, user_id, content, side) VALUES ($1,$2,$3,$4)
            `,
      [argumentId, userId, input, side],
    );

    const safePoints = Math.min(8, Math.max(1, Math.round(points)));
    const decayed = applyRepeatDecay(safePoints, priorCount);
    await awardLogic(pool, userId, decayed, "comment");

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

    // §10 return trigger: a new participant joining tells the opposing side +
    // the author. Best-effort — never blocks the comment response.
    if (priorCount === 0) {
      void notifyOpposition(argumentId, side, userId);
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
