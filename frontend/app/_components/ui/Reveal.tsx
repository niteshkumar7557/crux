"use client";
import { ReactNode, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollTrigger, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

// Rise-in for every [data-reveal] descendant. Server pages wrap sections in
// this to get the feed-stagger treatment: elements start dimmed (never fully
// hidden), then batch-animate as they scroll into view — above-the-fold
// content fires immediately.
//
// Once per page per session (see animateOnce): coming back to a page you have
// already met should put the content in front of you, not re-introduce it.
const Reveal = ({
  children,
  className,
  stagger = 0.08,
  y = 24,
  animationKey,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  /** Override the surface identity; defaults to the pathname. */
  animationKey?: string;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      if (!shouldAnimate(animationKey ?? pathname)) return;
      const targets = gsap.utils.toArray<HTMLElement>(
        rootRef.current!.querySelectorAll("[data-reveal]"),
      );
      if (targets.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set(targets, { opacity: 0.25, y });
        ScrollTrigger.batch(targets, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger,
              ease: "power3.out",
              clearProps: "opacity,transform",
            }),
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
};

export default Reveal;
