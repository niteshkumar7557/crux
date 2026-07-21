// §10 Seasons — pure, deterministic season maths. No I/O.
// NOTE: still the old 28-day anchored window; Task B1 replaces it with
// real UTC calendar months.

const DAY_MS = 86_400_000;
// A fixed anchor so season windows are deterministic everywhere (2026-01-05 UTC).
export const SEASON_ANCHOR = Date.UTC(2026, 0, 5);
export const SEASON_LENGTH_DAYS = 28; // 4-week heartbeat (§12.1)

/** UTC ms at the start of the season containing `now`. */
export function currentSeasonStart(now: number = Date.now()): number {
  const periods = Math.floor(
    (now - SEASON_ANCHOR) / (SEASON_LENGTH_DAYS * DAY_MS),
  );
  return SEASON_ANCHOR + periods * SEASON_LENGTH_DAYS * DAY_MS;
}

/** 1-based season number for `now`. */
export function currentSeasonNumber(now: number = Date.now()): number {
  return (
    Math.floor((now - SEASON_ANCHOR) / (SEASON_LENGTH_DAYS * DAY_MS)) + 1
  );
}
