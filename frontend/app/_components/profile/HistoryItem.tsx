import { DebateHistoryProps } from "@/app/profile/types";
import { MdOutlinePlayArrow } from "react-icons/md";

const HistoryItem = ({
  date,
  result,
  inFavour,
  title,
  score,
  replayLink,
}: DebateHistoryProps) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-surface-container-low items-center border-l-4 ${result === "win" ? "border-primary" : "border-secondary"}`}
    >
      <div className="md:col-span-2">
        <span className="font-label text-[10px] text-outline block mb-1">
          DATE / RESULT
        </span>
        <span
          className={`font-label text-sm ${result === "win" ? "text-primary" : "text-secondary"} font-bold uppercase`}
        >
          {date} / {result}
        </span>
      </div>
      <div className="md:col-span-6">
        <span className="font-label text-[10px] text-outline block mb-1">
          {inFavour ? "IN FAVOUR" : "OPPOSITION"}
        </span>
        <h3 className="font-body font-bold text-lg">"{title}"</h3>
      </div>
      <div className="md:col-span-2">
        <span className="font-label text-[10px] text-outline block mb-1">
          SCORE
        </span>
        <span className="font-headline text-xl">
          {score}% Affirmative
        </span>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <a
          className="flex items-center gap-2 font-label text-xs uppercase tracking-widest text-primary hover:text-white transition-colors"
          href="#"
        >
          Play Replay{" "}
          <span className="material-symbols-outlined text-sm">
            <MdOutlinePlayArrow />
          </span>
        </a>
      </div>
    </div>
  );
};

export default HistoryItem;
