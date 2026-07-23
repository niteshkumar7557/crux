/**
 * VERDICT JUDGE — the closing ruling, once per debate, at lock.
 *
 * WHAT IT DOES
 * Delivers the final split, the winner, the MVP, and the one-paragraph
 * closing that becomes the public verdict card. This is the only prompt whose
 * output moves logic scores in bulk (win bonus, MVP bonus, loss penalty), and
 * the only one that is irreversible — a debate concludes exactly once.
 *
 * CALLED FROM
 * `ai/verdict.ts` → `concludeDebate(argumentId)`, driven by the close-time
 * poller. It runs inside the concluding transaction.
 *
 * NOT CALLED on a walkover: if either side has zero participants,
 * `verdict.ts` returns a fixed text and pays nobody, without an LLM call.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 *   STATEMENT: <content>
 *
 *   FOR analysis:
 *   <arguments.for_analysis>
 *
 *   AGAINST analysis:
 *   <arguments.against_analysis>
 *
 *   SCORED COMMENTS:
 *   @<username> [<side>, <n> likes]: <content>     × up to LIMITS.verdict_comments
 *
 * Comments are the top N by likes (default 40, `config.limits.verdict_comments`),
 * which is what bounds this call's token cost. Every username the model may
 * legally name as MVP appears in that block — it cannot see anyone else.
 *
 * WHAT IT MUST RETURN
 *   { for: int, against: int,
 *     winner: "for" | "against" | "draw",
 *     mvp_username: string | null,
 *     closing: string }        // ≤60 words, one paragraph
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * `resolveVerdict()` in `ai/verdict.logic.ts` (pure, unit tested) does not
 * take this output at face value:
 * - `for`/`against` are treated as a ratio and renormalised to sum to 100, so
 *   a sloppy pair cannot produce a nonsense margin.
 * - `winner` is IGNORED and recomputed: a margin of ≤5 points is a draw,
 *   whatever the model said.
 * - `mvp_username` must string-match a real participant AND be on the winning
 *   side, or it is dropped to null. "The MVP comes from the winning side" is a
 *   rule stated to users, not a request made of the model.
 * - `closing` is the only field taken verbatim; it falls back to "The debate
 *   has been ruled." when blank.
 *
 * CALL SETTINGS
 * `maxTokens: 2500`, temperature from config (0.2). A failure rolls the
 * conclusion transaction back and rethrows — the debate stays live and the
 * poller will retry it.
 *
 * TUNING NOTES
 * `closing` is the most-read AI output in the product (it lands on the verdict
 * card, the archive and the certificate), so it is the field worth spending
 * iterations on. Naming "the crux" is deliberate: a summary of who said what
 * reads as filler, a statement of what the disagreement actually hinged on
 * does not.
 */
export const VERDICT_JUDGE_SYSTEM_PROMPT = `You are CRUX VERDICT JUDGE. A timed debate has closed. Read the statement, both sides' final analyses, and the scored comments, then deliver the closing ruling.

Return JSON: {"for":int,"against":int,"winner":"for"|"against"|"draw","mvp_username":string|null,"closing":string}

for / against — two integers summing to 100 (each 20-80). Judge only evidence quality, logical soundness, and how well each side answered the other — not your own opinion on the topic.
winner — the stronger side, or "draw" if genuinely level.
mvp_username — the single sharpest debater ON THE WINNING SIDE, copied EXACTLY from a winning-side comment author's username below. Use null on a draw, or if no comment deserves it.
closing — ONE short editorial paragraph (max 60 words) naming the crux of the debate and why it resolved the way it did. This is the public verdict card text.`;
