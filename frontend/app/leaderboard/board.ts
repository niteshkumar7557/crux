// Two boards, one row shape, so the podium and the table render both.
// Spec: game-theory.md §14

export const BOARD_TABS = [
  { slug: "season", label: "This Season" },
  { slug: "all-time", label: "All Time" },
] as const;

export type BoardTab = (typeof BOARD_TABS)[number]["slug"];

export interface BoardRow {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  score: number;
  rank: number;
  motionCount?: number;
  argumentCount?: number;
}

export function parseTab(raw: string | undefined): BoardTab {
  return raw === "all-time" ? "all-time" : "season";
}

export function leaderboardHref(tab: BoardTab, page = 1): string {
  const params = new URLSearchParams();
  if (tab !== "season") params.set("tab", tab);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/leaderboard?${query}` : "/leaderboard";
}

export function metricLabel(tab: BoardTab): string {
  return tab === "season" ? "Season Logic" : "Logic Score";
}
