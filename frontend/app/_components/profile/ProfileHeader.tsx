import type {
  ProfileIdentity,
  ProfileStanding,
  SeasonTitle,
} from "@/app/profile/types";
import AvatarEditor from "./AvatarEditor";
import OwnerRail from "./OwnerRail";
import SeasonTitles, { FRAME_RING, bestTitle } from "./SeasonTitles";

const ProfileHeader = ({
  identity,
  standing,
  titles,
}: {
  identity: ProfileIdentity;
  standing: ProfileStanding;
  titles: SeasonTitle[];
}) => {
  // §10: the best placing ever earned frames the avatar. Square, to match the
  // avatar itself.
  const best = bestTitle(titles);
  const frame = best ? FRAME_RING[best.frame] : undefined;

  return (
    <section className="mb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary-container text-on-primary-container px-3 py-0.5 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
            {standing.tier}
          </span>
          <span className="font-label text-[10px] tracking-widest uppercase text-outline">
            @{identity.username}
          </span>
        </div>
        <OwnerRail profileId={identity.id} bio={identity.bio} />
      </div>

      <div className="flex items-end gap-5 md:gap-8">
        <div className={frame ? `p-1 border-2 ${frame}` : undefined}>
          <AvatarEditor
            profileId={identity.id}
            username={identity.username}
            avatar={identity.avatar}
          />
        </div>
        <h1 className="font-headline text-5xl md:text-8xl font-bold tracking-tighter text-on-background leading-none break-words min-w-0">
          {identity.name}
        </h1>
      </div>

      <SeasonTitles titles={titles} />

      <p className="font-body text-on-surface-variant mt-6 max-w-xl text-lg leading-relaxed">
        {identity.bio}
      </p>
    </section>
  );
};

export default ProfileHeader;
