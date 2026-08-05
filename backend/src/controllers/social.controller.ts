// Draft the marketing words for one motion's post set.
// Authorisation is the router's job (authMiddleware + requireRole).

import type { Request, Response } from "express";
import pool from "../db/index.js";
import logger from "../lib/logger.js";
import { llmJson } from "../ai/llm.js";
import { readAnalysis } from "../ai/analysis.logic.js";
import { SOCIAL_COPY_SYSTEM_PROMPT } from "../ai/prompts/social-copy.prompt.js";
import { sanitizeDraft } from "../ai/socialCopy.logic.js";

function parseId(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// for_analysis/against_analysis are TEXT columns, so they arrive as JSON strings
// (or legacy Markdown). readAnalysis owns every one of those shapes.
function pointTexts(analysis: unknown): string[] {
  return readAnalysis(analysis)
    .points.map((p) => p.text)
    .filter((t) => t.length > 0)
    .slice(0, 3);
}

export async function draftSocialCopy(req: Request, res: Response) {
  const id = parseId((req.body as { motionId?: unknown })?.motionId);
  if (id === null) return res.status(400).json({ error: "invalid motion id" });

  const host =
    typeof (req.body as { host?: unknown })?.host === "string"
      ? (req.body as { host: string }).host
      : "cruxdebate.site";

  try {
    const { rows } = await pool.query(
      `SELECT content, content_keyword, status, winner, margin,
              verdict_text, affirmative, negative, for_analysis, against_analysis
         FROM motions WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "debate not found" });

    const user = JSON.stringify({
      motion: row.content,
      status: row.status,
      winner: row.winner,
      split: { for: row.affirmative, against: row.negative },
      margin: row.margin,
      verdict: row.verdict_text,
      forPoints: pointTexts(row.for_analysis),
      againstPoints: pointTexts(row.against_analysis),
      domain: host,
    });

    // Admin-triggered and off every user path, so it is outside the 100-second
    // budget the five judging personas share.
    const raw = await llmJson({
      system: SOCIAL_COPY_SYSTEM_PROMPT,
      user,
      temperature: 0.8,
      maxTokens: 1400,
    });

    return res.status(200).json({ data: sanitizeDraft(raw, String(row.content), host) });
  } catch (err) {
    logger.warn({ err: String(err), motionId: id }, "social copy draft failed");
    // The console falls back to its own defaults, so a dead model costs the
    // admin a nicer hook and nothing else.
    return res.status(503).json({ error: "could not draft copy" });
  }
}
