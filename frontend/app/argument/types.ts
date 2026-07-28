/**
 * The Crux AI analysis, as `GET /argument/:id` returns it. A point that came
 * from a real comment carries that comment's id, which is what lets the panel
 * link a named point to the argument it was made in; the AI's own opening-draft
 * points carry neither an author nor an id.
 *
 * Parsed server-side (backend `ai/analysis.logic.ts`) — including the legacy
 * Markdown rows — so there is no reader on this side to drift out of sync.
 */
export interface AnalysisPoint {
  author: string | null;
  commentId: number | null;
  text: string;
}

export interface Analysis {
  lead: string;
  points: AnalysisPoint[];
}

export interface UserArgumentCardProps {
  side: "for" | "against";
  reputation: string;
  username: string;
  avatar: string | null;
  comment: string;
  likes: number;
  user_id?: number; // the viewer's id (undefined when logged out)
  comment_id: number;
  post_user_id: number;
  initiallyLiked: boolean; // §5: filled on load when the viewer already liked it
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
