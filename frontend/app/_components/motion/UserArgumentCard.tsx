"use client";
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

  // Every footer control is the same tiny label that warms to the column's
  // accent on hover. LikeButton builds the same thing from `side`.
  const actionClass = `font-label text-[10px] uppercase text-ink-soft cursor-pointer transition-colors ${
    side === "for" ? "hover:text-side-for" : "hover:text-side-against"
  }`;

  // A like pays the author +2 logic (§6), so your own argument offers no button
  // — the count stays visible, it just isn't a control. The server refuses a
  // self-like too; this only keeps the UI from offering what it would reject.
  // A logged-out viewer gets the count and a route to log in.
  const likeMode =
    user_id === undefined
      ? ({ kind: "anonymous" } as const)
      : user_id === post_user_id
        ? ({ kind: "own" } as const)
        : ({ kind: "interactive" } as const);

  // Cross-side only (§5): you can reply to an opposing argument, never your own
  // side. A viewer with no side yet may reply to anyone — it locks them to the
  // opposite side. Logged-out viewers can't argue, so they get no Reply button.
  const canReply =
    user_id !== undefined &&
    (viewerLockedSide === null || viewerLockedSide !== side);

  return (
    <div id={`argument-${argument_id}`} data-side={side}>
      {/* Hovering lifts the card off the page — the accent border alone was a
          1px answer to a whole-card gesture. The cast carries the card's own
          camp colour, so the lift reads as this side's, not as generic depth.
          `duration-300` because a shadow arriving instantly reads as a flicker
          rather than as a lift. */}
      <div
        className={`group mb-2 relative bg-band p-6 border-l transition-all duration-300 ${
          side === "for"
            ? "border-side-for/20 hover:border-side-for/60 hover:shadow-cast-for-deep"
            : "border-side-against/20 hover:border-side-against/60 hover:shadow-cast-against-deep"
        }`}
      >
        <div className="flex items-start mb-4">
          <div className="flex items-center gap-3">
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
              <p className="font-label text-[10px] uppercase text-ink-soft">
                @{username}
              </p>
            </div>
          </div>
        </div>
        {/* §5: the quoted stub of the opposing argument this reply answers. The
            border takes the opponent's accent so it reads as a foreign quote,
            and the whole stub jumps to the argument it is quoting. */}
        {replyTo && (
          <button
            type="button"
            onClick={() => focusArgument(replyTo.argumentId)}
            aria-label={`Go to the argument by @${replyTo.username} this answers`}
            className={`block w-full text-left cursor-pointer mb-4 border-l-2 pl-3 py-2 bg-paper/60 hover:bg-paper transition-colors ${side === "for" ? "border-side-against/40 hover:border-side-against" : "border-side-for/40 hover:border-side-for"}`}
          >
            <p className="font-label text-[9px] uppercase tracking-[0.15em] text-ink-soft mb-1">
              replying to @{replyTo.username}
            </p>
            {/* Follows the argument face, since it *is* an argument. It keeps
                its quote marks, though: unlike the card's own words, these are
                genuinely someone else's, lifted into your card. */}
            <p className="font-label text-[0.72rem] leading-relaxed text-ink-soft/80 truncate">
              &ldquo;
              {replyTo.content.length > 80
                ? `${replyTo.content.slice(0, 80)}…`
                : replyTo.content}
              &rdquo;
            </p>
          </button>
        )}
        {/* Set in the label face, like the Crux AI panel above it, and with no
            quotation marks. The card already says whose words these are — the
            avatar, the handle and the surface do it — so the quotes were
            punctuation spent on something already established, and they made
            every argument read as though it were being cited by someone else
            rather than said. `text-ink` rather than `ink-soft`: sharing a face
            with the analysis, the arguments need the hierarchy back somewhere,
            and the darkest text in the column should be the debating. */}
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
