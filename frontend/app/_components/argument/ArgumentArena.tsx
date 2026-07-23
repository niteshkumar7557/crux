"use client";
import CaseColumn from "./CaseColumn";
import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { UserArgumentCardProps } from "@/app/argument/types";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { convertLogicScore } from "@/app/_utils/logicScore";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

interface RawComment {
  comment_id: number;
  username: string;
  avatar: string | null;
  side: "for" | "against";
  logic_score: number;
  content: string;
  likes: number;
  post_user_id: number;
  reply_to_comment_id: number | null;
  reply_to_username: string | null;
  reply_to_content: string | null;
}

const ArgumentArena = ({
  aiAnalysis,
  comments,
}: {
  aiAnalysis: [string, string];
  comments: { comments: RawComment[] };
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

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

  // §5: a reply targets a specific opposing comment. Count replies per target
  // (the "↳ N replies" badge) and remember the earliest one (the scroll anchor).
  // Comments arrive chronologically, so the first reply seen for a target wins.
  const replyCounts = new Map<number, number>();
  const firstReplyIds = new Map<number, number>();
  comments.comments.forEach((c) => {
    if (c.reply_to_comment_id !== null) {
      replyCounts.set(
        c.reply_to_comment_id,
        (replyCounts.get(c.reply_to_comment_id) ?? 0) + 1,
      );
      if (!firstReplyIds.has(c.reply_to_comment_id)) {
        firstReplyIds.set(c.reply_to_comment_id, c.comment_id);
      }
    }
  });

  // §4: the viewer's locked side, read off their own comments. Gates the
  // cross-side-only Reply button on each card.
  const viewerLockedSide: "for" | "against" | null = user
    ? (comments.comments.find((c) => c.post_user_id === user.id)?.side ?? null)
    : null;

  const forCaseComments: UserArgumentCardProps[] = [];
  const againstCaseComments: UserArgumentCardProps[] = [];
  comments.comments.forEach((e) => {
    const logicStats = convertLogicScore(e.logic_score);
    const arenaComment: UserArgumentCardProps = {
      side: e.side,
      reputation: logicStats.reputation,
      username: e.username,
      avatar: e.avatar,
      grade: logicStats.grade,
      comment: e.content,
      likes: e.likes,
      user_id: user?.id,
      comment_id: e.comment_id,
      post_user_id: e.post_user_id,
      replyTo:
        e.reply_to_comment_id !== null
          ? {
              commentId: e.reply_to_comment_id,
              username: e.reply_to_username ?? "",
              content: e.reply_to_content ?? "",
            }
          : null,
      replyCount: replyCounts.get(e.comment_id) ?? 0,
      firstReplyId: firstReplyIds.get(e.comment_id) ?? null,
      viewerLockedSide,
    };
    if (e.side === "for") {
      forCaseComments.push(arenaComment);
    } else {
      againstCaseComments.push(arenaComment);
    }
  });
  const argumentArenaData = {
    forArgumentsCount: forCaseComments.length,
    againstArgumentsCount: againstCaseComments.length,
    forCaseComments: forCaseComments,
    againstCaseComments: againstCaseComments,
  };

  return (
    <div
      ref={arenaRef}
      className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant/20 overflow-x-clip"
    >
      <CaseColumn
        side="for"
        aiAnalysis={aiAnalysis[0]}
        argumentArenaData={argumentArenaData}
      />
      <CaseColumn
        side="against"
        aiAnalysis={aiAnalysis[1]}
        argumentArenaData={argumentArenaData}
      />
    </div>
  );
};

export default ArgumentArena;
