// Permanent, stacking season titles. FRAME_BADGE and FRAME_RING need a key per
// frame — a new frame with no entry renders unstyled. Spec: game-theory.md §14

import type { SeasonTitle } from "@/app/profile/types";

const FRAME_BADGE: Record<string, string> = {
  gold: "text-metal-gold border-metal-gold/40",
  silver: "text-metal-silver border-metal-silver/40",
  bronze: "text-metal-bronze border-metal-bronze/40",
};

export const FRAME_RING: Record<string, string> = {
  gold: "border-metal-gold",
  silver: "border-metal-silver",
  bronze: "border-metal-bronze",
};

export function bestTitle(titles: SeasonTitle[]): SeasonTitle | null {
  return titles.reduce<SeasonTitle | null>(
    (best, t) => (best === null || t.rank < best.rank ? t : best),
    null,
  );
}

const SeasonTitles = ({ titles }: { titles: SeasonTitle[] }) => {
  if (titles.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-6">
      {titles.map((t) => (
        <span
          key={`${t.seasonKey}-${t.rank}`}
          title={`Season ${t.seasonNumber} — finished #${t.rank}`}
          className={`font-label text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
            FRAME_BADGE[t.frame] ?? "text-ink-soft border-ink-faint"
          }`}
        >
          {t.title}
        </span>
      ))}
    </div>
  );
};

export default SeasonTitles;
