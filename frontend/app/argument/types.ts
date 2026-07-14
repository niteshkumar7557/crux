export interface UserArgumentCardProps {
  side: "for" | "against";
  reputation: string;
  username: string;
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
