import { ArgumentArenaProps, Analysis } from "@/app/argument/types";
import UserArgumentCard from "./UserCommentCard";
import AnalysisPanel from "./AnalysisPanel";

// Both sides share one layout; only the accent token and column padding
// differ. Full literal class strings per side so Tailwind can see them.
const SIDES = {
  for: {
    title: "The Case For",
    wrapper: "bg-background lg:pr-12 py-8",
    header: "border-primary",
    accentText: "text-primary",
  },
  against: {
    title: "The Case Against",
    wrapper:
      "bg-background lg:pl-12 py-8 border-t lg:border-t-0 lg:border-l border-outline-variant/20",
    header: "border-secondary",
    accentText: "text-secondary",
  },
} as const;

const CaseColumn = ({
  side,
  argumentArenaData,
  aiAnalysis,
}: {
  side: "for" | "against";
  argumentArenaData: ArgumentArenaProps;
  aiAnalysis: Analysis;
}) => {
  const s = SIDES[side];
  const count =
    side === "for"
      ? argumentArenaData.forArgumentsCount
      : argumentArenaData.againstArgumentsCount;
  const comments =
    side === "for"
      ? argumentArenaData.forCaseComments
      : argumentArenaData.againstCaseComments;

  return (
    <div data-case={side} className={s.wrapper}>
      <div
        className={`flex items-center justify-between mb-10 border-l-4 ${s.header} pl-4`}
      >
        <h2
          className={`font-label uppercase tracking-[0.3em] text-xl font-bold ${s.accentText}`}
        >
          {s.title}
        </h2>
        <span className="font-label text-xs text-outline italic">
          {count} Arguments
        </span>
      </div>
      <AnalysisPanel side={side} analysis={aiAnalysis} />
      <div className="flex flex-col gap-10">
        {comments.map((e) => (
          <UserArgumentCard key={e.comment_id} {...e} />
        ))}
      </div>
    </div>
  );
};

export default CaseColumn;
