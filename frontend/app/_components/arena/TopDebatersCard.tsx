import { TopDebatersCardProps } from "@/app/types";
import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";

// Rank numerals are laurel only at the top of the board — gold is for things
// that were earned, and fourth place is not one of them (design-system.md §2).
const TopDebatersCard = ({
  rank,
  name,
  username,
  avatar,
  logicScore,
}: TopDebatersCardProps) => {
  return (
    <li>
      <Link
        href={`/profile/${username}`}
        className="flex items-center gap-4 py-3 px-2 transition-colors hover:bg-ink-wash"
      >
        <span
          className={`w-5 shrink-0 font-label text-xs tabular-nums ${
            rank === 1 ? "text-laurel" : "text-ink-soft"
          }`}
        >
          {rank < 10 ? `0${rank}` : rank}
        </span>
        <Avatar username={username} src={avatar} size="lg" />
        <div className="min-w-0">
          <div className="truncate font-headline text-base text-ink">
            {name}
          </div>
          <div className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
            {logicScore} Logic score
          </div>
        </div>
      </Link>
    </li>
  );
};

export default TopDebatersCard;
