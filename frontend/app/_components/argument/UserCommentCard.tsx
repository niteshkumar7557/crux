"use client";
import { UserArgumentCardProps } from "@/app/argument/types";
import api from "@/app/axios";
import Link from "next/link";
import { useRef, useState } from "react";
import { LuThumbsUp } from "react-icons/lu";
import Avatar from "@/app/_components/ui/Avatar";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import { focusComment } from "@/app/_utils/focusComment";
import { useReplyTarget } from "./ReplyContext";

const UserArgumentCard = ({
  side,
  reputation,
  username,
  avatar,
  grade,
  comment,
  likes,
  user_id,
  comment_id,
  replyTo,
  replyCount,
  firstReplyId,
  viewerLockedSide,
}: UserArgumentCardProps) => {
  const [likeCount, setLikeCount] = useState(likes);
  const [liked, setLiked] = useState(false);
  const likeRef = useRef<HTMLButtonElement>(null);
  const { setTarget } = useReplyTarget();

  // Every footer control is the same tiny label that warms to the column's
  // accent on hover; only the like button adds a filled state on top.
  const actionClass = `font-label text-[10px] uppercase text-outline cursor-pointer transition-colors ${
    side === "for" ? "hover:text-primary" : "hover:text-secondary"
  }`;

  // Cross-side only (§5): you can reply to an opposing comment, never your own
  // side. A viewer with no side yet may reply to anyone — it locks them to the
  // opposite side. Logged-out viewers can't argue, so they get no Reply button.
  const canReply =
    user_id !== undefined &&
    (viewerLockedSide === null || viewerLockedSide !== side);

  async function handleClick() {
    setLiked(!liked);
    if (!liked) {
      if (likeRef.current && window.matchMedia(MOTION_OK).matches) {
        gsap.fromTo(
          likeRef.current,
          { scale: 1 },
          {
            scale: 1.25,
            duration: 0.12,
            yoyo: true,
            repeat: 1,
            ease: "power2.out",
            overwrite: "auto",
          },
        );
      }
      setLikeCount((e) => e + 1);
      // Only rendered for a signed-in viewer, so there is always a token here.
      await api.post(
        "/like",
        { comment_id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
    } else {
      setLikeCount((e) => e - 1);
    }
  }

  return (
    <div id={`comment-${comment_id}`} data-side={side}>
      <div
        className={`group mb-2 relative bg-surface-container-low p-6 border-l ${side === "for" ? "border-primary/20 hover:border-primary/60" : "border-secondary/20 hover:border-secondary/60"}  transition-all`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar
              username={username}
              src={avatar}
              size="md"
              accent={side === "for" ? "primary" : "secondary"}
            />
            <div>
              <p className="font-label text-[10px] uppercase text-on-surface">
                Reputation: {reputation}
              </p>
              <p className="font-label text-[10px] uppercase text-outline">
                @{username}
              </p>
            </div>
          </div>
          <div
            className={`${side === "for" ? "bg-primary/10 border border-primary/20" : "bg-secondary/10 border border-secondary/20"}  px-3 py-1`}
          >
            <span
              className={`font-label font-bold ${side === "for" ? "text-primary" : "text-secondary"} text-sm`}
            >
              {grade}
            </span>
          </div>
        </div>
        {/* §5: the quoted stub of the opposing comment this reply answers. The
            border takes the opponent's accent so it reads as a foreign quote,
            and the whole stub jumps to the comment it is quoting. */}
        {replyTo && (
          <button
            type="button"
            onClick={() => focusComment(replyTo.commentId)}
            aria-label={`Go to the comment by @${replyTo.username} this answers`}
            className={`block w-full text-left cursor-pointer mb-4 border-l-2 pl-3 py-2 bg-surface-container-lowest/60 hover:bg-surface-container-lowest transition-colors ${side === "for" ? "border-secondary/40 hover:border-secondary" : "border-primary/40 hover:border-primary"}`}
          >
            <p className="font-label text-[9px] uppercase tracking-[0.15em] text-outline mb-1">
              replying to @{replyTo.username}
            </p>
            <p className="font-body text-xs italic text-on-surface-variant/70 truncate">
              &ldquo;
              {replyTo.content.length > 80
                ? `${replyTo.content.slice(0, 80)}…`
                : replyTo.content}
              &rdquo;
            </p>
          </button>
        )}
        <p className="font-body text-base leading-relaxed text-on-surface-variant mb-6 italic">
          &ldquo;{comment}&rdquo;
        </p>
        <div className="flex gap-4 items-center">
          {/* A like is a logic award to the author (§6), so it needs an account.
              Logged-out viewers still see the count — they just get sent to log
              in instead of a like that would silently go nowhere. */}
          {user_id === undefined ? (
            <Link
              href="/login"
              title="Log in to like this argument"
              className={`${actionClass} flex items-center gap-2`}
            >
              <LuThumbsUp className="text-sm" /> {likeCount}
            </Link>
          ) : (
            <button
              ref={likeRef}
              onClick={handleClick}
              className={`${actionClass} flex items-center gap-2 ${liked && side === "for" ? "text-primary" : ""} ${liked && side === "against" ? "text-secondary" : ""}`}
            >
              <LuThumbsUp
                className={`text-sm ${liked ? `fill-current ${side === "for" ? "text-primary" : "text-secondary"}` : ""}`}
              />{" "}
              {likeCount}
            </button>
          )}
          {canReply && (
            <button
              onClick={() =>
                setTarget({
                  commentId: comment_id,
                  username,
                  content: comment,
                  side,
                })
              }
              className={actionClass}
            >
              Reply
            </button>
          )}
          {replyCount > 0 && firstReplyId !== null && (
            <button onClick={() => focusComment(firstReplyId)} className={actionClass}>
              ↳ {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserArgumentCard;
