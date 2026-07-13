import HistoryItem from "./HistoryItem";
import { DebateHistoryProps } from "@/app/profile/types";

const DebateHistory = ({
  debateHistoryData,
}: {
  debateHistoryData: DebateHistoryProps[];
}) => {
  return (
    <div className="py-8 lg:col-span-12">
      <div className="flex items-center justify-between mb-8 border-b border-outline-variant pb-4">
        <h2 className="font-headline text-4xl font-bold italic">
          Debate History
        </h2>
        <span className="font-label text-xs text-outline uppercase tracking-widest">
          Showing last 4 Sessions
        </span>
      </div>
      <div className="space-y-4">
        {debateHistoryData.map((e, i) => (
          <HistoryItem
            key={i}
            date={e.date}
            result={e.result}
            inFavour={e.inFavour}
            title={e.title}
            score={e.score}
            replayLink={e.replayLink}
          />
        ))}
      </div>
    </div>
  );
};

export default DebateHistory;
