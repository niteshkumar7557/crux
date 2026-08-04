// Relative timestamps, in two lengths.
//
// `now` is a parameter rather than a Date.now() read inside, so both forms are
// pure and testable without fake timers. The default keeps every call site
// unchanged.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 12 * MONTH;

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function timeAgo(timestamp: string, now: number = Date.now()): string {
  const seconds = Math.floor((now - new Date(timestamp).getTime()) / 1000);
  if (seconds < MINUTE) return plural(Math.max(seconds, 0), "second");
  if (seconds < HOUR) return plural(Math.floor(seconds / MINUTE), "minute");
  if (seconds < DAY) return plural(Math.floor(seconds / HOUR), "hour");
  if (seconds < MONTH) return plural(Math.floor(seconds / DAY), "day");
  if (seconds < YEAR) return plural(Math.floor(seconds / MONTH), "month");
  return plural(Math.floor(seconds / YEAR), "year");
}

// The compact form, for slots that sit beside other controls rather than in
// running text — an argument card's action row is already carrying a like
// count, a reply button and a reply count before this arrives.
export function timeAgoShort(timestamp: string, now: number = Date.now()): string {
  const seconds = Math.floor((now - new Date(timestamp).getTime()) / 1000);
  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
  if (seconds < MONTH) return `${Math.floor(seconds / DAY)}d ago`;
  if (seconds < YEAR) return `${Math.floor(seconds / MONTH)}mo ago`;
  return `${Math.floor(seconds / YEAR)}y ago`;
}
