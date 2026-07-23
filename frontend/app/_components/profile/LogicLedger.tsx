"use client";
import type { LedgerWeek } from "@/app/profile/types";

// The real logic ledger — a windowed sum over logic_events, the same table
// the season board reads. §8's season-only loss penalty means a week can net
// negative, so negatives render downward in `outline` rather than being
// hidden. Red is reserved for stance (working rule 4).
const label = (weekStart: string) => {
  const [, m, d] = weekStart.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/**
 * §10: a season is a calendar month, so the reset lands on the week
 * containing the 1st. Marking that column makes "everyone starts at 0"
 * legible in the chart instead of only being claimed in the season band.
 * Returns the Monday of that week, matching the ledger's own week keys.
 */
function seasonStartWeek(now: Date = new Date()): string {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dow = (first.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  first.setUTCDate(first.getUTCDate() - dow);
  return first.toISOString().slice(0, 10);
}

const LogicLedger = ({
  ledger,
  seasonNumber,
}: {
  ledger: LedgerWeek[];
  seasonNumber: number;
}) => {
  const peak = Math.max(1, ...ledger.map((w) => Math.abs(w.amount)));
  const total = ledger.reduce((sum, w) => sum + w.amount, 0);
  const empty = ledger.every((w) => w.amount === 0);
  const seasonWeek = seasonStartWeek();
  const showsSeasonStart = ledger.some((w) => w.weekStart === seasonWeek);

  return (
    <div className="bg-surface-container p-8 h-full">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="font-headline text-3xl font-bold mb-1 italic">
            Logic Ledger
          </h2>
          <span className="font-label text-[10px] text-outline uppercase tracking-widest">
            Last {ledger.length} weeks
          </span>
        </div>
        <span className="font-label text-2xl font-bold text-primary shrink-0">
          {total >= 0 ? "+" : ""}
          {total}
        </span>
      </div>

      {empty ? (
        <p className="font-body text-sm text-outline italic py-16">
          No logic earned yet. Your first argument starts the line.
        </p>
      ) : (
        <div className="h-56 flex items-stretch gap-2">
          {ledger.map((w) => (
            <div
              key={w.weekStart}
              className={`flex-1 flex flex-col justify-center min-w-0 ${
                w.weekStart === seasonWeek ? "border-l border-tertiary/60" : ""
              }`}
              title={`${w.amount >= 0 ? "+" : ""}${w.amount} logic · week of ${w.weekStart}`}
            >
              <div className="flex-1 flex items-end">
                {w.amount > 0 && (
                  <div
                    data-ledger-bar
                    className="w-full bg-primary"
                    style={{ height: `${(w.amount / peak) * 100}%` }}
                  />
                )}
              </div>
              <div className="h-px bg-outline-variant/40 my-1" />
              <div className="flex-1 flex items-start">
                {w.amount < 0 && (
                  <div
                    data-ledger-bar
                    className="w-full bg-outline"
                    style={{ height: `${(Math.abs(w.amount) / peak) * 100}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!empty && (
        <div className="flex justify-between items-baseline gap-4 mt-3">
          <span className="font-label text-[10px] text-outline">
            {label(ledger[0].weekStart)}
          </span>
          {showsSeasonStart && (
            <span className="font-label text-[10px] uppercase tracking-widest text-tertiary">
              │ Season {seasonNumber} began
            </span>
          )}
          <span className="font-label text-[10px] text-outline">
            {label(ledger[ledger.length - 1].weekStart)}
          </span>
        </div>
      )}
    </div>
  );
};

export default LogicLedger;
