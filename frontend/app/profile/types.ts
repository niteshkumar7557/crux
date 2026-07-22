/** §10: a permanent, stacking season award. */
export interface SeasonTitle {
  seasonKey: string;
  seasonNumber: number;
  rank: number;
  title: string;
  frame: string;
}

export interface UserHeadInfoProps {
  profileId: number;
  name: string;
  username: string;
  avatar: string | null;
  level: string;
  description: string;
  reputation: number;
  globalRank: number;
  record: { wins: number; losses: number; draws: number };
  // §14 puts the "Season N · D days left" strip on the profile as well as the
  // leaderboard, so daysLeft comes from the server rather than being derived
  // client-side (the boundary is UTC and would drift by timezone).
  season: { number: number; logic: number; daysLeft: number };
  titles: SeasonTitle[];
}

export interface ReputationBreakdownProps {
  data: number[];
}

interface statementData {
  id: number;
  title: string;
}
export type ActiveStatementsProps = statementData[];
