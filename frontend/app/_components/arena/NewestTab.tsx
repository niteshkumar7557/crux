"use client";
import { useEffect, useState } from "react";
import ArenaCard from "./ArenaCard";
import api from "@/app/axios";
import { NewestCardProps } from "@/app/types";
import { LuMessageSquare } from "react-icons/lu";
import { timeAgo } from "@/app/_utils/timeAgo";

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
      {cardsData.map((e, i) => (
        <ArenaCard
          key={i}
          username={e.username}
          domain={e.domain}
          title={e.title}
          affirmativescore={e.affirmativescore}
          negativescore={e.negativescore}
          argumentid={e.argumentid}
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
