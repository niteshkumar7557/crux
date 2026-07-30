// Shared response shapes for the arena feed, sidebar and search.

export interface PrimaryCardDataType {
  username: string;
  avatar: string | null;
  domain: string;
  content: string;
  count_arguments: number;
  affirmative: number;
  negative: number;
  motionId: string;
  status?: string;
  closesAt?: string | null;
  isMotd?: boolean;
}

export interface SecondaryCardsDataType {
  username: string;
  avatar: string | null;
  domain: string;
  title: string;
  affirmativescore: number;
  negativescore: number;
  motionid: number;
  active_minds: number;
  status?: string;
  closesAt?: string | null;
  winner?: string | null;
  margin?: number | null;
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
  username: string;
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
  motionid: number;
  argumentNum: number;
  time: string;
  status?: string;
  closesAt?: string | null;
  winner?: string | null;
  margin?: number | null;
}
export type NewestCardData = NewestCardProps[];

export interface MotionSearchResult {
  id: number;
  content: string;
  domain: string;
  username: string;
}

export interface DomainSearchResult {
  domain: string;
  motionCount: number;
}

export interface UserSearchResult {
  id: number;
  username: string;
}

export interface SearchResults {
  motions: MotionSearchResult[];
  domains: DomainSearchResult[];
  users: UserSearchResult[];
}

export interface DomainInfo {
  id: number;
  name: string;
}

export interface PaginatedMotions {
  motions: NewestCardProps[];
  total: number;
  page: number;
  pageSize: number;
}
