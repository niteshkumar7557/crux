"use client";

// Both living cases, as an index into the arguments below rather than a document
// beside them: every attributed point jumps to the argument that made it.
// Spec: game-theory.md §17

import { PiCpu } from "react-icons/pi";
import type { Analysis } from "@/app/motion/types";
import { focusArgument } from "@/app/_utils/focusArgument";

const SIDES = {
  for: {
    title: "For holds",
    accent: "text-side-for",
    bullet: "border-side-for/40",
    nameHover: "hover:text-side-for",
  },
  against: {
    title: "Against holds",
    accent: "text-side-against",
    bullet: "border-side-against/40",
    nameHover: "hover:text-side-against",
  },
} as const;

const Case = ({
  side,
  analysis,
  count,
}: {
  side: "for" | "against";
  analysis: Analysis;
  count: number;
}) => {
  const s = SIDES[side];
  const points = analysis?.points ?? [];
  const lead = analysis?.lead ?? "";

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-ink-faint pb-2">
        <h2
          className={`font-label text-[11px] font-bold uppercase tracking-[0.22em] ${s.accent}`}
        >
          {s.title}
        </h2>
        <span
          className={`font-label text-[0.62rem] uppercase tracking-[0.22em] tabular-nums ${s.accent}`}
        >
          {count} {count === 1 ? "argument" : "arguments"}
        </span>
      </div>
      {lead && (
        <p className="mb-3 line-clamp-2 font-label text-[0.78rem] leading-[1.6] text-ink-soft">
          {lead}
        </p>
      )}
      {points.length === 0 ? (
        <p className="font-label text-[0.78rem] leading-[1.6] text-ink-soft">
          No case yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li
              key={`${i}-${p.text}`}
              className={`border-l-2 pl-3 font-label text-[0.8rem] leading-[1.5] text-ink-soft ${s.bullet}`}
            >
              {p.argumentId !== null ? (
                <button
                  type="button"
                  onClick={() => focusArgument(p.argumentId as number)}
                  aria-label={`Read the argument behind: ${p.text}`}
                  className={`cursor-pointer text-left transition-colors ${s.nameHover}`}
                >
                  {p.text}
                </button>
              ) : (
                p.text
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CaseIndex = ({
  analysis,
  forCount,
  againstCount,
}: {
  analysis: [Analysis, Analysis];
  forCount: number;
  againstCount: number;
}) => (
  <div className="border border-ink-faint bg-raised p-6 shadow-cast">
    <div className="mb-5 flex items-center gap-2">
      <PiCpu className="text-sm text-ink-soft" />
      <span className="font-label text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft">
        Crux AI · the state of play
      </span>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
      <Case side="for" analysis={analysis[0]} count={forCount} />
      <Case side="against" analysis={analysis[1]} count={againstCount} />
    </div>
  </div>
);

export default CaseIndex;
