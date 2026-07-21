"use client";
import { useEffect, useState } from "react";
import api from "@/app/axios";
import { NewestCardProps } from "@/app/types";
import { LuMessageSquare } from "react-icons/lu";
import { timeAgo } from "@/app/_utils/timeAgo";
import ArenaSecondaryCard from "./ArenaSecondaryCard";

const NewestTab = () => {
  const [cardsData, setCardsData] = useState<NewestCardProps[]>([]);

  useEffect(() => {
    async function getCardsData() {
      try {
        const { data } = await api.get("/arena/active/newest");
        setCardsData(data);
      } catch (error) {
        console.error("Failed to load newest arguments:", error);
      }
    }
    getCardsData();
  }, []);

  return (
    <div>
      {cardsData.length > 0 && cardsData.map((e, i) => (
        <ArenaSecondaryCard
          key={i}
          username={e.username}
          avatar={e.avatar}
          domain={e.domain}
          title={e.title}
          affirmativescore={e.affirmativescore}
          negativescore={e.negativescore}
          argumentid={e.argumentid}
          status={e.status}
          closesAt={e.closesAt}
          winner={e.winner}
          votes={e.votes}
          time={timeAgo(e.time)}
          footerLeft={
            <>
              <LuMessageSquare className="inline text-primary" />{" "}
              {e.argumentNum} Arguments
            </>
          }
        />
      ))}
    </div>
  );
};

export default NewestTab;
