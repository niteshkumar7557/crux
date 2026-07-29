"use client";
import CaseColumn from "./CaseColumn";
import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { Analysis, UserArgumentCardProps } from "@/app/motion/types";
import api from "@/app/axios";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { convertLogicScore } from "@/app/_utils/logicScore";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

interface RawArgument {
  argument_id: number;
  username: string;
  avatar: string | null;
  side: "for" | "against";
  logic_score: number;
  content: string;
  likes: number;
  post_user_id: number;
  reply_to_argument_id: number | null;
  reply_to_username: string | null;
  reply_to_content: string | null;
}

const MotionArena = ({
  aiAnalysis,
  argumentsPayload,
  motionId,
  authorId,
}: {
  aiAnalysis: [Analysis, Analysis];
  argumentsPayload: { arguments: RawArgument[] };
  motionId: number;
  authorId: number;
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  // §5: which arguments the viewer has already liked. The JWT is client-only, so
  // the SSR fetch can't tell — we load it here after the user resolves so the
  // hearts render already filled.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const arenaRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .get(`/like/mine/${motionId}`)
      .then(({ data }) => {
        if (alive) setLikedIds(new Set<number>(data.likedArgumentIds ?? []));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, motionId]);

  // Each case column slides in once from its own side of the argument.
  useGSAP(
    () => {
      if (!shouldAnimate(pathname)) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const sides = [
          ["[data-case='for']", -24],
          ["[data-case='against']", 24],
        ] as const;
        for (const [selector, x] of sides) {
          gsap.fromTo(
            selector,
            { opacity: 0.25, x },
            {
              opacity: 1,
              x: 0,
              duration: 0.8,
              ease: "power3.out",
              clearProps: "opacity,transform",
              scrollTrigger: { trigger: selector, start: "top 80%", once: true },
            },
          );
        }
      });
    },
    { scope: arenaRef },
  );

  // §5: a reply targets a specific opposing argument. Count replies per target
  // (the "↳ N replies" badge) and remember the earliest one (the scroll anchor).
  // Arguments arrive chronologically, so the first reply seen for a target wins.
  const replyCounts = new Map<number, number>();
  const firstReplyIds = new Map<number, number>();
  argumentsPayload.arguments.forEach((c) => {
    if (c.reply_to_argument_id !== null) {
      replyCounts.set(
        c.reply_to_argument_id,
        (replyCounts.get(c.reply_to_argument_id) ?? 0) + 1,
      );
      if (!firstReplyIds.has(c.reply_to_argument_id)) {
        firstReplyIds.set(c.reply_to_argument_id, c.argument_id);
      }
    }
  });

  // §4: the viewer's locked side, read off their own arguments. Gates the
  // cross-side-only Reply button on each card. The motion's author is bound
  // to the affirmative from the start — even before their first argument — so
  // their Reply button never appears on a FOR argument (which would derive
  // AGAINST) and only on the opposing case.
  const viewerLockedSide: "for" | "against" | null =
    user && user.id === authorId
      ? "for"
      : user
        ? (argumentsPayload.arguments.find((c) => c.post_user_id === user.id)?.side ??
          null)
        : null;

  const forCaseArguments: UserArgumentCardProps[] = [];
  const againstCaseArguments: UserArgumentCardProps[] = [];
  argumentsPayload.arguments.forEach((e) => {
    const logicStats = convertLogicScore(e.logic_score);
    const arenaArgument: UserArgumentCardProps = {
      side: e.side,
      reputation: logicStats.reputation,
      username: e.username,
      avatar: e.avatar,
      argument: e.content,
      likes: e.likes,
      user_id: user?.id,
      argument_id: e.argument_id,
      post_user_id: e.post_user_id,
      initiallyLiked: likedIds.has(e.argument_id),
      replyTo:
        e.reply_to_argument_id !== null
          ? {
              argumentId: e.reply_to_argument_id,
              username: e.reply_to_username ?? "",
              content: e.reply_to_content ?? "",
            }
          : null,
      replyCount: replyCounts.get(e.argument_id) ?? 0,
      firstReplyId: firstReplyIds.get(e.argument_id) ?? null,
      viewerLockedSide,
    };
    if (e.side === "for") {
      forCaseArguments.push(arenaArgument);
    } else {
      againstCaseArguments.push(arenaArgument);
    }
  });
  // Newest first: a debate you come back to should open on what has just been
  // argued, not on the opener you already read. Only the display order flips —
  // the reply counts and thread anchors above are built from the chronological
  // array, where "the first reply seen wins" still means the earliest one.
  forCaseArguments.reverse();
  againstCaseArguments.reverse();

  const motionArenaData = {
    forArgumentsCount: forCaseArguments.length,
    againstArgumentsCount: againstCaseArguments.length,
    forCaseArguments: forCaseArguments,
    againstCaseArguments: againstCaseArguments,
  };

  return (
    <div
      ref={arenaRef}
      className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-ink-faint overflow-x-clip"
    >
      <CaseColumn
        side="for"
        aiAnalysis={aiAnalysis[0]}
        motionArenaData={motionArenaData}
      />
      <CaseColumn
        side="against"
        aiAnalysis={aiAnalysis[1]}
        motionArenaData={motionArenaData}
      />
    </div>
  );
};

export default MotionArena;
