"use client";
import { useScoreBarReveal } from "@/app/_hooks/useScoreBarReveal";
import { drawBandStyle, DRAW_MARGIN } from "@/app/_utils/drawBand";

// The FOR/AGAINST split bar on every feed card. "lg" is the featured-card
// variant; "sm" the compact card variant.
//
// FOR is always the green family and AGAINST always terracotta — never a
// red/green stoplight pair (design-system.md §2). The draw band is marked
// because a debate inside it has not been won by anyone yet, and a bar that
// hides that reads as a lead when it is actually a tie.
//
// Except once the debate is concluded: then the band is a threshold nobody can
// still cross, and drawing it on a frozen result reads as a live target. Same
// rule the debate page's probability bar follows.
const ScoreBar = ({
  affirmative,
  negative,
  size = "sm",
  status,
}: {
  affirmative: number;
  negative: number;
  size?: "sm" | "lg";
  status?: string;
}) => {
  const barRef = useScoreBarReveal<HTMLDivElement>();
  const live = status !== "concluded";

  return (
    <div
      ref={barRef}
      role="img"
      aria-label={`Affirmative ${affirmative} percent, negative ${negative} percent${
        live ? `. A margin of ${DRAW_MARGIN} points or less is a draw.` : ""
      }`}
      className={`relative flex w-full overflow-hidden bg-ink-wash ${
        size === "lg" ? "h-5" : "mb-4 h-2"
      }`}
    >
      <div
        data-bar
        className="h-full bg-side-for"
        style={{ width: `${affirmative}%` }}
      />
      <div
        data-bar
        className="h-full bg-side-against"
        style={{ width: `${negative}%` }}
      />
      {live && (
        // Sits on the fills, never on bare track — the two shares always sum to
        // 100 — so `paper` is the contrast colour in both themes.
        //
        // Solid rather than dashed (the debate page's taller bar is dashed):
        // at 2px high a dashed border resolves to about one dash and reads as
        // a rendering fault rather than a marked threshold.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 border-x border-paper/80"
          style={drawBandStyle}
        />
      )}
    </div>
  );
};

export default ScoreBar;
