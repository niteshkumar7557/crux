// One side's column of arguments.

import { MotionArenaProps, Analysis } from "@/app/motion/types";
import UserArgumentCard from "./UserArgumentCard";
import AnalysisPanel from "./AnalysisPanel";

const SIDES = {
  for: {
    title: "The Case For",
    wrapper: "lg:pr-7 py-8",
    frame: "border border-side-for/40 text-side-for",
    countClass: "text-side-for",
  },
  against: {
    title: "The Case Against",
    wrapper: "lg:pl-7 py-8 border-t lg:border-t-0 lg:border-l border-ink-faint",
    frame: "border border-side-against/40 text-side-against",
    countClass: "text-side-against",
  },
} as const;

const CaseColumn = ({
  side,
  motionArenaData,
  aiAnalysis,
}: {
  side: "for" | "against";
  motionArenaData: MotionArenaProps;
  aiAnalysis: Analysis;
}) => {
  const s = SIDES[side];
  const count =
    side === "for"
      ? motionArenaData.forArgumentsCount
      : motionArenaData.againstArgumentsCount;
  const sideArguments =
    side === "for"
      ? motionArenaData.forCaseArguments
      : motionArenaData.againstCaseArguments;

  return (
    <div data-case={side} className={s.wrapper}>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-ink-faint pb-4">
        <h2
          className={`px-4 py-2 font-label text-lg font-bold uppercase tracking-[0.28em] ${s.frame}`}
        >
          {s.title}
        </h2>
        <span
          className={`font-label text-[0.68rem] uppercase tracking-[0.22em] tabular-nums ${s.countClass}`}
        >
          {count} {count === 1 ? "Argument" : "Arguments"}
        </span>
      </div>
      <AnalysisPanel side={side} analysis={aiAnalysis} />
      <div className="flex flex-col gap-3">
        {sideArguments.map((e) => (
          <UserArgumentCard key={e.argument_id} {...e} />
        ))}
      </div>
    </div>
  );
};

export default CaseColumn;
