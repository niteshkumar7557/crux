"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

// Attach the returned ref to a score-bar wrapper containing two [data-bar]
// segments. They start level and settle onto the real split — one of the
// system's three motion moments (design-system.md §6).
//
// Level-to-split rather than the old grow-from-the-edges: this bar answers
// "which way is it going", and starting at even makes the answer an event you
// watch arrive. Growing from the edges animated the bar's existence instead,
// which is not the interesting part.
//
// Selecting on [data-bar] rather than the first two children, because the draw
// band is a child of the same wrapper and must not be animated with them.
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
      if (!bar) return;
      const segments = bar.querySelectorAll<HTMLElement>("[data-bar]");
      if (segments.length < 2) return;
      if (!shouldAnimate(`${pathname}#scorebar`)) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // The inline width styles are the end state; `from` treats them as the
        // destination and starts both halves level.
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
