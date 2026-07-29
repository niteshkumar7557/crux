import { TopDebatersCardData } from "@/app/types";
import TopDebatersCard from "./TopDebatersCard";
import SidebarSection from "./SidebarSection";

const TopDebaters = ({ data }: { data: TopDebatersCardData }) => {
  return (
    <SidebarSection
      title="Top Debaters"
      action={{ label: "Full standings", href: "/leaderboard" }}
      className="mt-12"
    >
      <ol className="divide-y divide-ink-faint">
        {data.map((debater, i) => (
          <TopDebatersCard
            key={i}
            id={debater.id}
            rank={debater.rank}
            name={debater.name}
            username={debater.username}
            avatar={debater.avatar}
            logicScore={debater.logicScore}
          />
        ))}
      </ol>
    </SidebarSection>
  );
};

export default TopDebaters;
