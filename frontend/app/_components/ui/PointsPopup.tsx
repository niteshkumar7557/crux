"use client";
import { useEffect, useRef } from "react";
import { LuSparkles, LuX } from "react-icons/lu";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import { awardLines, teachingLine, type Award } from "./awardCopy";

// §14 the points pop-up — "the single most important piece of feedback in the
// product". Every accepted comment shows what it earned and exactly why, so
// the scoring rules are taught through play instead of discovered by surprise.

const DISMISS_MS = 6000;

const PointsPopup = ({
  award,
  onDismiss,
}: {
  award: Award;
  onDismiss: () => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Held in a ref so the auto-dismiss timer keys off the award alone. The
  // composer re-renders on every keystroke, and depending on the callback
  // would restart the countdown each time a user typed.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (rootRef.current && window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(
        rootRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      );
    }
    const t = setTimeout(() => dismissRef.current(), DISMISS_MS);
    return () => clearTimeout(t);
  }, [award]);

  const teach = teachingLine(award);

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      className="fixed bottom-32 right-6 z-60 max-w-xs bg-surface-container-lowest border-l-4 border-primary p-5 shadow-glow-primary flex items-start gap-4"
    >
      <div className="shrink-0 mt-1">
        <LuSparkles className="text-primary text-xl" />
      </div>
      <div className="grow">
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-3xl font-bold text-primary leading-none">
            +{award.points}
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            logic
          </span>
        </div>
        {/* The arithmetic, one step per line — §14 shows it rather than hiding it. */}
        <div className="mt-2 space-y-0.5">
          {awardLines(award).map((line) => (
            <p
              key={line}
              className="font-body text-xs leading-relaxed text-on-surface-variant"
            >
              {line}
            </p>
          ))}
        </div>
        {teach && (
          <p className="font-body text-xs leading-relaxed text-outline mt-2">
            {teach}
          </p>
        )}
        <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-3 border-t border-outline-variant/20 pt-2">
          Season total {award.seasonLogic} · Rank #{award.seasonRank}
        </p>
      </div>
      <button
        className="shrink-0 text-outline hover:text-white cursor-pointer"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <LuX className="text-sm" />
      </button>
    </div>
  );
};

export default PointsPopup;
