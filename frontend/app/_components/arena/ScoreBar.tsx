"use client";
import { useScoreBarReveal } from "@/app/_hooks/useScoreBarReveal";

// The FOR/AGAINST split bar on every feed card. "lg" is the featured-card
// variant; "sm" the compact card variant.
//
// FOR is always the green family and AGAINST always terracotta — never a
// red/green stoplight pair (design-system.md §2).
//
// **No draw band here.** The feed used to mark it on every bar, which put a
// pair of hairlines through the middle of a dozen cards at once and made the
// page look ruled rather than read. The band is a rule about how a debate ends,
// so it is marked where that matters and where the bar is tall enough to carry
// it: the debate page's own probability bar (MotionProbability), which still
// draws it and still states the margin. A feed card is a doorway, not a
// scoreboard — nothing is decided from this bar.
const ScoreBar = ({
  affirmative,
  negative,
  size = "sm",
}: {
  affirmative: number;
  negative: number;
  size?: "sm" | "lg";
}) => {
  const barRef = useScoreBarReveal<HTMLDivElement>();

  return (
    <div
      ref={barRef}
      role="img"
      aria-label={`Affirmative ${affirmative} percent, negative ${negative} percent`}
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
    </div>
  );
};

export default ScoreBar;
