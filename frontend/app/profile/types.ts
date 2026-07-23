/** §10: a permanent, stacking season award. */
export interface SeasonTitle {
  seasonKey: string;
  seasonNumber: number;
  rank: number;
  title: string;
  frame: string;
}

export interface ProfileIdentity {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string;
}

export interface ProfileStanding {
  logic: number;
  tier: string;
  grade: string;
  globalRank: number;
  record: { wins: number; losses: number; draws: number };
  mvpCount: number;
}

/** §14: the season window is server-sent — the boundary is UTC and would
 *  drift if it were derived client-side. */
export interface ProfileSeason {
  number: number;
  logic: number;
  daysLeft: number;
}

/** GET /profile/:username — the server-rendered half. */
export interface ProfileShell {
  identity: ProfileIdentity;
  standing: ProfileStanding;
  season: ProfileSeason;
  titles: SeasonTitle[];
}

/** One charted week of the logic ledger. `weekStart` is a Monday. */
export interface LedgerWeek {
  weekStart: string;
  amount: number;
}

export interface CraftStats {
  arguments: number;
  replies: number;
  avgLogic: number;
  statements: number;
  best: { points: number; argumentId: number; claim: string } | null;
}

export interface LiveDebate {
  id: number;
  claim: string;
  closesAt: string;
  isAuthor: boolean;
  /** The side their first comment locked (§4). Null = they have not argued. */
  side: "for" | "against" | null;
}

export interface HistoryRow {
  argumentId: number;
  claim: string;
  side: "for" | "against";
  outcome: "win" | "loss" | "draw";
  isMvp: boolean;
  margin: number | null;
  concludedAt: string;
}

/** GET /profile/:username/activity — the client-fetched half. */
export interface ProfileActivityData {
  ledger: LedgerWeek[];
  craft: CraftStats;
  live: LiveDebate[];
  history: HistoryRow[];
}
