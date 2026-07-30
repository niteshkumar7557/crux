// The season window and where this user stands in it. Spec: game-theory.md §14, §19

import Link from "next/link";
import type { ProfileSeason } from "@/app/profile/types";

const SeasonBand = ({ season }: { season: ProfileSeason }) => (
  <section className="mb-12 border border-ink-faint bg-band p-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft block mb-2">
          Season {season.number} · {season.daysLeft}{" "}
          {season.daysLeft === 1 ? "day" : "days"} left
        </span>
        <span className="font-label text-4xl font-bold text-laurel">
          {season.logic}
          <span className="text-lg text-ink-soft"> logic</span>
        </span>
      </div>
      <div className="md:text-right">
        <p className="font-body text-sm text-ink-soft">
          Logic earned this month — everyone starts at 0.
        </p>
        <p className="font-body text-sm text-ink-soft">
          The top 3 on the 1st earn a permanent title and avatar frame.
        </p>
        <Link
          href="/leaderboard"
          className="font-label text-[10px] uppercase tracking-widest text-laurel hover:underline mt-2 inline-block"
        >
          See the season board
        </Link>
      </div>
    </div>
  </section>
);

export default SeasonBand;
