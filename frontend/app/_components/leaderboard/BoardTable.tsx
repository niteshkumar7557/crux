// Ranks four through the page size.

import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";
import type { BoardRow } from "@/app/leaderboard/board";

const BoardTable = ({
  rows,
  metric,
}: {
  rows: BoardRow[];
  metric: string;
}) => {
  const hasCounts = rows.some((r) => r.motionCount !== undefined);

  return (
    <div>
      <div className="grid grid-cols-12 px-8 py-4 bg-paper border-b border-ink-faint">
        <div className="col-span-2 md:col-span-1 font-label text-[10px] text-ink-soft uppercase tracking-widest">
          Rank
        </div>
        <div className="col-span-6 md:col-span-5 font-label text-[10px] text-ink-soft uppercase tracking-widest">
          Debater
        </div>
        <div
          className={`col-span-4 ${hasCounts ? "md:col-span-2" : "md:col-span-6"} font-label text-[10px] text-ink-soft uppercase tracking-widest text-right`}
        >
          {metric}
        </div>
        {hasCounts && (
          <>
            <div className="hidden md:block md:col-span-2 font-label text-[10px] text-ink-soft uppercase tracking-widest text-right">
              Motions
            </div>
            <div className="hidden md:block md:col-span-2 font-label text-[10px] text-ink-soft uppercase tracking-widest text-right">
              Arguments
            </div>
          </>
        )}
      </div>
      <div className="space-y-px">
        {rows.map((debater, i) => (
          <Link
            key={debater.id}
            href={`/profile/${debater.username}`}
            data-reveal
            className={`grid grid-cols-12 px-8 py-6 ${i % 2 === 0 ? "bg-band" : "bg-paper"} hover:bg-raised transition-colors items-center group border-l-2 border-transparent hover:border-ink`}
          >
            <div className="col-span-2 md:col-span-1 font-label text-xl font-bold text-ink-soft group-hover:text-ink transition-colors">
              {String(debater.rank).padStart(2, "0")}
            </div>
            <div className="col-span-6 md:col-span-5 flex items-center gap-4 min-w-0">
              <Avatar
                username={debater.username}
                src={debater.avatar}
                size="lg"
              />
              <span className="min-w-0">
                <span className="block font-headline text-xl italic text-ink truncate">
                  {debater.name}
                </span>
                <span className="block font-label text-[10px] uppercase tracking-widest text-ink-soft truncate">
                  @{debater.username}
                </span>
              </span>
            </div>
            <div
              className={`col-span-4 ${hasCounts ? "md:col-span-2" : "md:col-span-6"} text-right font-label text-lg font-medium text-ink`}
            >
              {debater.score.toLocaleString("en-US")}
            </div>
            {hasCounts && (
              <>
                <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-ink-soft">
                  {debater.motionCount}
                </div>
                <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-ink">
                  {debater.argumentCount}
                </div>
              </>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BoardTable;
