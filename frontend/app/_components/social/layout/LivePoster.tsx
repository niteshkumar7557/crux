// The clock is the loud element; the contested split is the argument for turning
// up. No participation counts — a young platform that prints its own attendance
// advertises an empty room, and both facts here hold regardless of traffic.
//
// The draw band IS marked on these, and only on these. See the spec, §3.

import { HAIRLINE, PALETTE } from "../socialTokens";
import { plateBox } from "../socialPlates";
import type { SocialPayload } from "../socialAssets";
import { SERIF } from "@/app/_utils/ogFonts";
import { BigLine, CtaBand, Frame, Meta, MotionLine, Plate, SplitBar, TopRow } from "./Frame";
import { DRAW_MARGIN } from "@/app/_utils/drawBand";

// A framed box in ink: LIVE belongs to no camp, so it takes no camp colour.
const LiveBox = ({ size = 23 }: { size?: number }) => (
  <div style={{ display: "flex", border: `1.5px solid ${PALETTE.ink}`,
                padding: `${Math.round(size * 0.4)}px ${Math.round(size * 0.83)}px`,
                color: PALETTE.ink, fontSize: size, fontWeight: 600,
                letterSpacing: size * 0.28, textTransform: "uppercase" }}>
    Live
  </div>
);

// Every rule is stated with its real number. design-system.md §10.
const drawNote = (split: { for: number; against: number }) =>
  `${Math.abs(split.for - split.against)} points apart, inside the draw band. Anything under a ${DRAW_MARGIN}-point margin is ruled a draw.`;

export function LivePoster({
  payload,
  plate,
  wide,
}: {
  payload: SocialPayload;
  plate: string;
  wide: boolean;
}) {
  const hours = payload.closesInHours ?? 0;
  const countdown = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const split = payload.split ?? { for: 50, against: 50 };
  const contested = Math.abs(split.for - split.against) < DRAW_MARGIN;

  if (!wide) {
    const box = plateBox("hourglass", 230);
    return (
      <Frame>
        <TopRow left={<Meta size={25}>{`CRUX · ${payload.reference}`}</Meta>} right={<LiveBox />} />
        <MotionLine motion={payload.motion} keyword={payload.keyword} size={62} marginTop={44} />
        <div style={{ display: "flex", height: 1.5, width: "100%", backgroundColor: HAIRLINE,
                      marginTop: 42, marginBottom: 42 }} />

        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <Plate src={plate} width={box.width} height={box.height} arch={box.arch} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingBottom: 6 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 7.2, color: PALETTE.muted }}>
              CLOSES IN
            </div>
            <BigLine size={112} marginTop={14}>{countdown}</BigLine>
          </div>
        </div>

        <SplitBar split={split} height={52} marginTop={44} drawBand labels />

        {contested ? (
          <div style={{ display: "flex", fontFamily: SERIF, fontStyle: "italic", fontSize: 34,
                        lineHeight: 1.4, color: PALETTE.muted, marginTop: 34 }}>
            {drawNote(split)}
          </div>
        ) : null}

        <div style={{ display: "flex", flex: 1, minHeight: 26 }} />
        <CtaBand text="Pick a side" domain={payload.domain} />
      </Frame>
    );
  }

  const box = plateBox("hourglass", 190);
  return (
    <Frame pad={0} outer={32}>
      <div style={{ display: "flex", flex: 1, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1.45,
                      padding: "50px 44px 42px 52px" }}>
          <TopRow left={<Meta size={22}>{`CRUX · ${payload.reference}`}</Meta>}
                  right={<LiveBox size={20} />} />
          <MotionLine motion={payload.motion} keyword={payload.keyword} size={54} marginTop={30} />
          <div style={{ display: "flex", flex: 1, minHeight: 18 }} />
          <SplitBar split={split} height={44} drawBand labels />
          {contested ? (
            <div style={{ display: "flex", fontFamily: SERIF, fontStyle: "italic", fontSize: 27,
                          lineHeight: 1.4, color: PALETTE.muted, marginTop: 24 }}>
              {drawNote(split)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center",
                      justifyContent: "center", borderLeft: `1.5px solid ${HAIRLINE}`,
                      padding: "50px 44px" }}>
          <Plate src={plate} width={box.width} height={box.height} arch={box.arch} />
          <div style={{ display: "flex", fontSize: 21, letterSpacing: 6.3, color: PALETTE.muted,
                        marginTop: 26 }}>
            CLOSES IN
          </div>
          <BigLine size={88} marginTop={12}>{countdown}</BigLine>
        </div>
      </div>

      <CtaBand text="Pick a side" domain={payload.domain} size={36} padY={24} padX={52} />
    </Frame>
  );
}
