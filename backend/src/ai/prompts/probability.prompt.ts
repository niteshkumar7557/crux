/**
 * PROBABILITY JUDGE — the live win split shown on the debate bar.
 *
 * WHAT IT DOES
 * Says who is currently WINNING THE ARGUMENT, as two percentages. It is a
 * debate scoreboard, not a truth oracle — never "which side is right in
 * reality". It is *stateful*: rather than re-deriving the split cold on every
 * comment (which made the bar swing for no visible reason), it starts from the
 * PRIOR SPLIT and nudges it by however much the comment that just landed
 * actually changed the balance.
 *
 * CALLED FROM
 * `controllers/comment.controller.ts` → `updateProbability(argumentId)`,
 * after a comment is stored — but only once BOTH sides have at least one
 * comment. A one-sided debate keeps the 50/50 it was created with.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 * Built by `ai/analyst.logic.ts` → `buildProbabilityPrompt()` (pure, unit
 * tested):
 *
 *   STATEMENT: "<content>"
 *   PRIOR SPLIT: FOR <affirmative> / AGAINST <negative>
 *   LATEST COMMENT — @<user> [<SIDE>]: "<content>"
 *
 *   FOR analysis: <arguments.for_analysis>
 *   AGAINST analysis: <arguments.against_analysis>
 *
 * The analyses are the running STATE of each case; the latest comment is the
 * DELTA the nudge reacts to; the prior split is the anchor it moves from. The
 * comment is NOT re-scored here (the Moderator/Analyst already did that) — it
 * only tells the judge what just changed, so the same argument moving the bar
 * is not double-counted as new points.
 *
 * WHAT IT MUST RETURN
 *   { latest_effect: string,   // decode-first: what the comment changed
 *     affirmative:   int,      // 20-80
 *     negative:      int }     // 20-80, sums to 100
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - `latest_effect` is NOT read by code. It is the decode-first field that
 *   forces the model to name the delta before it moves the number.
 * - Only `affirmative` is read: it is rounded and `negative` is recomputed as
 *   `100 - affirmative`, so the model's `negative` is discarded. It is still
 *   asked for because forcing the model to state both is what keeps the pair
 *   coherent.
 * - There is no clamp in code. A returned 95 becomes a 95/5 bar. The 20-80
 *   floor and the ≤12-per-update move cap live only in this prompt.
 * - Both values are written to `arguments.affirmative` / `.negative`, the same
 *   columns the Verdict Judge's final ruling later overwrites.
 *
 * CALL SETTINGS
 * `maxTokens: 2000`, temperature from config (0.2). A failure here throws
 * inside the comment handler's try/catch → the comment post answers 500,
 * although the comment row and its logic award are already committed.
 *
 * TUNING NOTES
 * The move caps (nothing → 0, a solid point → 3-8, a decisive unanswered hit →
 * up to 12) are what turn the bar from a jittery re-roll into a legible
 * prediction market — §14 promises users can watch a debate drift toward the
 * draw band, and that only reads as real if the bar moves when an argument
 * lands and holds still when nothing does. The "not the popular position"
 * clause is what stops the model siding with the conventional view on
 * political or moral statements.
 */
export const PROBABILITY_SYSTEM_PROMPT = `You judge which side is currently WINNING THE ARGUMENT — not which side is right in reality — and express it as a live split. You are updating an existing number, not starting over.

You are given the statement, the current split (PRIOR SPLIT), the comment that just landed (LATEST COMMENT), and both sides' running analyses.

Return JSON in this exact order: {"latest_effect":string,"affirmative":int,"negative":int}

latest_effect — one short phrase for what the latest comment actually changed: e.g. "landed a specific rebuttal on the FOR case", "added an unanswered point for AGAINST", or "nothing new, restates existing points".

affirmative / negative — two integers summing to exactly 100, each between 20 and 80. Start from the PRIOR SPLIT and MOVE it according to latest_effect, judging only evidence quality, logical soundness and how well each side answers the other in the analyses — never your own opinion, never the popular or conventional position.
- Nothing new landed → keep the prior split unchanged.
- A solid point or partial rebuttal → move 3-8 points toward that side.
- A decisive, specific, well-supported hit the other side has not answered → move up to 12.
Never move more than 12 points in a single update. A balanced case sits near 50/50; a genuinely dominant case reaches 65/35 or beyond, up to the 20/80 edge.`;
