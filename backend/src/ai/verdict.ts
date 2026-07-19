import pool from "../db/index.js";
import { llmJson } from "./llm.js";
import {
  resolveVerdict,
  resolvePayouts,
  resolveStandout,
  resolveUpset,
  walkoverPayout,
  type RawVerdict,
  type Participant,
  type Payouts,
  type Side,
} from "./verdict.logic.js";

const VERDICT_JUDGE_SYSTEM_PROMPT = `You are CRUX VERDICT JUDGE. A timed debate has closed. Read the statement, both sides' final analyses, and the scored comments, then deliver the closing ruling.

Return JSON: {"for":int,"against":int,"winner":"for"|"against"|"draw","mvp_username":string|null,"standout_username":string|null,"closing":string}

for / against — two integers summing to 100 (each 20-80). Judge only evidence quality, logical soundness, and how well each side answered the other — not your own opinion on the topic.
winner — the stronger side, or "draw" if genuinely level.
mvp_username — the single sharpest debater on ANY side, copied EXACTLY from a comment author's username below. Never invent a name; use null only if no comment deserves it.
standout_username — the single sharpest debater on the LOSING side, copied EXACTLY from a losing-side comment author's username. Different from the MVP. Use null on a draw, or if no losing-side voice stands out.
closing — ONE short editorial paragraph (max 60 words) naming the crux of the debate and why it resolved the way it did. This is the public verdict card text.`;

const MAX_COMMENTS = 40;

type ParticipantWithName = Participant & { username: string };

export async function concludeDebate(argumentId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const argRes = await client.query(
      `SELECT id, user_id, content, for_analysis, against_analysis, status, for_low, against_low
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
      payouts = walkoverPayout(authorId);
    } else {
      const usernameSet = new Set(participants.map((p) => p.username));
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

      const resolved = resolveVerdict(raw, usernameSet);
      winner = resolved.winner;
      margin = resolved.margin;
      affirmative = resolved.affirmative;
      negative = resolved.negative;
      verdictText = raw.closing?.trim() || "The debate has been ruled.";

      const mvp = resolved.mvpUsername
        ? participants.find((p) => p.username === resolved.mvpUsername)
        : undefined;
      mvpUserId = mvp ? mvp.userId : null;

      const standoutUserId = resolveStandout(
        raw.standout_username,
        resolved.winner,
        participants,
        mvpUserId,
      );

      payouts = resolvePayouts({
        winner: resolved.winner,
        participants,
        mvpUserId,
        standoutUserId,
        authorId,
      });
    }

    // Write debate_results rows.
    for (const r of payouts.results) {
      await client.query(
        `INSERT INTO debate_results (argument_id, user_id, side, outcome, is_mvp, is_standout)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (argument_id, user_id) DO NOTHING`,
        [argumentId, r.userId, r.side, r.outcome, r.isMvp, r.isStandout],
      );
    }
    // Apply logic awards.
    for (const a of payouts.logicAwards) {
      await client.query(
        `UPDATE users SET logic_score = logic_score + $2 WHERE id = $1`,
        [a.userId, a.amount],
      );
    }

    const isUpset = resolveUpset(winner, arg.for_low, arg.against_low);

    await client.query(
      `UPDATE arguments SET
         status = 'concluded',
         concluded_at = NOW(),
         winner = $2,
         margin = $3,
         mvp_user_id = $4,
         verdict_text = $5,
         affirmative = COALESCE($6, affirmative),
         negative = COALESCE($7, negative),
         is_upset = $8
       WHERE id = $1`,
      [argumentId, winner, margin, mvpUserId, verdictText, affirmative, negative, isUpset],
    );

    await client.query("COMMIT");
    console.log(`⚖️  concluded debate ${argumentId} → ${winner}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ failed to conclude debate ${argumentId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}
