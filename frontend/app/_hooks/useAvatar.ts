import { useEffect, useState } from "react";
import api from "../axios";
import { jwtPayload } from "../_types/jwt";

/**
 * The signed-in user's avatar, for the two navbars.
 *
 * The JWT doesn't carry the avatar, so it is fetched once we know who is here.
 * AvatarEditor announces changes on `crux:avatar-updated` so a new portrait
 * lands in the bar without a reload.
 */
export function useAvatar(user: jwtPayload | null) {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get("/user/me")
      .then(({ data }) => {
        if (active) setAvatar(data.user?.avatar ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const onUpdate = (e: Event) =>
      setAvatar((e as CustomEvent<string | null>).detail);
    window.addEventListener("crux:avatar-updated", onUpdate);
    return () => window.removeEventListener("crux:avatar-updated", onUpdate);
  }, []);

  return avatar;
}
