// §12 Habit & Progression — the seasonal slice vs the career monument.
// Pure, deterministic season maths + the LP/division model. No I/O.

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

// §12.3 illustrative LP weights (marquee ×1.5 deferred — not stored per result).
export const LP = {
  win: 100,
  loss: -25,
  draw: 25,
  mvp: 50,
  standout: 15,
  upset: 100,
} as const;

/** Ladder Points from one debate result — standing projected onto the season. */
export function lpForResult(r: {
  outcome: string;
  isMvp: boolean;
  isStandout: boolean;
  isUpset: boolean;
}): number {
  let lp = 0;
  if (r.outcome === "win") lp += LP.win;
  else if (r.outcome === "loss") lp += LP.loss;
  else if (r.outcome === "draw") lp += LP.draw;
  if (r.isMvp) lp += LP.mvp;
  if (r.isStandout) lp += LP.standout;
  if (r.isUpset && r.outcome === "win") lp += LP.upset;
  return lp;
}

// §12.3 divisions by cumulative season LP, ordered low → high.
export const DIVISIONS: { name: string; floor: number }[] = [
  { name: "Circuit", floor: 0 },
  { name: "Contender", floor: 200 },
  { name: "Regional", floor: 500 },
  { name: "National", floor: 1000 },
  { name: "Elite", floor: 2000 },
  { name: "Champion", floor: 4000 },
];

export function divisionForLP(lp: number): string {
  let name = "Circuit";
  for (const d of DIVISIONS) if (lp >= d.floor) name = d.name;
  return name;
}
