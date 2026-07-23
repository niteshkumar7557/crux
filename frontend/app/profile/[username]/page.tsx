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

/** A numeric segment is always a legacy profile id — the username rule
 *  guarantees a handle contains at least one letter. */
const isLegacyId = (segment: string) => /^\d+$/.test(segment);

async function fetchShell(username: string): Promise<ProfileShell | null> {
  try {
    const { data } = await serverApi.get(`/profile/${username}`);
    return data?.identity ? data : null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
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
  };
}

const ProfilePage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;

  // Legacy /profile/<id> links redirect to the canonical URL. redirect()
  // throws by design, so it must sit outside any try/catch that swallows.
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
    <Reveal className="max-w-7xl mx-auto px-6 py-12">
      <div data-reveal>
        <ProfileHeader
          identity={shell.identity}
          standing={shell.standing}
          titles={shell.titles}
        />
      </div>
      <div data-reveal>
        <CareerStrip standing={shell.standing} />
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
      />
    </Reveal>
  );
};

export default ProfilePage;
