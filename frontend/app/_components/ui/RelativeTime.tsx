"use client";

// A timestamp that reads as "3h ago" without risking a hydration mismatch.
//
// The server cannot know which minute the browser will hydrate on, so rendering
// timeAgoShort() on both sides makes the two disagree across every boundary —
// that is the console-noise bug already recorded against Countdown in
// codebase-guide.md §11, and one instance of it is enough. So the server emits
// the absolute date, which is the same string everywhere, and the relative form
// takes over once hydrated.
//
// useSyncExternalStore is how that swap is expressed rather than a setState in
// an effect: it has a server snapshot by design, and the lint rule that bans
// set-state-in-effect is right that the effect version is a second render the
// component never needed. The snapshots are constants, so React can cache them —
// the label is derived from the flag, never returned by getSnapshot, which would
// hand React a new string every time it looked.
//
// Both halves have to be timezone-independent or the swap solves nothing: the
// server-rendered half is formatted in UTC (see formatDate.ts), and the
// hydrated half is a duration, which has no zone at all.
//
// It does not tick. "3h ago" going stale while a tab sits open costs nothing,
// and an interval per argument card is a real cost on a busy debate.

import { timeAgoShort } from "@/app/_utils/timeAgo";
import { utcDate, utcDateTime } from "@/app/_utils/formatDate";
import { useHydrated } from "@/app/_hooks/useHydrated";

const RelativeTime = ({
  timestamp,
  className,
}: {
  timestamp: string;
  className?: string;
}) => {
  const isHydrated = useHydrated();
  const exact = utcDateTime(timestamp);

  if (exact === "") return null;

  return (
    <time dateTime={timestamp} title={exact} className={className}>
      {isHydrated ? timeAgoShort(timestamp) : utcDate(timestamp)}
    </time>
  );
};

export default RelativeTime;
