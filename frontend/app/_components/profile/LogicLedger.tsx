"use client";

// Twelve weeks of earnings. A week can net negative — the season-only loss penalty
// is included, because that is the honest reading of the month.
// Spec: game-theory.md §12, §13

import type { LedgerWeek } from "@/app/profile/types";

const label = (weekStart: string) => {
  const [, m, d] = weekStart.split("-");
  return `${Number(d)}/${Number(m)}`;
};

// The bars are keyed by Postgres `date_trunc('week', …)`, which is Monday-based —
// so the season's opening day has to be walked back to its Monday to name a bar.
function weekOf(startsAt: string): string {
  const d = new Date(startsAt);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

const LogicLedger = ({
  ledger,
  seasonNumber,
  seasonStartsAt,
}: {
  ledger: LedgerWeek[];
  seasonNumber: number;
  seasonStartsAt: string;
}) => {
  const peak = Math.max(1, ...ledger.map((w) => Math.abs(w.amount)));
  const total = ledger.reduce((sum, w) => sum + w.amount, 0);
  const empty = ledger.every((w) => w.amount === 0);
  const seasonWeek = weekOf(seasonStartsAt);
  const seasonIndex = ledger.findIndex((w) => w.weekStart === seasonWeek);
  // The caption sits in the marked column, not centred under the chart — a season
  // that opened in the last week is the normal case, and a centred label points at
  // a week that has nothing to do with it. Past halfway it hangs to the left of its
  // column so it cannot run off the card.
  //
  // It is offset from the ROW's edge rather than laid inside its own column: a
  // column is a twelfth of the chart, which is ~50px on a desktop card and ~23px on
  // a phone, and a nowrap caption three times wider than its box overflows whatever
  // its text-align says. On mobile that overflow escaped the card and gave the whole
  // profile page a horizontal scrollbar. Anchored to the row it can only ever run
  // inward, so the caption is clamped by the chart's full width instead.
  const captionRight = seasonIndex > ledger.length / 2;
  const captionOffset = `${
    ((captionRight ? ledger.length - 1 - seasonIndex : seasonIndex) /
      ledger.length) *
    100
  }%`;

  return (
    <div className="bg-band p-5 sm:p-8 h-full">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="font-headline text-3xl font-bold mb-1 italic">
            Logic Ledger
          </h2>
          <span className="font-label text-[10px] text-ink-soft uppercase tracking-widest">
            Last {ledger.length} weeks
          </span>
        </div>
        <span className="font-label text-2xl font-bold text-laurel shrink-0">
          {total >= 0 ? "+" : ""}
          {total}
        </span>
      </div>

      {empty ? (
        <p className="font-body text-sm text-ink-soft italic py-16">
          No logic earned yet. Your first argument starts the line.
        </p>
      ) : (
        <div className="h-56 flex items-stretch gap-2">
          {ledger.map((w) => (
            <div
              key={w.weekStart}
              className={`flex-1 flex flex-col justify-center min-w-0 ${
                w.weekStart === seasonWeek ? "border-l border-laurel/60" : ""
              }`}
              title={`${w.amount >= 0 ? "+" : ""}${w.amount} logic · week of ${w.weekStart}`}
            >
              <div className="flex-1 flex items-end">
                {w.amount > 0 && (
                  <div
                    data-ledger-bar
                    className="w-full bg-laurel"
                    style={{ height: `${(w.amount / peak) * 100}%` }}
                  />
                )}
              </div>
              <div className="h-px bg-ink-faint my-1" />
              <div className="flex-1 flex items-start">
                {w.amount < 0 && (
                  <div
                    data-ledger-bar
                    className="w-full bg-ink-faint"
                    style={{ height: `${(Math.abs(w.amount) / peak) * 100}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!empty && (
        <>
          <div className="flex justify-between items-baseline gap-4 mt-3">
            <span className="font-label text-[10px] text-ink-soft">
              {label(ledger[0].weekStart)}
            </span>
            <span className="font-label text-[10px] text-ink-soft">
              {label(ledger[ledger.length - 1].weekStart)}
            </span>
          </div>
          {seasonIndex >= 0 && (
            <div className="relative mt-2 h-4 overflow-hidden">
              <span
                className="absolute whitespace-nowrap font-label text-[10px] uppercase tracking-widest text-laurel"
                style={captionRight ? { right: captionOffset } : { left: captionOffset }}
              >
                Season {seasonNumber} began
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LogicLedger;
