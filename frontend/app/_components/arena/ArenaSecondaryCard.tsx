"use client";
import { ReactNode, useRef } from "react";
import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/argument/Countdown";

// The compact feed card used by both the trending grid and the newest tab.
export interface ArenaCardComponentProps {
  username: string;
  avatar?: string | null;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
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
  argumentid,
  footerLeft,
  closesAt,
  className = "",
}: ArenaCardComponentProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      data-reveal
      className={`bg-surface-container-low cursor-pointer mt-5 p-6 border-l-2 transition-all border-outline-variant/30 hover:border-primary ${className}`}
    >
      <Link
        className="flex flex-col justify-between h-full"
        href={`/argument/CRX-${argumentid}-A`}
      >
        <div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Avatar username={username} src={avatar} size="sm" />
              <span className="font-body text-[10px] font-bold text-outline uppercase tracking-wider">
                {username}
              </span>
            </div>
            {closesAt && (
              <span className="self-start">
                <Countdown closesAt={closesAt} />
              </span>
            )}
          </div>
          <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
            {domain}
          </span>
          <h3 className="font-headline text-xl mb-4">&ldquo;{title}&rdquo;</h3>
        </div>

        <div>
          <ScoreBar affirmative={affirmativescore} negative={negativescore} />
          <div className="flex justify-between items-center font-label text-[10px] text-outline uppercase tracking-widest">
            <span>{footerLeft}</span>
            <span className="flex items-center gap-3">
              {affirmativescore > negativescore ? (
                <span className="text-primary-container">
                  {affirmativescore}% Favor
                </span>
              ) : (
                <span className="text-secondary-container">
                  {negativescore}% Against
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ArenaSecondaryCard;
