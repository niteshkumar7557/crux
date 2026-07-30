// The share card for one debater, rendered by satori.
//
// A profile is the thing a debater actually shares, so the card leads with the
// standing rather than the brand: the name reads first, the three numbers that
// make up a record read second, and Crux signs the bottom.

import { ImageResponse } from "next/og";
import { isAxiosError } from "axios";
import serverApi from "@/app/axios.server";
import {
  buildProfileCard,
  type ProfileCardModel,
} from "@/app/_components/profile/profileCard";
import { loadOgFonts, MONO, SERIF } from "@/app/_utils/ogFonts";
import { BRAND, markOutline } from "@/app/_utils/brandMark";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crux debater card";

const PAD = 72;

async function fetchCard(username: string): Promise<ProfileCardModel | null> {
  try {
    const { data } = await serverApi.get(`/profile/${username}`);
    return data?.identity ? buildProfileCard(data) : null;
  } catch (err) {
    if (isAxiosError(err)) return null;
    throw err;
  }
}

/** One number and its label, as used across the standing row. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: BRAND.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 18, letterSpacing: 4, color: BRAND.inkSoft }}>
        {label}
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const card = await fetchCard(username);
  const fonts = await loadOgFonts();

  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between" as const,
    backgroundColor: BRAND.paper,
    padding: PAD,
    fontFamily: MONO,
  };

  // An unknown or unreachable profile still has to return an image — a broken
  // one is worse than a plain one.
  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{ ...frame, justifyContent: "center", alignItems: "center" }}
        >
          <img src={markOutline(BRAND.ink)} width={72} height={72} alt="" />
          <div
            style={{
              marginTop: 20,
              fontSize: 26,
              letterSpacing: 6,
              color: BRAND.inkSoft,
            }}
          >
            CRUX
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={markOutline(BRAND.ink)} width={44} height={44} alt="" />
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 36,
              color: BRAND.ink,
            }}
          >
            Crux
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 18,
              letterSpacing: 5,
              color: BRAND.inkSoft,
            }}
          >
            {card.tier}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 82,
              lineHeight: 1.1,
              color: BRAND.ink,
            }}
          >
            {card.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 30, color: BRAND.inkSoft }}>
              {card.handle}
            </div>
            {card.title && (
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  letterSpacing: 3,
                  color: BRAND.draw,
                  border: `1px solid ${BRAND.faint}`,
                  padding: "6px 14px",
                }}
              >
                {card.title.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {/* The two-sided bar, as everywhere else in the product. */}
          <div style={{ display: "flex", height: 8, width: "100%" }}>
            <div
              style={{ display: "flex", width: "50%", backgroundColor: BRAND.for }}
            />
            <div
              style={{
                display: "flex",
                width: "50%",
                backgroundColor: BRAND.against,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 64 }}>
              <Stat value={String(card.logic)} label="LOGIC" />
              <Stat value={card.record} label="W–L–D" />
              {card.rank && <Stat value={card.rank} label="RANK" />}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 19,
                letterSpacing: 3,
                color: BRAND.inkSoft,
              }}
            >
              {card.mvp ?? ""}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
