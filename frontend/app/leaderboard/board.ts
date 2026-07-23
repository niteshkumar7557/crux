// Two boards, one layout. The season board ranks logic EARNED this month
// (§10 — everyone starts at 0), the all-time board ranks the career total.
// They differ in their metric and in whether they carry career counts, so the
// page normalises both into one row shape and renders them through the same
// podium and table.

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
  /** seasonLogic on the season board, logic_score on the all-time board. */
  score: number;
  rank: number;
  /** All-time only — the season board does not carry career counts. */
  statementCount?: number;
  argumentCount?: number;
}

/** Season is the default board, so it owns the bare /leaderboard URL. */
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

/** What the score column is called on each board. */
export function metricLabel(tab: BoardTab): string {
  return tab === "season" ? "Season Logic" : "Logic Score";
}
