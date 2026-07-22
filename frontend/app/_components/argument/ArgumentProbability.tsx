"use client";
import { useRef } from "react";
import { ArgumentHeaderProps } from "@/app/argument/types";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

// §15: the margin must EXCEED this for a side to win.
const DRAW_MARGIN = 5;
// The share of the bar where that holds: |for - against| <= 5 with the two
// summing to 100 means for is within 2.5 points of even.
const DRAW_BAND_START = 50 - DRAW_MARGIN / 2;
const DRAW_BAND_END = 50 + DRAW_MARGIN / 2;

const ArgumentProbability = ({
  argumentHeaderData,
  status,
}: {
  argumentHeaderData: ArgumentHeaderProps;
  status: "live" | "concluded";
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { affirmativeProbability, negativeProbability } = argumentHeaderData;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Concluded bars are a frozen final result, not a running forecast —
        // render them at their final widths with no draw/count-up.
        if (status === "concluded") return;
        const tl = gsap.timeline({
          delay: 0.45,
          defaults: { duration: 1.2, ease: "power3.out" },
        });
        // The inline width styles are the end state; bars draw in from
        // their outer edges while the percentages count up alongside.
        tl.from("[data-bar]", { width: 0 }, 0)
          .from(
            "[data-count]",
            { textContent: 0, snap: { textContent: 1 } },
            0,
          )
          .from("[data-divider]", { opacity: 0, duration: 0.4 }, "-=0.45");
      });
    },
    { scope: rootRef },
  );

  // §7: a side wins only when the margin EXCEEDS 5. With the two shares summing
  // to 100, |for - against| <= 5 is exactly for in [47.5, 52.5] — so the draw
  // is a band on this bar, not a knife edge, and §14 requires it to be visible.
  const inDrawZone =
    Math.abs(affirmativeProbability - negativeProbability) <= DRAW_MARGIN;

  return (
    <div ref={rootRef} className="mb-12">
      <div className="w-full h-12 bg-surface-container-low relative flex items-center border border-outline-variant/20 overflow-hidden">
        <div
          data-bar
          className="h-full bg-primary flex items-center justify-start px-6 relative overflow-hidden"
          style={{ width: `${affirmativeProbability}%` }}
        >
          <span className="font-label text-sm text-on-primary font-bold relative z-10 whitespace-nowrap">
            AFFIRMATIVE {status === "concluded" && "FINAL "}
            <span data-count>{affirmativeProbability}</span>%
          </span>
          <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent"></div>
        </div>
        {/* §14 the draw band — you can see a debate heading for a draw, and
            that it is still winnable, without being told after the fact. */}
        <div
          className="absolute top-0 bottom-0 z-10 pointer-events-none border-x border-dashed border-white/50 bg-white/5 flex items-center justify-center"
          style={{
            left: `${DRAW_BAND_START}%`,
            width: `${DRAW_BAND_END - DRAW_BAND_START}%`,
          }}
        >
          <span className="font-label text-[8px] tracking-[0.15em] text-white/70 hidden sm:block">
            DRAW
          </span>
        </div>
        <div
          data-divider
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-glow-marker"
          style={{ left: `${affirmativeProbability}%` }}
        ></div>
        <div
          data-bar
          className="h-full bg-secondary flex items-center justify-end px-6 ml-auto relative overflow-hidden"
          style={{ width: `${negativeProbability}%` }}
        >
          <span className="font-label text-sm text-on-secondary font-bold relative z-10 whitespace-nowrap">
            NEGATIVE {status === "concluded" && "FINAL "}
            <span data-count>{negativeProbability}</span>%
          </span>
          <div className="absolute inset-0 bg-linear-to-l from-white/10 to-transparent"></div>
        </div>
      </div>
      <p className="mt-2 font-body text-[11px] text-outline">
        {inDrawZone ? (
          <span className="text-tertiary">
            Inside the draw zone — a margin of {DRAW_MARGIN} points or less ends
            in a draw, and nobody is named MVP.{" "}
            {status === "live" && "There is still time to move it."}
          </span>
        ) : (
          <>
            The marked band is the draw zone: finish within {DRAW_MARGIN} points
            of your opponent and the debate is a draw.
          </>
        )}
      </p>
    </div>
  );
};

export default ArgumentProbability;
