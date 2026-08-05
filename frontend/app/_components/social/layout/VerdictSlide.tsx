// The last slide of the carousel: the ruling, and the one hard ask.
//
// "Against wins", not "Negative wins". verdictCard.ts labels the share card with
// the database's word; a poster is read by strangers, and FOR/AGAINST is the
// product's language and the only one that parses without explanation. Scoped to
// the social kit — the share card is deliberately left alone. See the spec, §3.

import { PALETTE } from "../socialTokens";
import { plateBox } from "../socialPlates";
import type { SocialPayload } from "../socialAssets";
import { RULING_BOX } from "../socialBoxes";
import { fitRuling, scaled } from "../socialFit";
import { SERIF } from "@/app/_utils/ogFonts";
import { BigLine, CtaBand, Frame, Meta, Plate, SideBox, SplitBar, TopRow, sideColour } from "./Frame";

const WINNER_LABEL = {
  for: "For wins",
  against: "Against wins",
  draw: "Draw",
  walkover: "Unopposed",
} as const;

export function VerdictSlide({ payload, plate }: { payload: SocialPayload; plate: string }) {
  const winner = payload.winner ?? "draw";
  const box = plateBox("scales", scaled(270, payload.sizes.plate));
  const accent =
    winner === "for" || winner === "against" ? sideColour(winner) : PALETTE.muted;
  const rulingSize = fitRuling(
    payload.verdictText ?? "",
    RULING_BOX["ig-verdict"],
    37,
    payload.sizes.body,
  );

  return (
    <Frame pad={scaled(66, payload.sizes.pad)}>
      <TopRow
        left={
          winner === "for" || winner === "against" ? (
            <SideBox side={winner} label="The verdict" />
          ) : (
            <Meta>THE VERDICT</Meta>
          )
        }
        right={<Meta>{`${String(payload.slideNumber).padStart(2, "0")} / ${payload.slideTotal}`}</Meta>}
      />

      <div style={{ display: "flex", alignItems: "flex-end", gap: 44, marginTop: 38 }}>
        <Plate src={plate} width={box.width} height={box.height} arch={box.arch}
               caption="PLATE II" captionSize={19} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingBottom: 12 }}>
          <BigLine size={scaled(104, payload.sizes.headline)} color={accent}>
            {WINNER_LABEL[winner]}
          </BigLine>
          {/* BigLine's 0.94 leading is tighter than Anton's own line box, so its
              ink overflows the element by ~13% of the size. Anything sitting
              directly beneath it needs that back as a margin. */}
          {payload.split && winner !== "walkover" ? (
            <div style={{ display: "flex", marginTop: 22 }}>
              <Meta size={26}>
                {`${payload.split.for}–${payload.split.against} · MARGIN ${payload.margin ?? 0}`}
              </Meta>
            </div>
          ) : null}
        </div>
      </div>

      {payload.split && winner !== "walkover" ? (
        <SplitBar split={payload.split} height={26} marginTop={40} />
      ) : null}

      {payload.verdictText ? (
        <div
          style={{
            display: "flex",
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: rulingSize,
            lineHeight: 1.42,
            color: PALETTE.muted,
            marginTop: 40,
          }}
        >
          {`“${payload.verdictText}”`}
        </div>
      ) : null}

      {/* Laurel is reserved for earned things, and an MVP is one. §2. */}
      {payload.mvpUsername ? (
        <div style={{ display: "flex", marginTop: 32, fontSize: 27, fontWeight: 600,
                      letterSpacing: 6, color: PALETTE.laurel }}>
          {`MVP · @${payload.mvpUsername}`}
        </div>
      ) : null}

      <div style={{ display: "flex", flex: 1, minHeight: 34 }} />

      <CtaBand text="Read the full verdict" domain={payload.domain} />
    </Frame>
  );
}
