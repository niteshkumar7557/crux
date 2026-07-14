export interface UserHeadInfoProps {
  name: string;
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
