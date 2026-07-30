// Seasons — one calendar month, UTC. Pure and deterministic; every function takes
// the moment it should answer for, so tests never mock a clock.
// Spec: game-theory.md §14

const DEFAULT_SEASON_ZERO = "2026-08";

function parseSeasonZero(): { year: number; month: number } {
  const raw = process.env.CRUX_SEASON_ZERO ?? DEFAULT_SEASON_ZERO;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) throw new Error(`CRUX_SEASON_ZERO must be YYYY-MM, got "${raw}"`);
  return { year: Number(m[1]), month: Number(m[2]) - 1 }; // month is 0-indexed // month is 0-indexed
}

export const SEASON_ZERO = parseSeasonZero();

export function currentSeasonStart(now: number = Date.now()): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function currentSeasonEnd(now: number = Date.now()): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export function seasonNumber(now: number = Date.now()): number {
  const d = new Date(now);
  return (
    (d.getUTCFullYear() - SEASON_ZERO.year) * 12 +
    (d.getUTCMonth() - SEASON_ZERO.month)
  );
}

export function seasonKey(now: number = Date.now()): string {
  const d = new Date(now);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}`;
}

export function daysLeftInSeason(now: number = Date.now()): number {
  const ms = currentSeasonEnd(now).getTime() - now;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
