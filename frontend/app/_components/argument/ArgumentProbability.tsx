"use client";
import { useRef } from "react";
import { ArgumentHeaderProps } from "@/app/argument/types";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const ArgumentProbability = ({
  argumentHeaderData,
}: {
  argumentHeaderData: ArgumentHeaderProps;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { affirmativeProbability, negativeProbability } = argumentHeaderData;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
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

  return (
    <div
      ref={rootRef}
      className="w-full h-12 bg-surface-container-low relative flex items-center mb-12 border border-outline-variant/20 overflow-hidden"
    >
      <div
        data-bar
        className="h-full bg-primary flex items-center justify-start px-6 relative overflow-hidden"
        style={{ width: `${affirmativeProbability}%` }}
      >
        <span className="font-label text-sm text-on-primary font-bold relative z-10 whitespace-nowrap">
          AFFIRMATIVE <span data-count>{affirmativeProbability}</span>%
        </span>
        <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent"></div>
      </div>
      <div
        data-divider
        className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
        style={{ left: `${affirmativeProbability}%` }}
      ></div>
      <div
        data-bar
        className="h-full bg-secondary flex items-center justify-end px-6 ml-auto relative overflow-hidden"
        style={{ width: `${negativeProbability}%` }}
      >
        <span className="font-label text-sm text-on-secondary font-bold relative z-10 whitespace-nowrap">
          NEGATIVE <span data-count>{negativeProbability}</span>%
        </span>
        <div className="absolute inset-0 bg-linear-to-l from-white/10 to-transparent"></div>
      </div>
    </div>
  );
};

export default ArgumentProbability;
