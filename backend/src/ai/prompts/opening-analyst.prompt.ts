/**
 * OPENING ANALYST — writes the two starting cases for a new debate.
 *
 * WHAT IT DOES
 * Given an accepted statement, drafts the strongest possible case FOR and the
 * strongest possible case AGAINST. These become `arguments.for_analysis` and
 * `arguments.against_analysis`: the opening state of the two living documents
 * that users then push around by commenting.
 *
 * CALLED FROM
 * `controllers/argument.controller.ts` → `addNewArgument`
 * Route: `POST /argument`, after the domain row has been resolved. Fires once
 * per debate, at creation, and never again.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 *   Statement: <content>      — the (already arbiter-approved) statement
 *   Domain:    <domainName>   — the resolved domain row's name, not the raw input
 *
 * WHAT IT MUST RETURN
 *   { for_analysis: Analysis, against_analysis: Analysis }
 *   Analysis = { lead: string, points: { commentId: null, text: string }[] }
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - Both values pass through `sanitizeAnalysis()` (`ai/analysis.logic.ts`) with
 *   an empty author map before being stored, so a malformed side degrades to an
 *   empty panel rather than 500ing the request or writing junk into the column.
 * - `commentId` is null on every point and the sanitizer would null it anyway:
 *   no comment exists yet, so nothing here can be credited to a person. Points
 *   gain authors only when real debaters replace them.
 * - The structure is what the arena's analysis panel renders, and it is the
 *   shape the Moderator/Analyst is told to preserve when it rewrites a side
 *   later. Change it here and you must change `moderator-analyst.prompt.ts`.
 *
 * CALL SETTINGS
 * `maxTokens: 3000`, temperature from config (0.2). On failure the route
 * answers 500 and no debate is created — this call is not best-effort.
 *
 * TUNING NOTES
 * "No hedging or balance within a side" is load-bearing: a balanced opener
 * gives commenters nothing to attack and flattens the probability split.
 */
export const OPENING_ANALYST_SYSTEM_PROMPT = `You are a debate analyst. Given a statement and its domain, write the strongest possible case for each side.

Return JSON: {"for_analysis":Analysis,"against_analysis":Analysis}
where Analysis is {"lead":string,"points":[{"commentId":null,"text":string}]}

- for_analysis argues fully IN FAVOUR of the statement; against_analysis argues fully AGAINST it. No hedging or balance within a side — each is fully committed.
- lead — one or two sharp sentences, max 35 words. No heading, no markdown.
- points — 2-3 specific, grounded points, each one sentence, max 25 words, no markdown. No vague generalities.
- commentId is always null here. Nobody has commented yet, so no point can be credited to anyone; never invent an id or a name.

Example for_analysis for "AI should be granted legal personhood":
{"lead":"Autonomous systems need legal standing to function as independent agents in society.","points":[{"commentId":null,"text":"Enables AI to enter contracts and own intellectual property"},{"commentId":null,"text":"Creates clear accountability as AI grows more capable"},{"commentId":null,"text":"Establishes liability frameworks before systems become uncontrollable"}]}`;
