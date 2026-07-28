"use client";
import { LuCpu } from "react-icons/lu";
import type { Analysis } from "@/app/argument/types";
import { focusComment } from "@/app/_utils/focusComment";

// The Crux AI analysis for one side — the original panel, unchanged to look at.
//
// The class strings below are the ones the old react-markdown panel used, and
// the DOM here is the shape they were written for: a lead <p>, an <h3>, then a
// <ul> of <li>s whose leading name is styled like a <strong>. Rendering that
// shape directly rather than serialising the analysis back into Markdown and
// parsing it again keeps the look identical, keeps the debater's name a real
// control instead of bold text, and avoids handing model-authored prose to a
// Markdown parser that would treat a stray asterisk or bracket as formatting.
//
// The one thing the old panel could not do: a point knows which comment it came
// from (backend `ai/analysis.logic.ts` records the id), so the name jumps to
// that exact argument. A point with no comment behind it — the AI's opening
// draft, written before anyone argued — has no name and nothing to press.

const NAME =
  "text-on-surface not-italic font-bold font-label text-xs tracking-wide transition-colors";

const SIDES = {
  for: {
    accentText: "text-primary",
    panel: "border-primary/30 shadow-glow-primary",
    nameHover: "hover:text-primary",
    body: "min-h-30 max-w-none [&>p]:font-headline [&>p]:text-sm [&>p]:text-on-surface-variant [&>p]:italic [&>p]:leading-relaxed [&>p]:mb-4 [&>h3]:font-label [&>h3]:text-[9px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-primary [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-primary/20 [&>h3]:pb-1 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3 [&>ul]:list-none [&>ul>li]:font-headline [&>ul>li]:text-sm [&>ul>li]:text-on-surface-variant [&>ul>li]:italic [&>ul>li]:leading-snug [&>ul>li]:border-l-2 [&>ul>li]:border-primary/40 [&>ul>li]:pl-3 [&>ul>li>strong]:text-on-surface [&>ul>li>strong]:not-italic [&>ul>li>strong]:font-bold [&>ul>li>strong]:font-label [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
  },
  against: {
    accentText: "text-secondary",
    panel: "border-secondary/30 shadow-glow-secondary",
    nameHover: "hover:text-secondary",
    body: "min-h-30 max-w-none [&>p]:font-headline [&>p]:text-sm [&>p]:text-on-surface-variant [&>p]:italic [&>p]:leading-relaxed [&>p]:mb-4 [&>h3]:font-label [&>h3]:text-[9px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-secondary [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-secondary/20 [&>h3]:pb-1 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3 [&>ul]:list-none [&>ul>li]:font-headline [&>ul>li]:text-sm [&>ul>li]:text-on-surface-variant [&>ul>li]:italic [&>ul>li]:leading-snug [&>ul>li]:border-l-2 [&>ul>li]:border-secondary/40 [&>ul>li]:pl-3 [&>ul>li>strong]:text-on-surface [&>ul>li>strong]:not-italic [&>ul>li>strong]:font-bold [&>ul>li>strong]:font-label [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
  },
} as const;

const AnalysisPanel = ({
  side,
  analysis,
}: {
  side: "for" | "against";
  analysis: Analysis;
}) => {
  const s = SIDES[side];
  const lead = analysis?.lead ?? "";
  const points = analysis?.points ?? [];

  return (
    <div
      className={`mb-10 relative p-6 bg-surface-container-lowest border ${s.panel}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <LuCpu className={`${s.accentText} text-sm`} />
        <span
          className={`font-label text-[10px] uppercase tracking-[0.15em] ${s.accentText} font-bold`}
        >
          Crux AI Analysis
        </span>
      </div>
      <div className={s.body}>
        {lead && <p>{lead}</p>}
        {points.length > 0 && (
          <>
            <h3>Key Arguments</h3>
            <ul>
              {points.map((p, i) => (
                <li key={`${i}-${p.text}`}>
                  {p.author && p.commentId !== null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => focusComment(p.commentId as number)}
                        aria-label={`Read @${p.author}'s comment`}
                        className={`${NAME} ${s.nameHover}`}
                      >
                        @{p.author}
                      </button>
                      {" — "}
                    </>
                  ) : (
                    p.author && (
                      <>
                        <strong>@{p.author}</strong>
                        {" — "}
                      </>
                    )
                  )}
                  {p.text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
