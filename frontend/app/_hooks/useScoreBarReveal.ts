"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

// Attach the returned ref to a score-bar wrapper whose first two children are
// the affirmative/negative segments; they draw in from their outer edges.
//
// A feed renders dozens of these. They all ask the same question with the same
// key and the batch memo in animateOnce makes sure they get the same answer —
// otherwise the first card would draw and the rest would sit there.
export function useScoreBarReveal<T extends HTMLElement>(delay = 0.3) {
  const barRef = useRef<T>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar || bar.children.length < 2) return;
      if (!shouldAnimate(`${pathname}#scorebar`)) return;
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
