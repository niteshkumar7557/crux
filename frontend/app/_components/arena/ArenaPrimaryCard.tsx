"use client";
import { PrimaryCardDataType } from "@/app/types";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/argument/Countdown";
import { settledSide } from "./settledSides";
import { LuBadgeCheck, LuMessageSquare } from "react-icons/lu";

const ArenaPrimaryCard = ({
  username,
  avatar,
  domain,
  content,
  count_comments,
  affirmative,
  negative,
  argumentId,
  status,
  closesAt,
  isDotd,
}: PrimaryCardDataType) => {
  return (
    <div
      data-reveal
      className={`bg-surface-container-low mt-5 p-8 pb-4 border-l-2 group transition-colors relative overflow-hidden border-primary hover:bg-surface-container`}
    >
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Avatar username={username} src={avatar} size="md" />
          <div className="flex flex-col">
            <span className="font-label text-[10px] text-primary uppercase tracking-[0.2em]">
              {isDotd ? "Debate of the Day" : "Proposed By"}
            </span>
            <span className="font-body text-xs font-bold text-on-surface">
              {username}
            </span>
          </div>
        </div>
        {closesAt && <Countdown closesAt={closesAt} />}
      </div>
      <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
        {domain}
      </span>
      <h2
        className="font-headline text-4xl leading-tight mb-4 transition-colors"
      >
        &ldquo;{content}&rdquo;
      </h2>
      <div className="flex gap-5 border-b border-outline-variant/40 pb-5">
        <span className="font-label text-xs text-outline uppercase tracking-widest">
          <LuMessageSquare className="inline text-primary" /> {count_comments}{" "}
          {count_comments === 1 ? "Argument" : "Arguments"}
        </span>
        {/* <span className="font-label text-xs text-outline uppercase tracking-widest">
          <LuBadgeCheck className="inline text-tertiary" /> Argument Quality:{" "}
          {argumentQuality}
        </span> */}
      </div>
      <div className="py-5">
        <div className="flex justify-between gap-4 font-label text-[10px] uppercase tracking-[0.25em] mb-3">
          <span className="text-primary-container">
            Affirmative ({affirmative}%)
          </span>
          <span className="text-secondary-container">
            Negative ({negative}%)
          </span>
        </div>
        <ScoreBar
          affirmative={affirmative}
          negative={negative}
          size="lg"
        />
        <div className="mt-7 flex justify-between items-center gap-4">
          <Button href={`/argument/${argumentId}`} variant="outline" size="sm">Enter Argument</Button>
        </div>
      </div>
    </div>
  );
};

export default ArenaPrimaryCard;
