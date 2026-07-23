import type { MatchState } from "@/app/argument/types";
import { buildVerdictCard, truncate, type VerdictCardModel } from "./verdictCard";
import {
  isEmptyAnalysis,
  parseAnalysis,
  type AnalysisModel,
} from "./certificateAnalysis";

// The certificate is the OG card's settled sibling: same tokens, same ruling
// vocabulary, but it is a document somebody downloads and keeps rather than a
// preview a scraper fetches. So it carries the things a keepsake needs and a
// link preview does not — who opened the claim, when it was settled, and the
// debate's own ID. Everything here is pure; the route only draws it.

/** A verdict is only certifiable once it exists. */
export const CERTIFIABLE_STATUS = "concluded";

export const CERT_CLAIM_MAX = 120;

export interface CertificateSource {
  debateId: number;
  authorUsername: string;
  concludedAt: string | null;
  /** Raw Markdown from the arbiter; parsed here, never rendered as Markdown. */
  forAnalysis?: unknown;
  againstAnalysis?: unknown;
}

export interface CertificateModel {
  card: VerdictCardModel;
  /** "CRX-12-A" — the same id shown in the page header. */
  reference: string;
  claim: string;
  authorUsername: string;
  /** "22 JUL 2026", or null when the row never recorded a conclusion time. */
  concludedOn: string | null;
  /** The one-line footer: MVP · opened by · date, already assembled. */
  footer: string;
  /** Both sides of the Crux AI reading, or null when neither survived parsing. */
  analysis: { for: AnalysisModel; against: AnalysisModel } | null;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * UTC deliberately: the image is rendered on a server whose timezone is not the
 * reader's, so a local-time format would print a date that depends on where the
 * container happens to run.
 */
export function formatCertDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function buildCertificate(
  state: MatchState,
  claimRaw: string,
  source: CertificateSource,
): CertificateModel | null {
  // A live debate has no verdict to certify. The download button only appears
  // on concluded pages, but the route is a public URL and must say no itself.
  if (state.status !== CERTIFIABLE_STATUS) return null;

  const card = buildVerdictCard(state, claimRaw);
  const concludedOn = formatCertDate(source.concludedAt);

  const parts: string[] = [];
  if (card.mvpUsername) parts.push(`MVP @${card.mvpUsername}`);
  parts.push(`OPENED BY @${source.authorUsername}`);
  if (concludedOn) parts.push(concludedOn);

  // Both columns stand or fall together: one lone side would read as though the
  // arbiter only bothered to argue one case.
  const forAnalysis = parseAnalysis(source.forAnalysis);
  const againstAnalysis = parseAnalysis(source.againstAnalysis);
  const hasAnalysis =
    !isEmptyAnalysis(forAnalysis) && !isEmptyAnalysis(againstAnalysis);

  return {
    card,
    reference: `CRX-${source.debateId}-A`,
    analysis: hasAnalysis
      ? { for: forAnalysis, against: againstAnalysis }
      : null,
    // The certificate gives the claim more room than the OG card does — it is
    // the subject of the document, not a caption above a headline.
    claim: truncate(claimRaw, CERT_CLAIM_MAX),
    authorUsername: source.authorUsername,
    concludedOn,
    footer: parts.join("  ·  "),
  };
}

/** `crux-verdict-CRX-12-A.png` — a filename that means something in a folder. */
export function certificateFilename(reference: string): string {
  return `crux-verdict-${reference}.png`;
}
