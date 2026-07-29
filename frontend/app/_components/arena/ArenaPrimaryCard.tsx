"use client";
import { PrimaryCardDataType } from "@/app/types";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";
import ScoreBar from "./ScoreBar";
import Countdown from "@/app/_components/motion/Countdown";
import { LuMessageSquare } from "react-icons/lu";

// The featured debate at the head of the feed. It earns its weight from scale
// and rules rather than from a fill or an accent border: the claim is set at
// display size, everything else is a tracked label, and hairlines divide the
// card into a masthead / claim / split / action stack.
const ArenaPrimaryCard = ({
  username,
  avatar,
  domain,
  content,
  count_arguments,
  affirmative,
  negative,
  motionId,
  status,
  closesAt,
  isMotd,
}: PrimaryCardDataType) => {
  return (
    <article
      data-reveal
      className="group mt-5 border border-ink-faint bg-band transition-colors hover:bg-raised"
    >
      <header className="flex items-start justify-between gap-3 border-b border-ink-faint px-8 py-5">
        <div className="flex items-center gap-3">
          <Avatar username={username} src={avatar} size="md" />
          <div className="flex flex-col gap-0.5">
            <span className="font-label text-[0.6rem] uppercase tracking-[0.28em] text-laurel">
              {isMotd ? "Motion of the Day" : "Proposed by"}
            </span>
            <span className="font-label text-[0.7rem] uppercase tracking-[0.14em] text-ink">
              {username}
            </span>
          </div>
        </div>
        {closesAt && <Countdown closesAt={closesAt} />}
      </header>

      <div className="px-8 py-8">
        <span className="mb-4 block font-label text-[0.6rem] uppercase tracking-[0.28em] text-ink-soft">
          {domain}
        </span>
        <h2 className="font-headline text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.15] text-ink">
          &ldquo;{content}&rdquo;
        </h2>
        <p className="mt-5 flex items-center gap-2 font-label text-[0.6rem] uppercase tracking-[0.24em] text-ink-soft">
          <LuMessageSquare aria-hidden className="text-sm" />
          {count_arguments} {count_arguments === 1 ? "Argument" : "Arguments"}
        </p>
      </div>

      <div className="border-t border-ink-faint px-8 py-6">
        <div className="mb-3 flex justify-between gap-4 font-label text-[0.6rem] uppercase tracking-[0.24em]">
          <span className="text-side-for">Affirmative ({affirmative}%)</span>
          <span className="text-side-against">Negative ({negative}%)</span>
        </div>
        <ScoreBar
          affirmative={affirmative}
          negative={negative}
          size="lg"
          status={status}
        />
        <div className="mt-7">
          <Button href={`/motion/CRX-${motionId}-A`} variant="outline" size="sm">
            Enter the debate
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ArenaPrimaryCard;
