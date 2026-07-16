// URL slug for a domain name: "Technology & AI" -> "technology-ai".
// Deterministic over the fixed 12-domain taxonomy; resolve a slug by
// slugifying the /domains list and matching.
export function slugifyDomain(name: string): string {
  return name.toLowerCase().replace(/&/g, " ").trim().replace(/\s+/g, "-");
}
