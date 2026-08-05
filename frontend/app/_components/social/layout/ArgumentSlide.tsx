// Slides 02 to N-1 of the carousel. Six of these, alternating sides.
//
// The referee's condensed line is the headline; the author's verbatim argument
// sits beneath it, set in Space Grotesk with no quotation marks — that is how an
// argument is set in the product. design-system.md §3.

import { PALETTE } from "../socialTokens";
import type { SocialPayload } from "../socialAssets";
import { argumentBudget, blockHeight } from "../socialBoxes";
import { fitScaled, linesAt, scaled } from "../socialFit";
import { BigLine, FootBar, Frame, Meta, PlainWord, SideBox, TopRow, sideColour } from "./Frame";

const LABEL = { for: "The case for", against: "The case against" } as const;

const QUOTE_MAX_SIZE = 31;
const QUOTE_LINE_HEIGHT = 1.5;
const HANDLE_BLOCK = 24 + 28;
const HEADLINE_MAX = 116;
const HEADLINE_MIN = 52;
const HEADLINE_LINE_HEIGHT = 0.94;

export function ArgumentSlide({ payload }: { payload: SocialPayload }) {
  const slide = payload.slide;
  if (!slide) return <Frame>{null}</Frame>;

  const accent = sideColour(slide.side);

  // The quote is the author's verbatim words and is already capped, so it is
  // measured first; the headline is then fitted into whatever height is left.
  // Sizing it fixed is what printed a six-line headline through the quote.
  const quoteSize = scaled(QUOTE_MAX_SIZE, payload.sizes.body);
  const budget = argumentBudget(
    slide.quote
      ? blockHeight(
          linesAt(slide.quote, "body", argumentBudget(0, 0).width, quoteSize),
          quoteSize,
          QUOTE_LINE_HEIGHT,
        )
      : 0,
    slide.quote && slide.handle ? HANDLE_BLOCK : 0,
  );

  const headlineSize = fitScaled(
    {
      text: slide.line,
      face: "display",
      width: budget.width,
      height: budget.headline,
      lineHeight: HEADLINE_LINE_HEIGHT,
      max: HEADLINE_MAX,
      min: HEADLINE_MIN,
    },
    payload.sizes.headline,
  );

  return (
    <Frame pad={scaled(66, payload.sizes.pad)}>
      <TopRow
        left={<SideBox side={slide.side} label={LABEL[slide.side]} />}
        right={<Meta>{`${String(payload.slideNumber).padStart(2, "0")} / ${payload.slideTotal}`}</Meta>}
      />

      <PlainWord word={slide.word} size={scaled(30, payload.sizes.word)} />

      <BigLine size={headlineSize} marginTop={24}>
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
          <div style={{ display: "flex", fontSize: quoteSize, lineHeight: QUOTE_LINE_HEIGHT,
                        color: PALETTE.ink }}>
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
