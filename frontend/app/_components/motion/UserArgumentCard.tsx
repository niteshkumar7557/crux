"use client";

// One argument: who, what it earned, what it answers, and its reply count.
// Spec: game-theory.md §6, §10

import Link from "next/link";
import { UserArgumentCardProps } from "@/app/motion/types";
import Avatar from "@/app/_components/ui/Avatar";
import LikeButton from "@/app/_components/ui/LikeButton";
import RelativeTime from "@/app/_components/ui/RelativeTime";
import { focusArgument } from "@/app/_utils/focusArgument";
import { useReplyTarget } from "./ReplyContext";
import ClampedText from "./ClampedText";

// §7 scores an argument 2–10. Only the strong ones are marked: a mark that always
// appears is a grade, and a public 2 beside a beginner's name is a put-down the
// author already saw privately in their points pop-up.
const STRONG_ARGUMENT = 8;

const UserArgumentCard = ({
  side,
  reputation,
  username,
  avatar,
  argument,
  points,
  likes,
  user_id,
  argument_id,
  post_user_id,
  initiallyLiked,
  replyCount,
  firstReplyId,
  viewerLockedSide,
  closed,
  createdAt,
}: UserArgumentCardProps) => {
  const { setTarget } = useReplyTarget();

  const actionClass = `font-label text-[10px] uppercase text-ink-soft cursor-pointer transition-colors ${
    side === "for" ? "hover:text-side-for" : "hover:text-side-against"
  }`;

  const sideLabelClass = side === "for" ? "text-side-for" : "text-side-against";

  const likeMode = closed
    ? ({ kind: "closed" } as const)
    : user_id === undefined
      ? ({ kind: "anonymous" } as const)
      : user_id === post_user_id
        ? ({ kind: "own" } as const)
        : ({ kind: "interactive" } as const);

  // A Reply button that opens a closed composer is a dead end.
  const canReply =
    !closed &&
    user_id !== undefined &&
    (viewerLockedSide === null || viewerLockedSide !== side);

  return (
    <div id={`argument-${argument_id}`} data-side={side}>
      <div
        className={`group mb-2 relative bg-band p-6 border-l transition-all duration-300 ${
          side === "for"
            ? "border-side-for/20 hover:border-side-for/60 hover:shadow-cast-for-deep"
            : "border-side-against/20 hover:border-side-against/60 hover:shadow-cast-against-deep"
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={`/profile/${username}`}
            aria-label={`@${username}'s profile`}
            title={`Reputation: ${reputation}`}
            className="group/author flex items-center gap-2"
          >
            <Avatar
              username={username}
              src={avatar}
              size="sm"
              accent={side === "for" ? "primary" : "secondary"}
            />
            <span
              className={`font-label text-[10px] uppercase tracking-[0.15em] ${sideLabelClass}`}
            >
              {side === "for" ? "For" : "Against"}
            </span>
            <span
              className={`font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft transition-colors ${
                side === "for"
                  ? "group-hover/author:text-side-for"
                  : "group-hover/author:text-side-against"
              }`}
            >
              @{username}
            </span>
          </Link>
          {points >= STRONG_ARGUMENT && (
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-laurel tabular-nums">
              {points} logic
            </span>
          )}
          <RelativeTime
            timestamp={createdAt}
            className="ml-auto shrink-0 font-label text-[10px] uppercase text-ink-soft"
          />
        </div>
        <div className="mb-6">
          <ClampedText
            text={argument}
            className="font-label text-[0.9rem] leading-[1.75] text-ink"
          />
        </div>
        <div className="flex gap-4 items-center">
          <LikeButton
            argumentId={argument_id}
            side={side}
            likes={likes}
            initiallyLiked={initiallyLiked}
            mode={likeMode}
          />
          {canReply && (
            <button
              onClick={() =>
                setTarget({
                  argumentId: argument_id,
                  username,
                  content: argument,
                  side,
                })
              }
              className={actionClass}
            >
              Reply
            </button>
          )}
          {replyCount > 0 && firstReplyId !== null && (
            <button onClick={() => focusArgument(firstReplyId)} className={actionClass}>
              ↳ {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserArgumentCard;
