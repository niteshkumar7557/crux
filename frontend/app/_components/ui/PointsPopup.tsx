"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuX } from "react-icons/lu";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import { awardLedger, awardNote, type Award } from "./awardCopy";

// §14 the points pop-up — "the single most important piece of feedback in the
// product". Every accepted argument shows what it earned and exactly why, so the
// scoring rules are taught through play instead of discovered by surprise.
//
// Shaped as a ruled slip rather than a toast, because that is the arena's own
// vocabulary: the certificate, the profile's standing row and the argument
// header all state a value as a tracked label over a numeral, divided by
// hairlines. A sparkle-and-sentence toast is the one register this product
// does not speak — and it read as a generic app notification sitting next to
// the far more formal page behind it.

const DISMISS_MS = 12000;

const PointsPopup = ({
  award,
  onDismiss,
}: {
  award: Award;
  onDismiss: () => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // Reading it or reaching for the rules link holds it open — a panel that
  // vanishes from under the cursor is the reason people never finish reading
  // the arithmetic. Keyboard focus counts too, or tabbing to the link would
  // start a countdown the user cannot see.
  const [held, setHeld] = useState(false);

  // Held in a ref so the auto-dismiss timer keys off the award alone. The
  // composer re-renders on every keystroke, and depending on the callback
  // would restart the countdown each time a user typed.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  // Entrance only, once per award. The probability bar counts its percentages
  // up, and the same treatment was tried on this number — but this element is
  // an aria-live region, and animating the text mutates it ~30 times, which a
  // screen reader may read out ~30 times. On a single digit it bought almost
  // nothing, so it lost the trade.
  useEffect(() => {
    if (rootRef.current && window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(
        rootRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      );
    }
  }, [award]);

  // No timer at all while it is held; leaving gives the full window back
  // rather than the remainder, so a glance never costs you the read.
  useEffect(() => {
    if (held) return;
    const t = setTimeout(() => dismissRef.current(), DISMISS_MS);
    return () => clearTimeout(t);
  }, [award, held]);

  const rows = awardLedger(award);
  const note = awardNote(award);

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="fixed bottom-32 right-6 z-60 w-76 max-w-[calc(100vw-3rem)] bg-surface-container-lowest border border-primary/30 shadow-glow-primary"
    >
      <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-3">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
          Logic awarded
        </span>
        <button
          className="shrink-0 text-outline hover:text-on-surface transition-colors"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <LuX className="text-sm" />
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-5xl font-bold text-primary leading-none">
            +{award.points}
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            logic
          </span>
        </div>

        {/* The arithmetic, priced step by step — §14 shows it rather than
            hiding it. A description list because that is what it is. */}
        <dl className="mt-5 space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-4 ${
                row.total
                  ? "mt-1.5 border-t border-outline-variant/20 pt-1.5"
                  : ""
              }`}
            >
              <dt
                className={`font-label text-[10px] uppercase tracking-[0.15em] ${
                  row.total ? "text-on-surface" : "text-outline"
                }`}
              >
                {row.label}
              </dt>
              <dd
                className={`font-body text-sm tabular-nums ${
                  row.total ? "font-bold text-primary" : "text-on-surface-variant"
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {note && (
          <p className="mt-4 font-headline text-xs italic leading-relaxed text-on-surface-variant">
            {note}
          </p>
        )}

        {/* Where the rest of the arithmetic is written down. The slip explains
            this one award; the rules explain every award. */}
        <Link
          href="/rules"
          className="mt-4 inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.15em] text-outline hover:text-primary transition-colors"
        >
          How scoring works
          <LuArrowRight className="text-[11px]" />
        </Link>
      </div>

      <div className="grid grid-cols-2 border-t border-outline-variant/20">
        <div className="px-5 py-3">
          <span className="block font-label text-[9px] uppercase tracking-[0.2em] text-outline mb-0.5">
            Season
          </span>
          <span className="font-body text-sm text-on-surface tabular-nums">
            {award.seasonLogic}
          </span>
        </div>
        <div className="border-l border-outline-variant/20 px-5 py-3">
          <span className="block font-label text-[9px] uppercase tracking-[0.2em] text-outline mb-0.5">
            Rank
          </span>
          <span className="font-body text-sm text-on-surface tabular-nums">
            #{award.seasonRank}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PointsPopup;
