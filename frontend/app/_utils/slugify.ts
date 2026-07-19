// §11 SEO: human-readable, claim-derived debate slugs. The trailing "-<id>" is
// the real key (id is unique), so the slug text is free to change without
// breaking links — the route reads the id off the end.

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
