"use client";

// The verdict, given the whole screen. Presentational only — the Portal, the scrim
// and the focus handling are VerdictTakeover's, so this stays renderable on the
// server and therefore testable.

import { useRef } from "react";
import type { DebateSide, PlaybackManifestV1, RoundTimeline } from "@/app/video-debates/types";
import type { VerdictCue } from "./verdictGate.logic";
import KeyArguments from "./KeyArguments";
import Button from "@/app/_components/ui/Button";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const WINNER_CLASS: Record<DebateSide, string> = {
  for: "text-side-for",
  against: "text-side-against",
};

const HEADING_ID = "verdict-takeover-heading";

const VerdictPanel = ({
  cue,
  manifest,
  onContinue,
}: {
  cue: VerdictCue;
  manifest: PlaybackManifestV1;
  onContinue: () => void;
}) => {
  const stampRef = useRef<HTMLParagraphElement>(null);

  // The fourth earned moment in the product (design-system.md §6). It reuses
  // VerdictBanner's stamp rather than inventing a gesture for this surface, and it
  // is interaction feedback, so it is never gated by animateOnce.
  useGSAP(
    () => {
      if (!window.matchMedia(MOTION_OK).matches) return;
      gsap.from(stampRef.current, { scale: 1.35, opacity: 0, duration: 0.45, ease: "power3.out" });
    },
    { dependencies: [cue] },
  );

  const round =
    cue.kind === "round" ? manifest.rounds.find((r) => r.number === cue.round) : undefined;
  // The predicate keeps `.domain` reachable: intro and outro entries have none.
  const domain =
    cue.kind === "round"
      ? manifest.timeline.find(
          (entry): entry is RoundTimeline => entry.type === "round" && entry.number === cue.round,
        )?.domain ?? ""
      : "";
  const winner = cue.kind === "final" ? manifest.final.winner : round?.winner;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
      className="mx-auto flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-y-auto border border-ink-faint bg-raised p-6 shadow-cast md:p-12"
    >
      <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        {cue.kind === "final" ? "Final verdict" : domain}
      </p>

      <h2 id={HEADING_ID} className="mt-4 display-type text-4xl text-ink md:text-6xl">
        {cue.kind === "final" ? "The programme is decided" : `Round ${cue.round}`}
      </h2>

      {winner && (
        <p
          ref={stampRef}
          className={`mt-6 display-type text-5xl md:text-7xl ${WINNER_CLASS[winner]}`}
        >
          {cue.kind === "final"
            ? `${winner.toUpperCase()} ${manifest.final.round_score.for}–${manifest.final.round_score.against}`
            : `${winner.toUpperCase()} ${round?.for_score}–${round?.against_score}`}
        </p>
      )}

      {cue.kind === "final" ? (
        <>
          <p className="mt-8 font-headline text-2xl italic leading-snug text-ink md:text-3xl">
            {manifest.final.crux}
          </p>
          <p className="mt-6 font-body text-lg leading-relaxed text-ink-soft">
            {manifest.final.verdict}
          </p>
        </>
      ) : (
        round && (
          <>
            <p className="mt-8 font-body text-lg leading-relaxed text-ink md:text-xl">
              {round.ruling}
            </p>
            <div className="mt-10">
              <KeyArguments points={round.points} scale="takeover" />
            </div>
          </>
        )
      )}

      <div className="mt-10">
        <Button type="button" onClick={onContinue} size="lg">
          {cue.kind === "final" ? "Read the record" : "Continue"}
        </Button>
      </div>
    </div>
  );
};

export default VerdictPanel;
