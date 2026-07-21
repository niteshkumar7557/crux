export interface PrimaryCardDataType {
  username: string;
  avatar: string | null;
  domain: string;
  content: string;
  count_comments: number;
  affirmative: number;
  negative: number;
  argumentId: string;
  status?: string;
  closesAt?: string | null;
  isDotd?: boolean;
  votes?: number;
}

export interface SecondaryCardsDataType {
  username: string;
  avatar: string | null;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
  active_minds: number;
  status?: string;
  closesAt?: string | null;
  winner?: string | null;
  margin?: number | null;
  votes?: number;
}

export interface TrendingDomainCardProps {
  topic: string;
  changePercentage: number;
  arguments: number;
  liveBattles: number;
}
export type TrendingDomainCardData = TrendingDomainCardProps[];

export interface TopDebatersCardProps {
  name: string;
  avatar: string | null;
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
  avatar: string | null;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  argumentid: number;
  argumentNum: number;
  time: string;
  status?: string;
  closesAt?: string | null;
  winner?: string | null;
  margin?: number | null;
  votes?: number;
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

export interface DomainInfo {
  id: number;
  name: string;
}

export interface PaginatedStatements {
  statements: NewestCardProps[];
  total: number;
  page: number;
  pageSize: number;
}
