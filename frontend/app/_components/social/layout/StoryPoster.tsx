// 1080x1920. Instagram draws its own UI over the top and bottom 250px, so those
// bands are spacers and nothing load-bearing enters them. The CTA lands just
// above the bottom zone, leaving room for a link sticker beneath it.

import { PALETTE, STORY_SAFE_BOTTOM, STORY_SAFE_TOP } from "../socialTokens";
import { plateBox } from "../socialPlates";
import type { SocialPayload } from "../socialAssets";
import { MOTION_BOX, RULING_BOX } from "../socialBoxes";
import { fitMotion, fitRuling, scaled } from "../socialFit";
import { SERIF } from "@/app/_utils/ogFonts";
import { BigLine, CtaBand, Frame, Meta, MotionLine, Plate, SideBox, SplitBar, TopRow, sideColour } from "./Frame";

const WINNER_LABEL = {
  for: "For wins",
  against: "Against wins",
  draw: "Draw",
  walkover: "Unopposed",
} as const;

// 1080x1920 less the two safe bands, the motion, the plate, the display line,
// the score, the bar, the MVP and the CTA leaves 196px for the ruling. Overflow
// here does not clip: yoga shrinks every item, and the score collapses into the
// display line while the MVP climbs into the ruling. Every block below is sized
// so the total lands inside the canvas.
export function StoryPoster({ payload, plate }: { payload: SocialPayload; plate: string }) {
  const winner = payload.winner ?? "draw";
  const box = plateBox("scales", scaled(210, payload.sizes.plate));
  const accent = winner === "for" || winner === "against" ? sideColour(winner) : PALETTE.muted;
  const motionSize = fitMotion(payload.motion, MOTION_BOX["ig-story"], 62, payload.sizes.motion);
  const rulingSize = fitRuling(
    payload.verdictText ?? "",
    RULING_BOX["ig-story"],
    38,
    payload.sizes.body,
  );

  return (
    <Frame pad={scaled(64, payload.sizes.pad)}>
      <div style={{ display: "flex", height: STORY_SAFE_TOP - 60 }} />

      <TopRow
        left={
          winner === "for" || winner === "against" ? (
            <SideBox side={winner} label="The verdict" />
          ) : (
            <Meta>THE VERDICT</Meta>
          )
        }
        right={<Meta>{payload.reference.replace("MOTION ", "")}</Meta>}
      />

      <MotionLine motion={payload.motion} keyword={payload.keyword} size={motionSize} marginTop={52} />

      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: 64 }}>
        <Plate src={plate} width={box.width} height={box.height} arch={box.arch}
               caption="PLATE II" captionSize={20} />
      </div>

      <BigLine size={scaled(118, payload.sizes.headline)} color={accent} marginTop={60}>
        {WINNER_LABEL[winner]}
      </BigLine>

      {/* A column wrapper, not a fragment: satori does not flatten fragments, so
          the score and the bar would be laid out as a row. */}
      {payload.split && winner !== "walkover" ? (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", marginTop: 26 }}>
            <Meta>{`${payload.split.for}–${payload.split.against} · MARGIN ${payload.margin ?? 0}`}</Meta>
          </div>
          <SplitBar split={payload.split} height={28} marginTop={28} />
        </div>
      ) : null}

      {payload.verdictText ? (
        <div style={{ display: "flex", fontFamily: SERIF, fontStyle: "italic", fontSize: rulingSize,
                      lineHeight: 1.42, color: PALETTE.muted, marginTop: 44 }}>
          {`“${payload.verdictText}”`}
        </div>
      ) : null}

      {payload.mvpUsername ? (
        <div style={{ display: "flex", marginTop: 34, fontSize: 28, fontWeight: 600,
                      letterSpacing: 6, color: PALETTE.laurel }}>
          {`MVP · @${payload.mvpUsername}`}
        </div>
      ) : null}

      <div style={{ display: "flex", flex: 1, minHeight: 30 }} />

      <CtaBand text="Read the full verdict" domain={payload.domain} size={44} padY={32} padX={38} />

      <div style={{ display: "flex", height: STORY_SAFE_BOTTOM - 100 }} />
    </Frame>
  );
}
