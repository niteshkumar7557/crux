"use client";

// A textarea that grows to its content.

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
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
