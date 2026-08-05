"use client";

// An argument capped at eight lines. §6 allows 2000 characters, so this governs
// the outlier rather than routine text — and the control only appears when the
// text is genuinely clamped, since "read on" under a paragraph that already
// ended is worse than no clamp at all.

import { useCallback, useEffect, useRef, useState } from "react";

const ClampedText = ({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || expanded) return;
    // The +1 absorbs sub-pixel line-height rounding, which otherwise reports a
    // one-pixel overflow on text that fits exactly.
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <>
      <p ref={ref} className={`${expanded ? "" : "line-clamp-8"} ${className}`}>
        {text}
      </p>
      {clamped && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 cursor-pointer font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
        >
          Read on
        </button>
      )}
    </>
  );
};

export default ClampedText;
