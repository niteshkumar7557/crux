import type { SeasonTitle } from "@/app/profile/types";

// §10: the only reward that survives a season — permanent, stacking, and
// status-only. A profile shows every title ever earned.
//
// Frame colours are spelled out because Tailwind cannot see a class name that
// is assembled at runtime; a lookup keeps all three variants in the built CSS.
const FRAME_BADGE: Record<string, string> = {
  gold: "text-[#ffd690] border-[#ffd690]/40",
  silver: "text-[#c9d1d4] border-[#c9d1d4]/40",
  bronze: "text-[#d09a6a] border-[#d09a6a]/40",
};

/** The avatar frame that goes with each rank (§10). */
export const FRAME_RING: Record<string, string> = {
  gold: "border-[#ffd690]",
  silver: "border-[#c9d1d4]",
  bronze: "border-[#d09a6a]",
};

/** The best rank this profile has ever placed — it styles the avatar frame. */
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
            FRAME_BADGE[t.frame] ?? "text-outline border-outline/30"
          }`}
        >
          {t.title}
        </span>
      ))}
    </div>
  );
};

export default SeasonTitles;
