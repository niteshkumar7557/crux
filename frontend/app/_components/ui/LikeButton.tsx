"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { PiThumbsUp, PiThumbsUpFill } from "react-icons/pi";
import api from "@/app/axios";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";

// The like control on an argument — icon, count, and the whole optimistic
// toggle behind it.
//
// **Two drawings, not one.** The icon is a matched outline/solid pair
// (Phosphor's `PiThumbsUp` / `PiThumbsUpFill`) rather than one line icon with
// `fill-current` thrown at it on the liked state. Filling a stroked drawing
// floods the gaps the strokes were describing — the wrist seam and the folded
// fingers close up and the thumb becomes a mitten. A purpose-drawn solid keeps
// the seam, so the liked state reads as the same hand, pressed.
//
// A like is not a "me too": it pays the argument's author +2 logic (§6). That
// is why liking your own argument is not on offer, and why a logged-out viewer
// is sent to log in rather than given a button that would go nowhere.

/** How the control behaves for this viewer. */
type Mode =
  /** The viewer wrote this argument — the count shows, but there is nothing to press. */
  | { kind: "own" }
  /** Nobody is logged in — the count shows and the control is a link to /login. */
  | { kind: "anonymous" }
  /** Someone else's argument, viewer signed in — a real toggle. */
  | { kind: "interactive" };

const LikeButton = ({
  argumentId,
  side,
  likes,
  initiallyLiked,
  mode,
  className = "",
}: {
  argumentId: number;
  side: "for" | "against";
  likes: number;
  initiallyLiked: boolean;
  mode: Mode;
  className?: string;
}) => {
  const [likeCount, setLikeCount] = useState(likes);
  const [liked, setLiked] = useState(initiallyLiked);
  const [busy, setBusy] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);

  // The viewer's like state loads a beat after mount (client-only JWT). Adopt it
  // when it arrives by comparing against the last value we synced — the React
  // "adjust state while rendering" pattern, so no effect and no extra render.
  // A toggle already in flight wins, so a mid-load tap is never clobbered.
  const [syncedInit, setSyncedInit] = useState(initiallyLiked);
  if (initiallyLiked !== syncedInit) {
    setSyncedInit(initiallyLiked);
    if (!busy) setLiked(initiallyLiked);
  }

  // **The pressed thumb is ink, not the camp colour.** A liked argument used to
  // fill forest on the FOR side and terracotta on the AGAINST side, which put
  // the loudest colour in the column on the one control that says nothing about
  // the debate — a like is a viewer's tap, not a claim about who is winning, and
  // two of them in different colours read as two different features. One neutral
  // fill for both sides; the outline/solid swap is what says "pressed". The
  // hover tint stays the camp's, matching Reply and the reply count beside it.
  const accent = "text-ink";
  const hover = side === "for" ? "hover:text-side-for" : "hover:text-side-against";
  const base = `font-label text-[10px] uppercase inline-flex items-center gap-1.5 transition-colors ${className}`;

  async function toggle() {
    if (busy) return;
    const next = !liked;
    // Optimistic: flip the icon and count now, reconcile with the server, and
    // roll both back if the call fails so the UI never lies about the count.
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    // The thumb presses in and springs back — only on the way *in*, because
    // celebrating an un-like is the app arguing with the user.
    if (next && iconRef.current && window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0.82 },
        {
          scale: 1,
          duration: 0.42,
          ease: "back.out(3)",
          overwrite: "auto",
        },
      );
    }
    setBusy(true);
    try {
      // Only rendered for a signed-in viewer, so the axios token interceptor
      // always has a token to attach.
      if (next) {
        await api.post("/like", { argument_id: argumentId });
      } else {
        await api.delete("/like", { data: { argument_id: argumentId } });
      }
    } catch {
      setLiked(!next);
      setLikeCount((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  // One icon slot for every mode, so the count never shifts sideways as the
  // drawing swaps: both cuts occupy the same box.
  const icon = (
    <span ref={iconRef} className="inline-flex text-[15px] leading-none">
      {liked ? <PiThumbsUpFill /> : <PiThumbsUp />}
    </span>
  );

  if (mode.kind === "own") {
    return (
      <span
        title="You can't like your own argument — a like pays the author"
        className={`${base} text-ink-soft cursor-not-allowed`}
      >
        {icon}
        <span className="tabular-nums">{likeCount}</span>
      </span>
    );
  }

  if (mode.kind === "anonymous") {
    return (
      <Link
        href="/login"
        title="Log in to like this argument"
        className={`${base} text-ink-soft cursor-pointer ${hover}`}
      >
        {icon}
        <span className="tabular-nums">{likeCount}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this argument" : "Like this argument"}
      className={`${base} cursor-pointer ${liked ? accent : `text-ink-soft ${hover}`}`}
    >
      {icon}
      <span className="tabular-nums">{likeCount}</span>
    </button>
  );
};

export default LikeButton;
