export interface UserHeadInfoProps {
  profileId: number;
  name: string;
  username: string;
  avatar: string | null;
  level: string;
  description: string;
  reputation: number;
  globalRank: number;
}

export interface ReputationBreakdownProps {
  data: number[];
}

interface statementData {
  id: number;
  title: string;
}
export type ActiveStatementsProps = statementData[];
