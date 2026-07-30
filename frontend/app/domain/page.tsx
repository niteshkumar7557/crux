// The twelve domains.

export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaSecondaryCard from "@/app/_components/arena/ArenaSecondaryCard";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import { DomainInfo, PaginatedMotions } from "@/app/types";
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
  // /domain and /domain?q=all are the same page under two URLs; point both at
  // the clean one so the signal is not split between them.
  if (!q || q === "all") {
    return { title: "Domains", alternates: { canonical: "/domain" } };
  }
  const domains = await fetchDomains();
  const match = domains.find((d) => slugifyDomain(d.name) === q);
  return {
    title: match ? match.name : "Domains",
    alternates: {
      canonical: match ? `/domain?q=${q}` : "/domain",
    },
  };
}

const chipClass = (active: boolean) =>
  `${active ? "border-ink bg-ink-wash text-ink" : "border-ink-faint bg-band text-ink-soft"} rounded-full border px-4 py-2 font-label text-[0.65rem] uppercase tracking-[0.16em] transition-colors hover:border-ink hover:text-ink`;

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

  let result: PaginatedMotions = {
    motions: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };
  if (!unknownSlug) {
    try {
      const { data } = await serverApi.get("/arena/motions", {
        params: {
          ...(activeDomain ? { domainId: activeDomain.id } : {}),
          page: requestedPage,
        },
      });
      if (Array.isArray(data.motions)) result = data;
    } catch (error) {
      console.error("Failed to load domain motions:", error);
    }
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const heading = activeDomain ? activeDomain.name : "All Battlegrounds";

  return (
    <Reveal
      key={`${slug}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          THE BATTLEGROUNDS
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          {heading}
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          {unknownSlug
            ? "This battleground does not exist."
            : `${result.total} motion${result.total === 1 ? "" : "s"} on the record.`}
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

      {result.motions.length === 0 ? (
        <div
          data-reveal
          className="border border-ink-faint bg-band p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-ink mb-3">
            {unknownSlug
              ? "No such battleground."
              : activeDomain
                ? `No motions filed under ${activeDomain.name}.`
                : "The arena is empty."}
          </p>
          <p className="font-body text-sm text-ink-soft mb-8">
            {unknownSlug
              ? "Pick a battleground above to browse the record."
              : activeDomain
                ? "Be the first to open this battleground."
                : "No claims have entered the arena yet."}
          </p>
          <Button href="/motion/new" size="lg">
            Start a Debate
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
          itemLabel={result.total === 1 ? "motion" : "motions"}
          hrefFor={(p) => `/domain?q=${encodeURIComponent(slug)}&page=${p}`}
        />
      </div>
    </Reveal>
  );
};

export default DomainPage;
