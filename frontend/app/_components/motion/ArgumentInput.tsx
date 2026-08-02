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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuChevronDown, LuX } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import AutoGrowTextarea from "@/app/_components/ui/AutoGrowTextarea";
import { useReplyTarget } from "./ReplyContext";
import { DEBATE_GUTTER } from "./debateLayout";
import PointsPopup from "../ui/PointsPopup";
import SideLockConfirm from "./SideLockConfirm";
import RefusalNotice, { type Notice } from "./RefusalNotice";
import { stageAt } from "./postingStages";
import { hasPostedArgument } from "./reconcile";
import { useArenaClosed } from "./useArenaClock";
import type { Award } from "../ui/awardCopy";

const TICK_MS = 400;
const BUSY_LABEL = "Posting your argument";

// Spec: game-theory.md §22 — a deliberate second copy of the backend's
// ARGUMENT_LIMIT, matching the pattern already used for STANDALONE_CAP in
// awardCopy.ts (the frontend cannot import backend modules). Only a fallback
// for the brief window before the server-reported limit arrives.
const ARGUMENT_LIMIT_DEFAULT = 8;

// The conclusion job sweeps every 60s, so five minutes is ~5x the expected wait
// — long enough that a reader never has to reload, short enough that a tab left
// open overnight stops asking.
const VERDICT_POLL_MS = 20_000;
const VERDICT_POLL_LIMIT_MS = 5 * 60_000;

// The server's worst case is ~60s (one LLM call, two attempts) and Cloudflare
// cuts the connection at ~100s. The client's deadline has to sit between them,
// or a timeout stops meaning "the server failed too".
const POST_TIMEOUT_MS = 75_000;
// A dropped socket can happen while the server is still inside the transaction,
// so look more than once before concluding anything.
const RECONCILE_DELAYS_MS = [0, 4_000, 10_000];

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
  closesAt,
  authorId,
  argumentSides,
}: {
  motionId: number;
  status: "live" | "concluded";
  closesAt: string | null;
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
  // Below md the composer is a one-line bar until it is asked for. Expanded it is
  // 187px of a 667px phone, which with the navbar and the sticky claim left under
  // half the screen for the debate the composer exists to join. Above md it is
  // always open and this state is inert.
  //
  // A reply target counts as open rather than opening it from an effect: choosing
  // an argument to answer IS asking for the box, so the two are one state read two
  // ways, not two states to keep in step.
  const [openedComposer, setOpenedComposer] = useState(false);
  const { target, setTarget } = useReplyTarget();
  const expanded = openedComposer || target !== null;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // §22: whether the signed-in viewer is blocked on THIS motion, and their
  // effective allowance (raised past 5 if a block was lifted). Both come from
  // an authenticated re-read of the arguments endpoint — DebateView is a
  // server component with no access to the browser's JWT, so this is the
  // only point identity and participation status can meet.
  const [blockedOnMotion, setBlockedOnMotion] = useState(false);
  const [argumentLimit, setArgumentLimit] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
      setReady(true);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get(`/motion/${motionId}/arguments`)
      .then(({ data }) => {
        if (!active) return;
        setBlockedOnMotion(Boolean(data.blockedOnMotion));
        setArgumentLimit(typeof data.argumentLimit === "number" ? data.argumentLimit : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, motionId]);

  // §4: the arena locks at zero. `status` alone cannot carry this — the
  // conclusion job flips it up to a minute late, and the page only learns about
  // it on a render. Every hook in this component sits above the early returns
  // below, and these two must stay here with them.
  const closed = useArenaClosed(status, closesAt);

  // Once the clock is out the verdict is a minute away at most. Ask for it
  // rather than making the reader reload — router.refresh() re-renders the whole
  // tree, so the banner, the payouts and the certificate all arrive on their
  // own. When status flips to concluded, this effect's guard turns it off.
  useEffect(() => {
    if (!closed || status !== "live") return;
    let waited = 0;
    const id = setInterval(() => {
      waited += VERDICT_POLL_MS;
      if (waited > VERDICT_POLL_LIMIT_MS) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, VERDICT_POLL_MS);
    return () => clearInterval(id);
  }, [closed, status, router]);

  if (status === "concluded") {
    return <ClosedBar>This debate has concluded — the verdict is in.</ClosedBar>;
  }

  // A post already in flight is left alone: aborting it would manufacture
  // exactly the phantom failure the reconcile path exists to remove.
  if (closed) {
    return <ClosedBar>Time&rsquo;s up — the verdict is being prepared.</ClosedBar>;
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

  // §22: the composer is hidden and replaced, never left enabled to fail on
  // submit — showing someone a text box that cannot accept their writing is
  // the worst version of this.
  if (blockedOnMotion) {
    return (
      <ClosedBar>
        You&rsquo;ve used your {argumentLimit ?? ARGUMENT_LIMIT_DEFAULT} arguments — a
        strong case beats a long one. If you have more to say here, message the
        developer via the chat icon in the navbar and ask.
      </ClosedBar>
    );
  }

  const isAuthor = user.id === authorId;

  const lockedSide = isAuthor
    ? "for"
    : (argumentSides.find((c) => c.post_user_id === user.id)?.side ?? null);

  // §22: "Argument 3 of 5" — shown throughout so nobody is surprised. A rule
  // that can cost something is shown before it can bite.
  const myArgumentCount = argumentSides.filter((c) => c.post_user_id === user.id).length;
  const displayedLimit = argumentLimit ?? ARGUMENT_LIMIT_DEFAULT;

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

  // The write may have landed in a socket nobody was holding. Rather than guess,
  // read the arena back and look for it.
  async function reconcile(draft: string) {
    for (const delay of RECONCILE_DELAYS_MS) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        const { data } = await api.get(`/motion/${motionId}/arguments`);
        if (hasPostedArgument(data.arguments ?? [], user!.id, draft)) {
          setInput("");
          setTarget(null);
          setNotice({
            tone: "posted",
            title: "It Posted",
            body: "The connection dropped before the reply came back, but your argument is in the arena below — with its score. Nothing was lost, and nothing was charged twice.",
          });
          router.refresh();
          return;
        }
      } catch {
        // A failed look is not an answer. Try the next delay.
      }
    }
    setNotice({
      title: "Not Posted",
      body: "We checked the arena and your argument isn't there. Your draft is still in the box — try again.",
    });
  }

  async function submit(
    urlSide: string,
    replyToArgumentId: number | null,
    ackSimilarTo: number | null = null,
  ) {
    if (input.length === 0) return;
    setPosting(urlSide);
    try {
      const { data } = await api.post(
        `/motion/${motionId}/arguments/${urlSide}`,
        { input, replyToArgumentId, ackSimilarTo },
        { timeout: POST_TIMEOUT_MS },
      );
      setInput("");
      if (data.abused) {
        setAward(null);
        setNotice(abuseNotice);
      } else {
        setNotice(null);
        setTarget(null);
        setOpenedComposer(false);
        setAward(data as Award);
        router.refresh();
      }
    } catch (err) {
      setAward(null);
      // §22: the block was reached between this render and this submit (e.g.
      // a previous post in the same session already hit the cap). Set state
      // directly rather than a round trip — the next render swaps in the
      // closed bar.
      if (isAxiosError(err) && err.response?.status === 403) {
        setBlockedOnMotion(true);
        setNotice({
          title: "You've Used Your 5 Arguments",
          body: "Five arguments is the limit on one debate, so a strong case beats a long one. If you have more to say here, message the developer via the chat icon in the navbar and ask.",
        });
        return;
      }
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
        } else if (reason === "similar_argument") {
          // §8: a confirm gate, not a wall — the draft stays in the box, and
          // "Post anyway" retries with the specific match acknowledged. If
          // someone else posts in the interval the top match changes server
          // side, so the ack silently stops applying rather than disarming
          // the wrong warning.
          const self = Boolean(err.response.data?.self);
          const who = err.response.data?.username;
          const argId = Number(err.response.data?.argumentId);
          setNotice({
            title: self ? "Already Said" : "Already Argued",
            body: self
              ? "You made this point earlier in this debate. Posting it again will score 2 unless it adds a new reason, example, mechanism, evidence, or burden."
              : `@${who} already made this point for your side. Posting it again will score 2 unless you add a new reason, example, mechanism, evidence, or burden.`,
            action: {
              label: "Post anyway",
              onClick: () => {
                setNotice(null);
                submit(urlSide, replyToArgumentId, argId);
              },
            },
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
        return;
      }
      // Everything left is either "we never heard back" or a 5xx. Both can mean
      // the write landed anyway, so we look before we say anything. A backend
      // 500 rolled its transaction back and will correctly find nothing — which
      // costs one cheap GET and saves the client from having to tell a proxy 502
      // apart from an application 500, which it cannot do.
      const noAnswer =
        !isAxiosError(err) ||
        !err.response ||
        err.code === "ECONNABORTED" ||
        err.code === "ERR_NETWORK" ||
        err.response.status >= 500;
      if (noAnswer) {
        await reconcile(input);
        return;
      }
      setNotice({
        title: "Post Failed",
        body: "Something went wrong. Try again.",
      });
    } finally {
      setPosting(null);
    }
  }

  function expand() {
    setOpenedComposer(true);
    // After the row it lives in has been painted, or there is nothing to focus.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Collapsing drops the reply too, or `expanded` stays true and the bar refuses
  // to close.
  function collapse() {
    setTarget(null);
    setOpenedComposer(false);
  }

  return (
    <div
      className={`sticky bottom-0 bg-paper/80 backdrop-blur-xl border-t border-ink-faint py-4 md:py-6 ${DEBATE_GUTTER} z-40`}
    >
      {!expanded && (
        <button
          type="button"
          onClick={expand}
          className="max-w-screen-2xl mx-auto flex w-full cursor-pointer items-center gap-3 border border-ink-faint bg-band px-4 py-3 text-left font-body text-ink-soft transition-colors hover:border-ink/50 md:hidden"
        >
          <span className="grow truncate">
            {lockedSide
              ? `Argue ${lockedSide === "for" ? "FOR" : "AGAINST"}…`
              : "Join the Argument..."}
          </span>
          <LuChevronDown className="shrink-0 rotate-180 text-sm" />
        </button>
      )}
      <div className={expanded ? undefined : "hidden md:block"}>
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
      {/* The side badge and the collapse control share a row, so the chevron sits
          on the first line of a notice that wraps to two or three on a phone
          rather than being pushed onto one of its own. */}
      {lockedSide ? (
        <div className="max-w-screen-2xl mx-auto mb-2.5 flex items-start gap-3">
          <div className="flex min-w-0 grow flex-wrap items-baseline gap-x-3 gap-y-1">
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
            {/* <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
              Argument {Math.min(myArgumentCount + 1, displayedLimit)} of {displayedLimit}
            </span> */}
          </div>
          <button
            type="button"
            aria-label="Collapse the composer"
            onClick={collapse}
            className="shrink-0 cursor-pointer text-ink-soft transition-colors hover:text-ink md:hidden"
          >
            <LuChevronDown className="text-base" />
          </button>
        </div>
      ) : (
        <div className="max-w-screen-2xl mx-auto mb-2 flex items-center justify-between md:hidden">
          {/* <span className="font-label text-[10px] uppercase tracking-widest text-ink-soft">
            Argument {Math.min(myArgumentCount + 1, displayedLimit)} of {displayedLimit}
          </span> */}
          <button
            type="button"
            aria-label="Collapse the composer"
            onClick={collapse}
            className="cursor-pointer text-ink-soft transition-colors hover:text-ink"
          >
            <LuChevronDown className="text-base" />
          </button>
        </div>
      )}
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <AutoGrowTextarea
            ref={inputRef}
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
              className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs max-md:tracking-[0.08em]"
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
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs max-md:tracking-[0.08em]"
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
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs max-md:tracking-[0.08em]"
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
