import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";
import type { BoardRow } from "@/app/leaderboard/board";

// The ranked table under the podium. Career counts only exist on the all-time
// board, so their columns come and go with the data rather than rendering
// empty cells on the season board.
const BoardTable = ({
  rows,
  metric,
}: {
  rows: BoardRow[];
  metric: string;
}) => {
  const hasCounts = rows.some((r) => r.statementCount !== undefined);

  return (
    <div>
      <div className="grid grid-cols-12 px-8 py-4 bg-surface-container-lowest border-b border-outline-variant/30">
        <div className="col-span-2 md:col-span-1 font-label text-[10px] text-outline uppercase tracking-widest">
          Rank
        </div>
        <div className="col-span-6 md:col-span-5 font-label text-[10px] text-outline uppercase tracking-widest">
          Debater
        </div>
        <div
          className={`col-span-4 ${hasCounts ? "md:col-span-2" : "md:col-span-6"} font-label text-[10px] text-outline uppercase tracking-widest text-right`}
        >
          {metric}
        </div>
        {hasCounts && (
          <>
            <div className="hidden md:block md:col-span-2 font-label text-[10px] text-outline uppercase tracking-widest text-right">
              Statements
            </div>
            <div className="hidden md:block md:col-span-2 font-label text-[10px] text-outline uppercase tracking-widest text-right">
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
            className={`grid grid-cols-12 px-8 py-6 ${i % 2 === 0 ? "bg-surface" : "bg-surface-container-lowest"} hover:bg-surface-container-low transition-colors items-center group border-l-2 border-transparent hover:border-primary`}
          >
            <div className="col-span-2 md:col-span-1 font-label text-xl font-bold text-outline group-hover:text-primary transition-colors">
              {String(debater.rank).padStart(2, "0")}
            </div>
            <div className="col-span-6 md:col-span-5 flex items-center gap-4 min-w-0">
              <Avatar
                username={debater.username}
                src={debater.avatar}
                size="lg"
              />
              <span className="min-w-0">
                <span className="block font-headline text-xl italic text-on-background truncate">
                  {debater.name}
                </span>
                <span className="block font-label text-[10px] uppercase tracking-widest text-outline truncate">
                  @{debater.username}
                </span>
              </span>
            </div>
            <div
              className={`col-span-4 ${hasCounts ? "md:col-span-2" : "md:col-span-6"} text-right font-label text-lg font-medium text-on-background`}
            >
              {debater.score.toLocaleString("en-US")}
            </div>
            {hasCounts && (
              <>
                <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-on-surface-variant">
                  {debater.statementCount}
                </div>
                <div className="hidden md:block md:col-span-2 text-right font-label text-lg font-medium text-on-background">
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
