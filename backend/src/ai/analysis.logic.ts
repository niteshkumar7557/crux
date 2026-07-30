// A side's living case, as data: a lead plus attributed points. Parse, sanitize,
// render. Pure.
//
// TRUST BOUNDARY: the model returns { argumentId, text } and nothing else. Authors
// are resolved server-side from the id, so a hallucinated id costs that point its
// link and can never invent a person. readAnalysis also accepts the Markdown that
// rows written before the structured format still hold.
// Spec: game-theory.md §17

export const MAX_POINTS = 6;
export const LEAD_MAX_CHARS = 400;
export const POINT_MAX_CHARS = 240;

export interface AnalysisPoint {
  author: string | null;
  argumentId: number | null;
  text: string;
}

export interface Analysis {
  lead: string;
  points: AnalysisPoint[];
}

export const EMPTY_ANALYSIS: Analysis = { lead: "", points: [] };

export function isEmptyAnalysis(a: Analysis): boolean {
  return a.lead.length === 0 && a.points.length === 0;
}

function trimTo(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

// The pre-JSON shape. Rows written before the structured format still look like
// this, and concluded debates are read-only, so they always will.
export function parseLegacyMarkdown(raw: string): Analysis {
  const lines = raw
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  const points: AnalysisPoint[] = [];
  const leadParts: string[] = [];
  let seenBullet = false;

  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.startsWith("#")) {
      seenBullet = true; // a heading ends the lead; the label is not content
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      seenBullet = true;
      const body = line.replace(/^[-*]\s+/, "");
      const attributed = body.match(/^\*\*@?([^*]+?)\*\*\s*[—–-]\s*(.+)$/);
      if (attributed) {
        points.push({
          author: (attributed[1] ?? "").trim() || null,
          argumentId: null, // the old format never recorded one
          text: trimTo(stripInline(attributed[2] ?? ""), POINT_MAX_CHARS),
        });
      } else {
        const text = trimTo(stripInline(body), POINT_MAX_CHARS);
        if (text) points.push({ author: null, argumentId: null, text });
      }
      continue;
    }
    if (!seenBullet) leadParts.push(stripInline(line));
  }

  return {
    lead: trimTo(leadParts.join(" "), LEAD_MAX_CHARS),
    points: points.filter((p) => p.text.length > 0).slice(0, MAX_POINTS),
  };
}

function coercePoint(raw: unknown): AnalysisPoint | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === "string" ? trimTo(r.text, POINT_MAX_CHARS) : "";
  if (text.length === 0) return null;

  const id = Number(r.argumentId);
  const argumentId = Number.isInteger(id) && id > 0 ? id : null;
  const author =
    typeof r.author === "string" && r.author.trim().length > 0
      ? r.author.trim().replace(/^@/, "")
      : null;

  return { author, argumentId, text };
}

export function readAnalysis(raw: unknown): Analysis {
  if (raw === null || raw === undefined) return EMPTY_ANALYSIS;

  if (typeof raw === "object") return normalise(raw);

  if (typeof raw !== "string") return EMPTY_ANALYSIS;
  const text = raw.trim();
  if (text.length === 0) return EMPTY_ANALYSIS;

  if (text.startsWith("{")) {
    try {
      return normalise(JSON.parse(text));
    } catch {
    }
  }
  return parseLegacyMarkdown(text);
}

function normalise(raw: unknown): Analysis {
  const r = raw as Record<string, unknown>;
  const lead = typeof r?.lead === "string" ? trimTo(r.lead, LEAD_MAX_CHARS) : "";
  const points = Array.isArray(r?.points)
    ? r.points
        .map(coercePoint)
        .filter((p): p is AnalysisPoint => p !== null)
        .slice(0, MAX_POINTS)
    : [];
  return { lead, points };
}

export function writeAnalysis(a: Analysis): string {
  return JSON.stringify(a);
}

export function sanitizeAnalysis(
  raw: unknown,
  authorByArgumentId: Map<number, string>,
): Analysis {
  const { lead, points } = normalise(
    typeof raw === "string" ? safeParse(raw) : raw,
  );

  const seen = new Set<string>();
  const clean: AnalysisPoint[] = [];

  for (const p of points) {
    const key = p.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const author =
      p.argumentId !== null ? (authorByArgumentId.get(p.argumentId) ?? null) : null;
    clean.push({
      author,
      argumentId: author !== null ? p.argumentId : null,
      text: p.text,
    });
  }

  return { lead, points: clean.slice(0, MAX_POINTS) };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function renderAnalysisForPrompt(a: Analysis): string {
  if (isEmptyAnalysis(a)) return "";
  const bullets = a.points
    .map((p) => (p.author ? `- **@${p.author}** — ${p.text}` : `- ${p.text}`))
    .join("\n");
  if (bullets.length === 0) return a.lead;
  return `${a.lead}\n\n### Key Arguments\n${bullets}`;
}

// The same document with each attributed point's argument id exposed. Only the
// analyst sees this, and only for its OWN side: to keep an existing point it has
// to re-emit that point's id, which it cannot do from a name alone. Without the
// ids here, every carried-forward point loses its link on the first rewrite.
export function renderOwnAnalysisForAnalyst(a: Analysis): string {
  if (isEmptyAnalysis(a)) return "";
  const bullets = a.points
    .map((p) => {
      if (p.author && p.argumentId !== null)
        return `- [#${p.argumentId}] **@${p.author}** — ${p.text}`;
      if (p.author) return `- **@${p.author}** — ${p.text}`;
      return `- ${p.text}`;
    })
    .join("\n");
  if (bullets.length === 0) return a.lead;
  return `${a.lead}\n\n### Key Arguments\n${bullets}`;
}
