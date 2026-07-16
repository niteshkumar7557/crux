import Link from "next/link";
import { TrendingDomainCardProps } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";

const TrendingDomainCard = ({
  topic,
  changePercentage,
  arguments: argumentsCount,
  liveBattles,
}: TrendingDomainCardProps) => {
  return (
    <Link href={`/domain?q=${slugifyDomain(topic)}`} className="group block">
      <div className="flex justify-between items-start mb-1">
        <span className="font-body capitalize text-sm font-bold group-hover:text-primary transition-colors">
          {topic}
        </span>
        <span
          className={`font-label text-[10px] ${changePercentage >= 0 ? "text-primary-container bg-primary-container/10" : "text-secondary-container bg-secondary-container/10"} px-1.5`}
        >
          {changePercentage > 0 ? `+${changePercentage}` : changePercentage}%
        </span>
      </div>
      <div className="text-[10px] font-label text-outline uppercase tracking-widest">
        {argumentsCount} Arguments • {liveBattles} Live Battles
      </div>
    </Link>
  );
};

export default TrendingDomainCard;
