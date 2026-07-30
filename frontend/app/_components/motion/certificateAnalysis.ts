// Trims a side's case down to what fits on the certificate. Pure.

import { truncate } from "./verdictCard";
import type { Analysis } from "@/app/motion/types";

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

export function isEmptyAnalysis(a: AnalysisModel): boolean {
  return a.lead.length === 0 && a.points.length === 0;
}
