"use client";
import { useEffect, useState } from "react";
import ArenaCard from "./ArenaCard";
import api from "@/app/axios";
import { NewestCardProps } from "@/app/types";
import { LuMessageSquare } from "react-icons/lu";

export function timeAgo(timestamp: string): string {
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const seconds = Math.floor((now - past) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  return `${years} years ago`;
}

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
