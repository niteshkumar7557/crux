import { ImageResponse } from "next/og";
import { loadOgFonts, MONO, SERIF } from "./_utils/ogFonts";
import { BRAND, markOutline } from "./_utils/brandMark";

// The card every share of the site itself renders. It replaced a static PNG
// still drawn in the old dark palette — cyan wordmark, red/cyan split bar, grid
// backdrop — which is exactly the drift that a generated image cannot have.
//
// The split bar carries the draw band, the same as every split bar in the
// product (design-system.md §2). It is the one piece of the interface that
// makes it into the share card, so it should not be the one place the rule is
// quietly dropped.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crux — the digital debate arena";

const PAD = 72;

export default async function OpengraphImage() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BRAND.paper,
          padding: PAD,
          fontFamily: MONO,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={markOutline(BRAND.ink)} width={54} height={54} alt="" />
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 46,
              color: BRAND.ink,
            }}
          >
            Crux
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 19,
              letterSpacing: 6,
              color: BRAND.inkSoft,
            }}
          >
            THE DIGITAL DEBATE ARENA
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 88,
            lineHeight: 1.15,
            color: BRAND.ink,
            maxWidth: 900,
          }}
        >
          Every argument deserves a verdict.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {/* The split bar, draw band marked — 47.5% to 52.5% of the width. */}
          <div style={{ display: "flex", position: "relative", height: 20, width: "100%" }}>
            <div style={{ display: "flex", width: "54%", backgroundColor: BRAND.for }} />
            <div style={{ display: "flex", width: "46%", backgroundColor: BRAND.against }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "47.5%",
                width: "5%",
                borderLeft: `2px solid ${BRAND.paper}`,
                borderRight: `2px solid ${BRAND.paper}`,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 21,
              letterSpacing: 5,
              color: BRAND.inkSoft,
            }}
          >
            STAKE A CLAIM · ARGUE BOTH SIDES · LET LOGIC DECIDE
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
