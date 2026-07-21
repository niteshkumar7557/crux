"use client";
import { useRef } from "react";
import { ArgumentHeaderProps, MatchState } from "@/app/argument/types";
import ArgumentProbability from "./ArgumentProbability";
import Countdown from "./Countdown";
import VerdictBanner from "./VerdictBanner";
import { gsap, useGSAP, SplitText, MOTION_OK } from "@/app/_utils/gsap";

const ArgumentHeader = ({
  argumentHeaderData,
  matchState,
  shareUrl,
}: {
  argumentHeaderData: ArgumentHeaderProps;
  matchState: MatchState;
  shareUrl: string;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const { statement, statementKeyword } = argumentHeaderData;
  const matchIndex = statementKeyword
    ? statement.toLowerCase().indexOf(statementKeyword.toLowerCase())
    : -1;
  const before = matchIndex >= 0 ? statement.slice(0, matchIndex) : statement;
  const highlight =
    matchIndex >= 0
      ? statement.slice(matchIndex, matchIndex + statementKeyword.length)
      : "";
  const after =
    matchIndex >= 0
      ? statement.slice(matchIndex + statementKeyword.length)
      : "";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!headlineRef.current) return;
        const split = SplitText.create(headlineRef.current, {
          type: "lines",
          mask: "lines",
        });
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-hero-meta]", { y: 10, opacity: 0, duration: 0.5 })
          .from(
            split.lines,
            { yPercent: 110, duration: 0.9, stagger: 0.09 },
            0.1,
          );
        return () => split.revert();
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      <div className="flex flex-col items-start gap-4 mb-8">
        <div data-hero-meta className="flex flex-wrap items-center gap-3">
          {matchState.status === "concluded" ? (
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline px-2 py-0.5 border border-outline/30">
              Concluded
            </span>
          ) : (
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary px-2 py-0.5 border border-primary/30">
              Live Arena
            </span>
          )}
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            ID: {argumentHeaderData.statementId}
          </span>
          {matchState.status === "live" && matchState.closesAt && (
            <Countdown closesAt={matchState.closesAt} />
          )}
        </div>
        <h1
          ref={headlineRef}
          className="font-headline text-5xl md:text-7xl font-bold max-w-5xl tracking-tight break-words"
        >
          {before}
          {highlight && (
            <span className="text-primary italic">{highlight}</span>
          )}
          {after}
        </h1>
      </div>

      {matchState.status === "concluded" && (
        <VerdictBanner
          winner={matchState.winner}
          margin={matchState.margin}
          mvpUsername={matchState.mvpUsername}
          verdictText={matchState.verdictText}
          affirmative={matchState.affirmative}
          negative={matchState.negative}
          shareUrl={shareUrl}
        />
      )}

      <ArgumentProbability
        argumentHeaderData={argumentHeaderData}
        status={matchState.status}
      />
    </div>
  );
};

export default ArgumentHeader;
