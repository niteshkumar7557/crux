import Link from "next/link";
import TrendingDomainCard from "./TrendingDomainCard";
import { TrendingDomainCardData } from "@/app/types";

const TrendingDomains = ({ data }: { data: TrendingDomainCardData }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-label text-xs uppercase tracking-[0.3em] text-outline flex items-center gap-2">
          <span className="w-8 h-px bg-outline-variant"></span>
          Trending Domains
        </h4>
        <Link
          href={"/domain?q=all"}
          className="font-label text-[10px] text-primary uppercase tracking-widest hover:underline"
        >
          All Domains
        </Link>
      </div>
      <div className="space-y-4">
        {data.length > 0 &&
          data.map((e, i) => (
            <TrendingDomainCard
              key={i}
              topic={e.topic}
              changePercentage={e.changePercentage}
              arguments={e.arguments}
              liveBattles={e.liveBattles}
            />
          ))}
      </div>
    </div>
  );
};

export default TrendingDomains;
