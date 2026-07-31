// Which three users win a finished season, and when there isn't one. Pure.
// A non-positive total earns nothing, and anything before Season 1 can never be
// awarded — a permanent title is the one reward that cannot be taken back.
// Spec: game-theory.md §14

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
  start: Date;
  end: Date;
}

export function previousSeason(now: number = Date.now()): SeasonWindow | null {
  // The current month's start is the previous month's exclusive end, so one
  // millisecond earlier is an instant inside the month that just closed.
  const end = currentSeasonStart(now);
  const inside = end.getTime() - 1;

  // Seasons are numbered from 1, so anything below it is pre-launch: the partial
  // month before Season 1 opened, which never closed and never pays out.
  const number = seasonNumber(inside);
  if (number < 1) return null;

  return { key: seasonKey(inside), number, start: currentSeasonStart(inside), end };
}

export function awardsForSeason(
  rows: BoardRow[],
  seasonNumber: number,
  seasonKey: string,
): SeasonAward[] {
  // Filtering happens before ranks are handed out, so a zeroed user never
  // occupies a place on the podium.
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
