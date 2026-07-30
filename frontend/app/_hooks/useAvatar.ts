// The signed-in user's current avatar, fetched after mount.

import { useEffect, useState } from "react";
import api from "../axios";
import { jwtPayload } from "../_types/jwt";

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
