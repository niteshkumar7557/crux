"use client";

// The composer, and most of the transparency layer: the side badge, the
// standalone-vs-reply hint and the abuse fine print all live here, because every
// one of them must be visible BEFORE it can bite.
//
// The one rule deliberately NOT surfaced here is the minimum length (§9). Naming
// it would teach a user to pad to it; leaving it silent means a throwaway post
// gets the same refusal as a padded one. Do not add a character counter or
// a length-aware disabled state.
// Spec: game-theory.md §19

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { ArgumentSide } from "@/app/motion/types";
import api from "@/app/axios";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LuX } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import AutoGrowTextarea from "@/app/_components/ui/AutoGrowTextarea";
import { useReplyTarget } from "./ReplyContext";
import { DEBATE_GUTTER } from "./debateLayout";
import PointsPopup from "../ui/PointsPopup";
import SideLockConfirm from "./SideLockConfirm";
import RefusalNotice, { type Notice } from "./RefusalNotice";
import { stageAt } from "./postingStages";
import type { Award } from "../ui/awardCopy";

const TICK_MS = 400;
const BUSY_LABEL = "Posting your argument";

// Mounted only while a post is in flight, so its clock starts at zero every time
// without an effect resetting it.
const PostingStage = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return <>{stageAt(elapsed)}</>;
};

// The real label stays in the flow, invisible, so the button cannot change width
// mid-post; the stage is laid over it. It is aria-hidden — the button carries
// aria-busy and a fixed label instead, or six substitutions become six
// announcements.
const PostLabel = ({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) => (
  <span className="relative inline-block">
    <span className={busy ? "invisible" : undefined}>{children}</span>
    {busy && (
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
      >
        <PostingStage />
      </span>
    )}
  </span>
);

// The composer's two dead states — concluded, and not signed in — are the same
// bar, so they are drawn by the same component rather than by two copies that
// drift apart.
const ClosedBar = ({ children }: { children: ReactNode }) => (
  <div
    className={`sticky bottom-0 bg-paper/80 backdrop-blur-xl border-t border-ink-faint py-4 md:py-5 ${DEBATE_GUTTER} z-40 text-center`}
  >
    <span className="font-label text-[11px] uppercase tracking-[0.2em] text-ink-soft">
      {children}
    </span>
  </div>
);

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
  // null means "signed out" only once this is true — before it, it just means the
  // token check has not come back, and prompting a signed-in reader to sign in on
  // every page load is worse than a beat of nothing.
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const { target, setTarget } = useReplyTarget();

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
      setReady(true);
    }
    fetchUser();
  }, []);

  if (status === "concluded") {
    return <ClosedBar>This debate has concluded — the verdict is in.</ClosedBar>;
  }

  if (!ready) return null;

  if (!user) {
    return (
      <ClosedBar>
        Sign in to argue this motion and like arguments.{" "}
        <Link
          href={`/login?next=/motion/CRX-${motionId}-A`}
          className="text-ink underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </ClosedBar>
    );
  }

  const isAuthor = user.id === authorId;

  const lockedSide = isAuthor
    ? "for"
    : (argumentSides.find((c) => c.post_user_id === user.id)?.side ?? null);

  const abuseNotice: Notice = {
    title: "Flagged for abuse",
    body: "The moderator judged this an attack on a debater rather than on an argument. It was discarded before it reached the arena, and it cost you 4 logic. Go as hard as you like at the reasoning.",
    action: { href: "/rules", label: "Read the rules" },
  };

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
      // §9: refused for having no argument in it. The draft is deliberately NOT
      // cleared — the fix is to add a reason, not to start again. Both refusal
      // layers land here identically, which is what keeps the cheap one's
      // threshold undiscoverable.
      if (isAxiosError(err) && err.response?.status === 422) {
        setNotice({
          title: "That isn't an argument yet",
          body:
            err.response.data?.message ??
            "Agreeing or disagreeing isn't an argument on its own. Give the reason, an example, or the mechanism. Nothing was charged, and your draft is still in the box.",
          action: { href: "/rules", label: "How scoring works" },
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
    <div
      className={`sticky bottom-0 bg-paper/80 backdrop-blur-xl border-t border-ink-faint py-4 md:py-6 ${DEBATE_GUTTER} z-40`}
    >
      {target && (
        <div className="max-w-screen-2xl mx-auto mb-3 flex items-center gap-3 border-l-2 border-side-for/50 bg-band/60 py-2 px-3">
          <span className="grow min-w-0 truncate font-label text-xs uppercase tracking-[0.12em] text-ink-soft">
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
      {lockedSide && (
        <div className="max-w-screen-2xl mx-auto mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={`font-label text-[11px] uppercase tracking-[0.18em] ${
              lockedSide === "for" ? "text-side-for" : "text-side-against"
            }`}
          >
            You&rsquo;re arguing {lockedSide === "for" ? "FOR" : "AGAINST"}
          </span>
          <span className="font-body text-sm leading-relaxed text-ink-soft">
            {isAuthor
              ? "— you posted this motion, so you can only argue FOR it."
              : `— you can't argue ${lockedSide === "for" ? "AGAINST" : "FOR"} in this debate.`}
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
            <Button
              variant={target.side === "for" ? "outline-secondary" : "outline"}
              size="bare"
              className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
              disabled={posting !== null}
              aria-busy={posting !== null}
              aria-label={posting !== null ? BUSY_LABEL : undefined}
              onClick={() =>
                requestPost(
                  target.side === "for" ? "negative" : "affirmative",
                  target.side === "for" ? "against" : "for",
                  target.argumentId,
                )
              }
            >
              <PostLabel busy={posting !== null}>Post Reply</PostLabel>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "against" || posting !== null}
                aria-busy={posting === "affirmative"}
                aria-label={
                  posting === "affirmative" ? BUSY_LABEL : undefined
                }
                title={
                  lockedSide === "against"
                    ? "You've committed to AGAINST in this debate."
                    : undefined
                }
                onClick={() => requestPost("affirmative", "for", null)}
              >
                <PostLabel busy={posting === "affirmative"}>
                  Support Affirmative
                </PostLabel>
              </Button>
              <Button
                variant="outline-secondary"
                size="bare"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
                disabled={lockedSide === "for" || posting !== null}
                aria-busy={posting === "negative"}
                aria-label={posting === "negative" ? BUSY_LABEL : undefined}
                title={
                  isAuthor
                    ? "You posted this motion — you can only argue FOR it."
                    : lockedSide === "for"
                      ? "You've committed to FOR in this debate."
                      : undefined
                }
                onClick={() => requestPost("negative", "against", null)}
              >
                <PostLabel busy={posting === "negative"}>
                  Support Negative
                </PostLabel>
              </Button>
            </>
          )}
        </div>
      </div>
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
      {award && (
        <PointsPopup award={award} onDismiss={() => setAward(null)} />
      )}
      {notice && (
        <RefusalNotice notice={notice} onDismiss={() => setNotice(null)} />
      )}
    </div>
  );
};

export default ArgumentInput;
