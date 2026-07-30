// The touch icon. Deliberately the OUTLINED mark: at 60-120pt the filled variant's
// knocked-out braces grow dominant enough to read as an envelope.
import { ImageResponse } from "next/og";
import { BRAND, markOutline } from "./_utils/brandMark";

// Generated rather than shipped as a binary, so the touch icon can never drift
// from the mark the way the old cyan "C" did.
//
// The OUTLINED mark, not the solid one, even though this is nominally an icon.
// The solid variant exists because a hairline dies at favicon size; a touch
// icon renders at 60–120pt where the hairline is not only safe but better —
// filled, the knocked-out braces grow dominant enough that the tile starts to
// read as an envelope. `icon.svg` still carries the solid version, which is
// where the small sizes actually land.
//
// Light ground only: iOS composites a touch icon onto its own tile and rounds
// the corners, so there is no dark variant to serve and nothing may rely on
// transparency. The mark is inset well clear of the corner radius.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BRAND.paper,
        }}
      >
        <img src={markOutline(BRAND.ink)} width={112} height={112} alt="" />
      </div>
    ),
    size,
  );
}
