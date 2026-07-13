import { ArgumentArenaProps } from "@/app/argument/types";
import UserArgumentCard from "./UserCommentCard";
import { MdMemory } from "react-icons/md";
import ReactMarkdown from "react-markdown";

// Both sides share one layout; only the accent token and column padding
// differ. Full literal class strings per side so Tailwind can see them.
const SIDES = {
  for: {
    title: "The Case For",
    wrapper: "bg-background lg:pr-12 py-8",
    header: "border-primary",
    accentText: "text-primary",
    panel: "border-primary/30 shadow-glow-primary",
    markdown:
      "min-h-30 max-w-none [&>p]:font-headline [&>p]:text-sm [&>p]:text-on-surface-variant [&>p]:italic [&>p]:leading-relaxed [&>p]:mb-4 [&>h3]:font-label [&>h3]:text-[9px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-primary [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-primary/20 [&>h3]:pb-1 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3 [&>ul]:list-none [&>ul>li]:font-headline [&>ul>li]:text-sm [&>ul>li]:text-on-surface-variant [&>ul>li]:italic [&>ul>li]:leading-snug [&>ul>li]:border-l-2 [&>ul>li]:border-primary/40 [&>ul>li]:pl-3 [&>ul>li>strong]:text-on-surface [&>ul>li>strong]:not-italic [&>ul>li>strong]:font-bold [&>ul>li>strong]:font-label [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
  },
  against: {
    title: "The Case Against",
    wrapper:
      "bg-background lg:pl-12 py-8 border-t lg:border-t-0 lg:border-l border-outline-variant/20",
    header: "border-secondary",
    accentText: "text-secondary",
    panel: "border-secondary/30 shadow-glow-secondary",
    markdown:
      "min-h-30 max-w-none [&>p]:font-headline [&>p]:text-sm [&>p]:text-on-surface-variant [&>p]:italic [&>p]:leading-relaxed [&>p]:mb-4 [&>h3]:font-label [&>h3]:text-[9px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-secondary [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-secondary/20 [&>h3]:pb-1 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3 [&>ul]:list-none [&>ul>li]:font-headline [&>ul>li]:text-sm [&>ul>li]:text-on-surface-variant [&>ul>li]:italic [&>ul>li]:leading-snug [&>ul>li]:border-l-2 [&>ul>li]:border-secondary/40 [&>ul>li]:pl-3 [&>ul>li>strong]:text-on-surface [&>ul>li>strong]:not-italic [&>ul>li>strong]:font-bold [&>ul>li>strong]:font-label [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
  },
} as const;

const CaseColumn = ({
  side,
  argumentArenaData,
  aiAnalysis,
}: {
  side: "for" | "against";
  argumentArenaData: ArgumentArenaProps;
  aiAnalysis: string;
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
    <div className={s.wrapper}>
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
      <div
        className={`mb-10 relative p-6 bg-surface-container-lowest border ${s.panel}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <MdMemory className={`${s.accentText} text-sm`} />
          <span
            className={`font-label text-[10px] uppercase tracking-[0.15em] ${s.accentText} font-bold`}
          >
            Crux AI Analysis
          </span>
        </div>
        <div className={s.markdown}>
          <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
        </div>
      </div>
      <div className="flex flex-col gap-10">
        {comments.map((e, i) => (
          <UserArgumentCard
            key={i}
            side={e.side}
            reputation={e.reputation}
            username={e.username}
            grade={e.grade}
            comment={e.comment}
            likes={e.likes}
            user_id={e.user_id}
            comment_id={e.comment_id}
            post_user_id={e.post_user_id}
          />
        ))}
      </div>
    </div>
  );
};

export default CaseColumn;
