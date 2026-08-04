// Absolute timestamps, always in UTC.
//
// The UTC part is load-bearing, not a shortcut. These strings are rendered on
// the SERVER and then hydrated in the browser, and a local-timezone format
// produces a different string on each side of that — which is exactly the
// Countdown hydration mismatch recorded in codebase-guide.md §11. Formatting
// against a fixed zone is the only version that is the same string everywhere.
//
// It is also the right reading of the product: the arena already runs on UTC —
// the 48-hour clock, the Motion of the Day's UTC day, the UTC calendar-month
// season. A debate closes at an instant on the arena's clock, not the reader's.
//
// So: do not "fix" these to local time. Doing so reintroduces the mismatch, and
// it is invisible in dev on a machine already set to UTC.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// "2 Aug 2026" — the archive's voice. A settled debate is a record entry, and a
// record entry carries a date rather than a number that decays.
export function utcDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// "2 Aug 2026, 20:00 UTC" — what a relative timestamp hides, for the title
// behind it. The zone is named rather than implied: an unlabelled clock time
// that is not the reader's own is worse than no clock time at all.
export function utcDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${utcDate(timestamp)}, ${hours}:${minutes} UTC`;
}
