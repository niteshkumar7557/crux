// The LinkedIn 4:5 page and the X 16:9 card. Same anatomy, two densities, and
// the wide one recomposes into two columns rather than scaling down.

import { HAIRLINE, PALETTE } from "../socialTokens";
import { plateBox } from "../socialPlates";
import type { SocialPayload } from "../socialAssets";
import { MOTION_BOX, RULING_BOX } from "../socialBoxes";
import { fitMotion, fitRuling, scaled } from "../socialFit";
import { SERIF } from "@/app/_utils/ogFonts";
import {
  BigLine, CtaBand, Frame, Lockup, Meta, MotionLine, Plate, Rule, SideBox, SplitBar, TopRow, sideColour,
} from "./Frame";

const WINNER_LABEL = {
  for: "For wins",
  against: "Against wins",
  draw: "Draw",
  walkover: "Unopposed",
} as const;

function Ruling({ text, size }: { text: string; size: number }) {
  return (
    <div style={{ display: "flex", fontFamily: SERIF, fontStyle: "italic", fontSize: size,
                  lineHeight: 1.42, color: PALETTE.muted }}>
      {`“${text}”`}
    </div>
  );
}

function Mvp({ username, size }: { username: string; size: number }) {
  return (
    <div style={{ display: "flex", marginTop: size, fontSize: size, fontWeight: 600,
                  letterSpacing: size * 0.22, color: PALETTE.laurel }}>
      {`MVP · @${username}`}
    </div>
  );
}

export function OnePager({
  payload,
  plate,
  wide,
}: {
  payload: SocialPayload;
  plate: string;
  wide: boolean;
}) {
  const winner = payload.winner ?? "draw";
  const accent = winner === "for" || winner === "against" ? sideColour(winner) : PALETTE.muted;
  const settled = payload.split !== null && winner !== "walkover";
  const key = wide ? "x-verdict" : "li-verdict";
  const motionSize = fitMotion(payload.motion, MOTION_BOX[key], wide ? 54 : 60, payload.sizes.motion);
  const rulingSize = fitRuling(
    payload.verdictText ?? "",
    RULING_BOX[key],
    wide ? 29 : 33,
    payload.sizes.body,
  );

  if (!wide) {
    const box = plateBox("scales", scaled(236, payload.sizes.plate));
    return (
      <Frame pad={scaled(66, payload.sizes.pad)}>
        <TopRow
          left={<Meta>{`CRUX · ${payload.reference}`}</Meta>}
          right={
            winner === "for" || winner === "against" ? (
              <SideBox side={winner} label="The verdict" size={22} />
            ) : (
              <Meta size={22}>THE VERDICT</Meta>
            )
          }
        />

        <MotionLine motion={payload.motion} keyword={payload.keyword} size={motionSize} marginTop={44} />
        <Rule margin={40} />

        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <Plate src={plate} width={box.width} height={box.height} arch={box.arch} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingBottom: 6 }}>
            <BigLine size={scaled(92, payload.sizes.headline)} color={accent}>{WINNER_LABEL[winner]}</BigLine>
            {settled ? (
              <div style={{ display: "flex", marginTop: 18 }}>
                <Meta>{`${payload.split!.for}–${payload.split!.against} · MARGIN ${payload.margin ?? 0}`}</Meta>
              </div>
            ) : null}
          </div>
        </div>

        {settled ? <SplitBar split={payload.split!} height={24} marginTop={34} /> : null}
        {payload.verdictText ? (
          <div style={{ display: "flex", marginTop: 36 }}>
            <Ruling text={payload.verdictText} size={rulingSize} />
          </div>
        ) : null}
        {payload.mvpUsername ? <Mvp username={payload.mvpUsername} size={25} /> : null}

        <div style={{ display: "flex", flex: 1, minHeight: 26 }} />
        <CtaBand text="Read the full verdict" domain={payload.domain} size={38} padY={28} padX={34} />
      </Frame>
    );
  }

  const box = plateBox("scales", scaled(150, payload.sizes.plate));
  return (
    <Frame pad={0} outer={32}>
      <div style={{ display: "flex", flex: 1, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1.5,
                      padding: "52px 44px 44px 52px" }}>
          <Meta size={24}>{`CRUX · ${payload.reference}`}</Meta>
          <MotionLine motion={payload.motion} keyword={payload.keyword} size={motionSize} marginTop={26} />
          <div style={{ display: "flex", flex: 1, minHeight: 20 }} />
          {payload.verdictText ? <Ruling text={payload.verdictText} size={rulingSize} /> : null}
          {payload.mvpUsername ? <Mvp username={payload.mvpUsername} size={23} /> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1,
                      borderLeft: `1.5px solid ${HAIRLINE}`, padding: "52px 52px 44px 44px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            {winner === "for" || winner === "against" ? (
              <SideBox side={winner} label="The verdict" size={21} />
            ) : (
              <Meta size={21}>THE VERDICT</Meta>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 32 }}>
            <Plate src={plate} width={box.width} height={box.height} arch={box.arch} />
            <div style={{ display: "flex", flex: 1, paddingBottom: 4 }}>
              <BigLine size={scaled(74, payload.sizes.headline)} color={accent}>{WINNER_LABEL[winner]}</BigLine>
            </div>
          </div>

          {/* A column wrapper, not a fragment: satori does not flatten fragments,
              so the score and the bar would be laid out as a row. */}
          {settled ? (
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div style={{ display: "flex", marginTop: 24 }}>
                <Meta size={23}>{`${payload.split!.for}–${payload.split!.against} · MARGIN ${payload.margin ?? 0}`}</Meta>
              </div>
              <SplitBar split={payload.split!} height={20} marginTop={18} />
            </div>
          ) : null}

          <div style={{ display: "flex", flex: 1, minHeight: 16 }} />
          {/* Landscape keeps the lockup AND the band: the band runs full width
              along the foot, so it never takes the footer's place here. */}
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Lockup domain={payload.domain} size={30} />
          </div>
        </div>
      </div>

      <CtaBand text="Read the full verdict" domain={payload.domain} size={36} padY={24} padX={52} />
    </Frame>
  );
}
