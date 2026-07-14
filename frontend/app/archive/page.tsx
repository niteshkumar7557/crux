export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaCard from "@/app/_components/arena/ArenaCard";
import Button from "@/app/_components/ui/Button";
import { NewestCardProps } from "@/app/types";
import { timeAgo } from "@/app/_utils/timeAgo";

export const metadata: Metadata = {
  title: "Archive",
};

const Archive = async ({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) => {
  const { domain } = await searchParams;

  let statements: NewestCardProps[] = [];
  try {
    const { data } = await serverApi.get("/arena/active/newest");
    if (Array.isArray(data)) statements = data;
  } catch (error) {
    console.error("Failed to load archive data:", error);
  }

  const domains = [...new Set(statements.map((e) => e.domain))];
  const filtered = domain
    ? statements.filter((e) => e.domain === domain)
    : statements;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12">
      <div className="mb-12 border-l-4 border-tertiary pl-6">
        <span className="font-label text-tertiary text-xs uppercase tracking-[0.3em] mb-2 block">
          THE RECORD
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          Statement Archive
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          Every claim the arena has taken up, filterable by battleground.
        </p>
      </div>

      {domains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/archive"
            className={`${!domain ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container text-on-surface-variant"} border px-4 py-2 font-label text-xs uppercase hover:border-primary hover:text-primary transition-colors`}
          >
            All
          </Link>
          {domains.map((domainName) => (
            <Link
              key={domainName}
              href={`/archive?domain=${encodeURIComponent(domainName)}`}
              className={`${domain === domainName ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container text-on-surface-variant"} border px-4 py-2 font-label text-xs uppercase hover:border-primary hover:text-primary transition-colors`}
            >
              {domainName}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center">
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            {domain
              ? `No statements filed under ${domain}.`
              : "The archive is empty."}
          </p>
          <p className="font-body text-sm text-outline mb-8">
            {domain
              ? "Be the first to open this battleground."
              : "No claims have entered the arena yet."}
          </p>
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          {filtered.map((e) => (
            <ArenaCard
              key={e.argumentid}
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
      )}
    </div>
  );
};

export default Archive;
