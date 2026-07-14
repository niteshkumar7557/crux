"use client";
import CaseColumn from "./CaseColumn";
import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { UserArgumentCardProps } from "@/app/argument/types";
import { useEffect, useRef, useState } from "react";
import { convertLogicScore } from "@/app/_utils/logicScore";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

interface RawComment {
  comment_id: number;
  username: string;
  side: "for" | "against";
  logic_score: number;
  content: string;
  likes: number;
  post_user_id: number;
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

  const forCaseComments: UserArgumentCardProps[] = [];
  const againstCaseComments: UserArgumentCardProps[] = [];
  comments.comments.forEach((e) => {
    const logicStats = convertLogicScore(e.logic_score);
    const arenaComment = {
      side: e.side,
      reputation: logicStats.reputation,
      username: e.username,
      grade: logicStats.grade,
      comment: e.content,
      likes: e.likes,
      user_id: user?.id,
      comment_id: e.comment_id,
      post_user_id: e.post_user_id,
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
