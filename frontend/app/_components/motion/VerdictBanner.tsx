"use client";

// The ruling, and the payout breakdown that explains it.
// Spec: game-theory.md §11, §12, §19

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MatchState } from "@/app/motion/types";
import ShareVerdict from "@/app/_components/motion/ShareVerdict";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

type Winner = MatchState["winner"];

const RULINGS: Record<
  "for" | "against" | "draw" | "walkover",
  { label: string; labelClass: string }
> = {
  for: { label: "Affirmative wins", labelClass: "text-side-for" },
  against: { label: "Negative wins", labelClass: "text-side-against" },
  draw: { label: "Draw", labelClass: "text-side-draw" },
  walkover: { label: "Unopposed", labelClass: "text-ink-soft" },
};

function payoutBreakdown(winner: Winner): string {
  if (winner === "walkover") {
    return "One side never argued, so this concluded unopposed: nobody scored anything — no logic, no record, not even the author's bonus.";
  }
  if (winner === "draw") {
    return "A draw pays nothing to either side, and names no MVP — there is no winning side to take one from. The motion's author still earns +10 logic.";
  }
  return "Winning side +10 logic, and +25 instead for the MVP — always chosen from the winning side. The author earns +10. The losing side loses 5 points from their season score only; all-time logic never falls.";
}

const VerdictBanner = ({
  winner,
  margin,
  mvpUsername,
  verdictText,
  affirmative,
  negative,
  shareUrl,
  certificateHref,
}: {
  winner: Winner;
  margin: number | null;
  mvpUsername: string | null;
  verdictText: string | null;
  affirmative: number;
  negative: number;
  shareUrl: string;
  certificateHref: string;
}) => {
  const ruling = RULINGS[winner ?? "draw"];
  const showMargin = winner !== "walkover" && margin !== null;
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      if (!shouldAnimate(`${pathname}#verdict`)) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-stamp]", {
          scale: 1.35,
          opacity: 0,
          duration: 0.5,
          delay: 0.3,
          ease: "power4.out",
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="mb-10 border border-ink-faint bg-band p-6 md:p-8"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Verdict
        </p>
        <span className="ml-auto self-center">
          <ShareVerdict url={shareUrl} certificateHref={certificateHref} />
        </span>
      </div>

      <p
        data-stamp
        className={`mt-4 inline-block origin-left display-type text-[clamp(2rem,4.4vw,3.2rem)] ${ruling.labelClass}`}
      >
        {ruling.label}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-label text-[0.62rem] uppercase tracking-[0.22em]">
        {showMargin && (
          <span className="text-ink-soft tabular-nums">
            {affirmative} – {negative} · Margin {margin}
          </span>
        )}
        {mvpUsername && (
          <Link
            href={`/profile/${mvpUsername}`}
            className="text-laurel transition-colors hover:text-laurel-bright"
          >
            MVP — @{mvpUsername}
          </Link>
        )}
      </div>

      {verdictText && (
        <p className="mt-6 max-w-3xl font-headline text-xl italic leading-relaxed text-ink md:text-2xl">
          {verdictText}
        </p>
      )}

      <p className="mt-7 max-w-3xl border-t border-ink-faint pt-4 font-body text-xs leading-relaxed text-ink-soft">
        {payoutBreakdown(winner)}
      </p>
    </div>
  );
};

export default VerdictBanner;
