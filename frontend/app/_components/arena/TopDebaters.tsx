import { TopDebatersCardData } from "@/app/types";
import { PLACEHOLDER_AVATAR_URL } from "@/app/_utils/constants";
import TopDebatersCard from "./TopDebatersCard";
import Link from "next/link";

const TopDebaters = ({ data }: { data: TopDebatersCardData }) => {
  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-label text-xs uppercase tracking-[0.3em] text-outline flex items-center gap-2">
          <span className="w-8 h-px bg-outline-variant"></span>
          Top Debaters
        </h4>
        <Link
          href={"/leaderboard"}
          className="font-label text-[10px] text-primary uppercase tracking-widest hover:underline"
        >
          Full Standings
        </Link>
      </div>
      <div className="space-y-2">
        {data.map((e, i) => (
          <TopDebatersCard
            key={i}
            id={e.id}
            rank={e.rank}
            avatar_url={PLACEHOLDER_AVATAR_URL}
            name={e.name}
            logicScore={e.logicScore}
          />
        ))}
      </div>
    </div>
  );
};

export default TopDebaters;
