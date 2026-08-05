// The debate page's view model.

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
  points: number; // §7: what the AI scored this argument, 2–10. 0 predates scoring.
  likes: number;
  user_id?: number; // the viewer's id (undefined when logged out)
  argument_id: number;
  post_user_id: number;
  initiallyLiked: boolean; // §10: filled on load when the viewer already liked it
  replyTo: { argumentId: number; username: string; content: string } | null;
  replyCount: number; // "↳ N replies" shown on the target argument
  firstReplyId: number | null; // scroll anchor for the replies link
  viewerLockedSide: "for" | "against" | null; // gates the cross-side Reply button
  closed: boolean; // §4: the arena is read-only once the clock is out
  createdAt: string; // ISO, already UTC-normalised by the controller
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
