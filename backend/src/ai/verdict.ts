import pool from "../db/index.js";
import { llmJson } from "./llm.js";
import { notifyVerdict } from "../notifications/notify.js";
import { awardLogic } from "../economy/logic.js";
import config from "../config/index.js";
import { readAnalysis, renderAnalysisForPrompt } from "./analysis.logic.js";
import {
  resolveVerdict,
  resolvePayouts,
  walkoverPayout,
  type RawVerdict,
  type Participant,
  type Payouts,
  type Side,
} from "./verdict.logic.js";
import { VERDICT_JUDGE_SYSTEM_PROMPT } from "./prompts/verdict-judge.prompt.js";

const MAX_ARGUMENTS = config.limits.verdict_arguments;

type ParticipantWithName = Participant & { username: string };

export async function concludeDebate(motionId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const motionRes = await client.query(
      `SELECT id, user_id, content, for_analysis, against_analysis, status
       FROM motions WHERE id = $1 FOR UPDATE`,
      [motionId],
    );
    const motion = motionRes.rows[0];
    if (!motion || motion.status !== "live") {
      await client.query("ROLLBACK");
      return;
    }
    const authorId: number = motion.user_id;

    // Top arguments by likes, for the judge's prompt (token-bounded).
    const argumentsRes = await client.query(
      `SELECT u.username, c.side, c.likes, c.content
       FROM arguments c JOIN users u ON u.id = c.user_id
       WHERE c.motion_id = $1
       ORDER BY c.likes DESC, c.id ASC
       LIMIT $2`,
      [motionId, MAX_ARGUMENTS],
    );

    // Distinct participants with their (locked) side + username for the MVP match.
    const partRes = await client.query(
      `SELECT DISTINCT ON (c.user_id) c.user_id, c.side, u.username
       FROM arguments c JOIN users u ON u.id = c.user_id
       WHERE c.motion_id = $1 ORDER BY c.user_id, c.id ASC`,
      [motionId],
    );
    const participants: ParticipantWithName[] = partRes.rows.map((r) => ({
      userId: r.user_id,
      side: r.side as Side,
      username: r.username,
    }));

    const forCount = participants.filter((p) => p.side === "for").length;
    const againstCount = participants.filter((p) => p.side === "against").length;

    let payouts: Payouts;
    let winner: string;
    let margin: number | null = null;
    let mvpUserId: number | null = null;
    let verdictText: string;
    let affirmative: number | null = null;
    let negative: number | null = null;

    if (forCount === 0 || againstCount === 0) {
      // Walkover — no contest, no LLM call.
      winner = "walkover";
      verdictText = "Concluded unopposed — a contest needs two committed sides.";
      payouts = walkoverPayout();
    } else {
      const argumentBlock = argumentsRes.rows
        .map((c) => `@${c.username} [${c.side}, ${c.likes} likes]: ${c.content}`)
        .join("\n");

      const raw = await llmJson<RawVerdict>({
        system: VERDICT_JUDGE_SYSTEM_PROMPT,
        user: `MOTION: ${motion.content}

FOR analysis:
${renderAnalysisForPrompt(readAnalysis(motion.for_analysis))}

AGAINST analysis:
${renderAnalysisForPrompt(readAnalysis(motion.against_analysis))}

SCORED ARGUMENTS:
${argumentBlock}`,
        maxTokens: 2500,
      });

      const resolved = resolveVerdict(raw, participants);
      winner = resolved.winner;
      margin = resolved.margin;
      affirmative = resolved.affirmative;
      negative = resolved.negative;
      verdictText = raw.closing?.trim() || "The debate has been ruled.";

      // §7: resolveVerdict already validated the MVP onto the winning side.
      mvpUserId = resolved.mvpUserId;

      payouts = resolvePayouts({
        winner: resolved.winner,
        participants,
        mvpUserId,
        authorId,
      });
    }

    // Write debate_results rows.
    for (const r of payouts.results) {
      await client.query(
        `INSERT INTO debate_results (motion_id, user_id, side, outcome, is_mvp)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (motion_id, user_id) DO NOTHING`,
        [motionId, r.userId, r.side, r.outcome, r.isMvp],
      );
    }
    // Apply logic awards (also ledgered for the §10 seasonal window). The
    // loss penalty rides in season-only, so a career total never falls (§8).
    for (const a of payouts.logicAwards) {
      await awardLogic(
        client,
        a.userId,
        a.amount,
        a.amount < 0 ? "loss" : "verdict",
        a.seasonOnly,
      );
    }

    await client.query(
      `UPDATE motions SET
         status = 'concluded',
         concluded_at = NOW(),
         winner = $2,
         margin = $3,
         mvp_user_id = $4,
         verdict_text = $5,
         affirmative = COALESCE($6, affirmative),
         negative = COALESCE($7, negative)
       WHERE id = $1`,
      [motionId, winner, margin, mvpUserId, verdictText, affirmative, negative],
    );

    await client.query("COMMIT");
    console.log(`⚖️  concluded debate ${motionId} → ${winner}`);

    // §14 return trigger: tell every participant the verdict is in. Best-effort,
    // post-commit so a notification failure can't roll back the conclusion.
    void notifyVerdict(
      motionId,
      payouts.results.map((r) => ({
        userId: r.userId,
        outcome: r.outcome,
        isMvp: r.isMvp,
      })),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ failed to conclude debate ${motionId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}
