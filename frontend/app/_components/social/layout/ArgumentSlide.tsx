// Slides 02 to N-1 of the carousel. Six of these, alternating sides.
//
// The referee's condensed line is the headline; the author's verbatim argument
// sits beneath it, set in Space Grotesk with no quotation marks — that is how an
// argument is set in the product. design-system.md §3.

import { PALETTE } from "../socialTokens";
import type { SocialPayload } from "../socialAssets";
import { BigLine, FootBar, Frame, Meta, PlainWord, SideBox, TopRow, sideColour } from "./Frame";

const LABEL = { for: "The case for", against: "The case against" } as const;

export function ArgumentSlide({ payload }: { payload: SocialPayload }) {
  const slide = payload.slide;
  if (!slide) return <Frame>{null}</Frame>;

  const accent = sideColour(slide.side);

  return (
    <Frame>
      <TopRow
        left={<SideBox side={slide.side} label={LABEL[slide.side]} />}
        right={<Meta>{`${String(payload.slideNumber).padStart(2, "0")} / ${payload.slideTotal}`}</Meta>}
      />

      <PlainWord word={slide.word} />

      <BigLine size={116} marginTop={24}>
        {slide.line}
      </BigLine>

      {/* The only flexible gap. Headline hangs from the top; the quote rests on
          the footer, at the same height on every slide. */}
      <div style={{ display: "flex", flex: 1, minHeight: 56 }} />

      {slide.quote ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderLeft: `4px solid ${accent}`,
            paddingLeft: 30,
            marginBottom: 44,
          }}
        >
          <div style={{ display: "flex", fontSize: 31, lineHeight: 1.5, color: PALETTE.ink }}>
            {slide.quote}
          </div>
          {slide.handle ? (
            <div style={{ display: "flex", marginTop: 24, fontSize: 28, fontWeight: 500,
                          color: PALETTE.muted }}>
              {slide.handle}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", marginBottom: 44 }} />
      )}

      <FootBar reference={payload.reference} domain={payload.domain} />
    </Frame>
  );
}
