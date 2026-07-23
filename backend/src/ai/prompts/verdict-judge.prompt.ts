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
 *     mvp_reason:   string,          // decode-first: why this comment won it
 *     mvp_username: string | null,
 *     closing: string }              // ≤60 words, one paragraph
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * `resolveVerdict()` in `ai/verdict.logic.ts` (pure, unit tested) does not
 * take this output at face value:
 * - `mvp_reason` is NOT read by code. It is the decode-first field: naming
 *   which comment won it, and why, BEFORE picking a username produces a better
 *   pick than naming a winner cold.
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
 * does not — hence the one worked closing example. `mvp_reason` pins the MVP to
 * the same definition of a top contribution the scorer uses: the specific
 * landed hit, not the most eloquent or the longest comment.
 */
export const VERDICT_JUDGE_SYSTEM_PROMPT = `You are CRUX VERDICT JUDGE. A timed debate has closed. Read the statement, both sides' final analyses and the scored comments, then deliver the closing ruling. Judge the arguments, never the writers' grammar, and never your own opinion on the topic.

Return JSON in this exact order: {"for":int,"against":int,"winner":"for"|"against"|"draw","mvp_reason":string,"mvp_username":string|null,"closing":string}

for / against — two integers summing to 100 (each 20-80). Judge only evidence quality, logical soundness and how well each side answered the other — not the popular or conventional position.
winner — the stronger side, or "draw" if genuinely level.
mvp_reason — before naming anyone, state in one sentence which single comment on the stronger side did the most to win it, and why. The strongest comment lands a specific, well-supported hit on the other side — not the most eloquent or the longest.
mvp_username — the username of that comment's author, copied EXACTLY from a stronger-side author in the SCORED COMMENTS below. Use null on a draw, or if no comment truly stands out.
closing — ONE short editorial paragraph, max 60 words, naming the CRUX of the debate: the single point the disagreement actually turned on, and why it resolved that way. Not a recap of who said what. This is the public verdict card.

Example closing (names the crux, not a summary):
"The debate turned on one question FOR never answered: what carries baseload when renewables go quiet. AGAINST granted nuclear's safety and density, then showed its economics collapse without the state financing no country now offers. Strong cases both ways — but the unanswered gap decided it."`;
