// §10 Season end — pure award selection and window arithmetic. No I/O.

import {
  currentSeasonStart,
  seasonKey,
  seasonNumber,
} from "../economy/season.logic.js";

export const TITLES = ["Champion", "Challenger", "Contender"] as const;
export const FRAMES = ["gold", "silver", "bronze"] as const;

export interface BoardRow {
  userId: number;
  seasonLogic: number;
}

export interface SeasonAward {
  seasonKey: string;
  seasonNumber: number;
  userId: number;
  rank: number;
  title: string;
  frame: string;
  seasonLogic: number;
}

export interface SeasonWindow {
  key: string;
  number: number;
  /** Inclusive lower bound — midnight UTC on the 1st. */
  start: Date;
  /** EXCLUSIVE upper bound — midnight UTC on the 1st of the next month. */
  end: Date;
}

/**
 * The finished season immediately before `now`, or null when there isn't one.
 *
 * Null before Season 0 closes: §10 numbers the launch month Season 0, so a
 * negative season is a month the game did not exist for. Without this guard a
 * job booted in a pre-launch month hands out "Champion of Season -2".
 */
export function previousSeason(now: number = Date.now()): SeasonWindow | null {
  // The current month's start is the previous month's exclusive end, so one
  // millisecond earlier is an instant inside the month that just closed.
  const end = currentSeasonStart(now);
  const inside = end.getTime() - 1;

  const number = seasonNumber(inside);
  if (number < 0) return null;

  return { key: seasonKey(inside), number, start: currentSeasonStart(inside), end };
}

/**
 * The top three of a finished season, in order. Rows must arrive already
 * sorted by seasonLogic descending.
 *
 * A non-positive total earns nothing: a month nobody played is not a month
 * somebody won, and a permanent title is the one reward that can never be
 * taken back. Filtering happens before ranks are handed out, so a zeroed user
 * never occupies a place on the podium.
 */
export function awardsForSeason(
  rows: BoardRow[],
  seasonNumber: number,
  seasonKey: string,
): SeasonAward[] {
  return rows
    .filter((r) => r.seasonLogic > 0)
    .slice(0, TITLES.length)
    .map((r, i) => ({
      seasonKey,
      seasonNumber,
      userId: r.userId,
      rank: i + 1,
      title: `${TITLES[i]} of Season ${seasonNumber}`,
      frame: FRAMES[i]!,
      seasonLogic: r.seasonLogic,
    }));
}
