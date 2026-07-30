"use client";

// The single most important piece of feedback in the product: what you earned and
// the arithmetic behind it, priced rule by rule. The ticking numeral is aria-hidden
// with an sr-only line beside it, or a screen reader reads the award ~30 times.
// Spec: game-theory.md §19

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuX } from "react-icons/lu";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import Portal from "./Portal";
import { awardLedger, awardNote, type Award } from "./awardCopy";

const DISMISS_MS = 12000;

const PointsPopup = ({
  award,
  onDismiss,
}: {
  award: Award;
  onDismiss: () => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [held, setHeld] = useState(false);

  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!rootRef.current || !window.matchMedia(MOTION_OK).matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      );
      if (!countRef.current) return;
      const counter = { value: 0 };
      gsap.to(counter, {
        value: award.points,
        duration: 0.7,
        delay: 0.15,
        ease: "power2.out",
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = `+${Math.round(counter.value)}`;
          }
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, [award]);

  useEffect(() => {
    if (held) return;
    const t = setTimeout(() => dismissRef.current(), DISMISS_MS);
    return () => clearTimeout(t);
  }, [award, held]);

  const rows = awardLedger(award);
  const note = awardNote(award);

  return (
    <Portal>
      <div
        ref={rootRef}
        role="status"
        aria-live="polite"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className="fixed bottom-32 right-6 z-60 w-76 max-w-[calc(100vw-3rem)] bg-raised border border-ink-faint shadow-cast-deep"
      >
        <div className="flex items-center justify-between border-b border-ink-faint px-5 py-3">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-laurel font-bold">
            Logic awarded
          </span>
          <button
            className="shrink-0 text-ink-soft hover:text-ink transition-colors"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <LuX className="text-sm" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="sr-only">
            {award.points} logic awarded. Season total {award.seasonLogic}, rank{" "}
            {award.seasonRank}.
          </p>
          <div aria-hidden="true" className="flex items-baseline gap-2">
            <span
              ref={countRef}
              className="display-type text-5xl text-laurel leading-none tabular-nums"
            >
              +{award.points}
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              logic
            </span>
          </div>

          <dl className="mt-5 space-y-1.5">
            {rows.map((row) => (
              <div
                key={row.label}
                className={`flex items-baseline justify-between gap-4 ${
                  row.total
                    ? "mt-1.5 border-t border-ink-faint pt-1.5"
                    : ""
                }`}
              >
                <dt
                  className={`font-label text-[10px] uppercase tracking-[0.15em] ${
                    row.total ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {row.label}
                </dt>
                <dd
                  className={`font-body text-sm tabular-nums ${
                    row.total ? "font-bold text-laurel" : "text-ink-soft"
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {note && (
            <p className="mt-4 font-headline text-xs italic leading-relaxed text-ink-soft">
              {note}
            </p>
          )}

          <Link
            href="/rules"
            className="mt-4 inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
          >
            How scoring works
            <LuArrowRight className="text-[11px]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 border-t border-ink-faint">
          <div className="px-5 py-3">
            <span className="block font-label text-[9px] uppercase tracking-[0.2em] text-ink-soft mb-0.5">
              Season
            </span>
            <span className="font-body text-sm text-ink tabular-nums">
              {award.seasonLogic}
            </span>
          </div>
          <div className="border-l border-ink-faint px-5 py-3">
            <span className="block font-label text-[9px] uppercase tracking-[0.2em] text-ink-soft mb-0.5">
              Rank
            </span>
            <span className="font-body text-sm text-ink tabular-nums">
              #{award.seasonRank}
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PointsPopup;
