"use client";

// The split settling into place — one of the product's three animated moments. See design-system.md §6.

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

export function useScoreBarReveal<T extends HTMLElement>(delay = 0.3) {
  const barRef = useRef<T>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar) return;
      const segments = bar.querySelectorAll<HTMLElement>("[data-bar]");
      if (segments.length < 2) return;
      if (!shouldAnimate(`${pathname}#scorebar`)) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(segments, {
          width: "50%",
          duration: 1.1,
          ease: "power3.out",
          delay,
        });
      });
    },
    { scope: barRef },
  );

  return barRef;
}
