"use client";
import { ReactNode } from "react";
import { PLACEHOLDER_AVATAR_URL } from "@/app/_utils/constants";
import Link from "next/link";
import ScoreBar from "./ScoreBar";

// The compact feed card used by both the trending grid and the newest tab.
export interface ArenaCardComponentProps {
  username: string;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
  footerLeft: ReactNode;
  time?: string;
  className?: string;
}

const ArenaCard = ({
  username,
  domain,
  title,
  affirmativescore,
  negativescore,
  argumentid,
  footerLeft,
  time,
  className = "",
}: ArenaCardComponentProps) => {
  return (
    <div
      data-reveal
      className={`bg-surface-container-low cursor-pointer mt-5 p-6 border-l-2 border-outline-variant/30 hover:border-primary transition-all ${className}`}
    >
      <Link
        className="flex flex-col justify-between h-full"
        href={`/argument/CRX-${argumentid}-A`}
      >
        <div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2 mb-4">
              <img
                alt={username}
                className="w-6 h-6 border border-outline-variant/20 grayscale"
                src={PLACEHOLDER_AVATAR_URL}
              />
              <span className="font-body text-[10px] font-bold text-outline uppercase tracking-wider">
                {username}
              </span>
            </div>
            {time && (
              <span className="font-label uppercase text-[10px] text-gray-400 bg-gray-500/10 px-1.5 py-1 self-start">
                {time}
              </span>
            )}
          </div>
          <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
            {domain}
          </span>
          <h3 className="font-headline text-xl mb-4">"{title}"</h3>
        </div>

        <div>
          <ScoreBar affirmative={affirmativescore} negative={negativescore} />
          <div className="flex justify-between items-center font-label text-[10px] text-outline uppercase tracking-widest">
            <span>{footerLeft}</span>
            {affirmativescore > negativescore ? (
              <span className="text-primary-container">
                {affirmativescore}% Favor
              </span>
            ) : (
              <span className="text-secondary-container">
                {negativescore}% Against
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ArenaCard;
