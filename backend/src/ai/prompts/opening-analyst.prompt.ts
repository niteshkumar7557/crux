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
 *   { for_analysis: string, against_analysis: string }   // Markdown, 40-60 words each
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - Both values go straight into the INSERT with no validation, so a missing
 *   key writes `undefined` into a NOT NULL column and the whole request 500s.
 * - The Markdown shape (one lead sentence, then `### Key Points` bullets) is
 *   what the arena's analysis panel is styled for, and it is the shape the
 *   Moderator/Analyst is told to preserve when it rewrites a side later. Change
 *   the structure here and you must change `moderator-analyst.prompt.ts` too.
 * - Newlines must be escaped as `\\n` in the JSON string values — the example
 *   in the prompt is doing that work, not decoration.
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

Return JSON: {"for_analysis":string,"against_analysis":string}

- for_analysis argues fully IN FAVOUR of the statement; against_analysis argues fully AGAINST it. No hedging or balance within a side — each is fully committed.
- Each value is Markdown with newlines escaped as \\n: one sharp opening sentence (no heading), then "### Key Points" with 2-3 specific, grounded bullets. 40-60 words per side. No vague generalities.

Example for_analysis for "AI should be granted legal personhood":
"Autonomous systems need legal standing to function as independent agents in society.\\n\\n### Key Points\\n- Enables AI to enter contracts and own intellectual property\\n- Creates clear accountability as AI grows more capable\\n- Establishes liability frameworks before systems become uncontrollable"`;
