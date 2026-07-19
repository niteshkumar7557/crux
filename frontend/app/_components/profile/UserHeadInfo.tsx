import type { UserHeadInfoProps } from "@/app/profile/types";
import AvatarEditor from "./AvatarEditor";
import LogoutButton from "./LogoutButton";

const UserHeadInfo = ({
  profileId,
  name,
  username,
  avatar,
  level,
  description,
  reputation,
  globalRank,
  record,
  season,
}: UserHeadInfoProps) => {
  return (
    <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 md:mt-12 mb-16 items-end">
      <div className="absolute top-0 right-0">
        <LogoutButton profileId={profileId} />
      </div>
      <div className="lg:col-span-7">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-primary-container text-on-primary-container px-3 py-0.5 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
            {level}
          </span>
          <span className="text-outline text-[10px] font-label tracking-widest uppercase italic">
            Verified Logic
          </span>
        </div>
        <div className="flex items-end gap-5 md:gap-8">
          <AvatarEditor
            profileId={profileId}
            username={username}
            avatar={avatar}
          />
          <h1
            className="font-headline text-5xl md:text-8xl font-bold tracking-tighter text-on-background leading-none break-words min-w-0"
          >
            {name}
          </h1>
        </div>
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
        <div className="col-span-2 bg-surface-container-low p-6 border-l-4 border-tertiary">
          <span className="font-label text-xs text-outline uppercase tracking-widest block mb-2">
            Record
          </span>
          <span className="font-label text-4xl font-bold text-tertiary">
            {record.wins}–{record.losses}
            {record.draws > 0 && (
              <span className="text-lg text-outline"> · {record.draws} draws</span>
            )}
            {record.standouts > 0 && (
              <span className="text-lg text-outline">
                {" "}
                · {record.standouts} standout
              </span>
            )}
            {record.upsets > 0 && (
              <span className="text-lg text-outline">
                {" "}
                · {record.upsets} upset{record.upsets === 1 ? "" : "s"}
              </span>
            )}
          </span>
        </div>
        <div className="col-span-2 bg-surface-container-low p-6 border-l-4 border-primary">
          <span className="font-label text-xs text-outline uppercase tracking-widest block mb-2">
            Season {season.number} · {season.division}
          </span>
          <span className="font-label text-4xl font-bold text-primary">
            {season.logic}
            <span className="text-lg text-outline"> logic</span>
            <span className="text-lg text-outline"> · {season.lp} LP</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default UserHeadInfo;
