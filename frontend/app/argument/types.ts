export interface UserArgumentCardProps {
  side: "for" | "against";
  reputation: string;
  username: string;
  avatar: string | null;
  grade: string;
  comment: string;
  likes: number;
  user_id?: number;
  comment_id: number;
  post_user_id: number;
}

export interface ArgumentHeaderProps {
  statementId: string;
  statement: string;
  statementKeyword: string;
  affirmativeProbability: number;
  negativeProbability: number;
}

export interface MatchState {
  status: "live" | "concluded";
  closesAt: string | null;
  winner: "for" | "against" | "draw" | "walkover" | null;
  margin: number | null;
  mvpUsername: string | null;
  standoutUsername: string | null;
  verdictText: string | null;
  affirmative: number;
  negative: number;
}

export interface CommentSide {
  post_user_id: number;
  side: "for" | "against";
}

export interface ArgumentArenaProps {
  forArgumentsCount: number;
  againstArgumentsCount: number;
  forCaseComments: UserArgumentCardProps[];
  againstCaseComments: UserArgumentCardProps[];
}

export interface ArgumentPageData {
  argumentHeaderData: ArgumentHeaderProps;
  argumentArenaData: ArgumentArenaProps;
}
