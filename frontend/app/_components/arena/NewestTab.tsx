"use client";

// The chronological feed.

import { useEffect, useState } from "react";
import api from "@/app/axios";
import { PaginatedMotions } from "@/app/types";
import { LuMessageSquare } from "react-icons/lu";
import { timeAgo } from "@/app/_utils/timeAgo";
import ArenaSecondaryCard from "./ArenaSecondaryCard";
import Pagination from "@/app/_components/ui/Pagination";
import { feedHref } from "./ActiveMotions";

const EMPTY: PaginatedMotions = {
  motions: [],
  total: 0,
  page: 1,
  pageSize: 12,
};

const NewestTab = ({ page }: { page: number }) => {
  const [result, setResult] = useState<PaginatedMotions>(EMPTY);

  useEffect(() => {
    let active = true;
    async function getCardsData() {
      try {
        const { data } = await api.get("/arena/motions", {
          params: { page },
        });
        if (active && Array.isArray(data.motions)) setResult(data);
      } catch (error) {
        console.error("Failed to load newest motions:", error);
      }
    }
    getCardsData();
    return () => {
      active = false;
    };
  }, [page]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <div>
      {result.motions.map((e) => (
        <ArenaSecondaryCard
          key={e.motionid}
          username={e.username}
          avatar={e.avatar}
          domain={e.domain}
          title={e.title}
          affirmativescore={e.affirmativescore}
          negativescore={e.negativescore}
          motionid={e.motionid}
          status={e.status}
          closesAt={e.closesAt}
          winner={e.winner}
          time={timeAgo(e.time)}
          footerLeft={
            <>
              <LuMessageSquare className="inline text-ink-soft" />{" "}
              {e.argumentNum} Arguments
            </>
          }
        />
      ))}
      <Pagination
        page={result.page}
        totalPages={totalPages}
        totalItems={result.total}
        itemLabel={result.total === 1 ? "motion" : "motions"}
        hrefFor={(p) => feedHref("newest", p)}
      />
    </div>
  );
};

export default NewestTab;
