/**
 * The Crux AI analysis, as `GET /motion/:id` returns it. A point that came
 * from a real argument carries that argument's id, which is what lets the panel
 * link a named point to the argument it was made in; the AI's own opening-draft
 * points carry neither an author nor an id.
 *
 * Parsed server-side (backend `ai/analysis.logic.ts`) — including the legacy
 * Markdown rows — so there is no reader on this side to drift out of sync.
 */
export interface AnalysisPoint {
  author: string | null;
  argumentId: number | null;
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
  argument: string;
  likes: number;
  user_id?: number; // the viewer's id (undefined when logged out)
  argument_id: number;
  post_user_id: number;
  initiallyLiked: boolean; // §5: filled on load when the viewer already liked it
  // §5: the opposing argument this one answers, or null for a standalone.
  // `argumentId` is the jump target behind the quoted stub.
  replyTo: { argumentId: number; username: string; content: string } | null;
  replyCount: number; // "↳ N replies" shown on the target argument
  firstReplyId: number | null; // scroll anchor for the replies link
  viewerLockedSide: "for" | "against" | null; // gates the cross-side Reply button
}

export interface MotionHeaderProps {
  motionId: string;
  motion: string;
  motionKeyword: string;
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

export interface ArgumentSide {
  post_user_id: number;
  side: "for" | "against";
}

export interface MotionArenaProps {
  forArgumentsCount: number;
  againstArgumentsCount: number;
  forCaseArguments: UserArgumentCardProps[];
  againstCaseArguments: UserArgumentCardProps[];
}

export interface MotionPageData {
  motionHeaderData: MotionHeaderProps;
  motionArenaData: MotionArenaProps;
}
