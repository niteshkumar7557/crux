// The hot path: post an argument. Read this file first — it exercises most of the
// codebase's conventions in one flow, walked step by step in codebase-guide.md §6.
//
// Order is deliberate throughout: validate, then refuse cheaply, then spend tokens.
// Spec: game-theory.md §5, §6, §7, §8, §9, §16, §17, §19, §20

import type { Request, Response } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import {
  buildAnalystPrompt,
  clampAffirmative,
  scoreArgument,
  type OwnSideArgument,
  type ReplyTarget,
} from "../ai/analyst.logic.js";
import { findDuplicate } from "../lib/duplicate.logic.js";
import {
  isEmptyAnalysis,
  readAnalysis,
  renderAnalysisForPrompt,
  renderOwnAnalysisForAnalyst,
  sanitizeAnalysis,
  writeAnalysis,
} from "../ai/analysis.logic.js";
import { ARGUMENT_JUDGE_SYSTEM_PROMPT } from "../ai/prompts/argument-judge.prompt.js";
import { notifyOpposition, notifyReply } from "../notifications/notify.js";
import { awardLogic } from "../economy/logic.js";
import { currentSeasonStart } from "../economy/season.logic.js";
import { checkText, isTooShortToJudge } from "../lib/validate.js";

// §9: both refusal layers must be indistinguishable from outside, so the silent
// length floor and the judge's "no_argument" verdict return this same body. A
// user who could tell them apart could find the threshold by probing.
const NO_ARGUMENT = {
  reason: "no_argument",
  message:
    "Agreeing or disagreeing isn't an argument on its own. Give the reason, an example, or the mechanism. Nothing was charged, and your draft is still in the box.",
};

interface Judgement {
  verdict: "ok" | "abuse" | "no_argument";
  points: number;
  newAnalysis: unknown;
  affirmative: number | null;
}

// ONE call per argument. The score and the win split come out of the SAME
// judgement, which is what stops the bar moving for an argument that scored the
// floor — the two used to be separate calls and the second never saw the first.
// See ai/prompts/argument-judge.prompt.ts.
async function judgeArgument(
  motionId: number,
  side: string,
  authorUsername: string,
  input: string,
  first: boolean = false,
  replyTo: ReplyTarget | null = null,
  ownSideArguments: OwnSideArgument[] = [],
  newArgumentId: number | null = null,
): Promise<Judgement> {
  const motionRes = await pool.query(
    `
            SELECT content, for_analysis, against_analysis, affirmative, negative
            FROM motions
            WHERE id = $1;
        `,
    [motionId],
  );
  const row = motionRes.rows[0];

  const own = readAnalysis(side === "for" ? row.for_analysis : row.against_analysis);
  const opponent = readAnalysis(
    side === "for" ? row.against_analysis : row.for_analysis,
  );

  const userPrompt = buildAnalystPrompt({
    motion: row.content,
    side: side as "for" | "against",
    author: authorUsername,
    ownAnalysis: renderOwnAnalysisForAnalyst(own),
    opponentAnalysis: renderAnalysisForPrompt(opponent),
    ownIsFirst: first,
    argument: input,
    replyTo,
    ownSideArguments,
    newArgumentId,
    priorAffirmative: row.affirmative,
    priorNegative: row.negative,
  });

  const parsed = await llmJson({
    system: ARGUMENT_JUDGE_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 8000,
  });

  const verdict: Judgement["verdict"] =
    parsed.verdict === "abuse" || parsed.verdict === "no_argument"
      ? parsed.verdict
      : "ok";

  // On anything but "ok" the model's other fields are ignored outright. The
  // prompt is told to zero them; the code does not depend on that.
  if (verdict !== "ok") {
    return { verdict, points: 0, newAnalysis: null, affirmative: null };
  }

  return {
    verdict,
    points: Number(parsed.points),
    newAnalysis: parsed.newAnalysis,
    affirmative: clampAffirmative(parsed.affirmative),
  };
}

export async function getArguments(req: Request, res: Response) {
  const { id } = req.params;
  const argumentsRes = await pool.query(
    `
            SELECT c.id AS argument_id, u.username, u.avatar, c.side, u.logic_score,
                   c.content, c.likes, c.points, c.created_at, u.id AS post_user_id,
                   c.reply_to_argument_id,
                   ru.username AS reply_to_username,
                   rc.content  AS reply_to_content
            FROM arguments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN arguments rc ON rc.id = c.reply_to_argument_id
            LEFT JOIN users    ru ON ru.id = rc.user_id
            WHERE c.motion_id = $1
            ORDER BY c.created_at ASC, c.id ASC;
        `,
    [Number(id)],
  );
  res.status(200).json({ arguments: argumentsRes.rows });
}

async function postArgument(req: Request, res: Response, side: "for" | "against") {
  const { id } = req.params;
  const userId = req.user!.id; // authMiddleware ran; body userId is ignored
  const { input } = req.body;
  const motionId = Number(id);

  const checkedInput = checkText(input, { field: "input", max: 2000 });
  if (!checkedInput.ok)
    return res.status(400).json({ error: checkedInput.reason });

  // §9 layer one: the free half of the low-effort gate, placed at the earliest
  // possible point so a throwaway post costs one round trip and no queries.
  // Same response as the judge's verdict below, deliberately — see validate.ts.
  if (isTooShortToJudge(checkedInput.value)) {
    return res.status(422).json(NO_ARGUMENT);
  }

  const rawReplyTo = req.body.replyToArgumentId;
  const replyToArgumentId =
    rawReplyTo === null || rawReplyTo === undefined || rawReplyTo === ""
      ? null
      : Number(rawReplyTo);

  try {
    if (replyToArgumentId !== null && !Number.isInteger(replyToArgumentId)) {
      return res.status(409).json({ reason: "bad_reply_target" });
    }

    // The arena is read-only once concluded (§4).
    const statusRes = await pool.query(
      `SELECT status, user_id AS author_id FROM motions WHERE id = $1`,
      [motionId],
    );
    if (statusRes.rows.length === 0) {
      return res.status(404).json({ error: "Motion not found." });
    }
    if (statusRes.rows[0].status !== "live") {
      return res.status(409).json({ reason: "locked" });
    }
    const authorId: number = statusRes.rows[0].author_id;

    // §5: the user's first argument locks their side for this debate.
    const sideRes = await pool.query(
      `SELECT side FROM arguments WHERE motion_id = $1 AND user_id = $2 LIMIT 1`,
      [motionId, userId],
    );
    const lockedSide: "for" | "against" | null = sideRes.rows[0]?.side ?? null;

    // §6: a reply targets a specific argument on the OPPOSING side. Validated
    // server-side, before the LLM call — cross-side-only is a rule, not a UI
    // convention, so posting straight at the API cannot bypass it.
    let effectiveSide: "for" | "against" = side;
    let replyTarget: ReplyTarget | null = null;
    let replyTargetUserId: number | null = null;

    if (replyToArgumentId !== null) {
      const t = await pool.query(
        `SELECT c.side, c.user_id, c.content, u.username
         FROM arguments c JOIN users u ON u.id = c.user_id
         WHERE c.id = $1 AND c.motion_id = $2`,
        [replyToArgumentId, motionId],
      );
      if (t.rows.length === 0) {
        return res.status(409).json({ reason: "bad_reply_target" });
      }
      const target = t.rows[0];
      const requiredSide: "for" | "against" =
        target.side === "for" ? "against" : "for";

      // Already locked to the target's own side, so this would be a same-side
      // reply — which §6 forbids.
      if (lockedSide !== null && lockedSide !== requiredSide) {
        return res.status(409).json({ reason: "bad_reply_target" });
      }

      // Derive the side from the target, never from the URL: replying commits
      // you to the side opposite the argument you answer.
      effectiveSide = requiredSide;
      replyTarget = { username: target.username, content: target.content };
      replyTargetUserId = target.user_id;
    } else if (lockedSide !== null && lockedSide !== side) {
      return res.status(409).json({ reason: "side_locked" });
    }

    // §5: the motion's author owns the affirmative case and may never argue
    // against their own claim — by a direct post or by a reply deriving AGAINST.
    if (userId === Number(authorId) && effectiveSide === "against") {
      return res.status(409).json({ reason: "author_affirmative_only" });
    }

    // Every argument in this debate, read once: the side counts, this user's
    // prior count, the repost check and the analyst's own-side block are all
    // views of these rows. Captured before the insert, so a first argument
    // correctly sees priorCount 0.
    const { rows: existing } = await pool.query(
      `SELECT c.id, c.user_id, c.side, c.content, u.username
       FROM arguments c JOIN users u ON u.id = c.user_id
       WHERE c.motion_id = $1
       ORDER BY c.created_at ASC, c.id ASC`,
      [motionId],
    );

    // §8: refused before the model is called, so the exploit costs the attacker
    // a round trip and us no tokens. Paraphrase is the analyst's job.
    const dupe = findDuplicate(checkedInput.value, existing.map((c) => ({
      userId: Number(c.user_id),
      username: String(c.username),
      content: String(c.content),
    })), userId);
    if (dupe.duplicate) {
      return res.status(409).json({
        reason: dupe.of === "self" ? "duplicate_own" : "duplicate_other",
        ...(dupe.of === "other" ? { username: dupe.username } : {}),
      });
    }

    // Pre-insert side counts drive the opener exception (own side still empty)
    // and §7's standalone-cap exemption (opposing side still empty).
    const ownSideRows = existing.filter((c) => c.side === effectiveSide);
    const oppSideCount = existing.length - ownSideRows.length;
    const first = ownSideRows.length === 0;
    const priorCount = existing.filter(
      (c) => Number(c.user_id) === userId,
    ).length;

    // §17: the analyst must attribute a point to this argument, but the row is
    // not inserted until after it runs (an abusive argument is never inserted at
    // all). So the id is taken from the sequence up front and the INSERT uses it
    // explicitly. A failed post just leaves a gap in the numbering.
    const idRes = await pool.query(
      `SELECT nextval(pg_get_serial_sequence('arguments','id'))::int AS id,
              (SELECT username FROM users WHERE id = $1) AS username`,
      [userId],
    );
    const newArgumentId = Number(idRes.rows[0].id);
    const authorUsername = String(idRes.rows[0].username);

    const judgement = await judgeArgument(
      motionId,
      effectiveSide,
      authorUsername,
      checkedInput.value,
      first,
      replyTarget,
      ownSideRows.map((c) => ({
        id: Number(c.id),
        username: String(c.username),
        content: String(c.content),
      })),
      newArgumentId,
    );

    if (judgement.verdict === "abuse") {
      await awardLogic(pool, userId, -4, "abuse");
      return res.status(201).json({ abused: true });
    }

    // §9 layer two. Laziness costs the post and nothing else — abuse is malice
    // and costs 4 logic, this is not.
    if (judgement.verdict === "no_argument") {
      return res.status(422).json(NO_ARGUMENT);
    }

    // §7: clamp to 2-10, then the standalone cap. In that order.
    const breakdown = scoreArgument({
      rawPoints: judgement.points,
      isReply: replyToArgumentId !== null,
      opponentHasArguments: oppSideCount > 0,
    });

    // Insert, award and case-rewrite commit or roll back together — a failure
    // between them must never leave a half-persisted argument.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO arguments (id, motion_id, user_id, content, side, reply_to_argument_id, points)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          newArgumentId,
          motionId,
          userId,
          checkedInput.value,
          effectiveSide,
          replyToArgumentId,
          breakdown.points,
        ],
      );
      await awardLogic(client, userId, breakdown.points, "argument");
      // §17: attribution is resolved against this side's real arguments,
      // including the one being inserted right now — so an id the model invented
      // costs a point its link and nothing more. An analysis that sanitizes to
      // empty means "no update", and the previous one stands.
      const authorByArgumentId = new Map<number, string>(
        ownSideRows.map((c) => [Number(c.id), String(c.username)]),
      );
      authorByArgumentId.set(newArgumentId, authorUsername);
      const analysis = sanitizeAnalysis(judgement.newAnalysis, authorByArgumentId);
      if (!isEmptyAnalysis(analysis)) {
        await client.query(
          `UPDATE motions SET ${effectiveSide}_analysis = $1 WHERE id = $2;`,
          [writeAnalysis(analysis), motionId],
        );
      }

      // §16: the split only goes live once BOTH sides have argued. oppSideCount
      // is read pre-insert, so this argument already accounts for the own side.
      // A null affirmative means the model returned nothing usable — leave the
      // split alone rather than fail a post that is otherwise good.
      if (oppSideCount > 0 && judgement.affirmative !== null) {
        await client.query(
          `UPDATE motions SET affirmative = $1, negative = $2 WHERE id = $3;`,
          [judgement.affirmative, 100 - judgement.affirmative, motionId],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // §20 return triggers, both best-effort — neither blocks the response.
    if (replyTargetUserId !== null) {
      void notifyReply(motionId, replyTargetUserId, userId);
    }
    if (priorCount === 0) {
      void notifyOpposition(motionId, effectiveSide, userId);
    }

    // §19: the season standing the points pop-up reconciles the award against.
    // Rank is "how many people sort strictly ahead of me, plus one", where ahead
    // means more logic, or the same logic and a lower id.
    //
    // Both halves matter. The tiebreak is the same one the season board ranks by
    // (arena.controller.ts), so the number here and the number there agree — and
    // totals covers EVERY user rather than only those with events this season, or
    // a user on 0 would be ranked against a table that does not contain them.
    const standing = await pool.query(
      `WITH totals AS (
         SELECT u.id AS user_id,
                COALESCE(SUM(le.amount) FILTER (WHERE le.created_at >= $1), 0)::int AS logic
         FROM users u
         LEFT JOIN logic_events le ON le.user_id = u.id
         GROUP BY u.id
       ), mine AS (
         SELECT COALESCE((SELECT logic FROM totals WHERE user_id = $2), 0) AS logic
       )
       SELECT (SELECT logic FROM mine) AS season_logic,
              (SELECT COUNT(*) + 1 FROM totals, mine
                WHERE totals.logic > mine.logic
                   OR (totals.logic = mine.logic AND totals.user_id < $2))::int AS season_rank`,
      [currentSeasonStart(), userId],
    );

    res.status(201).json({
      points: breakdown.points,
      judged: breakdown.judged,
      capped: breakdown.capped,
      isReply: replyToArgumentId !== null,
      replyToUsername: replyTarget?.username ?? null,
      seasonLogic: standing.rows[0].season_logic,
      seasonRank: standing.rows[0].season_rank,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error in argument posting!" });
  }
}

export async function postAffirmativeArgument(req: Request, res: Response) {
  return postArgument(req, res, "for");
}

export async function postNegativeArgument(req: Request, res: Response) {
  return postArgument(req, res, "against");
}
