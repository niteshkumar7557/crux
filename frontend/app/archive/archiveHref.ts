// The archive's filters live in the URL. Changing one must never silently drop
// another, and defaults stay out of the query so /archive is always canonical.

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

export function parseOutcome(raw: string | undefined): ArchiveOutcome {
  return ARCHIVE_OUTCOMES.find((o) => o.slug === raw)?.slug ?? "all";
}
