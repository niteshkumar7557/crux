// Slide 01. The motion is the hook, at poster scale.
//
// It is set in Newsreader with the keyword lifted in laurel italic — the
// product's own h1 treatment — and NOT in Anton. design-system.md §3: condensed
// uppercase poster type turns an argument into a headline shouting at the
// reader. That rule holds on a poster too, and it also separates this slide from
// the six Anton argument slides that follow.

import { PALETTE } from "../socialTokens";
import { PLATE_SOURCES, plateBox } from "../socialPlates";
import { MOTION_BOX } from "../socialBoxes";
import { fitMotion, scaled } from "../socialFit";
import type { SocialPayload } from "../socialAssets";
import { BigLine, Frame, Lockup, Meta, MotionLine, Plate, Rule, TopRow } from "./Frame";

const PLATE_WIDTH = 856;

export function CoverSlide({ payload, plate }: { payload: SocialPayload; plate: string }) {
  const box = plateBox("duel", scaled(PLATE_WIDTH, payload.sizes.plate));
  const motionSize = fitMotion(payload.motion, MOTION_BOX["ig-cover"], 86, payload.sizes.motion);

  return (
    <Frame pad={scaled(66, payload.sizes.pad)}>
      <TopRow
        left={<Meta>{`CRUX · ${payload.reference}`}</Meta>}
        right={<Meta>{`${String(payload.slideNumber).padStart(2, "0")} / ${payload.slideTotal}`}</Meta>}
      />

      <MotionLine motion={payload.motion} keyword={payload.keyword} size={motionSize} marginTop={56} />

      <div style={{ display: "flex", flex: 1, minHeight: 40 }} />

      <Plate
        src={plate}
        width={box.width}
        height={box.height}
        arch={box.arch}
        caption={PLATE_SOURCES.duel.caption}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 40 }} />

      <Rule />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginTop: 28,
        }}
      >
        <BigLine size={scaled(40, payload.sizes.headline)} color={PALETTE.ink}>
          Swipe for both cases →
        </BigLine>
        <Lockup domain={payload.domain} />
      </div>
    </Frame>
  );
}
