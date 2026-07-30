// W-L-D, MVPs, rank. Spec: game-theory.md §13

import type { ProfileStanding } from "@/app/profile/types";

const Cell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="bg-band p-6">
    <span className="font-label text-[10px] text-ink-soft uppercase tracking-widest block mb-2">
      {label}
    </span>
    <span className="font-label text-4xl font-bold tracking-tight">
      {children}
    </span>
  </div>
);

const CareerStrip = ({ standing }: { standing: ProfileStanding }) => (
  <section
    aria-label="Career totals"
    className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-faint mb-12"
  >
    <Cell label="Logic">
      <span className="text-laurel">
        {standing.logic.toLocaleString("en-US")}
      </span>
    </Cell>
    <Cell label="Record (Win–Loss–Draw)">
      <span className="text-ink">{standing.record.wins}</span>
      <span className="text-ink-soft">
        –{standing.record.losses}–{standing.record.draws}
      </span>
    </Cell>
    <Cell label="MVP">
      <span className="text-laurel">×{standing.mvpCount}</span>
    </Cell>
    <Cell label="Global Rank">
      <span className="text-ink">#{standing.globalRank}</span>
    </Cell>
  </section>
);

export default CareerStrip;
