import { truncate } from "./verdictCard";
import type { Analysis } from "@/app/argument/types";

// The certificate is drawn by satori, which renders a React tree and lays out
// plain strings — it has no Markdown pipeline and no room for a full analysis.
// So the structured analysis the API returns is reduced here to the two things
// the card can draw: a lead and a few short lines.
//
// Note what this file no longer does: parse. `GET /argument/:id` returns the
// analysis already structured (backend `ai/analysis.logic.ts`), including for
// the legacy Markdown rows, so there is exactly one parser in the codebase and
// it is not this one.

/** Points past this are dropped — the card has room for three. */
export const MAX_POINTS = 3;
export const LEAD_MAX = 110;
export const POINT_MAX = 78;

export interface AnalysisModel {
  lead: string;
  points: string[];
}

const EMPTY: AnalysisModel = { lead: "", points: [] };

function isAnalysis(raw: unknown): raw is Analysis {
  return typeof raw === "object" && raw !== null && "points" in raw;
}

/**
 * Flattens the structured analysis for the card. Attribution is dropped: at
 * certificate size a name per line crowds out the point itself, and the
 * certificate is a record of what was argued, not of who is owed credit.
 */
export function parseAnalysis(raw: unknown): AnalysisModel {
  if (!isAnalysis(raw)) return EMPTY;

  const lead = typeof raw.lead === "string" ? truncate(raw.lead, LEAD_MAX) : "";
  const points = Array.isArray(raw.points)
    ? raw.points
        .map((p) => (typeof p?.text === "string" ? p.text.trim() : ""))
        .filter((text) => text.length > 0)
        .slice(0, MAX_POINTS)
        .map((text) => truncate(text, POINT_MAX))
    : [];

  return { lead, points };
}

/** Nothing survived — the column should not be drawn at all. */
export function isEmptyAnalysis(a: AnalysisModel): boolean {
  return a.lead.length === 0 && a.points.length === 0;
}
