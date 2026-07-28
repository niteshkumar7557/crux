/**
 * §13 — the Crux AI analysis, as data rather than a Markdown blob.
 *
 * A side's analysis is a lead sentence plus a list of points, and each point
 * that came from a real comment carries that comment's id. The id is what lets
 * the arena link a named point to the argument it was made in; before this the
 * panel could print "@dev" but had no way to say WHICH of @dev's comments it
 * meant.
 *
 * TRUST BOUNDARY
 * The model returns `{commentId, text}` and nothing else. Authors are looked up
 * from the comment id server-side, never taken from the model — so a
 * hallucinated id cannot invent a person, it can only cost that point its link.
 *
 * STORAGE
 * Serialised to JSON into the existing `arguments.{side}_analysis` text
 * columns. `readAnalysis` accepts the legacy Markdown that every row written
 * before this change still holds, so no migration is needed and concluded
 * debates keep rendering exactly as they did.
 */

/** Points past this are dropped — the panel is a summary, not a transcript. */
export const MAX_POINTS = 6;
export const LEAD_MAX_CHARS = 400;
export const POINT_MAX_CHARS = 240;

export interface AnalysisPoint {
  /** Username without "@", or null for an AI opening-draft point. */
  author: string | null;
  /** The comment this point came from; null for opening-draft points. */
  commentId: number | null;
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

// ── Reading ──────────────────────────────────────────────────────────────────

/** Strips the inline Markdown the legacy prompts emitted. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

/**
 * The pre-JSON shape: a lead paragraph, a "### Key Arguments" heading, then
 * bullets of the form `- **@name** — the point`. Rows written before the
 * structured format still look like this, and concluded debates are read-only,
 * so they will look like this forever.
 */
export function parseLegacyMarkdown(raw: string): Analysis {
  // Some rows escaped their newlines and some did not, depending on how the
  // model returned them — normalise both to real breaks.
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
      // `**@name** — point`, the shape the old analyst prompt specified.
      const attributed = body.match(/^\*\*@?([^*]+?)\*\*\s*[—–-]\s*(.+)$/);
      if (attributed) {
        points.push({
          author: (attributed[1] ?? "").trim() || null,
          commentId: null, // the old format never recorded one
          text: trimTo(stripInline(attributed[2] ?? ""), POINT_MAX_CHARS),
        });
      } else {
        const text = trimTo(stripInline(body), POINT_MAX_CHARS);
        if (text) points.push({ author: null, commentId: null, text });
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

  const id = Number(r.commentId);
  const commentId = Number.isInteger(id) && id > 0 ? id : null;
  const author =
    typeof r.author === "string" && r.author.trim().length > 0
      ? r.author.trim().replace(/^@/, "")
      : null;

  return { author, commentId, text };
}

/**
 * Reads whatever is in the column: the structured JSON written from now on, or
 * the Markdown written before it. Never throws — a column this can't make sense
 * of yields an empty analysis, which renders as no panel rather than a crash.
 */
export function readAnalysis(raw: unknown): Analysis {
  if (raw === null || raw === undefined) return EMPTY_ANALYSIS;

  // A driver or caller that already handed us an object.
  if (typeof raw === "object") return normalise(raw);

  if (typeof raw !== "string") return EMPTY_ANALYSIS;
  const text = raw.trim();
  if (text.length === 0) return EMPTY_ANALYSIS;

  if (text.startsWith("{")) {
    try {
      return normalise(JSON.parse(text));
    } catch {
      // Malformed JSON — fall through and read it as prose rather than lose it.
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

// ── Writing ──────────────────────────────────────────────────────────────────

export function writeAnalysis(a: Analysis): string {
  return JSON.stringify(a);
}

/**
 * The model's `newAnalysis`, made safe to store.
 *
 * Attribution is resolved here and only here: a point's author is whatever the
 * comments table says wrote that comment. An id the model invented, or one
 * belonging to the other side, is dropped to null — the point survives
 * unattributed rather than being credited to nobody in particular.
 */
export function sanitizeAnalysis(
  raw: unknown,
  authorByCommentId: Map<number, string>,
): Analysis {
  const { lead, points } = normalise(
    typeof raw === "string" ? safeParse(raw) : raw,
  );

  const seen = new Set<string>();
  const clean: AnalysisPoint[] = [];

  for (const p of points) {
    // Two points saying the same thing is the model padding the list.
    const key = p.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const author =
      p.commentId !== null ? (authorByCommentId.get(p.commentId) ?? null) : null;
    clean.push({
      author,
      commentId: author !== null ? p.commentId : null,
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

// ── Rendering back into prompts ──────────────────────────────────────────────

/**
 * The compact prose form the probability judge, the verdict judge and the
 * OPPONENT ANALYSIS slot all already expect. Keeping this shape is what lets
 * the storage change without touching those three prompts.
 */
export function renderAnalysisForPrompt(a: Analysis): string {
  if (isEmptyAnalysis(a)) return "";
  const bullets = a.points
    .map((p) => (p.author ? `- **@${p.author}** — ${p.text}` : `- ${p.text}`))
    .join("\n");
  if (bullets.length === 0) return a.lead;
  return `${a.lead}\n\n### Key Arguments\n${bullets}`;
}

/**
 * The same document, but with each attributed point's comment id exposed.
 *
 * Only the analyst sees this, and only for its OWN side: when it keeps an
 * existing point it has to re-emit that point's id, and it cannot do that from
 * a name alone — a debater may have several comments. Without the ids here,
 * every carried-forward point would quietly lose its link the first time the
 * analysis was rewritten.
 */
export function renderOwnAnalysisForAnalyst(a: Analysis): string {
  if (isEmptyAnalysis(a)) return "";
  const bullets = a.points
    .map((p) => {
      if (p.author && p.commentId !== null)
        return `- [#${p.commentId}] **@${p.author}** — ${p.text}`;
      if (p.author) return `- **@${p.author}** — ${p.text}`;
      return `- ${p.text}`;
    })
    .join("\n");
  if (bullets.length === 0) return a.lead;
  return `${a.lead}\n\n### Key Arguments\n${bullets}`;
}
