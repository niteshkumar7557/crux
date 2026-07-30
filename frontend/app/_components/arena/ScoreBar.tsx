"use client";

// The feed's split bar. No draw band here — see MotionProbability for why.
// See design-system.md §2, §6.

import { useScoreBarReveal } from "@/app/_hooks/useScoreBarReveal";

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
