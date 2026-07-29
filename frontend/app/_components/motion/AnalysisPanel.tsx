"use client";
import { LuCpu } from "react-icons/lu";
import type { Analysis } from "@/app/motion/types";
import { focusArgument } from "@/app/_utils/focusArgument";

// The Crux AI analysis for one side.
//
// The DOM is authored directly rather than serialised back to Markdown and
// parsed again: it keeps the debater's name a real control instead of bold
// text, and avoids handing model-authored prose to a Markdown parser that would
// treat a stray asterisk or bracket as formatting. A point knows which argument
// it came from (backend `ai/analysis.logic.ts` records the id), so the name
// jumps to that exact argument. A point with no argument behind it — the AI's
// opening draft, written before anyone argued — has no name and nothing to
// press.
//
// **The whole column speaks in Space Grotesk.** This panel moved to the label
// face first, and the arguments below it followed — the page is a screenful of
// short, scannable statements, and the label face carries them better at that
// length than the italic serif did.
//
// So the face no longer separates the machine from the debaters; the *surface*
// does. This panel is `bg-raised` with a side-tinted cast and a ruled
// "Crux AI Analysis" header, while an argument is a flat `bg-band` card with a
// human attached to it. If this panel ever loses that shell, it will need
// another way to say it is not a person — the type will not do it any more.

const NAME =
  "text-ink font-bold font-label text-xs tracking-wide transition-colors";

const SIDES = {
  for: {
    accentText: "text-side-for",
    panel: "border-side-for/30 shadow-cast-for",
    nameHover: "hover:text-side-for",
    body: "min-h-30 max-w-none [&>p]:font-label [&>p]:text-[0.82rem] [&>p]:text-ink-soft [&>p]:leading-[1.7] [&>p]:mb-5 [&>h3]:font-label [&>h3]:text-[10px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-side-for [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-side-for/20 [&>h3]:pb-1.5 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3.5 [&>ul]:list-none [&>ul>li]:font-label [&>ul>li]:text-[0.8rem] [&>ul>li]:text-ink-soft [&>ul>li]:leading-[1.65] [&>ul>li]:border-l-2 [&>ul>li]:border-side-for/40 [&>ul>li]:pl-3.5 [&>ul>li>strong]:text-ink [&>ul>li>strong]:font-bold [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
  },
  against: {
    accentText: "text-side-against",
    panel: "border-side-against/30 shadow-cast-against",
    nameHover: "hover:text-side-against",
    body: "min-h-30 max-w-none [&>p]:font-label [&>p]:text-[0.82rem] [&>p]:text-ink-soft [&>p]:leading-[1.7] [&>p]:mb-5 [&>h3]:font-label [&>h3]:text-[10px] [&>h3]:uppercase [&>h3]:tracking-[0.2em] [&>h3]:text-side-against [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:border-b [&>h3]:border-side-against/20 [&>h3]:pb-1.5 [&>ul]:pl-0 [&>ul]:mt-2 [&>ul]:space-y-3.5 [&>ul]:list-none [&>ul>li]:font-label [&>ul>li]:text-[0.8rem] [&>ul>li]:text-ink-soft [&>ul>li]:leading-[1.65] [&>ul>li]:border-l-2 [&>ul>li]:border-side-against/40 [&>ul>li]:pl-3.5 [&>ul>li>strong]:text-ink [&>ul>li>strong]:font-bold [&>ul>li>strong]:text-xs [&>ul>li>strong]:tracking-wide",
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

  // `bg-raised` rather than `bg-paper`: a cast shadow needs the surface above
  // it to be lighter than the page, or the panel reads as a hole punched in it.
  // The cast itself is the side's own colour and comes in with `s.panel`.
  return (
    <div className={`mb-6 relative p-6 bg-raised border ${s.panel}`}>
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
