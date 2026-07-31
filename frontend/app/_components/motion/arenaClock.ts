// The arena is closed when the server says so, or when the clock says so —
// whichever comes first. The conclusion job sweeps once a minute and the page it
// renders can be older still, so between 0:00 and the next render the clock is
// the earlier authority and the status is stale.
//
// An unreadable deadline leaves a LIVE debate open on purpose: the server
// refuses a late post anyway, and locking a running debate over a bad string
// would be the worse failure.
// Spec: game-theory.md §4

export function isArenaClosed({
  status,
  closesAt,
  now,
}: {
  status: string;
  closesAt: string | null;
  now: number;
}): boolean {
  if (status !== "live") return true;
  if (!closesAt) return false;
  const closes = new Date(closesAt).getTime();
  if (Number.isNaN(closes)) return false;
  return now >= closes;
}
