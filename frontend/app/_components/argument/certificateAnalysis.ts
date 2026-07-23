import { truncate } from "./verdictCard";

// The Crux AI analyses are stored as Markdown: one lead sentence, then a
// "### Key Points" heading and 2-3 bullets (see ARGUMENT_SYSTEM_PROMPT in
// backend/src/controllers/argument.controller.ts).
//
// The certificate is drawn by satori, which renders a React tree — it has no
// Markdown pipeline, and handing it react-markdown's output would mean trusting
// whatever HTML that produces to be a subset satori supports. So the Markdown
// is reduced here, to plain strings the card lays out itself.

/** Bullets past this are dropped — the card has room for three. */
export const MAX_POINTS = 3;
export const LEAD_MAX = 110;
export const POINT_MAX = 78;

export interface AnalysisModel {
  lead: string;
  points: string[];
}

const EMPTY: AnalysisModel = { lead: "", points: [] };

/** Strips the inline Markdown the prompt actually emits: **bold** and _italic_. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|$)/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

export function parseAnalysis(raw: unknown): AnalysisModel {
  if (typeof raw !== "string" || raw.trim().length === 0) return EMPTY;

  // The stored text escapes newlines in some rows and not others, depending on
  // how the model returned it — normalise both to real line breaks.
  const lines = raw
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  const points: string[] = [];
  const leadParts: string[] = [];
  let seenBullet = false;

  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.startsWith("#")) {
      // A heading ends the lead; "### Key Points" is a label, not content.
      seenBullet = true;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      seenBullet = true;
      const point = stripInline(line.replace(/^[-*]\s+/, ""));
      if (point) points.push(truncate(point, POINT_MAX));
      continue;
    }
    // Prose before the first bullet or heading is the lead. Prose after it is
    // trailing commentary the card has no room for.
    if (!seenBullet) leadParts.push(stripInline(line));
  }

  return {
    lead: truncate(leadParts.join(" ").trim(), LEAD_MAX),
    points: points.slice(0, MAX_POINTS),
  };
}

/** Nothing survived parsing — the column should not be drawn at all. */
export function isEmptyAnalysis(a: AnalysisModel): boolean {
  return a.lead.length === 0 && a.points.length === 0;
}
