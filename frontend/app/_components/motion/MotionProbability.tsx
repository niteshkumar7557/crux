"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { MotionHeaderProps } from "@/app/motion/types";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";
import { drawBandStyle } from "@/app/_utils/drawBand";

const MotionProbability = ({
  motionHeaderData,
  status,
}: {
  motionHeaderData: MotionHeaderProps;
  status: "live" | "concluded";
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { affirmativeProbability, negativeProbability } = motionHeaderData;

  useGSAP(
    () => {
      if (!shouldAnimate(pathname)) return;
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
  // is a band on this bar, not a knife edge.
  //
  // Only while the debate is live: once the result is final the band is a
  // threshold nobody can still cross, and would read as a live target on a bar
  // that can no longer move.
  const showDrawBand = status === "live";

  return (
    <div ref={rootRef} className="mb-12">
      <div className="w-full h-12 bg-band relative flex items-center border border-ink-faint overflow-hidden">
        <div
          data-bar
          className="h-full bg-side-for flex items-center justify-start px-6 relative overflow-hidden"
          style={{ width: `${affirmativeProbability}%` }}
        >
          <span className="font-label text-sm text-paper font-bold relative z-10 whitespace-nowrap">
            AFFIRMATIVE {status === "concluded" && "FINAL "}
            <span data-count>{affirmativeProbability}</span>%
          </span>
        </div>
        {/* §14 the draw band — you can see a debate heading for a draw, and
            that it is still winnable, without being told after the fact. */}
        {showDrawBand && (
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none border-x border-dashed border-paper/60 bg-paper/10 flex items-center justify-center"
            style={drawBandStyle}
          >
            <span className="font-label text-[8px] tracking-[0.15em] text-paper/80 hidden sm:block">
              DRAW
            </span>
          </div>
        )}
        <div
          data-divider
          className="absolute top-0 bottom-0 w-0.5 bg-paper z-20"
          style={{ left: `${affirmativeProbability}%` }}
        ></div>
        <div
          data-bar
          className="h-full bg-side-against flex items-center justify-end px-6 ml-auto relative overflow-hidden"
          style={{ width: `${negativeProbability}%` }}
        >
          <span className="font-label text-sm text-paper font-bold relative z-10 whitespace-nowrap">
            NEGATIVE {status === "concluded" && "FINAL "}
            <span data-count>{negativeProbability}</span>%
          </span>
        </div>
      </div>
    </div>
  );
};

export default MotionProbability;
