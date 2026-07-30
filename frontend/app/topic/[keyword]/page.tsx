// SEO hub for one Arbiter-assigned keyword.

export const dynamic = "force-dynamic";
import { cache } from "react";
import type { Metadata } from "next";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaSecondaryCard from "@/app/_components/arena/ArenaSecondaryCard";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import { timeAgo } from "@/app/_utils/timeAgo";
import { PaginatedMotions } from "@/app/types";

const EMPTY: PaginatedMotions = { motions: [], total: 0, page: 1, pageSize: 12 };

/** Shared by generateMetadata and the page, so a request costs one query, not two. */
const fetchTopic = cache(async function fetchTopic(
  keyword: string,
  page: number,
): Promise<PaginatedMotions> {
  try {
    const { data } = await serverApi.get("/arena/motions", {
      params: { keyword, page },
    });
    if (Array.isArray(data.motions)) return data;
  } catch (error) {
    console.error("Failed to load topic motions:", error);
  }
  return EMPTY;
});

function pageNumber(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ keyword: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const { page } = await searchParams;
  const kw = decodeURIComponent(keyword);
  const requestedPage = pageNumber(page);
  const { total } = await fetchTopic(kw, requestedPage);

  const path = `/topic/${encodeURIComponent(kw)}`;
  return {
    title: `Debates on “${kw}”`,
    description: `Every Crux debate tagged “${kw}” — live arenas and settled verdicts.`,
    alternates: {
      canonical: requestedPage > 1 ? `${path}?page=${requestedPage}` : path,
    },
    // A hub with nothing on it is a soft 404, and enough of them read as a
    // site-wide quality problem rather than a per-page one. `follow` keeps the
    // links live, and the page indexes itself again the moment it has a debate.
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
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
  const requestedPage = pageNumber(pageParam);

  const result = await fetchTopic(kw, requestedPage);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <Reveal
      key={`${kw}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          TOPIC
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          {kw}
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          {result.total} debate{result.total === 1 ? "" : "s"} on this topic.
        </p>
      </div>

      {result.motions.length === 0 ? (
        <div
          data-reveal
          className="border border-ink-faint bg-band p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-ink mb-3">
            No debates tagged “{kw}” yet.
          </p>
          <Button href="/motion/new" size="lg">
            Start one
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
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
                  <LuMessageSquare className="inline text-ink" />{" "}
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
