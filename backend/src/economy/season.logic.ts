// Seasons — one calendar month, UTC, numbered from 1. One exception: Season 1
// runs from the launch instant to the end of the FOLLOWING month, so launching
// part-way through a month does not ship a two-day first season. Pure and
// deterministic; every function takes the moment it should answer for, so tests
// never mock a clock.
// Spec: game-theory.md §14

const DEFAULT_LAUNCH_AT = "2026-07-31";

function parseLaunchAt(): Date {
  // CRUX_SEASON_ZERO was a month anchor; CRUX_LAUNCH_AT is a launch date. A stale
  // value carried over under the old name would silently misnumber every season,
  // and season_awards.season_number cannot be corrected afterwards — so refuse to
  // boot rather than guess which one the operator meant.
  if (
    process.env.CRUX_LAUNCH_AT === undefined &&
    process.env.CRUX_SEASON_ZERO !== undefined
  ) {
    throw new Error(
      "CRUX_SEASON_ZERO is retired and no longer read. Set CRUX_LAUNCH_AT=YYYY-MM-DD to the launch date and remove CRUX_SEASON_ZERO.",
    );
  }

  const raw = process.env.CRUX_LAUNCH_AT ?? DEFAULT_LAUNCH_AT;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) throw new Error(`CRUX_LAUNCH_AT must be YYYY-MM-DD, got "${raw}"`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export const LAUNCH_AT = parseLaunchAt();

// Season 1's exclusive end. Launching mid-month absorbs the remainder into the
// following month (31 Jul → closes 1 Sep); launching on a 1st needs no absorbing,
// so Season 1 is that month alone.
export const FIRST_SEASON_END = new Date(
  Date.UTC(
    LAUNCH_AT.getUTCFullYear(),
    LAUNCH_AT.getUTCMonth() + (LAUNCH_AT.getUTCDate() === 1 ? 1 : 2),
    1,
  ),
);

function inFirstSeason(now: number): boolean {
  return now >= LAUNCH_AT.getTime() && now < FIRST_SEASON_END.getTime();
}

export function currentSeasonStart(now: number = Date.now()): Date {
  if (inFirstSeason(now)) return new Date(LAUNCH_AT.getTime());
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function currentSeasonEnd(now: number = Date.now()): Date {
  if (inFirstSeason(now)) return new Date(FIRST_SEASON_END.getTime());
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

// Numbered from 1, and 0 for anything before launch — there is no Season 0.
// previousSeason() reads that 0 as "nothing to award", which is what keeps the
// pre-launch month from ever handing out a permanent title.
export function seasonNumber(now: number = Date.now()): number {
  if (now < LAUNCH_AT.getTime()) return 0;
  if (inFirstSeason(now)) return 1;
  const d = new Date(now);
  return (
    (d.getUTCFullYear() - FIRST_SEASON_END.getUTCFullYear()) * 12 +
    (d.getUTCMonth() - FIRST_SEASON_END.getUTCMonth()) +
    2
  );
}

// Keyed off the season's last instant rather than off `now`: Season 1 spans two
// calendar months, and a key that flipped part-way through would disagree with the
// one written to season_awards when it closes. Identical to the calendar month for
// every ordinary season.
export function seasonKey(now: number = Date.now()): string {
  const last = new Date(currentSeasonEnd(now).getTime() - 1);
  const month = String(last.getUTCMonth() + 1).padStart(2, "0");
  return `${last.getUTCFullYear()}-${month}`;
}

export function daysLeftInSeason(now: number = Date.now()): number {
  const ms = currentSeasonEnd(now).getTime() - now;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
