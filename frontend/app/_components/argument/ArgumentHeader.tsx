"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArgumentHeaderProps, MatchState } from "@/app/argument/types";
import Avatar from "@/app/_components/ui/Avatar";
import { shouldAnimate } from "@/app/_utils/animateOnce";
import ArgumentProbability from "./ArgumentProbability";
import Countdown from "./Countdown";
import VerdictBanner from "./VerdictBanner";
import PinControl from "../arena/PinControl";
import { gsap, useGSAP, SplitText, MOTION_OK } from "@/app/_utils/gsap";

const ArgumentHeader = ({
  argumentHeaderData,
  matchState,
  shareUrl,
  argumentId,
  pinned,
  isDotd,
}: {
  argumentHeaderData: ArgumentHeaderProps;
  matchState: MatchState;
  shareUrl: string;
  argumentId: number;
  pinned: boolean;
  isDotd: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();

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
      // The header, the arena columns and the probability bar all mount in the
      // same commit and share one key: the debate introduces itself once, as a
      // whole, rather than in three independently-gated pieces.
      if (!shouldAnimate(pathname)) return;
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
        <div
          data-hero-meta
          className="w-full flex flex-wrap items-center gap-x-3 gap-y-2"
        >
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
          {/* Whose claim this is. Every comment names its debater; the statement
              itself did not, so the one person on the hook for it was anonymous. */}
          <Link
            href={`/profile/${argumentHeaderData.authorUsername}`}
            className="flex items-center gap-2 text-outline hover:text-primary transition-colors"
          >
            <Avatar
              username={argumentHeaderData.authorUsername}
              src={argumentHeaderData.authorAvatar}
              size="sm"
            />
            <span className="font-label text-[10px] uppercase tracking-[0.2em]">
              Opened by @{argumentHeaderData.authorUsername}
            </span>
          </Link>
          {/* The clock and the curation control sit on the right edge, away
              from the identity of the claim. */}
          <div className="ml-auto flex items-center gap-3">
            {/* §11: admin-only, and only while there is still a stage to curate. */}
            {matchState.status === "live" && (
              <PinControl
                argumentId={argumentId}
                pinned={pinned}
                isDotd={isDotd}
              />
            )}
            {matchState.status === "live" && matchState.closesAt && (
              <Countdown closesAt={matchState.closesAt} />
            )}
          </div>
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
          certificateHref={`/argument/${argumentHeaderData.statementId}/certificate`}
        />
      )}

      <ArgumentProbability
        argumentHeaderData={argumentHeaderData}
        status={matchState.status}
        winner={matchState.winner}
      />
    </div>
  );
};

export default ArgumentHeader;
