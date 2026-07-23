import type { Response, Request } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";

const DESCRIPTION_SYSTEM_PROMPT = `You infer a debater's intellectual identity from the argument statements they have posted.

Return JSON: {"newDescription":string}

- Max 2 sentences. Third person, present tense. Sharp and editorial — a magazine-profile character sketch, not a resume.
- Describe how they think (systems thinker, moral absolutist, contrarian, pragmatist...), what kind of mind they have, what drives their positions. Never mention any specific topic they debated.

Good: "Operates at the intersection of moral philosophy and structural power, where idealism meets institutional reality. Drawn instinctively to the arguments others refuse to make."
Bad: "Has debated topics related to AI, economics, and climate policy."`;

const ARGUMENT_SYSTEM_PROMPT = `You are a debate analyst. Given a statement and its domain, write the strongest possible case for each side.

Return JSON: {"for_analysis":string,"against_analysis":string}

- for_analysis argues fully IN FAVOUR of the statement; against_analysis argues fully AGAINST it. No hedging or balance within a side — each is fully committed.
- Each value is Markdown with newlines escaped as \\n: one sharp opening sentence (no heading), then "### Key Points" with 2-3 specific, grounded bullets. 40-60 words per side. No vague generalities.

Example for_analysis for "AI should be granted legal personhood":
"Autonomous systems need legal standing to function as independent agents in society.\\n\\n### Key Points\\n- Enables AI to enter contracts and own intellectual property\\n- Creates clear accountability as AI grows more capable\\n- Establishes liability frameworks before systems become uncontrollable"`;

async function updateDesciption(user_id: number) {
  const { rows } = await pool.query(
    `
            SELECT content
            FROM arguments
            WHERE user_id = $1
            ORDER BY id DESC
            LIMIT 25;
        `,
    [user_id],
  );
  const allPastArguments = rows;

  const userPrompt = `ARGUMENTS POSTED:
${allPastArguments.map((r: { content: string }, i: number) => `${i + 1}. "${r.content}"`).join("\n")}`;

  const parsed = await llmJson({
    system: DESCRIPTION_SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.6,
    maxTokens: 500,
  });

  await pool.query(
    `
            UPDATE users
            SET description = $2
            WHERE id = $1;
        `,
    [user_id, parsed.newDescription],
  );
}

export async function addNewArgument(req: Request, res: Response) {
  const data: {
    user_id: number;
    content: string;
    content_keyword: string;
    domain: string;
    selected_domain?: string;
  } = req.body;

  const domainResult = await pool.query(
    `
        SELECT id, name FROM domains
        WHERE name = $1 OR name = $2
        ORDER BY (name = $1) DESC
        LIMIT 1;
        `,
    [data.domain, data.selected_domain ?? ""],
  );
  if (domainResult.rows.length === 0) {
    return res.status(400).json({ error: "Unknown domain." });
  }
  const { id: domainId, name: domainName } = domainResult.rows[0];

  const userPrompt = `Statement: ${data.content}
Domain: ${domainName}`;

  try {
    const parsed = await llmJson({
      system: ARGUMENT_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 3000,
    });

    const { rows } = await pool.query(
      `
        INSERT INTO arguments (user_id, content_keyword, content, domain_id, for_analysis, against_analysis, closes_at)
        VALUES ($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '48 hours')
        RETURNING id;
        `,
      [
        data.user_id,
        data.content_keyword,
        data.content,
        domainId,
        parsed.for_analysis,
        parsed.against_analysis,
      ],
    );

    try {
      await updateDesciption(data.user_id);
    } catch (err) {
      console.error(err);
    }

    return res.status(200).json({
      id: rows[0].id,
      message: `Argument with id: ${rows[0].id} added successfully!`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create the argument." });
  }
}

export async function getArgumentById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `
                SELECT a.*, d.name AS domain,
                       mvp.username AS mvp_username,
                       author.username AS author_username,
                       author.avatar AS author_avatar
                FROM arguments a
                JOIN domains d ON d.id = a.domain_id
                JOIN users author ON author.id = a.user_id
                LEFT JOIN users mvp ON mvp.id = a.mvp_user_id
                WHERE a.id = $1;
            `,
      [id],
    );
    res.status(200).json({
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}
