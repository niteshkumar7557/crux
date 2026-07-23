// The logic ledger charted on a profile. Postgres only returns weeks that
// actually have events, but the chart needs a stable axis — so the gaps are
// filled here, and the series is always exactly `weeks` long.

/** One charted week. `weekStart` is a Monday, `YYYY-MM-DD`. */
export interface LedgerWeek {
  weekStart: string;
  amount: number;
}

/**
 * The Monday of the week containing `d`, in UTC — matching Postgres's
 * date_trunc('week', …), which is ISO and therefore Monday-based.
 */
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
