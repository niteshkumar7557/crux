"use client";

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { CommentSide } from "@/app/argument/types";
import api from "@/app/axios";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LuTriangleAlert, LuX } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import AutoGrowTextarea from "@/app/_components/ui/AutoGrowTextarea";
import { useReplyTarget } from "./ReplyContext";
import PointsPopup from "../ui/PointsPopup";
import SideLockConfirm from "./SideLockConfirm";
import type { Award } from "../ui/awardCopy";

type Notice = { title: string; body: ReactNode };

/** A post held back until the user confirms the side lock (§14). */
type Pending = {
  urlSide: string;
  side: "for" | "against";
  replyToCommentId: number | null;
};

/** §15: comments per debate at full value, before the halving. */
const FULL_VALUE_COMMENTS = 3;

const ArgumentInput = ({
  argumentId,
  status,
  authorId,
  commentSides,
}: {
  argumentId: number;
  status: "live" | "concluded";
  authorId: number;
  commentSides: CommentSide[];
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const { target, setTarget } = useReplyTarget();

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  // Concluded arenas are read-only — shown to everyone, logged in or not.
  if (status === "concluded") {
    return (
      <div className="sticky bottom-0 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/20 py-4 px-4 md:py-5 md:px-6 z-40 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
          This debate has concluded — the verdict is in.
        </span>
      </div>
    );
  }

  if (!user) return null;

  // The statement's author owns the affirmative case: they are locked to FOR
  // from the very first comment, so the AGAINST button is disabled before it can
  // be pressed and the server rejects it either way (author_affirmative_only).
  const isAuthor = user.id === authorId;

  // The viewer's first comment locks their side for this debate; the opposite
  // side's button is pre-disabled so the lock is visible before they hit it.
  const lockedSide = isAuthor
    ? "for"
    : (commentSides.find((c) => c.post_user_id === user.id)?.side ?? null);

  // §6/§14: comments already made here, so the composer can say what the next
  // one is worth before it is written.
  const priorCount = commentSides.filter(
    (c) => c.post_user_id === user.id,
  ).length;
  const halfValue = priorCount >= FULL_VALUE_COMMENTS;
  const counterText = halfValue
    ? `Half value — you've already made ${FULL_VALUE_COMMENTS} comments here`
    : `Comment ${priorCount + 1} of ${FULL_VALUE_COMMENTS} at full value`;

  // The standalone cap only bites when there is somebody to have replied to
  // (§6). Once locked we know which side is the opponent's, so the hint can be
  // withheld rather than promise a penalty that will not apply.
  const opposingHasComments = lockedSide
    ? commentSides.some((c) => c.side !== lockedSide)
    : commentSides.length > 0;
  const showCapHint = !target && opposingHasComments;

  const abuseNotice: Notice = {
    title: "Flagged for Abuse",
    body: (
      <>
        Your comment crossed the line of civil debate. Review the{" "}
        <Link
          className="text-secondary underline underline-offset-2 hover:text-white"
          href={"/rules"}
        >
          Arena Rules
        </Link>{" "}
        before posting again.
      </>
    ),
  };

  // §14: the lock is confirmed BEFORE it happens, never discovered after. A
  // reply commits you too (§5 — to the side opposite the comment you answer),
  // so it routes through the same gate rather than sneaking past it.
  function requestPost(
    urlSide: string,
    side: "for" | "against",
    replyToCommentId: number | null,
  ) {
    if (input.length === 0) return;
    if (lockedSide === null) {
      setPending({ urlSide, side, replyToCommentId });
      return;
    }
    submit(urlSide, replyToCommentId);
  }

  // One poster for standalone comments and cross-side replies alike. For a
  // reply the side is implied by the target (§5): the URL carries the opposite
  // side and the body the target id, and the server re-derives + validates it.
  async function submit(urlSide: string, replyToCommentId: number | null) {
    if (input.length === 0) return;
    try {
      const { data } = await api.post(`/comment/${urlSide}/${argumentId}`, {
        userId: user?.id,
        input,
        replyToCommentId,
      });
      setInput("");
      if (data.abused) {
        setAward(null);
        setNotice(abuseNotice);
      } else {
        setNotice(null);
        setTarget(null);
        setAward(data as Award);
        router.refresh();
      }
    } catch (err) {
      setAward(null);
      if (isAxiosError(err) && err.response?.status === 409) {
        const reason = err.response.data?.reason;
        if (reason === "side_locked") {
          setNotice({
            title: "Side Locked",
            body: "You've committed to the other side of this debate.",
          });
        } else if (reason === "author_affirmative_only") {
          setNotice({
            title: "Author Argues For",
            body: "You posted this statement, so you can only argue FOR it — never against your own claim.",
          });
        } else if (reason === "bad_reply_target") {
          setTarget(null);
          setNotice({
            title: "Can't Reply There",
            body: "You can only reply to a comment on the opposing side.",
          });
        } else {
          setNotice({
            title: "Debate Concluded",
            body: "This debate has just concluded.",
          });
          router.refresh();
        }
      } else {
        setNotice({
          title: "Post Failed",
          body: "Something went wrong. Try again.",
        });
      }
    }
  }

  return (
    <div className="sticky bottom-0 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/20 py-4 px-4 md:py-6 md:px-6 z-40">
      {target && (
        <div className="max-w-screen-2xl mx-auto mb-3 flex items-center gap-3 border-l-2 border-primary/50 bg-surface-container/60 py-2 px-3">
          <span className="grow min-w-0 truncate font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
            Replying to @{target.username} — &ldquo;
            {target.content.length > 48
              ? `${target.content.slice(0, 48)}…`
              : target.content}
            &rdquo;
          </span>
          <button
            className="shrink-0 text-outline hover:text-white cursor-pointer"
            aria-label="Cancel reply"
            onClick={() => setTarget(null)}
          >
            <LuX className="text-sm" />
          </button>
        </div>
      )}
      {/* §14: everything that changes the value of the next comment, stated
          while it is being written — never discovered afterwards. */}
      <div className="max-w-screen-2xl mx-auto mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {lockedSide && (
          <span
            className={`font-label text-[10px] uppercase tracking-[0.15em] ${
              lockedSide === "for" ? "text-primary" : "text-secondary"
            }`}
          >
            You&rsquo;re arguing {lockedSide === "for" ? "FOR" : "AGAINST"}{" "}
            <span className="text-outline normal-case tracking-normal font-body ml-2">
              {isAuthor
                ? "— you posted this statement, so you can only argue FOR it."
                : `— you can't argue ${lockedSide === "for" ? "AGAINST" : "FOR"} in this debate.`}
            </span>
          </span>
        )}
        <span
          className={`font-label text-[10px] uppercase tracking-[0.15em] ${
            halfValue ? "text-tertiary" : "text-outline"
          }`}
        >
          {counterText}
        </span>
        {showCapHint && (
          <span className="font-body text-[11px] text-outline">
            Standalone comments cap at 5 logic. Reply to an opponent to earn up
            to 8.
          </span>
        )}
        {/* §14: the abuse penalty is fine print on the composer as well as a
            rejection message — stated before it can bite, not only after. */}
        <span className="font-body text-[11px] text-outline/70">
          Abuse is flagged, discards the comment, and costs 4 logic.
        </span>
      </div>
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <AutoGrowTextarea
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary focus:outline-none px-4 py-3 md:px-6 md:py-4 font-body text-on-surface placeholder:text-outline transition-all block"
            placeholder={target ? "Write your reply..." : "Join the Argument..."}
            aria-label={target ? "Write your reply" : "Join the argument"}
            maxHeight={160}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {target ? (
            // The reply's side is implied by the target, so a side choice here
            // would be a contradiction — one action, opposite of the target.
            <Button
              variant={target.side === "for" ? "outline-secondary" : "outline"}
              size="bare"
              className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
              onClick={() =>
                requestPost(
                  target.side === "for" ? "negative" : "affirmative",
                  target.side === "for" ? "against" : "for",
                  target.commentId,
                )
              }
            >
              Post Reply
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "against"}
                title={
                  lockedSide === "against"
                    ? "You've committed to AGAINST in this debate."
                    : undefined
                }
                onClick={() => requestPost("affirmative", "for", null)}
              >
                Support Affirmative
              </Button>
              <Button
                variant="outline-secondary"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "for"}
                title={
                  isAuthor
                    ? "You posted this statement — you can only argue FOR it."
                    : lockedSide === "for"
                      ? "You've committed to FOR in this debate."
                      : undefined
                }
                onClick={() => requestPost("negative", "against", null)}
              >
                Support Negative
              </Button>
            </>
          )}
        </div>
      </div>
      {/* §14 the side lock, confirmed before it binds. */}
      {pending && (
        <SideLockConfirm
          side={pending.side}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setPending(null);
            submit(pending.urlSide, pending.replyToCommentId);
          }}
        />
      )}
      {/* §14 the points pop-up — what you earned and exactly why. */}
      {award && (
        <PointsPopup award={award} onDismiss={() => setAward(null)} />
      )}
      {notice && (
        <div className="fixed bottom-32 right-6 z-60 max-w-sm bg-surface-container-lowest border-l-4 border-secondary p-4 shadow-glow-secondary flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <LuTriangleAlert className="text-secondary font-bold text-xl" />
          </div>
          <div className="grow">
            <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary mb-1 font-bold">
              {notice.title}
            </h4>
            <p className="font-body text-xs leading-relaxed text-on-surface-variant">
              {notice.body}
            </p>
          </div>
          <button
            className="shrink-0 text-outline hover:text-white cursor-pointer"
            onClick={() => setNotice(null)}
          >
            <LuX className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ArgumentInput;
