"use client";

// Once the claim scrolls under the navbar, a one-line restatement slides out from
// behind it — so a reader deep in a column can still see the sentence being argued.
// Measures Navbar's data-navbar for its offset.

import { useEffect, useState, type RefObject } from "react";
import { DEBATE_GUTTER } from "./debateLayout";

const StickyMotion = ({
  watch,
  before,
  highlight,
  after,
}: {
  watch: RefObject<HTMLElement | null>;
  before: string;
  highlight: string;
  after: string;
}) => {
  const [navHeight, setNavHeight] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-navbar]");
    if (!nav) return;
    const measure = () => setNavHeight(nav.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: `-${navHeight}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch, navHeight]);

  return (
    <div
      style={{ top: navHeight }}
      className="pointer-events-none fixed inset-x-0 z-40 overflow-hidden"
      aria-hidden={!shown}
    >
      <div
        className={`pointer-events-auto border-b border-ink-faint bg-paper/95 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none ${
          shown ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div
          className={`mx-auto flex max-w-screen-2xl items-baseline gap-3 py-2.5 ${DEBATE_GUTTER}`}
        >
          <span className="shrink-0 font-label text-[0.55rem] uppercase tracking-[0.28em] text-ink-soft">
            Motion
          </span>
          <p className="truncate font-headline text-[0.95rem] leading-snug text-ink">
            {before}
            {highlight && <span className="italic text-laurel">{highlight}</span>}
            {after}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StickyMotion;
