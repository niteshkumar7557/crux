"use client";
import { useEffect, useState } from "react";
import api from "@/app/axios";
import { PaginatedStatements } from "@/app/types";
import { LuMessageSquare } from "react-icons/lu";
import { timeAgo } from "@/app/_utils/timeAgo";
import ArenaSecondaryCard from "./ArenaSecondaryCard";
import Pagination from "@/app/_components/ui/Pagination";
import { feedHref } from "./ActiveArguments";

const EMPTY: PaginatedStatements = {
  statements: [],
  total: 0,
  page: 1,
  pageSize: 12,
};

// The whole record, newest first — the same paginated endpoint /domain reads,
// just without a domain filter. There is no separate "newest" query any more.
const NewestTab = ({ page }: { page: number }) => {
  const [result, setResult] = useState<PaginatedStatements>(EMPTY);

  useEffect(() => {
    let active = true;
    async function getCardsData() {
      try {
        const { data } = await api.get("/arena/statements", {
          params: { page },
        });
        if (active && Array.isArray(data.statements)) setResult(data);
      } catch (error) {
        console.error("Failed to load newest arguments:", error);
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
      {result.statements.map((e) => (
        <ArenaSecondaryCard
          key={e.argumentid}
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
          time={timeAgo(e.time)}
          footerLeft={
            <>
              <LuMessageSquare className="inline text-primary" />{" "}
              {e.argumentNum} Arguments
            </>
          }
        />
      ))}
      <Pagination
        page={result.page}
        totalPages={totalPages}
        totalItems={result.total}
        itemLabel={result.total === 1 ? "statement" : "statements"}
        hrefFor={(p) => feedHref("newest", p)}
      />
    </div>
  );
};

export default NewestTab;
