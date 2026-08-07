// One round, at the weight a ruling deserves. The number and the domain are the
// two things a reader scans for, so they are the two largest things in the block.

import type { DebateSide, Point, RoundResult } from "@/app/video-debates/types";
import KeyArguments from "./KeyArguments";

const WINNER_CLASS: Record<DebateSide, string> = {
  for: "text-side-for",
  against: "text-side-against",
};

const RoundRecord = ({
  result,
  domain,
  ruled,
  points,
}: {
  result: RoundResult;
  domain: string;
  ruled: boolean;
  points: Record<DebateSide, Point[]>;
}) => (
  <li className="border-t border-ink-faint pt-8">
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
      <h3 className="display-type text-5xl text-ink md:text-7xl">Round {result.number}</h3>
      <p className="font-label text-sm uppercase tracking-[0.3em] text-ink-soft md:text-base">
        {domain}
      </p>
    </div>

    {ruled ? (
      <>
        <p className={`mt-6 display-type text-3xl md:text-5xl ${WINNER_CLASS[result.winner]}`}>
          {result.winner.toUpperCase()} {result.for_score}–{result.against_score}
        </p>
        <p className="mt-4 max-w-3xl font-body text-lg leading-relaxed text-ink md:text-xl">
          {result.ruling}
        </p>
      </>
    ) : (
      <p className="mt-6 font-label text-sm uppercase tracking-[0.25em] text-ink-soft">
        Not ruled yet
      </p>
    )}

    <div className="mt-8">
      <KeyArguments points={points} scale="record" />
    </div>
  </li>
);

export default RoundRecord;
