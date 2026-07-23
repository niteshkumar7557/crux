import type { ProfileStanding } from "@/app/profile/types";

// §9: logic, record, MVP count and rank — the four numbers a profile carries.
// One hairline-divided band, not four floating cards.
//
// W-L-D stays neutral on purpose: working rule 4 reserves `secondary` (red)
// for stance — it means AGAINST — and there is no stance on a profile.
const Cell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="bg-surface-container-low p-6">
    <span className="font-label text-[10px] text-outline uppercase tracking-widest block mb-2">
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
    className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-outline-variant/20 mb-12"
  >
    <Cell label="Logic">
      <span className="text-primary">
        {standing.logic.toLocaleString("en-US")}
      </span>
    </Cell>
    <Cell label="Record">
      <span className="text-primary">{standing.record.wins}</span>
      <span className="text-on-surface-variant">
        –{standing.record.losses}–{standing.record.draws}
      </span>
    </Cell>
    <Cell label="MVP">
      <span className="text-tertiary">×{standing.mvpCount}</span>
    </Cell>
    <Cell label="Global Rank">
      <span className="text-on-background">#{standing.globalRank}</span>
    </Cell>
  </section>
);

export default CareerStrip;
