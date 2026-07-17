export type DomainClassification = string[];
// Sentinel for the AUTO chip — the arbiter picks the domain from the closed list.
export const AUTO_DOMAIN = "auto";
export type Stage = "compose" | "verdict" | "broadcast";
export type VerdictStatus = "pass" | "fail" | "unavailable";
export interface ArbiterVerdict {
  status: VerdictStatus;
  original: string;   // user's text at check time
  improved: string;   // arbiter's rewrite (may equal original)
  feedback: string;
  keyword: string;
  domain: string;     // arbiter's (possibly refiled) domain
}
export type ClaimVersion = "original" | "improved";
export interface SimilarStatement {
  id: number;
  content: string;
  domain: string;
  username: string;
}
