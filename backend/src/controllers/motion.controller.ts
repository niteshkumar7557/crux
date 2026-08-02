// Create a motion, and read one back. Creating runs the Opening Brief, starts the
// 48h clock, and fires the Debater Profiler best-effort.
// Spec: game-theory.md §3, §4, §16, §17

import type { Response, Request } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import { DEBATER_PROFILER_SYSTEM_PROMPT } from "../ai/prompts/debater-profiler.prompt.js";
import { OPENING_BRIEF_SYSTEM_PROMPT } from "../ai/prompts/opening-brief.prompt.js";
import { checkText } from "../lib/validate.js";
import { readAnalysis, sanitizeAnalysis, writeAnalysis } from "../ai/analysis.logic.js";
import { normaliseArgument } from "../lib/duplicate.logic.js";

async function updateDesciption(user_id: number) {
  const { rows } = await pool.query(
    `
            SELECT content
            FROM motions
            WHERE user_id = $1
            ORDER BY id DESC
            LIMIT 25;
        `,
    [user_id],
  );
  const allPastMotions = rows;

  const userPrompt = `ARGUMENTS POSTED:
${allPastMotions.map((r: { content: string }, i: number) => `${i + 1}. "${r.content}"`).join("\n")}`;

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

export async function addNewMotion(req: Request, res: Response) {
  const userId = req.user!.id;
  const data: {
    content: string;
    content_keyword: string;
    domain: string;
    selected_domain?: string;
  } = req.body;

  const content = checkText(req.body?.content, { field: "content", max: 1000 });
  if (!content.ok) return res.status(400).json({ error: content.reason });
  const keyword = checkText(req.body?.content_keyword, {
    field: "content_keyword",
    max: 200,
  });
  if (!keyword.ok) return res.status(400).json({ error: keyword.reason });
  const domainIn = checkText(req.body?.domain, { field: "domain", max: 100 });
  if (!domainIn.ok) return res.status(400).json({ error: domainIn.reason });

  // §3: refused before ANY model is called (Opening Brief below), so a
  // verbatim repost costs the attacker a round trip and us no tokens. The
  // pre-check here handles the common case with a good error message; the
  // unique index (caught below on insert) is the race-safe backstop for two
  // simultaneous submissions of the identical motion.
  const normalisedContent = normaliseArgument(content.value);
  const existingDupe = await pool.query(
    `SELECT id, status FROM motions WHERE normalised_content = $1`,
    [normalisedContent],
  );
  if (existingDupe.rows.length > 0) {
    return res.status(409).json({
      reason: "duplicate_motion",
      motionId: existingDupe.rows[0].id,
      status: existingDupe.rows[0].status,
    });
  }

  const domainResult = await pool.query(
    `
        SELECT id, name FROM domains
        WHERE name = $1 OR name = $2
        ORDER BY (name = $1) DESC
        LIMIT 1;
        `,
    [domainIn.value, data.selected_domain ?? ""],
  );
  if (domainResult.rows.length === 0) {
    return res.status(400).json({ error: "Unknown domain." });
  }
  const { id: domainId, name: domainName } = domainResult.rows[0];

  const userPrompt = `Motion: ${content.value}
Domain: ${domainName}`;

  try {
    const parsed = await llmJson({
      system: OPENING_BRIEF_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 3000,
    });

    let insertRes;
    try {
      insertRes = await pool.query(
        `
        INSERT INTO motions (user_id, content_keyword, content, domain_id, for_analysis, against_analysis, closes_at, normalised_content)
        VALUES ($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '48 hours', $7)
        RETURNING id;
        `,
        [
          userId,
          keyword.value,
          content.value,
          domainId,
          // §17: a brief is a lead with NO points. Nobody has argued, so there is
          // nothing to credit — and an empty points array is what keeps the panel
          // honest until a real argument fills it.
          writeAnalysis(
            sanitizeAnalysis({ lead: parsed.for_opening, points: [] }, new Map()),
          ),
          writeAnalysis(
            sanitizeAnalysis({ lead: parsed.against_opening, points: [] }, new Map()),
          ),
          normalisedContent,
        ],
      );
    } catch (err: any) {
      // Race backstop: two simultaneous submissions of the identical motion
      // both pass the pre-check above and both attempt to insert — only one
      // can win the unique index. Check the constraint name specifically so
      // an unrelated unique violation is never misreported as a duplicate.
      if (err?.code === "23505" && err?.constraint === "idx_motions_normalised_content") {
        const conflict = await pool.query(
          `SELECT id, status FROM motions WHERE normalised_content = $1`,
          [normalisedContent],
        );
        return res.status(409).json({
          reason: "duplicate_motion",
          motionId: conflict.rows[0]?.id ?? null,
          status: conflict.rows[0]?.status ?? "live",
        });
      }
      throw err;
    }
    const rows = insertRes.rows;

    res.status(200).json({
      id: rows[0].id,
      message: `Motion with id: ${rows[0].id} added successfully!`,
    });

    // Best-effort, and deliberately AFTER the response: the profiler is a SECOND
    // LLM call, and nothing the author is waiting for depends on their bio being
    // rewritten. Awaiting it here is what used to let a motion commit and then
    // spend up to a minute more rewriting a bio, while the composer — which
    // gives up at 75s — told the author the broadcast had failed.
    // Same shape as the §20 notification triggers in argument.controller.ts.
    void updateDesciption(userId).catch((err) => console.error(err));
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create the motion." });
  }
}

export async function getMotionById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `
                SELECT a.*, d.name AS domain,
                       mvp.username AS mvp_username,
                       author.username AS author_username,
                       author.avatar AS author_avatar
                FROM motions a
                JOIN domains d ON d.id = a.domain_id
                JOIN users author ON author.id = a.user_id
                LEFT JOIN users mvp ON mvp.id = a.mvp_user_id
                WHERE a.id = $1;
            `,
      [id],
    );
    // The analyses leave here already parsed. Both the arena panel and the
    // certificate read this one endpoint, so there is no second reader on the
    // frontend to drift — and legacy rows are handled in exactly one place.
    const row = rows[0];
    res.status(200).json({
      data: row && {
        ...row,
        for_analysis: readAnalysis(row.for_analysis),
        against_analysis: readAnalysis(row.against_analysis),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}
