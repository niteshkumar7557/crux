"use client";

// The live win split, with the draw band marked. The band belongs here and not on
// the feed's ScoreBar — it is a rule about how a debate ENDS, so it goes where a
// debate is read and acted on. Spec: game-theory.md §11, §19

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
        if (status === "concluded") return;
        const tl = gsap.timeline({
          delay: 0.45,
          defaults: { duration: 1.2, ease: "power3.out" },
        });
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
