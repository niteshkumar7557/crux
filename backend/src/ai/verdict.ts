import pool from "../db/index.js";
import { llmJson } from "./llm.js";
import { notifyVerdict } from "../notifications/notify.js";
import { awardLogic } from "../economy/logic.js";
import config from "../config/index.js";
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

const MAX_COMMENTS = config.limits.verdict_comments;

type ParticipantWithName = Participant & { username: string };

export async function concludeDebate(argumentId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const argRes = await client.query(
      `SELECT id, user_id, content, for_analysis, against_analysis, status
       FROM arguments WHERE id = $1 FOR UPDATE`,
      [argumentId],
    );
    const arg = argRes.rows[0];
    if (!arg || arg.status !== "live") {
      await client.query("ROLLBACK");
      return;
    }
    const authorId: number = arg.user_id;

    // Top comments by likes, for the judge's prompt (token-bounded).
    const commentsRes = await client.query(
      `SELECT u.username, c.side, c.likes, c.content
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.argument_id = $1
       ORDER BY c.likes DESC, c.id ASC
       LIMIT $2`,
      [argumentId, MAX_COMMENTS],
    );

    // Distinct participants with their (locked) side + username for the MVP match.
    const partRes = await client.query(
      `SELECT DISTINCT ON (c.user_id) c.user_id, c.side, u.username
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.argument_id = $1 ORDER BY c.user_id, c.id ASC`,
      [argumentId],
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
      const commentBlock = commentsRes.rows
        .map((c) => `@${c.username} [${c.side}, ${c.likes} likes]: ${c.content}`)
        .join("\n");

      const raw = await llmJson<RawVerdict>({
        system: VERDICT_JUDGE_SYSTEM_PROMPT,
        user: `STATEMENT: ${arg.content}

FOR analysis:
${arg.for_analysis}

AGAINST analysis:
${arg.against_analysis}

SCORED COMMENTS:
${commentBlock}`,
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
        `INSERT INTO debate_results (argument_id, user_id, side, outcome, is_mvp)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (argument_id, user_id) DO NOTHING`,
        [argumentId, r.userId, r.side, r.outcome, r.isMvp],
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
      `UPDATE arguments SET
         status = 'concluded',
         concluded_at = NOW(),
         winner = $2,
         margin = $3,
         mvp_user_id = $4,
         verdict_text = $5,
         affirmative = COALESCE($6, affirmative),
         negative = COALESCE($7, negative)
       WHERE id = $1`,
      [argumentId, winner, margin, mvpUserId, verdictText, affirmative, negative],
    );

    await client.query("COMMIT");
    console.log(`⚖️  concluded debate ${argumentId} → ${winner}`);

    // §14 return trigger: tell every participant the verdict is in. Best-effort,
    // post-commit so a notification failure can't roll back the conclusion.
    void notifyVerdict(
      argumentId,
      payouts.results.map((r) => ({
        userId: r.userId,
        outcome: r.outcome,
        isMvp: r.isMvp,
      })),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ failed to conclude debate ${argumentId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}
