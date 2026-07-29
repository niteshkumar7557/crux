"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionHeaderProps, MatchState } from "@/app/motion/types";
import Avatar from "@/app/_components/ui/Avatar";
import { shouldAnimate } from "@/app/_utils/animateOnce";
import MotionProbability from "./MotionProbability";
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
          {/* Whose claim this is. Every argument names its debater; the motion
              itself did not, so the one person on the hook for it was anonymous. */}
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
          {/* The clock and the curation control sit on the right edge, away
              from the identity of the claim. */}
          <div className="ml-auto flex items-center gap-3">
            {/* §11: admin-only, and only while there is still a stage to curate. */}
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
        {/* The claim is set in Newsreader, not the display face. Anton was
            tried here and rejected: a motion is a sentence someone is on the
            hook for, and setting it in condensed uppercase poster type turned
            an argument into a headline shouting at the reader. The serif reads
            as something written and signed, which is what a motion is. The
            keyword lifts in laurel italic. */}
        <h1
          ref={headlineRef}
          className="font-headline text-[clamp(2.2rem,5.2vw,4.2rem)] leading-[1.12] max-w-5xl break-words text-ink"
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
