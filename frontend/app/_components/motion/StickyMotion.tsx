"use client";
import { useEffect, useState, type RefObject } from "react";
import { DEBATE_GUTTER } from "./debateLayout";

// The motion, kept on screen after its headline has scrolled away.
//
// A debate page is a long scroll of arguments about one sentence, and that
// sentence was only visible at the very top of it. Halfway down a column you
// could be reading a case for something you could no longer read — and the fix
// people reach for is scrolling back up, losing their place, to re-read eleven
// words. So the claim follows: once the h1 goes under the navbar, a one-line
// restatement of it slides out from behind the bar and stays there.
//
// **It is a reminder, not a control.** No countdown, no share, no "back to top"
// — those all live in the header, and a second bar competing with the first is
// how a page ends up with two mastheads. One eyebrow, one line of the claim.
//
// The rail is clipped rather than faded: the outer element is a fixed strip
// sitting exactly at the navbar's bottom edge with `overflow-hidden`, and the
// bar inside it translates from -100% to 0. The bar is therefore genuinely
// hidden *behind* the navbar between states — an opacity fade would have shown
// it drifting over the page, and translating without the clip would have left it
// visible through the navbar's 85%-opaque paper.
const StickyMotion = ({
  watch,
  before,
  highlight,
  after,
}: {
  /** The h1 this bar stands in for. It shows once that heading is out of view. */
  watch: RefObject<HTMLElement | null>;
  before: string;
  highlight: string;
  after: string;
}) => {
  // The navbar's height is not a constant — it carries a wrapping search field
  // and grows at the md breakpoint — so it is measured rather than hardcoded.
  // Guessing it wrong leaves either a seam of page showing between the two bars
  // or the claim tucked under the navigation.
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
    // The top inset pulls the observer's edge down to the navbar's underside, so
    // "out of view" means "hidden by the navbar" rather than "off the viewport"
    // — otherwise the claim would be uncovered for the last 60px of the scroll.
    //
    // `boundingClientRect.top < 0` is what keeps the bar off the page on the way
    // *in*: a headline that has not been reached yet is also not intersecting,
    // and without the check the bar would greet a deep link before the reader
    // ever scrolled.
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
          {/* Same face and same laurel-italic keyword as the h1 it replaces —
              shrunk to one line, not restyled into a label. It has to read as
              the same sentence you scrolled past. */}
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
