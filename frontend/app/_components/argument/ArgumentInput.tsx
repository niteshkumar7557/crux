"use client";

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { CommentSide } from "@/app/argument/types";
import api from "@/app/axios";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuTriangleAlert, LuX, LuSparkles } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";
import { useReplyTarget } from "./ReplyContext";

type Notice = { title: string; body: ReactNode };

// §14: what a posted comment earned — the body of POST /comment/:side/:id.
interface Award {
  points: number;
  judged: number;
  capped: boolean;
  halved: boolean;
  isReply: boolean;
  replyToUsername: string | null;
  seasonLogic: number;
  seasonRank: number;
}

// The one line that explains the number. When a modifier bit, the arithmetic
// is shown rather than hidden (§14) — the rule gets taught in the moment.
function awardReason(a: Award): string {
  const mods: string[] = [];
  if (a.capped) mods.push("capped at 5 (standalone)");
  if (a.halved) mods.push("halved — 4th+ comment here");
  if (mods.length > 0) return `Judged ${a.judged} · ${mods.join(" · ")}`;
  if (a.isReply && a.replyToUsername)
    return `Targeted rebuttal of @${a.replyToUsername} — full range`;
  return `Full value — judged ${a.judged}`;
}

const ArgumentInput = ({
  argumentId,
  status,
  commentSides,
}: {
  argumentId: number;
  status: "live" | "concluded";
  commentSides: CommentSide[];
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const awardRef = useRef<HTMLDivElement>(null);
  const { target, setTarget } = useReplyTarget();

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  // Pop the award in, then clear it after a few seconds. It survives the
  // router.refresh() that reloads the new comment because it is client state.
  useEffect(() => {
    if (!award) return;
    if (awardRef.current && window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(
        awardRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      );
    }
    const t = setTimeout(() => setAward(null), 6000);
    return () => clearTimeout(t);
  }, [award]);

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

  // The viewer's first comment locks their side for this debate; the opposite
  // side's button is pre-disabled so the lock is visible before they hit it.
  const lockedSide =
    commentSides.find((c) => c.post_user_id === user.id)?.side ?? null;

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
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <input
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary px-4 py-3 md:px-6 md:py-4 font-body text-on-surface placeholder:text-outline transition-all"
            placeholder={target ? "Write your reply..." : "Join the Argument..."}
            aria-label={target ? "Write your reply" : "Join the argument"}
            type="text"
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
                submit(
                  target.side === "for" ? "negative" : "affirmative",
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
                    ? "You've committed to the Negative side of this debate."
                    : undefined
                }
                onClick={() => submit("affirmative", null)}
              >
                Support Affirmative
              </Button>
              <Button
                variant="outline-secondary"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "for"}
                title={
                  lockedSide === "for"
                    ? "You've committed to the Affirmative side of this debate."
                    : undefined
                }
                onClick={() => submit("negative", null)}
              >
                Support Negative
              </Button>
            </>
          )}
        </div>
      </div>
      {/* §14 the points pop-up — what you earned and exactly why. */}
      {award && (
        <div
          ref={awardRef}
          className="fixed bottom-32 right-6 z-60 max-w-xs bg-surface-container-lowest border-l-4 border-primary p-5 shadow-glow-primary flex items-start gap-4"
        >
          <div className="shrink-0 mt-1">
            <LuSparkles className="text-primary text-xl" />
          </div>
          <div className="grow">
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-primary leading-none">
                +{award.points}
              </span>
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
                logic
              </span>
            </div>
            <p className="font-body text-xs leading-relaxed text-on-surface-variant mt-2">
              {awardReason(award)}
            </p>
            {award.capped && (
              <p className="font-body text-xs leading-relaxed text-outline mt-1">
                Reply to an opponent next time to earn up to 8.
              </p>
            )}
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-3 border-t border-outline-variant/20 pt-2">
              Season total {award.seasonLogic} · Rank #{award.seasonRank}
            </p>
          </div>
          <button
            className="shrink-0 text-outline hover:text-white cursor-pointer"
            aria-label="Dismiss"
            onClick={() => setAward(null)}
          >
            <LuX className="text-sm" />
          </button>
        </div>
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
