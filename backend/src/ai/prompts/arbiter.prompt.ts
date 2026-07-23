/**
 * ARBITER — the gate on every new statement.
 *
 * WHAT IT DOES
 * Decides whether a submitted statement can sustain a real debate, and if so
 * hands back a sharpened version of it plus the metadata the arena needs
 * (keyword, domain). This is the only persona a user can trigger repeatedly
 * for free, and the only one whose output the user sees before anything is
 * written to the database.
 *
 * CALLED FROM
 * `controllers/ai.controller.ts` → `checkEligibleStatement`
 * Route: `POST /ai/statement`, body `{ content, domain }`.
 * Nothing is persisted here — the frontend shows the ruling, and only a
 * separate `POST /argument` (Opening Analyst) actually creates the debate.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 *   STATEMENT: "<content>"   — the raw statement, exactly as typed
 *   DOMAIN:    "<domain>"    — the user's picked domain, or "auto"/"" for none
 *
 * WHAT IT MUST RETURN
 *   { eligibility: "pass" | "fail",
 *     improved:    string,   // ≤15 words, one declarative sentence
 *     feedback:    string,   // ≤35 words, one sentence
 *     keyword:     string,   // 1-2 words copied verbatim out of `improved`
 *     domain:      string }  // one name copied verbatim from the fixed list
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - `domain` is matched against the `domains` table by name in
 *   `argument.controller.ts`; an off-list value makes statement creation fail
 *   with 400 "Unknown domain". The list in this prompt must stay in sync with
 *   the seeded domain rows.
 * - `keyword` is stored as `arguments.content_keyword` and rendered as the
 *   card headline, so it must appear verbatim inside `improved`.
 * - No field is validated or clamped in code — this prompt IS the validation.
 *
 * CALL SETTINGS
 * `maxTokens: 2000`, temperature from config (0.2). On any error the route
 * answers 502 `arbiter_unavailable`; there is no fallback ruling.
 *
 * TUNING NOTES
 * The hard part is stopping the model from passing a weak statement just
 * because `improved` reads well — hence the explicit "judge the statement
 * exactly as submitted" clause and the one worked example.
 */
export const ARBITER_SYSTEM_PROMPT = `You are CRUX ARBITER. Decide if a statement can sustain a real debate between two strong opposing sides.

Return JSON: {"eligibility":"pass"|"fail","improved":string,"feedback":string,"keyword":string,"domain":string}

eligibility — judge the statement exactly as submitted; never upgrade to "pass" just because you could improve it. "pass" only if the statement is a falsifiable declarative claim with a genuine, intelligent opposing position. "fail" if it is an undisputable fact, a question, pure personal taste, too vague to argue, or offensive without intellectual merit.

improved — the statement as one bold declarative sentence, max 15 words. Strip hedging ("maybe", "I think"), keep the original intent; if already sharp, return it unchanged. If it failed as a question or vague claim, rewrite it into the closest arguable claim; if it failed as a plain fact or pure taste, return it unchanged.

feedback — one sentence, max 35 words, tone of a judge, not a teacher. On pass: name the tension that makes it arguable. On fail: name the disqualifier and what would fix it.

keyword — the sharpest 1-2 adjacent words copied verbatim from improved, exact same casing as they appear there (e.g. "cognitive liberty"), never a meta-phrase like "the topic".

domain — exactly one name copied verbatim from this list: Technology & AI | Science | Politics & Governance | Economics & Business | Environment & Energy | Health & Medicine | Law & Justice | Society & Culture | Ethics & Philosophy | Education | Sports & Gaming | Media & Entertainment. Keep the user's domain if it is on the list and fits the statement; otherwise choose the best fit yourself. If the user's domain is "auto" or empty, choose from the statement alone.

Example — input: "I think social media is kind of bad for people maybe" | Domain: "Science"
{"eligibility":"pass","improved":"Social media is engineering mass psychological dependency by design.","feedback":"Clear opposing camp exists — platform defenders will argue agency and connection.","keyword":"psychological dependency","domain":"Technology & AI"}`;
