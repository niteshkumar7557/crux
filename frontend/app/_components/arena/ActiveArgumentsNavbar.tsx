interface ActiveNavbarProps {
  tabList: string[];
  active: string;
  changeActive: (a: string) => void;
}

const ActiveArgumentsNavbar = ({
  tabList,
  active,
  changeActive,
}: ActiveNavbarProps) => {
  return (
    <div>
      <span className="font-label text-primary uppercase tracking-[0.2em] text-xs mb-2 block">
        live feed
      </span>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:justify-between md:items-baseline">
        <h2 className="font-headline text-5xl font-medium italic">
          Active Arguments
        </h2>
        <div className="flex gap-5 font-label text-[10px] uppercase tracking-widest">
          {tabList.map((e, i) => (
            <button
              key={i}
              onClick={() => changeActive(e)}
              className={`${e === active ? "text-primary border-b uppercase border-primary pb-1 cursor-pointer" : "text-outline border-b border-transparent pb-1 hover:text-on-surface uppercase transition-colors cursor-pointer"}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveArgumentsNavbar;
