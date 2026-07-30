// Trending / Newest switch above the feed.

import Link from "next/link";

interface ActiveNavbarProps {
  tabList: string[];
  active: string;
  hrefFor: (tab: string) => string;
}

const ActiveMotionsNavbar = ({
  tabList,
  active,
  hrefFor,
}: ActiveNavbarProps) => {
  return (
    <header className="mb-10">
      <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        <span aria-hidden className="h-px w-8 bg-ink-faint" />
        Live feed
      </p>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display-type text-[clamp(2.4rem,5vw,3.6rem)] text-ink">
            Active Motions
          </h1>
          <p className="mt-3 font-label text-[0.6rem] uppercase tracking-[0.28em] text-ink-soft">
            Main stage — featured live matches
          </p>
        </div>
        <nav className="flex gap-6 font-label text-[0.62rem] uppercase tracking-[0.24em]">
          {tabList.map((tab) => {
            const isActive = tab === active;
            return (
              <Link
                key={tab}
                href={hrefFor(tab)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`border-b pb-1 transition-colors ${
                  isActive
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {tab}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default ActiveMotionsNavbar;
