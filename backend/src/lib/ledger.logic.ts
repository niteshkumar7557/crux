// Fills the gaps in the profile's weekly logic chart, so the axis is stable even in
// weeks with no events. Weeks can net negative — the season-only loss penalty is
// included, because that is the honest reading of the month.
// Spec: game-theory.md §13

export interface LedgerWeek {
  weekStart: string;
  amount: number;
}

function mondayOf(d: Date): Date {
  const m = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dow = (m.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  m.setUTCDate(m.getUTCDate() - dow);
  return m;
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

export function fillLedgerWeeks(
  rows: { weekStart: string; amount: number }[],
  weeks: number,
  now: Date = new Date(),
): LedgerWeek[] {
  const byWeek = new Map<string, number>();
  for (const r of rows) {
    const key = String(r.weekStart).slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + Number(r.amount));
  }

  const end = mondayOf(now);
  const out: LedgerWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const wk = new Date(end);
    wk.setUTCDate(wk.getUTCDate() - i * 7);
    const key = isoDay(wk);
    out.push({ weekStart: key, amount: byWeek.get(key) ?? 0 });
  }
  return out;
}
