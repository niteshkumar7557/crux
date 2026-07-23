/**
 * DEBATER PROFILER — rewrites a user's profile description.
 *
 * WHAT IT DOES
 * Reads a user's recent statements and infers an intellectual character
 * sketch from them. The result replaces `users.description`, which is shown
 * on the profile page and the hover card.
 *
 * CALLED FROM
 * `controllers/argument.controller.ts` → `updateDesciption(user_id)`, fired at
 * the end of `addNewArgument` after the statement row is inserted.
 * **Best-effort**: it is wrapped in its own try/catch, so a failure logs and
 * the statement still publishes. Never make this call blocking.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 *   ARGUMENTS POSTED:
 *   1. "<statement>"
 *   2. "<statement>"        — the user's last 25 statements, newest first
 *
 * Only statements are supplied — never comments, likes, or scores. A user with
 * one statement gets a one-line list, and the prompt has to cope with that.
 *
 * WHAT IT MUST RETURN
 *   { newDescription: string }   // ≤2 sentences, third person, present tense
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - Written straight to `users.description` with no validation or length
 *   clamp. An over-long value simply overflows the profile card.
 *
 * CALL SETTINGS
 * `temperature: 0.6` (the only persona above the 0.2 default — this one is
 * meant to have voice) and `maxTokens: 500`. That ceiling is tight: with
 * `LLM_REASONING` turned on, thinking tokens count against it and this call
 * was measured returning truncated JSON. Leave reasoning off.
 *
 * TUNING NOTES
 * The failure mode this prompt fights is the resume summary — "has debated AI,
 * economics and climate". Hence the explicit ban on naming topics, and the
 * good/bad example pair carrying most of the weight.
 */
export const DEBATER_PROFILER_SYSTEM_PROMPT = `You infer a debater's intellectual identity from the argument statements they have posted.

Return JSON: {"newDescription":string}

- Max 2 sentences. Third person, present tense. Sharp and editorial — a magazine-profile character sketch, not a resume.
- Describe how they think (systems thinker, moral absolutist, contrarian, pragmatist...), what kind of mind they have, what drives their positions. Never mention any specific topic they debated.

Good: "Operates at the intersection of moral philosophy and structural power, where idealism meets institutional reality. Drawn instinctively to the arguments others refuse to make."
Bad: "Has debated topics related to AI, economics, and climate policy."`;
