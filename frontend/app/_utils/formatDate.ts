// Absolute timestamps. Pure, and deliberately clock-free: nothing here reads
// Date.now(), so the same input renders identically on the server and in the
// browser. That is what lets a relative timestamp use one of these as its
// server-rendered starting value.
//
// Both read the viewer's local timezone, because a timestamp shown to a person
// is about their day, not the database's.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// "2 Aug 2026" — the archive's voice. A settled debate is a record entry, and a
// record entry carries a date rather than a number that decays.
export function absoluteDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// "2 Aug 2026, 14:32" — what a relative timestamp hides, for the title behind it.
export function absoluteDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${absoluteDate(timestamp)}, ${hours}:${minutes}`;
}
