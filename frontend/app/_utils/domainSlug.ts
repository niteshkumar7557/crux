// Domain name to URL segment.

export function slugifyDomain(name: string): string {
  return name.toLowerCase().replace(/&/g, " ").trim().replace(/\s+/g, "-");
}
