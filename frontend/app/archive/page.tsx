// The settled record — concluded debates, filtered by outcome and domain.

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
import { ARCHIVE_OUTCOMES, archiveHref, parseOutcome } from "./archiveHref";

export const metadata: Metadata = {
  title: "Archive",
  description:
    "Every settled debate on Crux — the verdicts, the draws and the walkovers, on the permanent record.",
};

type SearchParams = Promise<{
  outcome?: string;
  domain?: string;
  page?: string;
}>;

const chipClass = (active: boolean) =>
  `${active ? "border-ink bg-ink-wash text-ink" : "border-ink-faint bg-band text-ink-soft"} rounded-full border px-4 py-2 font-label text-[0.65rem] uppercase tracking-[0.16em] transition-colors hover:border-ink hover:text-ink`;

async function fetchDomains(): Promise<DomainInfo[]> {
  try {
    const { data } = await serverApi.get("/domains");
    return Array.isArray(data.domains) ? data.domains : [];
  } catch {
    return [];
  }
}

const ArchivePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const {
    outcome: outcomeParam,
    domain: domainParam,
    page: pageParam,
  } = await searchParams;

  const outcome = parseOutcome(outcomeParam);
  const domainSlug = domainParam || "all";
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const domains = await fetchDomains();
  const activeDomain =
    domainSlug === "all"
      ? null
      : (domains.find((d) => slugifyDomain(d.name) === domainSlug) ?? null);
  const unknownDomain = domainSlug !== "all" && activeDomain === null;

  let result: PaginatedMotions = {
    motions: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };
  if (!unknownDomain) {
    try {
      const { data } = await serverApi.get("/arena/motions", {
        params: {
          status: "concluded",
          ...(outcome !== "all" ? { outcome } : {}),
          ...(activeDomain ? { domainId: activeDomain.id } : {}),
          page: requestedPage,
        },
      });
      if (Array.isArray(data.motions)) result = data;
    } catch (error) {
      console.error("Failed to load the archive:", error);
    }
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const activeOutcome = ARCHIVE_OUTCOMES.find((o) => o.slug === outcome)!;

  return (
    <Reveal
      key={`${outcome}-${domainSlug}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          THE PERMANENT RECORD
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          The Archive
        </h1>
        <p className="mt-4 text-ink-soft font-body text-lg max-w-xl">
          {unknownDomain
            ? "This battleground does not exist."
            : `${result.total} settled debate${result.total === 1 ? "" : "s"} — every verdict, draw and walkover, kept.`}
        </p>
      </div>

      <div data-reveal className="mb-4 flex flex-wrap gap-2">
        {ARCHIVE_OUTCOMES.map((o) => (
          <Link
            key={o.slug}
            href={archiveHref({ outcome: o.slug, domain: domainSlug })}
            className={chipClass(o.slug === outcome)}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {domains.length > 0 && (
        <div data-reveal className="flex flex-wrap gap-2 mb-8">
          <Link
            href={archiveHref({ outcome, domain: "all" })}
            className={chipClass(domainSlug === "all")}
          >
            All domains
          </Link>
          {domains.map((d) => {
            const slug = slugifyDomain(d.name);
            return (
              <Link
                key={d.id}
                href={archiveHref({ outcome, domain: slug })}
                className={chipClass(domainSlug === slug)}
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
            {unknownDomain
              ? "No such battleground."
              : "Nothing settled here yet."}
          </p>
          <p className="font-body text-sm text-ink-soft mb-8">
            {unknownDomain
              ? "Pick a battleground above to browse the record."
              : outcome === "all" && domainSlug === "all"
                ? "Every debate in the arena is still running. Come back when the first one closes."
                : `No debate has concluded with this combination${activeDomain ? ` in ${activeDomain.name}` : ""}. Try a wider filter.`}
          </p>
          <Button href="/domain?q=all" size="lg">
            Browse live debates
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
          itemLabel={
            activeOutcome.slug === "all"
              ? result.total === 1
                ? "settled debate"
                : "settled debates"
              : `${activeOutcome.label.toLowerCase()} verdict${result.total === 1 ? "" : "s"}`
          }
          hrefFor={(p) => archiveHref({ outcome, domain: domainSlug, page: p })}
        />
      </div>
    </Reveal>
  );
};

export default ArchivePage;
