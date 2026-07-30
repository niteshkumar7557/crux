// Builds the certificate model from a concluded debate. Pure.

import type { MatchState } from "@/app/motion/types";
import { buildVerdictCard, truncate, type VerdictCardModel } from "./verdictCard";
import {
  isEmptyAnalysis,
  parseAnalysis,
  type AnalysisModel,
} from "./certificateAnalysis";

export const CERTIFIABLE_STATUS = "concluded";

export const CERT_CLAIM_MAX = 120;

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
    claim: truncate(claimRaw, CERT_CLAIM_MAX),
    authorUsername: source.authorUsername,
    concludedOn,
    footer: parts.join("  ·  "),
  };
}

export function certificateFilename(reference: string): string {
  return `crux-verdict-${reference}.png`;
}
