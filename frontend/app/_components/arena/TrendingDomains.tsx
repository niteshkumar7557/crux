// Sidebar: the busiest domains.

import TrendingDomainCard from "./TrendingDomainCard";
import SidebarSection from "./SidebarSection";
import { TrendingDomainCardData } from "@/app/types";

const TrendingDomains = ({ data }: { data: TrendingDomainCardData }) => {
  return (
    <SidebarSection
      title="Trending Domains"
      action={{ label: "All domains", href: "/domain?q=all" }}
    >
      <ul className="divide-y divide-ink-faint">
        {data.map((domain, i) => (
          <TrendingDomainCard
            key={i}
            topic={domain.topic}
            changePercentage={domain.changePercentage}
            arguments={domain.arguments}
            liveBattles={domain.liveBattles}
          />
        ))}
      </ul>
    </SidebarSection>
  );
};

export default TrendingDomains;
