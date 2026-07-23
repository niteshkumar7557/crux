import type { Response, Request } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import { DEBATER_PROFILER_SYSTEM_PROMPT } from "../ai/prompts/debater-profiler.prompt.js";
import { OPENING_ANALYST_SYSTEM_PROMPT } from "../ai/prompts/opening-analyst.prompt.js";

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
    system: DEBATER_PROFILER_SYSTEM_PROMPT,
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
      system: OPENING_ANALYST_SYSTEM_PROMPT,
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
