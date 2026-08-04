"use client";

// Whether the server has an OAuth client configured. Asked rather than mirrored
// into a NEXT_PUBLIC_ variable, so there is one source of truth: the backend's
// own config decides, and a half-configured deploy hides the button instead of
// showing one that 503s.
//
// null while unknown — the button is not drawn and then withdrawn.

import { useEffect, useState } from "react";
import api from "@/app/axios";

export function useGoogleAvailable(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/user/auth/google/available")
      .then(({ data }) => {
        if (alive) setEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        if (alive) setEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return enabled;
}
