"use client";

// The two argument columns. Spec: game-theory.md §6

import CaseColumn from "./CaseColumn";
import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { Analysis, UserArgumentCardProps } from "@/app/motion/types";
import api from "@/app/axios";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useArenaClosed } from "./useArenaClock";
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
  created_at: string;
  reply_to_argument_id: number | null;
  reply_to_username: string | null;
  reply_to_content: string | null;
}

const MotionArena = ({
  aiAnalysis,
  argumentsPayload,
  motionId,
  authorId,
  status,
  closesAt,
}: {
  aiAnalysis: [Analysis, Analysis];
  argumentsPayload: { arguments: RawArgument[] };
  motionId: number;
  authorId: number;
  status: "live" | "concluded";
  closesAt: string | null;
}) => {
  // §4: the same clock the composer closes on, so the thumbs and the composer
  // can never disagree about whether this debate is still open.
  const closed = useArenaClosed(status, closesAt);
  const [user, setUser] = useState<jwtPayload | null>(null);
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
      closed,
      createdAt: e.created_at,
    };
    if (e.side === "for") {
      forCaseArguments.push(arenaArgument);
    } else {
      againstCaseArguments.push(arenaArgument);
    }
  });
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
      className="grid grid-cols-1 lg:grid-cols-2 gap-px overflow-x-clip"
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
