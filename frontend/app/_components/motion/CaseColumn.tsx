import { MotionArenaProps, Analysis } from "@/app/motion/types";
import UserArgumentCard from "./UserArgumentCard";
import AnalysisPanel from "./AnalysisPanel";

// Both sides share one layout; only the accent token and column padding
// differ. Full literal class strings per side so Tailwind can see them.
//
// Each column is headed by a stamp — the side's name filled in its own camp
// colour, the way a clerk marks which pile a document belongs to. It replaces
// an accent rail on the column edge: at column height a 4px rail is a wall,
// and the two of them boxed the arguments in.
const SIDES = {
  for: {
    title: "The Case For",
    wrapper: "lg:pr-12 py-8",
    stamp: "bg-side-for text-paper",
    countClass: "text-side-for",
  },
  against: {
    title: "The Case Against",
    wrapper:
      "lg:pl-12 py-8 border-t lg:border-t-0 lg:border-l border-ink-faint",
    stamp: "bg-side-against text-paper",
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
          className={`px-3 py-1.5 font-label text-[0.68rem] font-medium uppercase tracking-[0.28em] ${s.stamp}`}
        >
          {s.title}
        </h2>
        <span
          className={`font-label text-[0.62rem] uppercase tracking-[0.22em] tabular-nums ${s.countClass}`}
        >
          {count} {count === 1 ? "Argument" : "Arguments"}
        </span>
      </div>
      <AnalysisPanel side={side} analysis={aiAnalysis} />
      <div className="flex flex-col gap-10">
        {sideArguments.map((e) => (
          <UserArgumentCard key={e.argument_id} {...e} />
        ))}
      </div>
    </div>
  );
};

export default CaseColumn;
