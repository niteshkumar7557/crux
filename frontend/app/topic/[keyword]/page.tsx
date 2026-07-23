export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaSecondaryCard from "@/app/_components/arena/ArenaSecondaryCard";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import { timeAgo } from "@/app/_utils/timeAgo";
import { PaginatedStatements } from "@/app/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const kw = decodeURIComponent(keyword);
  return {
    title: `Debates on “${kw}”`,
    description: `Every Crux debate tagged “${kw}” — live arenas and settled verdicts.`,
  };
}

const TopicPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ keyword: string }>;
  searchParams: Promise<{ page?: string }>;
}) => {
  const { keyword } = await params;
  const { page: pageParam } = await searchParams;
  const kw = decodeURIComponent(keyword);
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let result: PaginatedStatements = {
    statements: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };
  try {
    const { data } = await serverApi.get("/arena/statements", {
      params: { keyword: kw, page: requestedPage },
    });
    if (Array.isArray(data.statements)) result = data;
  } catch (error) {
    console.error("Failed to load topic statements:", error);
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <Reveal
      key={`${kw}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-12 border-l-4 border-tertiary pl-6">
        <span className="font-label text-tertiary text-xs uppercase tracking-[0.3em] mb-2 block">
          TOPIC
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          {kw}
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          {result.total} debate{result.total === 1 ? "" : "s"} on this topic.
        </p>
      </div>

      {result.statements.length === 0 ? (
        <div
          data-reveal
          className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            No debates tagged “{kw}” yet.
          </p>
          <Button href="/statement" size="lg">
            Start one
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
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
        </div>
      )}

      <div data-reveal>
        <Pagination
          page={result.page}
          totalPages={totalPages}
          totalItems={result.total}
          itemLabel={result.total === 1 ? "debate" : "debates"}
          hrefFor={(p) => `/topic/${encodeURIComponent(kw)}?page=${p}`}
        />
      </div>
    </Reveal>
  );
};

export default TopicPage;
