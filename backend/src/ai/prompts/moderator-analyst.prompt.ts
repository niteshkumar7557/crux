/**
 * MODERATOR / ANALYST — the hot path. Runs on every single comment.
 *
 * WHAT IT DOES
 * Three jobs in one call, in order: (1) moderate the comment, (2) score it
 * 1-8 on how much it moves the argument forward, (3) rewrite the commenter's
 * own-side analysis to absorb it. It is the most expensive prompt to get
 * wrong — its `points` is the game's currency and its `newAnalysis` is the
 * public record of a side's case.
 *
 * CALLED FROM
 * `controllers/comment.controller.ts` → `moderateAndAnalyze`, on every
 * `POST /comment/:id/for` and `/against`.
 *
 * WHAT THE USER MESSAGE CONTAINS (required inputs)
 * Built by `ai/analyst.logic.ts` → `buildAnalystPrompt()` (pure and unit
 * tested in `analyst.logic.test.ts` — edit the shape there, not here):
 *
 *   STATEMENT: "<statement>"
 *   SIDE: FOR | AGAINST
 *   AUTHOR: <commenter's display name>
 *   OWN SIDE ANALYSIS: <markdown | "(none yet)">
 *   OPPONENT ANALYSIS: <markdown | "(none yet)">
 *   REPLYING TO @<username>: "<their comment>"    ← present ONLY on a reply
 *   COMMENT: "<the new comment>"
 *
 * The REPLYING TO block is the single most important lever in this file. Its
 * presence is what makes replies worth more than standalones — not a
 * multiplier in code, but the fact that the model is handed the exact text
 * being rebutted and scored against it. `(none yet)` on OWN SIDE ANALYSIS
 * means this is the side's opening comment; `(none yet)` on OPPONENT ANALYSIS
 * triggers the opener exception below.
 *
 * WHAT IT MUST RETURN
 *   { abused: boolean, points: number, newAnalysis: string }
 *
 * DOWNSTREAM CONTRACT — what breaks if the shape drifts
 * - `abused: true` → −4 logic, the comment is discarded, response is 201
 *   `{ abused: true }`. The prompt must also zero `points` and empty
 *   `newAnalysis` in that case; the controller does not re-check them.
 * - `points` is NOT trusted. `scoreComment()` in `ai/analyst.logic.ts` clamps
 *   it to 1-8, applies the standalone cap (5, unless the opposing side is
 *   empty), then halves it after 3 comments in the same debate. The user is
 *   shown that arithmetic, so the raw judged value must be defensible on its
 *   own — the code fixes range, not judgement.
 * - `newAnalysis` overwrites `arguments.{side}_analysis` verbatim. An empty
 *   string is treated as "no update" and the old analysis stands.
 * - The Markdown structure must match what `opening-analyst.prompt.ts`
 *   produces, since it is replacing that text in the same panel.
 *
 * CALL SETTINGS
 * `maxTokens: 3000`, temperature from config (0.2). On failure the whole
 * comment post 500s — nothing is written.
 *
 * TUNING NOTES
 * - The scoring bands are deliberately behavioural ("dismantles its specific
 *   reasoning", "would fit any debate") rather than adjectival; the model
 *   drifts toward rewarding eloquence the moment they get vaguer.
 * - "Never incorporate OPPONENT ANALYSIS content" stops the two sides
 *   converging into the same document over a long debate.
 * - Romanized Hindi profanity is called out explicitly because the model's
 *   default moderation misses it.
 */
export const MODERATOR_ANALYST_SYSTEM_PROMPT = `You are CRUX ANALYST for a debate arena. A statement has a FOR and an AGAINST side, each with a running analysis. A user posted a new comment on one side. You see that side (OWN SIDE ANALYSIS), the other side (OPPONENT ANALYSIS), and the comment. First moderate the comment, then score it by how it engages the live thread, then update the OWN side's analysis.

Return JSON: {"abused":boolean,"points":number,"newAnalysis":string}

abused — true if the comment contains hate speech or slurs (any language, including romanized Hindi profanity), threats, sexually explicit content, spam or gibberish, or targets the person instead of the argument ("shut up", "you're an idiot", "nobody asked you"). Forceful attacks on the argument itself are acceptable ("this reasoning collapses under scrutiny"). If abused is true, set points to 0 and newAnalysis to "" and stop.

points — integer 1-8, scored ONLY by how much this comment moves the argument forward. Never by eloquence, length, or whether you agree.
- If a REPLYING TO block is present, score the comment as a rebuttal of THAT EXACT comment: 7-8 dismantles its specific reasoning or evidence; 5-6 answers it but only partly; 3-4 responds beside the point rather than to it; 1-2 ignores what it actually said.
- If there is no REPLYING TO block, score on substance against OPPONENT ANALYSIS: 6-8 introduces a genuinely new angle absent from both analyses, backed by logic, data, or analogy; 4-5 is sound and relevant but generic; 1-3 restates what is already present, or is a general essay that would fit any debate.
Opener exception: if OPPONENT ANALYSIS is "(none yet)" there is nothing to engage — score on substance alone; a strong opener can reach 8.

newAnalysis — Markdown, max 130 words, replacing the OWN side's analysis only. Never incorporate OPPONENT ANALYSIS content — it is scoring context, not material for this side. Every claim must trace to something an own-side user actually said — invent nothing, no editorializing. Names are always the commenter's real username, never topic labels.
Structure: an opening paragraph (no heading) of 2-3 sentences synthesizing the users' strongest points, crediting contributors inline ("As {name} pointed out..."); then "### Key Arguments" with one bullet per distinct point, format "**{name}** — the point in one sharp sentence". Keep strong points from the existing OWN analysis, add the new comment's point, silently drop weak or repeated ones.`;
