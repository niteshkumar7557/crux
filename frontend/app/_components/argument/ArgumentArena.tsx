"use client";
import CaseColumn from "./CaseColumn";
import { getUser } from "@/app/_utils/getUser";
import { useEffect, useState } from "react";

function convertLogicScore(score: number) {
  // Beginner       -> B   0-50
  // Intermediate   -> B+  50-100
  // Skilled        -> A   100-150
  // Expert         -> A+  150-200
  // Master         -> M   200+

  const logicIndex = Number(score >= 50) + Number(score >= 100) + Number(score >= 150) + Number(score >= 200);
  
  return {
    reputation: ["beginner", "intermediate", "skilled", "expert", "master"][logicIndex],
    grade: ["B", "B+", "A", "A+", "M"][logicIndex],
  };
}

const ArgumentArena = ({
  aiAnalysis,
  comments,
}: {
  aiAnalysis: [string, string];
  comments: any;
}) => {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  const forCaseComments: any = [];
  const againstCaseComments: any = [];
  comments.comments.forEach(
    (e: {
      comment_id: number;
      username: string;
      side: "for" | "against";
      logic_score: number;
      content: string;
      likes: number;
      post_user_id: number;
    }) => {
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
    },
  );
  const argumentArenaData = {
    forArgumentsCount: forCaseComments.length,
    againstArgumentsCount: againstCaseComments.length,
    forCaseComments: forCaseComments,
    againstCaseComments: againstCaseComments,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant/20">
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
