// A profile. The shell is server-rendered and the activity payload is fetched after
// mount, so nothing slow blocks first paint. Spec: game-theory.md §13

import { cache } from "react";
import type { Metadata } from "next";
import { isAxiosError } from "axios";
import { notFound, redirect } from "next/navigation";
import serverApi from "@/app/axios.server";
import Reveal from "@/app/_components/ui/Reveal";
import ProfileHeader from "@/app/_components/profile/ProfileHeader";
import CareerStrip from "@/app/_components/profile/CareerStrip";
import SeasonBand from "@/app/_components/profile/SeasonBand";
import TierLadder from "@/app/_components/profile/TierLadder";
import ProfileActivity from "@/app/_components/profile/ProfileActivity";
import { validateUsername } from "@/app/_utils/username";
import type { ProfileShell } from "@/app/profile/types";

const isLegacyId = (segment: string) => /^\d+$/.test(segment);

// cache() because generateMetadata and the page both need the shell, and without
// it every profile render costs two identical queries.
const fetchShell = cache(async function fetchShell(
  username: string,
): Promise<ProfileShell | null> {
  try {
    const { data } = await serverApi.get(`/profile/${username}`);
    return data?.identity ? data : null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
});

/** A registered account that has never argued: nothing here for anyone to find. */
function hasNothingToShow(shell: ProfileShell): boolean {
  const { logic, record } = shell.standing;
  return logic === 0 && record.wins + record.losses + record.draws === 0;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  if (isLegacyId(username) || !validateUsername(username).ok) return {};
  const shell = await fetchShell(username);
  if (!shell) return {};
  return {
    title: `${shell.identity.name} (@${shell.identity.username})`,
    description: `${shell.standing.logic} logic · ${shell.standing.record.wins}–${shell.standing.record.losses}–${shell.standing.record.draws} · ${shell.standing.tier} tier on Crux.`,
    alternates: { canonical: `/profile/${shell.identity.username}` },
    // Empty profiles are the bulk of a young platform's URLs and none of its
    // value. Keep them out until there is a record to show; the page starts
    // indexing itself as soon as there is.
    ...(hasNothingToShow(shell)
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

const ProfilePage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;

  if (isLegacyId(username)) {
    let canonical: string | null = null;
    try {
      const { data } = await serverApi.get(`/profile/id/${username}`);
      canonical = data?.username ?? null;
    } catch {
      canonical = null;
    }
    if (!canonical) notFound();
    redirect(`/profile/${canonical}`);
  }

  if (!validateUsername(username).ok) notFound();

  const shell = await fetchShell(username);
  if (!shell) notFound();

  return (
    <Reveal className="w-full max-w-7xl mx-auto px-6 py-12">
      <div data-reveal>
        <ProfileHeader
          identity={shell.identity}
          standing={shell.standing}
          titles={shell.titles}
        />
      </div>
      <div data-reveal>
        <CareerStrip standing={shell.standing} season={shell.season} />
      </div>
      <div data-reveal>
        <TierLadder logic={shell.standing.logic} />
      </div>
      <div data-reveal>
        <SeasonBand season={shell.season} />
      </div>
      <ProfileActivity
        username={shell.identity.username}
        profileId={shell.identity.id}
        seasonNumber={shell.season.number}
        seasonStartsAt={shell.season.startsAt}
      />
    </Reveal>
  );
};

export default ProfilePage;
