export interface UserArgumentCardProps {
  side: "for" | "against";
  reputation: string;
  username: string;
  avatar: string | null;
  grade: string;
  comment: string;
  likes: number;
  user_id?: number; // the viewer's id (undefined when logged out)
  comment_id: number;
  post_user_id: number;
  // §5: the opposing comment this one answers, or null for a standalone.
  // `commentId` is the jump target behind the quoted stub.
  replyTo: { commentId: number; username: string; content: string } | null;
  replyCount: number; // "↳ N replies" shown on the target comment
  firstReplyId: number | null; // scroll anchor for the replies link
  viewerLockedSide: "for" | "against" | null; // gates the cross-side Reply button
}

export interface ArgumentHeaderProps {
  statementId: string;
  statement: string;
  statementKeyword: string;
  affirmativeProbability: number;
  negativeProbability: number;
  authorUsername: string;
  authorAvatar: string | null;
}

export interface MatchState {
  status: "live" | "concluded";
  closesAt: string | null;
  winner: "for" | "against" | "draw" | "walkover" | null;
  margin: number | null;
  mvpUsername: string | null;
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
