import { ImageResponse } from "next/og";
import { isAxiosError } from "axios";
import serverApi from "@/app/axios.server";
import type { MatchState } from "@/app/argument/types";
import { TOKENS } from "@/app/_components/argument/verdictCard";
import {
  buildCertificate,
  certificateFilename,
  type CertificateModel,
} from "@/app/_components/argument/certificate";
import { loadOgFonts, MONO, SERIF } from "@/app/_utils/ogFonts";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

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
    });
  } catch (err) {
    if (isAxiosError(err)) return null;
    throw err;
  }
}

/**
 * The downloadable verdict certificate (§11/§14). Deliberately a separate image
 * from `opengraph-image.tsx`: that one is fetched by scrapers and must stay a
 * link preview, while this is a document a debater saves — framed, dated, and
 * naming everyone on the record.
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
  const { card } = model;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: TOKENS.bg,
          padding: 28,
          fontFamily: MONO,
        }}
      >
        {/* The rule frame — what makes it read as a document rather than a
            share image at the same dimensions. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: `1px solid ${TOKENS.outline}55`,
            padding: "40px 52px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 20,
              letterSpacing: 5,
              color: TOKENS.outline,
            }}
          >
            <div>CRUX · CERTIFICATE OF VERDICT</div>
            <div>{model.reference}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 38,
                lineHeight: 1.25,
                color: TOKENS.onSurface,
              }}
            >
              {`“${model.claim}”`}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: card.accent,
                }}
              >
                {card.label}
              </div>
              {card.score && (
                <div style={{ fontSize: 24, color: TOKENS.onSurfaceVariant }}>
                  {card.score}
                </div>
              )}
            </div>

            {card.split && (
              <div
                style={{
                  display: "flex",
                  height: 12,
                  width: "100%",
                  backgroundColor: TOKENS.track,
                }}
              >
                <div
                  style={{ flex: card.split.for, backgroundColor: TOKENS.cyan }}
                />
                <div
                  style={{
                    flex: card.split.against,
                    backgroundColor: TOKENS.red,
                  }}
                />
              </div>
            )}

            {card.heroLine && (
              <div
                style={{
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: TOKENS.onSurfaceVariant,
                }}
              >
                {`“${card.heroLine}”`}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 20,
              borderTop: `1px solid ${TOKENS.outline}33`,
              fontSize: 19,
              letterSpacing: 2,
              color: TOKENS.outline,
            }}
          >
            <div style={{ color: card.mvpUsername ? TOKENS.amber : TOKENS.outline }}>
              {model.footer}
            </div>
            <div>crux</div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts,
      headers: {
        // The point of the whole route: a click saves a file instead of
        // opening an image in a tab.
        "Content-Disposition": `attachment; filename="${certificateFilename(model.reference)}"`,
        // Verdicts are immutable once settled, so this can be cached hard.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
      },
    },
  );
}
