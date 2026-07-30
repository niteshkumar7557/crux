"use client";

// Like and unlike. Spec: game-theory.md §10

import Link from "next/link";
import { useRef, useState } from "react";
import { PiThumbsUp, PiThumbsUpFill } from "react-icons/pi";
import api from "@/app/axios";
import { gsap, MOTION_OK } from "@/app/_utils/gsap";

type Mode =
  | { kind: "own" }
  | { kind: "anonymous" }
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

  const [syncedInit, setSyncedInit] = useState(initiallyLiked);
  if (initiallyLiked !== syncedInit) {
    setSyncedInit(initiallyLiked);
    if (!busy) setLiked(initiallyLiked);
  }

  const accent = "text-ink";
  const hover = side === "for" ? "hover:text-side-for" : "hover:text-side-against";
  const base = `font-label text-[10px] uppercase inline-flex items-center gap-1.5 transition-colors ${className}`;

  async function toggle() {
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
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
