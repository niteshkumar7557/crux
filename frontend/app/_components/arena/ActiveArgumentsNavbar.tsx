import Link from "next/link";

interface ActiveNavbarProps {
  tabList: string[];
  active: string;
  /** Builds the href for a tab; the tab lives in the URL so it survives a
   *  refresh and a pager link can name the tab it belongs to. */
  hrefFor: (tab: string) => string;
}

const ActiveArgumentsNavbar = ({
  tabList,
  active,
  hrefFor,
}: ActiveNavbarProps) => {
  return (
    <div>
      <span className="font-label text-primary uppercase tracking-[0.2em] text-xs mb-2 block">
        live feed
      </span>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:justify-between md:items-baseline">
        <div className="flex gap-5">
          <h2 className="font-headline text-5xl font-medium italic">
            Active Arguments
          </h2>
          <div className="font-label text-[10px] text-tertiary uppercase tracking-[0.25em] mt-6 mb-1">
						Main Stage — Featured Live Matches
					</div>
        </div>
        <div className="flex gap-5 font-label text-[10px] uppercase tracking-widest">
          {tabList.map((e) => (
            <Link
              key={e}
              href={hrefFor(e)}
              scroll={false}
              aria-current={e === active ? "page" : undefined}
              className={`${e === active ? "text-primary border-b uppercase border-primary pb-1 cursor-pointer" : "text-outline border-b border-transparent pb-1 hover:text-on-surface uppercase transition-colors cursor-pointer"}`}
            >
              {e}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveArgumentsNavbar;
