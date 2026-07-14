"use client";
import { ReactNode, useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, MOTION_OK } from "@/app/_utils/gsap";

// Rise-in for every [data-reveal] descendant. Server pages wrap sections in
// this to get the feed-stagger treatment: elements start dimmed (never fully
// hidden), then batch-animate as they scroll into view — above-the-fold
// content fires immediately.
const Reveal = ({
  children,
  className,
  stagger = 0.08,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
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
