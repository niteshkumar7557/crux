"use client";
import { ReactNode, useRef } from "react";
import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/argument/Countdown";
import { settledSide } from "./settledSides";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";

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

const ArenaCard = ({
  username,
  avatar,
  domain,
  title,
  affirmativescore,
  negativescore,
  argumentid,
  footerLeft,
  time,
  status,
  closesAt,
  winner,
  className = "",
}: ArenaCardComponentProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const isConcluded = status === "concluded";
  const isLive = status === "live";
  const ruling = settledSide(winner);

  const lift = (up: boolean) => {
    if (!cardRef.current || !window.matchMedia(MOTION_OK).matches) return;
    gsap.to(cardRef.current, {
      y: up ? -6 : 0,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  return (
    <div
      ref={cardRef}
      data-reveal
      onMouseEnter={() => lift(true)}
      onMouseLeave={() => lift(false)}
      className={`bg-surface-container-low cursor-pointer mt-5 p-6 border-l-2 transition-all ${
        isConcluded
          ? "border-outline-variant/20 opacity-80 hover:opacity-100"
          : "border-outline-variant/30 hover:border-primary"
      } ${className}`}
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
            {isConcluded ? (
              <span className="font-label uppercase text-[10px] text-outline border border-outline/40 px-1.5 py-1 self-start tracking-[0.2em]">
                Settled
              </span>
            ) : isLive && closesAt ? (
              <span className="self-start">
                <Countdown closesAt={closesAt} />
              </span>
            ) : (
              time && (
                <span className="font-label uppercase text-[10px] text-on-surface-variant bg-outline/10 px-1.5 py-1 self-start">
                  {time}
                </span>
              )
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
            {isConcluded ? (
              <span className={ruling.cls}>
                {ruling.label} · {affirmativescore}–{negativescore}
              </span>
            ) : affirmativescore > negativescore ? (
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
