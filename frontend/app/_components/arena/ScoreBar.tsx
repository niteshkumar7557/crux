"use client";
import { useScoreBarReveal } from "@/app/_hooks/useScoreBarReveal";

// The affirmative/negative duotone bar used on every feed card. "lg" is the
// featured-card variant; "sm" the compact card variant.
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
  const wrapper =
    size === "lg"
      ? "w-full h-5 flex gap-0.5"
      : "h-2 w-full bg-surface-container-highest flex mb-4";

  return (
    <div ref={barRef} className={wrapper}>
      <div
        className="h-full bg-primary-container"
        style={{ width: `${affirmative}%` }}
      ></div>
      <div
        className="h-full bg-secondary-container"
        style={{ width: `${negative}%` }}
      ></div>
    </div>
  );
};

export default ScoreBar;
