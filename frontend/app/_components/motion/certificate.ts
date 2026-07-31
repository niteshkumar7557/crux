// Builds the certificate model from a concluded debate. Pure.
//
// Note the two claims and the two rulings: `card.*` is the SHARE card's, cut to
// fit a 1200x630 box that has no room to grow, and the top-level `claim` /
// `verdict` are the certificate's, uncut. They are different documents with
// different jobs, and loosening the card's cuts would silently break the OG
// image.

import type { MatchState } from "@/app/motion/types";
import { buildVerdictCard, truncate, type VerdictCardModel } from "./verdictCard";
import { VERDICT_HARD_MAX } from "./certificateType";
import {
  isEmptyAnalysis,
  parseAnalysis,
  type AnalysisModel,
} from "./certificateAnalysis";

export const CERTIFIABLE_STATUS = "concluded";

export interface CertificateSource {
  debateId: number;
  authorUsername: string;
  concludedAt: string | null;
  forAnalysis?: unknown;
  againstAnalysis?: unknown;
}

export interface CertificateModel {
  card: VerdictCardModel;
  reference: string;
  claim: string;
  verdict: string;
  authorUsername: string;
  concludedOn: string | null;
  footer: string;
  analysis: { for: AnalysisModel; against: AnalysisModel } | null;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

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
  if (state.status !== CERTIFIABLE_STATUS) return null;

  const card = buildVerdictCard(state, claimRaw);
  const concludedOn = formatCertDate(source.concludedAt);

  const parts: string[] = [];
  if (card.mvpUsername) parts.push(`MVP @${card.mvpUsername}`);
  parts.push(`OPENED BY @${source.authorUsername}`);
  if (concludedOn) parts.push(concludedOn);

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
    // The certificate carries the whole ruling and the whole claim. The only cut
    // is a backstop three times longer than anything the judge is prompted for,
    // so that no possible row can push text off the page.
    claim: claimRaw.trim(),
    verdict: truncate(state.verdictText ?? "", VERDICT_HARD_MAX),
    authorUsername: source.authorUsername,
    concludedOn,
    footer: parts.join("  ·  "),
  };
}

export function certificateFilename(reference: string): string {
  return `crux-verdict-${reference}.png`;
}
