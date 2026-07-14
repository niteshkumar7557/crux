import { TopDebatersCardProps } from "@/app/types";
import Link from "next/link";
import Avatar from "@/app/_components/ui/Avatar";

const TopDebatersCard = ({
  rank,
  name,
  logicScore,
  id,
}: TopDebatersCardProps) => {
  return (
    <Link
      href={`/profile/${id}`}
      className="flex cursor-pointer items-center gap-4 p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors"
    >
      <span
        className={`font-label ${rank !== 1 ? "text-outline" : "text-primary-container"} text-xs w-4`}
      >
        {rank < 10 ? `0${rank}` : rank}
      </span>
      <Avatar username={name} size="lg" />
      <div>
        <div className="text-sm font-bold">{name}</div>
        <div className="text-[10px] font-label text-outline uppercase tracking-widest">
          {logicScore} logic score
        </div>
      </div>
    </Link>
  );
};

export default TopDebatersCard;
