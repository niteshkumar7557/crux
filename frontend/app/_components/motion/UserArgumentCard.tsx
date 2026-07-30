"use client";

// One argument: who, what it earned, what it answers, and its reply count.
// Spec: game-theory.md §6, §10

import Link from "next/link";
import { UserArgumentCardProps } from "@/app/motion/types";
import Avatar from "@/app/_components/ui/Avatar";
import LikeButton from "@/app/_components/ui/LikeButton";
import { focusArgument } from "@/app/_utils/focusArgument";
import { useReplyTarget } from "./ReplyContext";

const UserArgumentCard = ({
  side,
  reputation,
  username,
  avatar,
  argument,
  likes,
  user_id,
  argument_id,
  post_user_id,
  initiallyLiked,
  replyTo,
  replyCount,
  firstReplyId,
  viewerLockedSide,
}: UserArgumentCardProps) => {
  const { setTarget } = useReplyTarget();

  const actionClass = `font-label text-[10px] uppercase text-ink-soft cursor-pointer transition-colors ${
    side === "for" ? "hover:text-side-for" : "hover:text-side-against"
  }`;

  const likeMode =
    user_id === undefined
      ? ({ kind: "anonymous" } as const)
      : user_id === post_user_id
        ? ({ kind: "own" } as const)
        : ({ kind: "interactive" } as const);

  const canReply =
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
        <div className="flex items-start mb-4">
          <Link
            href={`/profile/${username}`}
            aria-label={`@${username}'s profile`}
            className="group/author flex items-center gap-3"
          >
            <Avatar
              username={username}
              src={avatar}
              size="md"
              accent={side === "for" ? "primary" : "secondary"}
            />
            <div>
              <p className="font-label text-[10px] uppercase text-ink">
                Reputation: {reputation}
              </p>
              <p
                className={`font-label text-[10px] uppercase text-ink-soft transition-colors ${
                  side === "for"
                    ? "group-hover/author:text-side-for"
                    : "group-hover/author:text-side-against"
                }`}
              >
                @{username}
              </p>
            </div>
          </Link>
        </div>
        {replyTo && (
          <div
            className={`mb-4 border-l-2 pl-3 py-2 bg-paper/60 transition-colors has-[button:hover]:bg-paper ${side === "for" ? "border-side-against/40 has-[button:hover]:border-side-against" : "border-side-for/40 has-[button:hover]:border-side-for"}`}
          >
            <p className="font-label text-[9px] uppercase tracking-[0.15em] text-ink-soft mb-1">
              replying to{" "}
              <Link
                href={`/profile/${replyTo.username}`}
                className="transition-colors hover:text-ink"
              >
                @{replyTo.username}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => focusArgument(replyTo.argumentId)}
              aria-label={`Go to the argument by @${replyTo.username} this answers`}
              className="block w-full cursor-pointer text-left font-label text-[0.72rem] leading-relaxed text-ink-soft/80 truncate"
            >
              &ldquo;
              {replyTo.content.length > 80
                ? `${replyTo.content.slice(0, 80)}…`
                : replyTo.content}
              &rdquo;
            </button>
          </div>
        )}
        <p className="font-label text-[0.9rem] leading-[1.75] text-ink mb-6">
          {argument}
        </p>
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
