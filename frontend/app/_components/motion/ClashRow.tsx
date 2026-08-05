"use client";

// One exchange. Left half is always FOR and right half always AGAINST — §6 keeps
// a reply in its own side's column, and this preserves that while making the
// exchange, not the argument, the block a reader scans.
// Spec: game-theory.md §6

import { useState } from "react";
import UserArgumentCard from "./UserArgumentCard";
import { useReplyTarget } from "./ReplyContext";
import { CLASH_VISIBLE_DEPTH, type Clash, type ClashEntry } from "./clash";

// Literal class strings: Tailwind cannot see a name built at runtime.
const COLUMN = {
  for: "lg:col-start-1",
  against: "lg:col-start-2",
} as const;

const DEPTH_INDENT = ["", "pl-4 lg:pl-0", "pl-8 lg:pl-0"] as const;

const OPPOSING = {
  for: {
    column: COLUMN.against,
    text: "text-side-against",
    frame: "border-side-against/40",
    hover: "hover:text-side-against",
  },
  against: {
    column: COLUMN.for,
    text: "text-side-for",
    frame: "border-side-for/40",
    hover: "hover:text-side-for",
  },
} as const;

const Entry = ({ entry }: { entry: ClashEntry }) => (
  <div
    className={`${COLUMN[entry.argument.side]} ${DEPTH_INDENT[Math.min(entry.depth, 2)]}`}
  >
    <UserArgumentCard {...entry.argument} />
  </div>
);

const ClashRow = ({ clash }: { clash: Clash }) => {
  const [expanded, setExpanded] = useState(false);
  const { setTarget } = useReplyTarget();

  const root = clash.root.argument;
  const shown = expanded
    ? clash.entries
    : clash.entries.filter((e) => e.depth <= CLASH_VISIBLE_DEPTH);
  const hidden = clash.entries.length - shown.length;

  const opposing = OPPOSING[root.side];

  // The same gate the card's own Reply button uses: a button that opens a closed
  // composer, or one the viewer's side lock forbids, is a dead end.
  const canAnswer =
    !root.closed &&
    root.user_id !== undefined &&
    (root.viewerLockedSide === null || root.viewerLockedSide !== root.side);

  return (
    <div className="relative grid grid-cols-1 gap-x-10 border-b border-ink-faint py-8 lg:grid-cols-2 lg:before:absolute lg:before:inset-y-0 lg:before:left-1/2 lg:before:w-px lg:before:bg-ink-faint">
      <Entry entry={clash.root} />
      {shown.map((entry) => (
        <Entry key={entry.argument.argument_id} entry={entry} />
      ))}

      {clash.unanswered && (
        <div className={`${opposing.column} flex items-start`}>
          <div className={`border-l-2 py-2 pl-4 ${opposing.frame}`}>
            <p
              className={`font-label text-[0.62rem] font-bold uppercase tracking-[0.28em] ${opposing.text}`}
            >
              {root.closed ? "Stood unanswered" : "Unanswered"}
            </p>
            {canAnswer && (
              <button
                type="button"
                onClick={() =>
                  setTarget({
                    argumentId: root.argument_id,
                    username: root.username,
                    content: root.argument,
                    side: root.side,
                  })
                }
                className={`mt-1.5 cursor-pointer font-label text-[0.72rem] uppercase tracking-[0.15em] text-ink-soft transition-colors ${opposing.hover}`}
              >
                Answer it →
              </button>
            )}
          </div>
        </div>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="col-span-full mt-2 cursor-pointer text-left font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
        >
          ▾ {hidden} more in this exchange
        </button>
      )}
    </div>
  );
};

export default ClashRow;
