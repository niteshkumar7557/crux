import Link from "next/link";
import { TrendingDomainCardProps } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";

// A rising domain is FOR-green and a falling one AGAINST-terracotta. Those two
// are the only colours in the system that mean direction, and re-using them
// here costs nothing — nothing on this row is a camp, so there is no clash.
const TrendingDomainCard = ({
  topic,
  changePercentage,
  arguments: argumentsCount,
  liveBattles,
}: TrendingDomainCardProps) => {
  const rising = changePercentage >= 0;
  return (
    <li>
      <Link
        href={`/domain?q=${slugifyDomain(topic)}`}
        className="group block py-3 transition-colors hover:bg-ink-wash"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-headline text-base capitalize text-ink">
            {topic}
          </span>
          <span
            className={`shrink-0 font-label text-[0.6rem] tabular-nums tracking-[0.1em] ${
              rising ? "text-side-for" : "text-side-against"
            }`}
          >
            {rising ? `+${changePercentage}` : changePercentage}%
          </span>
        </div>
        <div className="mt-1 font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
          {argumentsCount} Arguments · {liveBattles} Live battles
        </div>
      </Link>
    </li>
  );
};

export default TrendingDomainCard;
