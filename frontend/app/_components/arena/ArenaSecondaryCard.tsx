"use client";
import { ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/motion/Countdown";
import { settledSide } from "./settledSides";

// The compact feed card used by both the trending grid and the newest tab.
export interface ArenaCardComponentProps {
  username: string;
  avatar?: string | null;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  motionid: number;
  footerLeft: ReactNode;
  time?: string;
  status?: string;
  closesAt?: string | null;
  winner?: string | null;
  className?: string;
}

const ArenaSecondaryCard = ({
  username,
  avatar,
  domain,
  title,
  affirmativescore,
  negativescore,
  motionid,
  footerLeft,
  status,
  closesAt,
  winner,
  className = "",
}: ArenaCardComponentProps) => {
  // A settled card must not read like a live one. Where a live card counts
  // down, a concluded card names its ruling — otherwise the archive is a wall
  // of debates that all look like they are still running.
  const concluded = status === "concluded";
  const ruling = concluded ? settledSide(winner) : null;

  return (
    <article
      data-reveal
      className={`mt-5 border border-ink-faint transition-colors hover:bg-band ${className}`}
    >
      <Link
        className="flex h-full flex-col justify-between p-6"
        href={`/motion/CRX-${motionid}-A`}
      >
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Avatar username={username} src={avatar} size="sm" />
              <span className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
                {username}
              </span>
            </div>
            {ruling ? (
              <span
                className={`shrink-0 border px-2 py-0.5 font-label text-[0.6rem] uppercase tracking-[0.2em] ${ruling.chip}`}
              >
                {ruling.label}
              </span>
            ) : (
              closesAt && (
                <span className="shrink-0">
                  <Countdown closesAt={closesAt} />
                </span>
              )
            )}
          </div>
          <span className="mb-3 block font-label text-[0.6rem] uppercase tracking-[0.28em] text-ink-soft">
            {domain}
          </span>
          <h3 className="mb-5 font-headline text-xl leading-snug text-ink">
            &ldquo;{title}&rdquo;
          </h3>
        </div>

        <div>
          <ScoreBar affirmative={affirmativescore} negative={negativescore} />
          <div className="flex items-center justify-between gap-3 font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
            <span>{footerLeft}</span>
            {affirmativescore > negativescore ? (
              <span className="text-side-for">{affirmativescore}% Favor</span>
            ) : (
              <span className="text-side-against">
                {negativescore}% Against
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};

export default ArenaSecondaryCard;
