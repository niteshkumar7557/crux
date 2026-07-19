import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isAxiosError } from "axios";
import serverApi from "@/app/axios.server";
import type { MatchState } from "@/app/argument/types";
import {
  buildVerdictCard,
  TOKENS,
  type VerdictCardModel,
} from "@/app/_components/argument/verdictCard";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crux verdict card";

const FONT_DIR = join(process.cwd(), "app", "_fonts");

async function loadFonts() {
  const [newsreader, grotesk, groteskBold] = await Promise.all([
    readFile(join(FONT_DIR, "Newsreader-Italic.woff")),
    readFile(join(FONT_DIR, "SpaceGrotesk-Regular.woff")),
    readFile(join(FONT_DIR, "SpaceGrotesk-Bold.woff")),
  ]);
  return [
    {
      name: "Newsreader",
      data: newsreader,
      weight: 400 as const,
      style: "italic" as const,
    },
    {
      name: "Grotesk",
      data: grotesk,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Grotesk",
      data: groteskBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}

async function fetchModel(rawId: string): Promise<VerdictCardModel | null> {
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
      standoutUsername: row.standout_username,
      verdictText: row.verdict_text,
      affirmative: row.affirmative,
      negative: row.negative,
    };
    return buildVerdictCard(state, String(row.content));
  } catch (err) {
    if (isAxiosError(err)) return null;
    throw err;
  }
}

const MONO = "Grotesk";
const SERIF = "Newsreader";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await fetchModel(id);
  const fonts = await loadFonts();

  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between" as const,
    backgroundColor: TOKENS.bg,
    padding: "64px",
    fontFamily: MONO,
  };

  if (!model) {
    return new ImageResponse(
      (
        <div
          style={{ ...frame, justifyContent: "center", alignItems: "center" }}
        >
          <div style={{ fontSize: 40, letterSpacing: 6, color: TOKENS.outline }}>
            CRUX
          </div>
          <div
            style={{
              fontSize: 28,
              color: TOKENS.onSurfaceVariant,
              marginTop: 12,
            }}
          >
            Verdict unavailable
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const showQuotes = model.mode !== "live";

  return new ImageResponse(
    (
      <div style={frame}>
        {/* top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 4,
            color: TOKENS.outline,
          }}
        >
          <div>CRUX · VERDICT</div>
          <div>{id}</div>
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {model.mode !== "live" && (
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 30,
                color: TOKENS.onSurfaceVariant,
              }}
            >
              {model.claim}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: 2,
                color: model.accent,
              }}
            >
              {model.label}
            </div>
            <div style={{ fontSize: 26, color: TOKENS.onSurfaceVariant }}>
              {model.liveNote ?? model.score ?? ""}
            </div>
          </div>

          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 40,
              lineHeight: 1.3,
              color: TOKENS.onSurface,
            }}
          >
            {showQuotes ? `“${model.heroLine}”` : model.heroLine}
          </div>
        </div>

        {/* split bar */}
        {model.split && (
          <div
            style={{
              display: "flex",
              height: 10,
              width: "100%",
              backgroundColor: TOKENS.track,
            }}
          >
            <div
              style={{ flex: model.split.for, backgroundColor: TOKENS.cyan }}
            />
            <div
              style={{ flex: model.split.against, backgroundColor: TOKENS.red }}
            />
          </div>
        )}

        {/* bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 2,
            color: TOKENS.outline,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: model.mvpUsername ? TOKENS.amber : TOKENS.bg }}>
              {model.mvpUsername ? `MVP  @${model.mvpUsername}` : ""}
            </div>
            {model.standoutUsername && (
              <div style={{ fontSize: 18, color: TOKENS.outline }}>
                {`Standout in defeat  @${model.standoutUsername}`}
              </div>
            )}
          </div>
          <div>{`crux · /argument/${id}`}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
