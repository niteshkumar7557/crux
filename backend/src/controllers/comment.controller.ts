import type { Request, Response } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import {
  buildAnalystPrompt,
  scoreComment,
  type ReplyTarget,
} from "../ai/analyst.logic.js";
import { MODERATOR_ANALYST_SYSTEM_PROMPT } from "../ai/prompts/moderator-analyst.prompt.js";
import { PROBABILITY_SYSTEM_PROMPT } from "../ai/prompts/probability.prompt.js";
import { notifyOpposition, notifyReply } from "../notifications/notify.js";
import { awardLogic } from "../economy/logic.js";
import { currentSeasonStart } from "../economy/season.logic.js";

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
  replyTo: ReplyTarget | null = null,
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
    replyTo,
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
            SELECT c.id AS comment_id, u.username, u.avatar, c.side, u.logic_score,
                   c.content, c.likes, c.points, c.created_at, u.id AS post_user_id,
                   c.reply_to_comment_id,
                   ru.username AS reply_to_username,
                   rc.content  AS reply_to_content
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN comments rc ON rc.id = c.reply_to_comment_id
            LEFT JOIN users    ru ON ru.id = rc.user_id
            WHERE c.argument_id = $1
            ORDER BY c.created_at ASC, c.id ASC;
        `,
    [Number(id)],
  );
  res.status(200).json({ comments: comments.rows });
}

async function postComment(req: Request, res: Response, side: "for" | "against") {
  const { id } = req.params;
  const { userId, input } = req.body;
  const argumentId = Number(id);

  const rawReplyTo = req.body.replyToCommentId;
  const replyToCommentId =
    rawReplyTo === null || rawReplyTo === undefined || rawReplyTo === ""
      ? null
      : Number(rawReplyTo);

  try {
    if (replyToCommentId !== null && !Number.isInteger(replyToCommentId)) {
      return res.status(409).json({ reason: "bad_reply_target" });
    }

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

    // Commit-to-one-side (§4): the user's first comment locks their side.
    const sideRes = await pool.query(
      `SELECT side FROM comments WHERE argument_id = $1 AND user_id = $2 LIMIT 1`,
      [argumentId, userId],
    );
    const lockedSide: "for" | "against" | null = sideRes.rows[0]?.side ?? null;

    // §5: a reply targets a specific comment on the OPPOSING side. Validated
    // here, server-side, before the LLM call -- cross-side-only is a rule, not
    // a UI convention, so it cannot be bypassed by posting straight at the API.
    let effectiveSide: "for" | "against" = side;
    let replyTarget: ReplyTarget | null = null;
    let replyTargetUserId: number | null = null;

    if (replyToCommentId !== null) {
      const t = await pool.query(
        `SELECT c.side, c.user_id, c.content, u.username
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.id = $1 AND c.argument_id = $2`,
        [replyToCommentId, argumentId],
      );
      if (t.rows.length === 0) {
        return res.status(409).json({ reason: "bad_reply_target" });
      }
      const target = t.rows[0];
      const requiredSide: "for" | "against" =
        target.side === "for" ? "against" : "for";

      // Already locked to the target's own side => this would be a same-side
      // reply, which §5 forbids.
      if (lockedSide !== null && lockedSide !== requiredSide) {
        return res.status(409).json({ reason: "bad_reply_target" });
      }

      // Derive the side from the target, never from the URL: replying commits
      // you to the side opposite the comment you are answering (§5).
      effectiveSide = requiredSide;
      replyTarget = { username: target.username, content: target.content };
      replyTargetUserId = target.user_id;
    } else if (lockedSide !== null && lockedSide !== side) {
      return res.status(409).json({ reason: "side_locked" });
    }

    // Pre-insert side counts drive the opener exception (own side still empty)
    // and §6's standalone-cap exemption (opposing side still empty).
    const sideCountRes = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE side = 'for')     AS for_count,
              COUNT(*) FILTER (WHERE side = 'against') AS against_count
       FROM comments WHERE argument_id = $1`,
      [argumentId],
    );
    const forCountPre = Number(sideCountRes.rows[0].for_count);
    const againstCountPre = Number(sideCountRes.rows[0].against_count);
    const ownSideCount =
      effectiveSide === "for" ? forCountPre : againstCountPre;
    const oppSideCount =
      effectiveSide === "for" ? againstCountPre : forCountPre;
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
      effectiveSide,
      userId,
      input,
      first,
      replyTarget,
    );

    if (abused) {
      await awardLogic(pool, userId, -4, "abuse");
      return res.status(201).json({ abused: true });
    }

    // §6: clamp to 1-8 -> standalone cap -> halving, in that order.
    const breakdown = scoreComment({
      rawPoints: points,
      isReply: replyToCommentId !== null,
      opponentHasComments: oppSideCount > 0,
      priorCount,
    });

    // §14: the award is stored on the row so the arena can show what each
    // comment earned without recomputing it.
    await pool.query(
      `INSERT INTO comments (argument_id, user_id, content, side, reply_to_comment_id, points)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        argumentId,
        userId,
        input,
        effectiveSide,
        replyToCommentId,
        breakdown.points,
      ],
    );

    await awardLogic(pool, userId, breakdown.points, "comment");

    if (newAnalysis) {
      await pool.query(
        `
            UPDATE arguments
            SET ${effectiveSide}_analysis = $1
            WHERE id = $2;
        `,
        [newAnalysis, argumentId],
      );
    }

    // §14 return triggers, both best-effort — neither blocks the response.
    if (replyTargetUserId !== null) {
      void notifyReply(argumentId, replyTargetUserId, Number(userId));
    }
    if (priorCount === 0) {
      void notifyOpposition(argumentId, effectiveSide, userId);
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

    // §14: the season standing the points pop-up reconciles the award against.
    // Rank is "how many people are strictly ahead, plus one".
    const standing = await pool.query(
      `WITH totals AS (
         SELECT user_id, SUM(amount)::int AS logic
         FROM logic_events
         WHERE created_at >= $1
         GROUP BY user_id
       ), mine AS (
         SELECT COALESCE((SELECT logic FROM totals WHERE user_id = $2), 0) AS logic
       )
       SELECT (SELECT logic FROM mine) AS season_logic,
              (SELECT COUNT(*) + 1 FROM totals
                WHERE logic > (SELECT logic FROM mine))::int AS season_rank`,
      [currentSeasonStart(), userId],
    );

    res.status(201).json({
      points: breakdown.points,
      judged: breakdown.judged,
      capped: breakdown.capped,
      halved: breakdown.halved,
      isReply: replyToCommentId !== null,
      replyToUsername: replyTarget?.username ?? null,
      seasonLogic: standing.rows[0].season_logic,
      seasonRank: standing.rows[0].season_rank,
    });
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
