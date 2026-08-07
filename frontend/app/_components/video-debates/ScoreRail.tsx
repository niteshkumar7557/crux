"use client";

// The running score, kept in view while the record is read.
//
// A pip only takes a side once its round has been ruled: the shape of the
// programme is not a spoiler, the outcome is.

import { useEffect, useState } from "react";
import type { DebateSide, PlaybackManifestV1 } from "@/app/video-debates/types";

const PIP_CLASS = {
  pending: "border-ink-faint bg-paper text-ink-soft",
  for: "border-side-for bg-side-for/15 text-side-for",
  against: "border-side-against bg-side-against/15 text-side-against",
} as const;

const ScoreRail = ({
  manifest,
  revealedRoundNumbers,
  roundScore,
}: {
  manifest: PlaybackManifestV1;
  revealedRoundNumbers: number[];
  roundScore: Record<DebateSide, number>;
}) => {
  const revealed = new Set(revealedRoundNumbers);
  // Duplicated from motion/StickyMotion rather than shared: extracting it would
  // edit debate-page code, and this is ten lines. Extract if a third one appears.
  const [navHeight, setNavHeight] = useState(0);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-navbar]");
    if (!nav) return;
    const measure = () => setNavHeight(nav.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-label="Running score"
      style={{ top: navHeight }}
      className="sticky z-30 -mx-6 border-y border-ink-faint bg-paper/90 px-6 py-3 backdrop-blur-md md:-mx-8 md:px-8"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="font-label text-[0.7rem] uppercase tracking-[0.28em] text-side-for">
          FOR {roundScore.for}
        </p>
        <ol className="flex flex-1 flex-wrap gap-2">
          {manifest.rounds.map((result) => {
            const isRevealed = revealed.has(result.number);
            const tone = isRevealed ? result.winner : "pending";
            return (
              <li key={result.number}>
                <span
                  className={`flex min-w-24 flex-col gap-0.5 border px-3 py-1.5 ${PIP_CLASS[tone]}`}
                >
                  <span className="font-label text-[0.55rem] uppercase tracking-[0.2em]">
                    Round {result.number}
                  </span>
                  <span className="font-label text-[0.6rem] uppercase tracking-[0.2em]">
                    {isRevealed
                      ? `${result.winner.toUpperCase()} ${Math.max(result.for_score, result.against_score)}`
                      : "Not yet ruled"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="font-label text-[0.7rem] uppercase tracking-[0.28em] text-side-against">
          AGAINST {roundScore.against}
        </p>
      </div>
    </section>
  );
};

export default ScoreRail;
