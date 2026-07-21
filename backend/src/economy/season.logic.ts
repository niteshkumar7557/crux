// §10 Seasons — one calendar month, UTC. Pure, deterministic. No I/O.
//
// Season 0 is the launch month. Set CRUX_SEASON_ZERO=YYYY-MM in the
// environment before launch; the default below is the fallback.

const DEFAULT_SEASON_ZERO = "2026-08";

function parseSeasonZero(): { year: number; month: number } {
  const raw = process.env.CRUX_SEASON_ZERO ?? DEFAULT_SEASON_ZERO;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) throw new Error(`CRUX_SEASON_ZERO must be YYYY-MM, got "${raw}"`);
  return { year: Number(m[1]), month: Number(m[2]) - 1 }; // month is 0-indexed
}

export const SEASON_ZERO = parseSeasonZero();

/** Midnight UTC on the 1st of the month containing `now`. */
export function currentSeasonStart(now: number = Date.now()): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Midnight UTC on the 1st of the FOLLOWING month — the exclusive upper bound. */
export function currentSeasonEnd(now: number = Date.now()): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** 0-based season number. The launch month is Season 0. */
export function seasonNumber(now: number = Date.now()): number {
  const d = new Date(now);
  return (
    (d.getUTCFullYear() - SEASON_ZERO.year) * 12 +
    (d.getUTCMonth() - SEASON_ZERO.month)
  );
}

/** 'YYYY-MM' — the stable key a season's awards are filed under. */
export function seasonKey(now: number = Date.now()): string {
  const d = new Date(now);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}`;
}

/** Whole days remaining, rounded up. Never below 0. */
export function daysLeftInSeason(now: number = Date.now()): number {
  const ms = currentSeasonEnd(now).getTime() - now;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
