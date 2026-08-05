// The shapes every social template is built from.
//
// Satori rules that bite here: no CSS grid, no mix-blend-mode, and any element
// with more than one child needs an explicit display:flex. Components cannot be
// async, so plate images arrive as already-resolved data URIs.

import type { ReactNode } from "react";
import { HAIRLINE, PALETTE, PLATE_CREAM } from "../socialTokens";
import { DISPLAY, MONO, SERIF } from "@/app/_utils/ogFonts";
import { DRAW_BAND_END, DRAW_BAND_START } from "@/app/_utils/drawBand";

export type Side = "for" | "against";

export const sideColour = (side: Side): string =>
  side === "for" ? PALETTE.forSide : PALETTE.againstSide;

export const Rule = ({ margin = 0 }: { margin?: number }) => (
  <div
    style={{
      display: "flex",
      height: 1.5,
      width: "100%",
      backgroundColor: HAIRLINE,
      marginTop: margin,
      marginBottom: margin,
    }}
  />
);

// Paper, a 40px margin, then the hairline frame. This is what makes eight
// separate images read as one document.
export const Frame = ({
  children,
  pad = 66,
  outer = 40,
}: {
  children: ReactNode;
  pad?: number;
  outer?: number;
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      backgroundColor: PALETTE.paper,
      color: PALETTE.ink,
      fontFamily: MONO,
      padding: outer,
    }}
  >
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        border: `1.5px solid ${HAIRLINE}`,
        padding: pad,
      }}
    >
      {children}
    </div>
  </div>
);

export const TopRow = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    }}
  >
    {left}
    {right}
  </div>
);

export const Meta = ({ children, size = 26 }: { children: string; size?: number }) => (
  <div style={{ display: "flex", fontSize: size, letterSpacing: size * 0.09, color: PALETTE.muted }}>
    {children}
  </div>
);

// Framed, never filled: reversed-out type at this size turns a label into a
// block of camp colour competing with the text under it. design-system.md §3.
export const SideBox = ({
  side,
  label,
  size = 26,
}: {
  side: Side;
  label: string;
  size?: number;
}) => (
  <div
    style={{
      display: "flex",
      border: `1.5px solid ${sideColour(side)}`,
      padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.85)}px`,
      color: sideColour(side),
      fontSize: size,
      fontWeight: 600,
      letterSpacing: size * 0.28,
      textTransform: "uppercase",
    }}
  >
    {label}
  </div>
);

// One plain English noun naming what the argument is about. Empty collapses.
export const PlainWord = ({ word, size = 30 }: { word: string; size?: number }) =>
  word ? (
    <div
      style={{
        display: "flex",
        marginTop: 50,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: size * 0.3,
        textTransform: "uppercase",
        color: PALETTE.muted,
      }}
    >
      {word}
    </div>
  ) : (
    <div style={{ display: "flex", marginTop: 50 }} />
  );

export const BigLine = ({
  children,
  size,
  color = PALETTE.ink,
  marginTop = 0,
}: {
  children: string;
  size: number;
  color?: string;
  marginTop?: number;
}) => (
  <div
    style={{
      display: "flex",
      fontFamily: DISPLAY,
      fontSize: size,
      lineHeight: 0.94,
      letterSpacing: size * 0.015,
      textTransform: "uppercase",
      color,
      marginTop,
    }}
  >
    {children}
  </div>
);

// The motion is the one headline that is NOT the display face: a motion is a
// sentence someone is on the hook for. design-system.md §3 — do not "fix" this.
export const MotionLine = ({
  motion,
  keyword,
  size,
  marginTop = 0,
}: {
  motion: string;
  keyword: string;
  size: number;
  marginTop?: number;
}) => {
  const at = keyword ? motion.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  const base = {
    fontFamily: SERIF,
    fontSize: size,
    lineHeight: 1.08,
    letterSpacing: -size * 0.015,
    fontWeight: 600,
    color: PALETTE.ink,
  } as const;

  if (at < 0) {
    return <div style={{ display: "flex", marginTop, ...base }}>{motion}</div>;
  }

  // Each span is a flex item, and flexbox collapses the whitespace at its edges
  // — which is exactly where the space either side of the keyword lives, so
  // without pre-wrap the motion reads "damagedhow".
  const keep = { whiteSpace: "pre-wrap" } as const;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", marginTop, ...base }}>
      <span style={keep}>{motion.slice(0, at)}</span>
      <span style={{ ...keep, fontStyle: "italic", fontWeight: 400, color: PALETTE.laurel }}>
        {motion.slice(at, at + keyword.length)}
      </span>
      <span style={keep}>{motion.slice(at + keyword.length)}</span>
    </div>
  );
};

const Mark = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={PALETTE.muted}
       strokeWidth={1.7} strokeLinecap="round">
    <path d="M4 21.2V11a8 8 0 0 1 16 0v10.2" />
    <path d="M5.2 20.2L18.4 9.4" />
    <path d="M18.8 20.2L5.6 9.4" />
  </svg>
);

export const Lockup = ({ domain, size = 34 }: { domain: string; size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <Mark size={size} />
    <div style={{ display: "flex", fontFamily: SERIF, fontStyle: "italic",
                  fontSize: size * 0.94, color: PALETTE.ink }}>
      crux
    </div>
    <div style={{ display: "flex", fontSize: size * 0.65, letterSpacing: size * 0.105,
                  color: PALETTE.muted, textTransform: "uppercase" }}>
      {domain}
    </div>
  </div>
);

export const FootBar = ({ reference, domain }: { reference: string; domain: string }) => (
  <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
    <Rule />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 28, width: "100%" }}>
      <Meta>{reference}</Meta>
      <Lockup domain={domain} />
    </div>
  </div>
);

// One hard ask, on the last asset of a set only.
export const CtaBand = ({
  text,
  domain,
  size = 42,
  padY = 30,
  padX = 36,
}: {
  text: string;
  domain: string;
  size?: number;
  padY?: number;
  padX?: number;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      backgroundColor: PALETTE.ink,
      padding: `${padY}px ${padX}px`,
    }}
  >
    <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: size,
                  letterSpacing: size * 0.02, textTransform: "uppercase", color: PALETTE.paper }}>
      {text}
    </div>
    <div style={{ display: "flex", fontSize: size * 0.55, letterSpacing: size * 0.18,
                  color: PALETTE.paper, textTransform: "uppercase" }}>
      {domain}
    </div>
  </div>
);

// The draw band is marked on the LIVE posters only. §2 confines it to where a
// debate is read and acted on; a settled verdict is neither. See the spec, §3.
export const SplitBar = ({
  split,
  height,
  drawBand = false,
  labels = false,
  marginTop = 0,
}: {
  split: { for: number; against: number };
  height: number;
  drawBand?: boolean;
  labels?: boolean;
  marginTop?: number;
}) => (
  <div
    style={{
      display: "flex",
      position: "relative",
      width: "100%",
      height,
      marginTop,
      backgroundColor: PALETTE.track,
    }}
  >
    <div style={{ display: "flex", flex: split.for, backgroundColor: PALETTE.forSide,
                  alignItems: "center", paddingLeft: 26 }}>
      {labels ? (
        <div style={{ display: "flex", color: PALETTE.paper, fontWeight: 700,
                      fontSize: height * 0.46, textTransform: "uppercase" }}>
          {`For ${split.for}`}
        </div>
      ) : null}
    </div>
    <div style={{ display: "flex", flex: split.against, backgroundColor: PALETTE.againstSide,
                  alignItems: "center", justifyContent: "flex-end", paddingRight: 26 }}>
      {labels ? (
        <div style={{ display: "flex", color: PALETTE.paper, fontWeight: 700,
                      fontSize: height * 0.46, textTransform: "uppercase" }}>
          {`${split.against} Against`}
        </div>
      ) : null}
    </div>
    {drawBand ? (
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${DRAW_BAND_START}%`,
          width: `${DRAW_BAND_END - DRAW_BAND_START}%`,
          borderLeft: `2px dashed rgba(243,237,218,0.6)`,
          borderRight: `2px dashed rgba(243,237,218,0.6)`,
          backgroundColor: "rgba(243,237,218,0.1)",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(243,237,218,0.8)",
          fontSize: height * 0.29,
          fontWeight: 600,
          letterSpacing: height * 0.05,
        }}
      >
        DRAW
      </div>
    ) : null}
  </div>
);

// A cream panel with the engraving drawn onto it. No blend mode — satori has
// none — and the hairline is what declares the edge.
export const Plate = ({
  src,
  width,
  height,
  arch,
  caption,
  captionSize = 21,
}: {
  src: string;
  width: number;
  height: number;
  arch: boolean;
  caption?: string;
  captionSize?: number;
}) => {
  // Satori does not clip a child to its parent's overflow+radius, so the arch is
  // set on the image itself as well as on the panel that frames it.
  const radius = arch ? `${width / 2}px ${width / 2}px 0 0` : 0;

  return (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div
      style={{
        display: "flex",
        width,
        height,
        overflow: "hidden",
        backgroundColor: PLATE_CREAM,
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: radius,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={width} height={height}
           style={{ objectFit: "cover", borderRadius: radius }} />
    </div>
    {caption ? (
      <div style={{ display: "flex", marginTop: 14, fontSize: captionSize,
                    letterSpacing: captionSize * 0.3, color: PALETTE.muted }}>
        {caption}
      </div>
    ) : null}
  </div>
  );
};
