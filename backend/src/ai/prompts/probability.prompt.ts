/**
 * PROBABILITY JUDGE — the live win split shown on the debate bar.
 *
 * WHAT IT DOES
 * Reads the statement and both running analyses and says who is currently
 * ahead, as two percentages. It judges the *analyses*, not the comments —
 * which means it inherits whatever the Moderator/Analyst wrote, and a bad
 * analysis rewrite shows up here as a swing nobody can explain.
 *
 * CALLED FROM
 * `controllers/comment.controller.ts` → `updateProbability(argumentId)`,
 * after a comment is stored — but only once BOTH sides have at least one
 * comment. A one-sided debate keeps whatever split it was created with.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 *   STATEMENT: <content>
 *
 *   FOR analysis: <arguments.for_analysis>
 *   AGAINST analysis: <arguments.against_analysis>
 *
 * No comments, no scores, no like counts — by design. Adding them here would
 * double-count the Moderator/Analyst's judgement.
 *
 * WHAT IT MUST RETURN
 *   { affirmative: int, negative: int }   // sum to exactly 100, each 20-80
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - Only `affirmative` is read: it is rounded and `negative` is recomputed as
 *   `100 - affirmative`, so the model's `negative` is discarded. It is still
 *   asked for because forcing the model to state both is what keeps the pair
 *   coherent.
 * - There is no clamp in code. A returned 95 becomes a 95/5 bar. The 20-80
 *   floor lives only in this prompt.
 * - Both values are written to `arguments.affirmative` / `.negative`, the same
 *   columns the Verdict Judge's final ruling later overwrites.
 *
 * CALL SETTINGS
 * `maxTokens: 2000`, temperature from config (0.2). A failure here throws
 * inside the comment handler's try/catch → the comment post answers 500,
 * although the comment row and its logic award are already committed.
 *
 * TUNING NOTES
 * The 20-80 band exists to keep an early lead from reading as a rout; the
 * "not your own opinion" clause is what stops the model siding with the
 * conventional position on political statements.
 */
export const PROBABILITY_SYSTEM_PROMPT = `You judge which side of a debate currently holds the stronger position, given the statement and each side's analysis.

Return JSON: {"affirmative":int,"negative":int} — two integers summing to exactly 100, each between 20 and 80. Judge only evidence quality, logical soundness, and specificity of the analyses — not your own opinion. Balanced = 50/50; clearly dominant = 65/35 or beyond.`;
