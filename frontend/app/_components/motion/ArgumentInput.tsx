"use client";

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { ArgumentSide } from "@/app/motion/types";
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
  replyToArgumentId: number | null;
};

const ArgumentInput = ({
  motionId,
  status,
  authorId,
  argumentSides,
}: {
  motionId: number;
  status: "live" | "concluded";
  authorId: number;
  argumentSides: ArgumentSide[];
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  // Which side is in flight, or null. The post is not fast — it waits on the
  // moderator/analyst call — so without this the composer looks inert for
  // several seconds and people press the button again.
  const [posting, setPosting] = useState<string | null>(null);
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
      <div className="sticky bottom-0 bg-paper/80 backdrop-blur-xl border-t border-ink-faint py-4 px-4 md:py-5 md:px-6 z-40 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          This debate has concluded — the verdict is in.
        </span>
      </div>
    );
  }

  if (!user) return null;

  // The motion's author owns the affirmative case: they are locked to FOR
  // from the very first argument, so the AGAINST button is disabled before it can
  // be pressed and the server rejects it either way (author_affirmative_only).
  const isAuthor = user.id === authorId;

  // The viewer's first argument locks their side for this debate; the opposite
  // side's button is pre-disabled so the lock is visible before they hit it.
  const lockedSide = isAuthor
    ? "for"
    : (argumentSides.find((c) => c.post_user_id === user.id)?.side ?? null);

  const abuseNotice: Notice = {
    title: "Flagged for Abuse",
    body: (
      <>
        Your argument crossed the line of civil debate. Review the{" "}
        <Link
          className="text-side-against underline underline-offset-2 hover:text-ink"
          href={"/rules"}
        >
          Arena Rules
        </Link>{" "}
        before posting again.
      </>
    ),
  };

  // §14: the lock is confirmed BEFORE it happens, never discovered after. A
  // reply commits you too (§5 — to the side opposite the argument you answer),
  // so it routes through the same gate rather than sneaking past it.
  function requestPost(
    urlSide: string,
    side: "for" | "against",
    replyToArgumentId: number | null,
  ) {
    if (input.length === 0 || posting) return;
    if (lockedSide === null) {
      setPending({ urlSide, side, replyToArgumentId });
      return;
    }
    submit(urlSide, replyToArgumentId);
  }

  // One poster for standalone arguments and cross-side replies alike. For a
  // reply the side is implied by the target (§5): the URL carries the opposite
  // side and the body the target id, and the server re-derives + validates it.
  async function submit(urlSide: string, replyToArgumentId: number | null) {
    if (input.length === 0) return;
    setPosting(urlSide);
    try {
      const { data } = await api.post(`/motion/${motionId}/arguments/${urlSide}`, {
        input,
        replyToArgumentId,
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
      if (isAxiosError(err) && err.response?.status === 429) {
        setNotice({
          title: "Easy There",
          body:
            err.response.data?.message ??
            "You're posting fast — try again in a minute.",
        });
        return;
      }
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
            body: "You posted this motion, so you can only argue FOR it — never against your own claim.",
          });
        } else if (reason === "duplicate_own") {
          setNotice({
            title: "Already Said",
            body: "You've already posted this argument in this debate. Make a new point, or add a reason or example to the one you made.",
          });
        } else if (reason === "duplicate_other") {
          const who = err.response.data?.username;
          setNotice({
            title: "Already Argued",
            body: `That argument has already been made${who ? ` by @${who}` : ""}. Reposting it earns nothing — argue it further or take it somewhere new.`,
          });
        } else if (reason === "bad_reply_target") {
          setTarget(null);
          setNotice({
            title: "Can't Reply There",
            body: "You can only reply to an argument on the opposing side.",
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
    } finally {
      setPosting(null);
    }
  }

  return (
    <div className="sticky bottom-0 bg-paper/80 backdrop-blur-xl border-t border-ink-faint py-4 px-4 md:py-6 md:px-6 z-40">
      {target && (
        <div className="max-w-screen-2xl mx-auto mb-3 flex items-center gap-3 border-l-2 border-side-for/50 bg-band/60 py-2 px-3">
          <span className="grow min-w-0 truncate font-label text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Replying to @{target.username} — &ldquo;
            {target.content.length > 48
              ? `${target.content.slice(0, 48)}…`
              : target.content}
            &rdquo;
          </span>
          <button
            className="shrink-0 text-ink-soft hover:text-ink cursor-pointer"
            aria-label="Cancel reply"
            onClick={() => setTarget(null)}
          >
            <LuX className="text-sm" />
          </button>
        </div>
      )}
      {/* §14: the side lock is the one rule that has already bound by the time
          you are typing, so it stays stated at the composer. */}
      {lockedSide && (
        <div className="max-w-screen-2xl mx-auto mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className={`font-label text-[10px] uppercase tracking-[0.15em] ${
              lockedSide === "for" ? "text-side-for" : "text-side-against"
            }`}
          >
            You&rsquo;re arguing {lockedSide === "for" ? "FOR" : "AGAINST"}{" "}
            <span className="text-ink-soft normal-case tracking-normal font-body ml-2">
              {isAuthor
                ? "— you posted this motion, so you can only argue FOR it."
                : `— you can't argue ${lockedSide === "for" ? "AGAINST" : "FOR"} in this debate.`}
            </span>
          </span>
        </div>
      )}
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <AutoGrowTextarea
            className="w-full bg-band border border-ink-faint focus:border-side-for focus:outline-none px-4 py-3 md:px-6 md:py-4 font-body text-ink placeholder:text-ink-soft transition-all block disabled:opacity-60"
            placeholder={target ? "Write your reply..." : "Join the Argument..."}
            aria-label={target ? "Write your reply" : "Join the argument"}
            maxHeight={160}
            value={input}
            disabled={posting !== null}
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
              disabled={posting !== null}
              onClick={() =>
                requestPost(
                  target.side === "for" ? "negative" : "affirmative",
                  target.side === "for" ? "against" : "for",
                  target.argumentId,
                )
              }
            >
              {posting ? "Posting…" : "Post Reply"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "against" || posting !== null}
                title={
                  lockedSide === "against"
                    ? "You've committed to AGAINST in this debate."
                    : undefined
                }
                onClick={() => requestPost("affirmative", "for", null)}
              >
                {posting === "affirmative" ? "Posting…" : "Support Affirmative"}
              </Button>
              <Button
                variant="outline-secondary"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "for" || posting !== null}
                title={
                  isAuthor
                    ? "You posted this motion — you can only argue FOR it."
                    : lockedSide === "for"
                      ? "You've committed to FOR in this debate."
                      : undefined
                }
                onClick={() => requestPost("negative", "against", null)}
              >
                {posting === "negative" ? "Posting…" : "Support Negative"}
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
            submit(pending.urlSide, pending.replyToArgumentId);
          }}
        />
      )}
      {/* §14 the points pop-up — what you earned and exactly why. */}
      {award && (
        <PointsPopup award={award} onDismiss={() => setAward(null)} />
      )}
      {notice && (
        <div className="fixed bottom-32 right-6 z-60 max-w-sm bg-paper border-l-4 border-side-against p-4 flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <LuTriangleAlert className="text-side-against font-bold text-xl" />
          </div>
          <div className="grow">
            <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-side-against mb-1 font-bold">
              {notice.title}
            </h4>
            <p className="font-body text-xs leading-relaxed text-ink-soft">
              {notice.body}
            </p>
          </div>
          <button
            className="shrink-0 text-ink-soft hover:text-ink cursor-pointer"
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
