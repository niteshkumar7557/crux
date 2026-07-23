// The archive has two independent filters and a page, all in the URL. Every
// link on the page rebuilds the whole query, so the rule that matters is that
// changing one filter never silently drops another — and that defaults stay out
// of the URL, so /archive is always the canonical "everything" address.

export const ARCHIVE_OUTCOMES = [
  { slug: "all", label: "All" },
  { slug: "for", label: "Affirmative" },
  { slug: "against", label: "Negative" },
  { slug: "draw", label: "Draw" },
  { slug: "walkover", label: "Unopposed" },
] as const;

export type ArchiveOutcome = (typeof ARCHIVE_OUTCOMES)[number]["slug"];

export interface ArchiveQuery {
  outcome?: string;
  domain?: string;
  page?: number;
}

export function archiveHref({ outcome, domain, page }: ArchiveQuery): string {
  const params = new URLSearchParams();
  if (outcome && outcome !== "all") params.set("outcome", outcome);
  if (domain && domain !== "all") params.set("domain", domain);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/archive?${query}` : "/archive";
}

/** Unknown or missing outcome slugs fall back to "all" rather than 404. */
export function parseOutcome(raw: string | undefined): ArchiveOutcome {
  return ARCHIVE_OUTCOMES.find((o) => o.slug === raw)?.slug ?? "all";
}
