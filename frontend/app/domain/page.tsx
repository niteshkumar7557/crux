export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaCard from "@/app/_components/arena/ArenaCard";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import { DomainInfo, PaginatedStatements } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";
import { timeAgo } from "@/app/_utils/timeAgo";

type SearchParams = Promise<{ q?: string; page?: string }>;

async function fetchDomains(): Promise<DomainInfo[]> {
  try {
    const { data } = await serverApi.get("/domains");
    return Array.isArray(data.domains) ? data.domains : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q || q === "all") return { title: "Domains" };
  const domains = await fetchDomains();
  const match = domains.find((d) => slugifyDomain(d.name) === q);
  return { title: match ? match.name : "Domains" };
}

const chipClass = (active: boolean) =>
  `${active ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container text-on-surface-variant"} border px-4 py-2 font-label text-xs uppercase hover:border-primary hover:text-primary transition-colors`;

const DomainPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { q, page: pageParam } = await searchParams;
  const slug = q || "all";
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const domains = await fetchDomains();
  const activeDomain =
    slug === "all"
      ? null
      : (domains.find((d) => slugifyDomain(d.name) === slug) ?? null);
  const unknownSlug = slug !== "all" && activeDomain === null;

  let result: PaginatedStatements = {
    statements: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };
  if (!unknownSlug) {
    try {
      const { data } = await serverApi.get("/arena/statements", {
        params: {
          ...(activeDomain ? { domainId: activeDomain.id } : {}),
          page: requestedPage,
        },
      });
      if (Array.isArray(data.statements)) result = data;
    } catch (error) {
      console.error("Failed to load domain statements:", error);
    }
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const heading = activeDomain ? activeDomain.name : "All Battlegrounds";

  return (
    <Reveal
      key={`${slug}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-12 border-l-4 border-tertiary pl-6">
        <span className="font-label text-tertiary text-xs uppercase tracking-[0.3em] mb-2 block">
          THE BATTLEGROUNDS
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          {heading}
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          {unknownSlug
            ? "This battleground does not exist."
            : `${result.total} statement${result.total === 1 ? "" : "s"} on the record.`}
        </p>
      </div>

      {domains.length > 0 && (
        <div data-reveal className="flex flex-wrap gap-2 mb-8">
          <Link href="/domain?q=all" className={chipClass(slug === "all")}>
            All
          </Link>
          {domains.map((d) => {
            const domainSlug = slugifyDomain(d.name);
            return (
              <Link
                key={d.id}
                href={`/domain?q=${domainSlug}`}
                className={chipClass(slug === domainSlug)}
              >
                {d.name}
              </Link>
            );
          })}
        </div>
      )}

      {result.statements.length === 0 ? (
        <div
          data-reveal
          className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            {unknownSlug
              ? "No such battleground."
              : activeDomain
                ? `No statements filed under ${activeDomain.name}.`
                : "The arena is empty."}
          </p>
          <p className="font-body text-sm text-outline mb-8">
            {unknownSlug
              ? "Pick a battleground above to browse the record."
              : activeDomain
                ? "Be the first to open this battleground."
                : "No claims have entered the arena yet."}
          </p>
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          {result.statements.map((e) => (
            <ArenaCard
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
          itemLabel={result.total === 1 ? "statement" : "statements"}
          hrefFor={(p) => `/domain?q=${encodeURIComponent(slug)}&page=${p}`}
        />
      </div>
    </Reveal>
  );
};

export default DomainPage;
