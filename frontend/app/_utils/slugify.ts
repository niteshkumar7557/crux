// Builds the canonical /debate/[slug] URL. The trailing id is what the lookup uses.

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

export function debateSlug(content: string, id: number): string {
  const base = slugify(content) || "debate";
  return `${base}-${id}`;
}

export function idFromSlug(slug: string): number {
  const m = String(slug).match(/-(\d+)$/);
  return m ? Number(m[1]) : NaN;
}
