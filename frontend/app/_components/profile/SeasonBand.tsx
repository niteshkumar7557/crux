import Link from "next/link";
import type { ProfileSeason } from "@/app/profile/types";

// §14 requires the season window on the profile as well as the leaderboard,
// stated and never left to be inferred. The wording matches the leaderboard's
// strip so the same fact reads the same way in both places.
const SeasonBand = ({ season }: { season: ProfileSeason }) => (
  <section className="bg-surface-container-low border-l-4 border-primary p-6 mb-12">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <span className="font-label text-[10px] uppercase tracking-widest text-outline block mb-2">
          Season {season.number} · {season.daysLeft}{" "}
          {season.daysLeft === 1 ? "day" : "days"} left
        </span>
        <span className="font-label text-4xl font-bold text-primary">
          {season.logic}
          <span className="text-lg text-outline"> logic</span>
        </span>
      </div>
      <div className="md:text-right">
        <p className="font-body text-sm text-on-surface-variant">
          Logic earned this month — everyone starts at 0.
        </p>
        <p className="font-body text-sm text-on-surface-variant">
          The top 3 on the 1st earn a permanent title and avatar frame.
        </p>
        <Link
          href="/leaderboard"
          className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline mt-2 inline-block"
        >
          See the season board
        </Link>
      </div>
    </div>
  </section>
);

export default SeasonBand;
