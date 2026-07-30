"use client";

// One side's living case. Attributed points link back to the argument that made
// them. Spec: game-theory.md §17

import { LuCpu } from "react-icons/lu";
import type { Analysis } from "@/app/motion/types";
import { focusArgument } from "@/app/_utils/focusArgument";

const NAME =
  "text-ink font-bold font-label text-[0.8rem] tracking-wide transition-colors";

const SIDES = {
  for: {
    accentText: "text-side-for",
    panel: "border-side-for/30 shadow-cast-for",
    nameHover: "hover:text-side-for",
    body: "min-h-30 max-w-none [&>p]:font-label [&>p]:text-[0.86rem] [&>p]:text-ink-soft [&>p]:leading-[1.7] [&>p]:mb-5 [&>h3]:font-label [&>h3]:text-[11px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-side-for [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-side-for/20 [&>h3]:pb-1.5 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3.5 [&>ul]:list-none [&>ul>li]:font-label [&>ul>li]:text-[0.86rem] [&>ul>li]:text-ink-soft [&>ul>li]:leading-[1.65] [&>ul>li]:border-l-2 [&>ul>li]:border-side-for/40 [&>ul>li]:pl-3.5 [&>ul>li>strong]:text-ink [&>ul>li>strong]:font-bold [&>ul>li>strong]:text-[0.8rem] [&>ul>li>strong]:tracking-wide",
  },
  against: {
    accentText: "text-side-against",
    panel: "border-side-against/30 shadow-cast-against",
    nameHover: "hover:text-side-against",
    body: "min-h-30 max-w-none [&>p]:font-label [&>p]:text-[0.86rem] [&>p]:text-ink-soft [&>p]:leading-[1.7] [&>p]:mb-5 [&>h3]:font-label [&>h3]:text-[11px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-side-against [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-side-against/20 [&>h3]:pb-1.5 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3.5 [&>ul]:list-none [&>ul>li]:font-label [&>ul>li]:text-[0.86rem] [&>ul>li]:text-ink-soft [&>ul>li]:leading-[1.65] [&>ul>li]:border-l-2 [&>ul>li]:border-side-against/40 [&>ul>li]:pl-3.5 [&>ul>li>strong]:text-ink [&>ul>li>strong]:font-bold [&>ul>li>strong]:text-[0.8rem] [&>ul>li>strong]:tracking-wide",
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
    <div className={`mb-6 relative p-6 bg-raised border ${s.panel}`}>
      <div className="flex items-center gap-2 mb-3">
        <LuCpu className={`${s.accentText} text-sm`} />
        <span
          className={`font-label text-[11px] uppercase tracking-[0.15em] ${s.accentText} font-bold`}
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
                  {p.author && p.argumentId !== null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => focusArgument(p.argumentId as number)}
                        aria-label={`Read @${p.author}'s argument`}
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
