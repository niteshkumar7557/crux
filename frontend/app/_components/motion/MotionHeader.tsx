"use client";

// The claim, its author, its domain and its clock.

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionHeaderProps, MatchState } from "@/app/motion/types";
import Avatar from "@/app/_components/ui/Avatar";
import { shouldAnimate } from "@/app/_utils/animateOnce";
import MotionProbability from "./MotionProbability";
import StickyMotion from "./StickyMotion";
import Countdown from "./Countdown";
import VerdictBanner from "./VerdictBanner";
import PinControl from "../arena/PinControl";
import { gsap, useGSAP, SplitText, MOTION_OK } from "@/app/_utils/gsap";

const MotionHeader = ({
  motionHeaderData,
  matchState,
  shareUrl,
  motionId,
  pinned,
  isMotd,
}: {
  motionHeaderData: MotionHeaderProps;
  matchState: MatchState;
  shareUrl: string;
  motionId: number;
  pinned: boolean;
  isMotd: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();

  const { motion, motionKeyword } = motionHeaderData;
  const matchIndex = motionKeyword
    ? motion.toLowerCase().indexOf(motionKeyword.toLowerCase())
    : -1;
  const before = matchIndex >= 0 ? motion.slice(0, matchIndex) : motion;
  const highlight =
    matchIndex >= 0
      ? motion.slice(matchIndex, matchIndex + motionKeyword.length)
      : "";
  const after =
    matchIndex >= 0
      ? motion.slice(matchIndex + motionKeyword.length)
      : "";

  useGSAP(
    () => {
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
      <StickyMotion
        watch={headlineRef}
        before={before}
        highlight={highlight}
        after={after}
      />
      <div className="flex flex-col items-start gap-4 mb-8">
        <div
          data-hero-meta
          className="w-full flex flex-wrap items-center gap-x-3 gap-y-2"
        >
          {matchState.status === "concluded" ? (
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft px-2 py-0.5 border border-ink-faint">
              Concluded
            </span>
          ) : (
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink px-2 py-0.5 border border-ink">
              Live Arena
            </span>
          )}
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            ID: {motionHeaderData.motionId}
          </span>
          <Link
            href={`/profile/${motionHeaderData.authorUsername}`}
            className="flex items-center gap-2 text-ink-soft hover:text-ink transition-colors"
          >
            <Avatar
              username={motionHeaderData.authorUsername}
              src={motionHeaderData.authorAvatar}
              size="sm"
            />
            <span className="font-label text-[10px] uppercase tracking-[0.2em]">
              Opened by @{motionHeaderData.authorUsername}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {matchState.status === "live" && (
              <PinControl
                motionId={motionId}
                pinned={pinned}
                isMotd={isMotd}
              />
            )}
            {matchState.status === "live" && matchState.closesAt && (
              <Countdown closesAt={matchState.closesAt} />
            )}
          </div>
        </div>
        <h1
          ref={headlineRef}
          className="font-headline text-5xl md:text-7xl font-bold leading-tight tracking-tight max-w-5xl wrap-break-word text-ink"
        >
          {before}
          {highlight && (
            <span className="italic text-laurel">{highlight}</span>
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
          certificateHref={`/motion/${motionHeaderData.motionId}/certificate`}
        />
      )}

      <MotionProbability
        motionHeaderData={motionHeaderData}
        status={matchState.status}
      />
    </div>
  );
};

export default MotionHeader;
