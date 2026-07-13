"use client";
import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

// Attach the returned ref to a score-bar wrapper whose first two children are
// the affirmative/negative segments; they draw in from their outer edges.
export function useScoreBarReveal<T extends HTMLElement>(delay = 0.3) {
  const barRef = useRef<T>(null);

  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar || bar.children.length < 2) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const defaults = { duration: 1.1, ease: "power3.out", delay };
        gsap.from(bar.children[0], {
          scaleX: 0,
          transformOrigin: "left center",
          ...defaults,
        });
        gsap.from(bar.children[1], {
          scaleX: 0,
          transformOrigin: "right center",
          ...defaults,
        });
      });
    },
    { scope: barRef },
  );

  return barRef;
}
