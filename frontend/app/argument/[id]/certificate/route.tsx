import { ImageResponse } from "next/og";
import { isAxiosError } from "axios";
import serverApi from "@/app/axios.server";
import type { MatchState } from "@/app/argument/types";
import {
  buildCertificate,
  certificateFilename,
  type CertificateModel,
} from "@/app/_components/argument/certificate";
import {
  CertificateCard,
  CERT_SIZE,
} from "@/app/_components/argument/CertificateCard";
import { loadOgFonts } from "@/app/_utils/ogFonts";

export const runtime = "nodejs";

async function fetchModel(rawId: string): Promise<CertificateModel | null> {
  const id = Number(rawId.split("-")[1]);
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    const { data } = await serverApi.get(`/argument/${id}`);
    const row = data?.data;
    if (!row) return null;
    const state: MatchState = {
      status: row.status,
      closesAt: row.closes_at,
      winner: row.winner,
      margin: row.margin,
      mvpUsername: row.mvp_username,
      verdictText: row.verdict_text,
      affirmative: row.affirmative,
      negative: row.negative,
    };
    return buildCertificate(state, String(row.content), {
      debateId: id,
      authorUsername: String(row.author_username ?? "unknown"),
      concludedAt: row.concluded_at ?? null,
      forAnalysis: row.for_analysis,
      againstAnalysis: row.against_analysis,
    });
  } catch (err) {
    if (isAxiosError(err)) return null;
    throw err;
  }
}

/**
 * The downloadable verdict certificate (§11/§14). Deliberately a separate image
 * from `opengraph-image.tsx`: that one is fetched by scrapers and must stay a
 * link preview, while this is a document a debater saves and posts — framed,
 * dated, naming everyone on the record, and carrying the arbiter's case for
 * both sides so the picture argues for itself away from the site.
 *
 * Live debates 404 rather than render: a certificate for a result that has not
 * happened is a lie, and this URL is guessable whether or not a button exists.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const model = await fetchModel(id);
  if (!model) {
    return new Response("No verdict to certify.", { status: 404 });
  }

  const fonts = await loadOgFonts();

  return new ImageResponse(<CertificateCard model={model} />, {
    ...CERT_SIZE,
    fonts,
    headers: {
      // The point of the whole route: a click saves a file instead of
      // opening an image in a tab.
      "Content-Disposition": `attachment; filename="${certificateFilename(model.reference)}"`,
      // Verdicts are immutable once settled, so this can be cached hard.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
    },
  });
}
