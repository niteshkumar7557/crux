export interface MainTrendingArenaCardProps {
  username: string;
  domain: string;
  title: string;
  argumentNum: number;
  argumentQuality: "low" | "medium" | "high";
  affirmativeScore: number;
  negativeScore: number;
  argumentId: string;
}
export type MainTrendingArenaCardData = MainTrendingArenaCardProps[];

export interface TrendingArenaCardProps {
  username: string;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
  active_minds: number;
}
export type TrendingArenaCardData = TrendingArenaCardProps[];

export interface TrendingTopicsCardProps {
  topic: string;
  changePercentage: number;
  arguments: number;
  liveBattles: number;
}
export type TrendingTopicsCardData = TrendingTopicsCardProps[];

export interface TopDebatersCardProps {
  name: string;
  logicScore: number;
  id: number;
  rank: number;
}
export type TopDebatersCardData = TopDebatersCardProps[];

export interface SystemHealthData {
  logicStacked: number;
  activeArenas: number;
}

export interface NewestCardProps {
  username: string;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
  argumentNum: number;
  time: string;
}
export type NewestCardData = NewestCardProps[];

export interface StatementSearchResult {
  id: number;
  content: string;
  domain: string;
  username: string;
}

export interface DomainSearchResult {
  domain: string;
  statementCount: number;
}

export interface UserSearchResult {
  id: number;
  username: string;
}

export interface SearchResults {
  statements: StatementSearchResult[];
  domains: DomainSearchResult[];
  users: UserSearchResult[];
}
