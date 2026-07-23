"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/app/_utils/getUser";
import Skeleton from "@/app/_components/ui/Skeleton";

// The JWT lives in localStorage, so a server component cannot know who you
// are. /profile/me resolves the handle here and hands off to the canonical
// /profile/<username> URL — one rendering path, and the URL you land on is
// the one you can share.
const ProfileMe = () => {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getUser()
      .then((user) => {
        if (!active) return;
        if (user?.username) {
          router.replace(`/profile/${user.username}`);
        } else {
          router.replace("/login?next=/profile/me");
        }
      })
      .catch(() => {
        if (active) router.replace("/login?next=/profile/me");
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-6 py-12">
      <span className="sr-only">Opening your profile…</span>
      <div className="flex items-end gap-5 md:gap-8">
        <Skeleton className="w-32 h-32 shrink-0" />
        <div className="grow space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </div>
    </main>
  );
};

export default ProfileMe;
