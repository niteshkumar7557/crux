"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

// A textarea that grows with its content instead of scrolling a fixed box, so a
// long argument, bio, or claim stays fully visible while it's written. It grows
// up to `maxHeight` and only then scrolls, so it can never push the page around
// without bound. Any CSS `min-height` on `className` still sets the floor.
interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** px height at which it stops growing and starts scrolling. */
  maxHeight?: number;
}

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function AutoGrowTextarea(
    { value, maxHeight = 240, rows = 1, className = "", onChange, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [maxHeight]);

    // Re-fit whenever the controlled value changes (covers programmatic resets
    // like clearing after a post, not just keystrokes).
    useLayoutEffect(resize, [value, resize]);

    return (
      <textarea
        ref={setRefs}
        rows={rows}
        value={value}
        onChange={(e) => {
          resize();
          onChange?.(e);
        }}
        className={`resize-none ${className}`}
        {...rest}
      />
    );
  },
);

export default AutoGrowTextarea;
