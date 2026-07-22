import type { UserHeadInfoProps } from "@/app/profile/types";
import AvatarEditor from "./AvatarEditor";
import LogoutButton from "./LogoutButton";
import SeasonTitles, { FRAME_RING, bestTitle } from "./SeasonTitles";

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
  titles,
}: UserHeadInfoProps) => {
  // §10: the best placing ever earned frames the avatar. Square, to match the
  // avatar itself.
  const best = bestTitle(titles);
  const frame = best ? FRAME_RING[best.frame] : undefined;

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
          <div className={frame ? `p-1 border-2 ${frame}` : undefined}>
            <AvatarEditor
              profileId={profileId}
              username={username}
              avatar={avatar}
            />
          </div>
          <h1
            className="font-headline text-5xl md:text-8xl font-bold tracking-tighter text-on-background leading-none break-words min-w-0"
          >
            {name}
          </h1>
        </div>
        <SeasonTitles titles={titles} />
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
          </span>
        </div>
        <div className="col-span-2 bg-surface-container-low p-6 border-l-4 border-primary">
          {/* §14: the season window is stated, never left to be inferred. */}
          <span className="font-label text-xs text-outline uppercase tracking-widest block mb-2">
            Season {season.number} ·{" "}
            {season.daysLeft} {season.daysLeft === 1 ? "day" : "days"} left
          </span>
          <span className="font-label text-4xl font-bold text-primary">
            {season.logic}
            <span className="text-lg text-outline"> logic</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default UserHeadInfo;
