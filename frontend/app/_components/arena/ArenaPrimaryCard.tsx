"use client";

// The Motion of the Day hero. Spec: game-theory.md §15

import Link from "next/link";
import { PrimaryCardDataType } from "@/app/types";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/motion/Countdown";
import { LuMessageSquare } from "react-icons/lu";

const ArenaPrimaryCard = ({
  username,
  avatar,
  domain,
  content,
  count_arguments,
  affirmative,
  negative,
  motionId,
  closesAt,
  isMotd,
}: PrimaryCardDataType) => {
  return (
    <article
      data-reveal
      className="group mt-5 border border-ink-faint bg-band transition-colors hover:bg-raised"
    >
      <header className="flex items-start justify-between gap-3 border-b border-ink-faint px-8 py-4">
        <Link
          href={`/profile/${username}`}
          aria-label={`@${username}'s profile`}
          className="group/author flex items-center gap-3"
        >
          <Avatar username={username} src={avatar} size="md" />
          <div className="flex flex-col gap-0.5">
            <span className="font-label text-[0.6rem] uppercase tracking-[0.28em] text-laurel">
              {isMotd ? "Motion of the Day" : "Proposed by"}
            </span>
            <span className="font-label text-[0.7rem] uppercase tracking-[0.14em] text-ink transition-colors group-hover/author:text-laurel">
              {username}
            </span>
          </div>
        </Link>
        {closesAt && <Countdown closesAt={closesAt} />}
      </header>

      <div className="px-8 py-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-label text-[0.6rem] uppercase tracking-[0.28em] text-ink-soft">
          <span>{domain}</span>
          <span className="flex items-center gap-2 tracking-[0.24em]">
            <LuMessageSquare aria-hidden className="text-sm" />
            {count_arguments} {count_arguments === 1 ? "Argument" : "Arguments"}
          </span>
        </div>
        <h2 className="font-headline text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.15] text-ink">
          &ldquo;{content}&rdquo;
        </h2>
      </div>

      <div className="border-t border-ink-faint px-8 py-5">
        <div className="mb-2.5 flex justify-between gap-4 font-label text-[0.6rem] uppercase tracking-[0.24em]">
          <span className="text-side-for">Affirmative ({affirmative}%)</span>
          <span className="text-side-against">Negative ({negative}%)</span>
        </div>
        <ScoreBar affirmative={affirmative} negative={negative} size="lg" />
        <div className="mt-4 flex justify-end">
          <Button href={`/motion/CRX-${motionId}-A`} variant="outline" size="sm">
            Enter the debate
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ArenaPrimaryCard;
