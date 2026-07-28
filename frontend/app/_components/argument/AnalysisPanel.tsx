"use client";
import { LuCpu } from "react-icons/lu";
import type { Analysis } from "@/app/argument/types";
import { focusComment } from "@/app/_utils/focusComment";

// The Crux AI analysis for one side. Rendered from structured points rather
// than a Markdown blob, which is what makes each attributed point a link: the
// backend records the comment id a point came from, so "@dev" can jump to the
// exact argument it credits instead of just naming a person.
//
// Two kinds of point live here. The AI's opening draft has no author and no id
// — nobody had argued yet — and renders as a plain line. A point a real debater
// landed carries both, and renders as a control.

const SIDES = {
  for: {
    accentText: "text-primary",
    panel: "border-primary/30 shadow-glow-primary",
    rail: "border-primary/40",
    railHover: "hover:border-primary",
    nameHover: "group-hover/point:text-primary",
  },
  against: {
    accentText: "text-secondary",
    panel: "border-secondary/30 shadow-glow-secondary",
    rail: "border-secondary/40",
    railHover: "hover:border-secondary",
    nameHover: "group-hover/point:text-secondary",
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
  const hasContent =
    analysis && (analysis.lead?.length > 0 || analysis.points?.length > 0);

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

      {!hasContent ? (
        <p className="min-h-30 font-headline text-sm italic text-outline leading-relaxed">
          No analysis yet.
        </p>
      ) : (
        <div className="min-h-30">
          {analysis.lead && (
            <p className="font-headline text-sm text-on-surface-variant italic leading-relaxed mb-4">
              {analysis.lead}
            </p>
          )}
          {analysis.points.length > 0 && (
            <>
              <h3
                className={`font-label text-[9px] uppercase tracking-[0.2em] ${s.accentText} font-bold mt-6 mb-3 border-b ${side === "for" ? "border-primary/20" : "border-secondary/20"} pb-1`}
              >
                Key Arguments
              </h3>
              <ul className="mt-2 space-y-3">
                {analysis.points.map((p, i) => {
                  const body = (
                    <>
                      {p.author && (
                        <span
                          className={`font-label text-xs font-bold tracking-wide text-on-surface not-italic ${s.nameHover} transition-colors`}
                        >
                          @{p.author}
                          <span className="text-outline mx-1.5">—</span>
                        </span>
                      )}
                      <span className="font-headline text-sm text-on-surface-variant italic leading-snug">
                        {p.text}
                      </span>
                    </>
                  );

                  // Unlinkable points still belong on the panel; they just
                  // aren't controls, so they never look clickable.
                  return p.commentId === null ? (
                    <li
                      key={`${i}-${p.text}`}
                      className={`border-l-2 ${s.rail} pl-3`}
                    >
                      {body}
                    </li>
                  ) : (
                    <li key={`${i}-${p.text}`}>
                      <button
                        type="button"
                        onClick={() => focusComment(p.commentId!)}
                        aria-label={`Go to @${p.author}'s comment`}
                        className={`group/point block w-full text-left border-l-2 ${s.rail} ${s.railHover} pl-3 transition-colors`}
                      >
                        {body}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
