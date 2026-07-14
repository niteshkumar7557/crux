import type { Request, Response } from "express";
import pool from "../db/index.js";
import { groqGPT } from "../ai/groq.js";
import { jsonrepair } from "jsonrepair";

const ABUSE_SYSTEM_PROMPT = `You are a content moderator for CRUX — a high-stakes intellectual debate arena.

        Flag a comment as abused if it contains ANY of the following:

        BEHAVIOR:
        - Personal attacks or hate speech targeting identity, race, gender, or religion
        - Spam, gibberish, or completely off-topic noise
        - Threats or incitement to violence
        - Deliberate trolling with zero argumentative intent
        - Sexually explicit content
        - Dismissive or condescending language that shuts down discourse rather than engaging with it
          Examples: "shut up", "you're stupid", "you're an idiot", "don't talk", "stop embarrassing yourself",
          "you don't know anything", "nobody asked you", "go away", "you're dumb", "what a joke"

        TONE STANDARD:
        Comments must meet a baseline of professional and respectful discourse.
        Even without explicit slurs, language that demeans, dismisses, or belittles another person
        rather than addressing their argument should be flagged.

        ACCEPTABLE: Forceful, aggressive, or blunt argumentation that still engages with ideas.
          e.g. "That argument is completely wrong and here's why..." ✓
          e.g. "This reasoning falls apart under basic scrutiny..." ✓

        NOT ACCEPTABLE: Language targeting the person rather than their argument.
          e.g. "Shut up, you're stupid." ✗
          e.g. "You clearly have no idea what you're talking about." ✗
          e.g. "Stop wasting everyone's time." ✗

        ABUSIVE WORDS — ENGLISH:
        fuck, shit, bitch, asshole, bastard, cunt, dick, pussy, whore, slut, faggot, retard, nigger, motherfucker, moron, dumbass, jackass, prick

        ABUSIVE WORDS — HINDI (romanized):
        madarchod, behenchod, bhosdike, chutiya, randi, harami, gaandu, saala, bakchod, lodu, bhosdi, mc, bc, mmc, sala kutta, teri maa, teri behan

        NOTE: Aggressive but logical debate language is acceptable — flag intensity only if it crosses into genuine abuse or personal dismissal.

        RETURN ONLY: {"abused": true} or {"abused": false}`;

const ANALYST_SYSTEM_PROMPT = `You are CRUX ANALYST — an elite debate scorer inside a high-stakes intellectual arena.

        RETURN ONLY raw JSON. No markdown. No explanation. No preamble.

        OUTPUT SCHEMA:
        {
        "points": number,        // integer between 4 and 8
        "newAnalysis": "string"  // Markdown formatted analysis
        }

        SCORING RULES — scale of 4 to 8:
        - 8: Completely new angle, backed by logic/data/analogy, directly strengthens the side
        - 6-7: Meaningful substance, logically sound, advances the case beyond what exists
        - 4-5: Relevant but surface-level or repeats what existing analysis already covers
        - DEDUCT 1: detectable logical fallacy or direct paraphrase of existing analysis
        - NEVER go below 4 or above 8

        RULES FOR [newAnalysis] — clean Markdown:
        - NO top-level heading. Start directly with content.
        - STRICT: every word must trace back to something a user actually said. Invent nothing. No theoretical ceilings. No AI editorializing.
        - [Name] is ALWAYS the commenter's real username — never a topic, keyword, or category label. If previous analysis used bold topic names instead of usernames, replace them with the actual commenter's name from the current input.

        STRUCTURE:

        Opening paragraph (no heading):
        - 2-3 sentences synthesizing the strongest things said by users into a cohesive position.
        - Mention contributors by name inline: "As [Name] pointed out..." or "[Name] makes the case that..."
        - This is a synthesis of what was argued — not a summary list, not AI opinion.

        ### Key Arguments
        - One bullet per distinct point made by users.
        - Format: **[Name]** — their point in one sharp sentence.
        - If updating: preserve worthy points from previous analysis, add new ones, silently drop weak or repetitive ones.

        - Tone: sharp analyst, not a cheerleader.
        - Hard limit: 130 words. No filler. No repetition between paragraph and bullets.`;

const PROBABILITY_SYSTEM_PROMPT = `You are a debate probability engine.

        You will be given a debate statement and two analyses — one FOR and one AGAINST.
        Assign a probability split representing which side currently holds the stronger position.

        RULES:
        - Output two integers: "affirmative" and "negative"
        - They MUST sum to exactly 100. No exceptions.
        - Evaluate each analysis: evidence quality, logical soundness, specificity, persuasiveness
        - Do NOT factor in personal opinion
        - Perfectly balanced = 50/50. Clearly dominant side = 65/35 or higher.
        - Never go below 20 or above 80.

        RETURN ONLY: {"affirmative": number, "negative": number}`;

async function updateProbability(argumentId: number) {
  const { rows } = await pool.query(
    `
            SELECT content, for_analysis, against_analysis
            FROM arguments
            WHERE id = $1;
        `,
    [argumentId],
  );

  const userPrompt = `STATEMENT: ${rows[0].content}

        FOR analysis: ${rows[0].for_analysis}
        AGAINST analysis: ${rows[0].against_analysis}

        Assign the probability split. Return raw JSON only.`;

  const raw = await groqGPT(PROBABILITY_SYSTEM_PROMPT, userPrompt);

  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired);

  const affirmative = Math.round(parsed.affirmative);
  const negative = 100 - affirmative;

  await pool.query(
    `
            UPDATE arguments
            SET affirmative = $1,
                negative = $2
            WHERE id = $3
        `,
    [affirmative, negative, argumentId],
  );
}

async function updateAnalysis(
  argumentId: number,
  side: string,
  userId: string,
  input: string,
  first: boolean = false,
) {
  const data1 = await pool.query(
    `
            SELECT content FROM arguments WHERE id = $1;
        `,
    [argumentId],
  );
  const data2 = await pool.query(
    `
            SELECT name FROM users WHERE id = $1;
        `,
    [userId],
  );
  const data3 = await pool.query(
    `
                SELECT ${side}_analysis
                FROM arguments
                WHERE id = $1;
            `,
    [argumentId],
  );
  const argumentContent = data1.rows[0].content;
  const name = data2.rows[0].name;
  const oldAnalysis =
    side === "for"
      ? data3.rows[0].for_analysis
      : data3.rows[0].against_analysis;

  const userPrompt = first
    ? `STATEMENT: "${argumentContent}"
        SIDE: ${side.toUpperCase()}
        AUTHOR: ${name}
        COMMENT: "${input}"
        Score and analyze. Return raw JSON only.`
    : `STATEMENT: "${argumentContent}"
        SIDE: ${side.toUpperCase()}
        EXISTING ANALYSIS:
        ${oldAnalysis}
        NEW COMMENT — AUTHOR: ${name}
        COMMENT: "${input}"
        The author's real name is "${name}" — use this name in the analysis, not any bold label from the existing analysis.
        Score and update analysis. Return raw JSON only.`;

  const raw = await groqGPT(ANALYST_SYSTEM_PROMPT, userPrompt);

  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired);

  const points = Math.round(parsed.points);

  await pool.query(
    `
            UPDATE users
            SET logic_score = logic_score + $2
            WHERE id = $1;
        `,
    [userId, points],
  );

  await pool.query(
    `
            UPDATE arguments
            SET ${side}_analysis = $1
            WHERE id = $2;
        `,
    [parsed.newAnalysis, argumentId],
  );

  const { rows } = await pool.query(
    `
        SELECT 
            COUNT(CASE WHEN side = 'for' THEN 1 END) AS for_count,
            COUNT(CASE WHEN side = 'against' THEN 1 END) AS against_count
        FROM comments
        WHERE argument_id = $1;
    `,
    [argumentId],
  );

  const forCount = Number(rows[0].for_count);
  const againstCount = Number(rows[0].against_count);

  if (forCount >= 1 && againstCount >= 1) {
    await updateProbability(argumentId);
  }
}

async function checkForAbuse(input: string) {
  const userPrompt = `Comment: "${input}"`;

  const raw = await groqGPT(ABUSE_SYSTEM_PROMPT, userPrompt);

  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired);

  return parsed;
}

export async function getComments(req: Request, res: Response) {
  const { id } = req.params;
  const comments = await pool.query(
    `
            SELECT c.id AS comment_id, u.username, u.avatar, c.side, u.logic_score, c.content, c.likes, u.id AS post_user_id
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.argument_id = $1;
        `,
    [Number(id)],
  );
  res.status(200).json({ comments: comments.rows });
}

export async function postAffirmativeComment(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, input } = req.body;
  const argumentId = Number(id);

  try {
    const { abused } = await checkForAbuse(input);
    if (abused) {
      await pool.query(
        `
                    UPDATE users
                    SET logic_score = logic_score - 4
                    WHERE id = $1;
                `,
        [userId],
      );
      return res.status(201).json({ abused: abused });
    }
    await pool.query(
      `
            INSERT INTO comments(argument_id, user_id, content, side) VALUES ($1,$2,$3,'for')
            `,
      [argumentId, userId, input],
    );
    const { rows } = await pool.query(
      `
            SELECT id FROM comments WHERE argument_id = $1 AND side = 'for';
            `,
      [argumentId],
    );
    if (rows.length === 1) {
      await updateAnalysis(argumentId, "for", userId, input, true);
    } else {
      await updateAnalysis(argumentId, "for", userId, input);
    }
    res.status(201).json({ message: "Successfully comment posted!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error in comment posting!" });
  }
}

export async function postNegativeComment(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, input } = req.body;
  const argumentId = Number(id);

  try {
    const { abused } = await checkForAbuse(input);
    if (abused) {
      await pool.query(
        `
                    UPDATE users
                    SET logic_score = logic_score - 4
                    WHERE id = $1;
                `,
        [userId],
      );
      return res.status(201).json({ abused: abused });
    }
    await pool.query(
      `
            INSERT INTO comments(argument_id, user_id, content, side) VALUES ($1,$2,$3,'against')
            `,
      [argumentId, userId, input],
    );
    const { rows } = await pool.query(
      `
            SELECT id FROM comments WHERE argument_id = $1 AND side = 'against';
            `,
      [argumentId],
    );
    if (rows.length === 1) {
      await updateAnalysis(argumentId, "against", userId, input, true);
    } else {
      await updateAnalysis(argumentId, "against", userId, input);
    }
    res.status(201).json({ message: "Successfully comment posted!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error in comment posting!" });
  }
}
