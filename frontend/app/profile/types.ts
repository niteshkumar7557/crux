// The profile page's view model.

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
  globalRank: number;
  record: { wins: number; losses: number; draws: number };
  mvpCount: number;
}

export interface ProfileSeason {
  number: number;
  logic: number;
  rank: number;
  startsAt: string;
  daysLeft: number;
}

export interface ProfileShell {
  identity: ProfileIdentity;
  standing: ProfileStanding;
  season: ProfileSeason;
  titles: SeasonTitle[];
}

export interface LedgerWeek {
  weekStart: string;
  amount: number;
}

export interface CraftStats {
  arguments: number;
  replies: number;
  avgLogic: number;
  /** Distinct motions these arguments are spread across. */
  motions: number;
  /** Motions this user put on the board. */
  motionsStarted: number;
}

export interface LiveDebate {
  id: number;
  claim: string;
  closesAt: string;
  isAuthor: boolean;
  side: "for" | "against" | null;
}

export interface HistoryRow {
  motionId: number;
  claim: string;
  side: "for" | "against";
  outcome: "win" | "loss" | "draw";
  isMvp: boolean;
  margin: number | null;
  concludedAt: string;
}

export interface ProfileActivityData {
  ledger: LedgerWeek[];
  craft: CraftStats;
  live: LiveDebate[];
  history: HistoryRow[];
}
