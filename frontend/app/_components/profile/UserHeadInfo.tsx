import type { UserHeadInfoProps } from "@/app/profile/types";

const UserHeadInfo = ({
  name,
  level,
  description,
  reputation,
  globalRank,
}: UserHeadInfoProps) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 md:mt-12 mb-16 items-end">
      <div className="lg:col-span-7">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-primary-container text-on-primary-container px-3 py-0.5 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
            {level}
          </span>
          <span className="text-outline text-[10px] font-label tracking-widest uppercase italic">
            Verified Logic
          </span>
        </div>
        <h1
          className="font-headline text-5xl md:text-8xl font-bold tracking-tighter text-on-background leading-none break-words"
        >
          {name}
        </h1>
        <p className="font-body text-on-surface-variant mt-6 max-w-xl text-lg leading-relaxed">
          {description}
        </p>
      </div>
      <div className="lg:col-span-5 grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low p-6 border-l-4 border-primary">
          <span className="font-label text-xs text-outline uppercase tracking-widest block mb-2">
            Reputation
          </span>
          <span className="font-label text-4xl font-bold text-primary">
            {reputation}
          </span>
        </div>
        <div className="bg-surface-container-low p-6 border-l-4 border-secondary">
          <span className="font-label text-xs text-outline uppercase tracking-widest block mb-2">
            Global Rank
          </span>
          <span className="font-label text-4xl font-bold text-secondary">
            #{globalRank}
          </span>
        </div>
      </div>
    </section>
  );
};

export default UserHeadInfo;
