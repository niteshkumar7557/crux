"use client";

// §13: asks a signed-in account that predates Google sign-in to link one. Asks
// at most three times, a week apart, and then never again — the server owns that
// count, so clearing localStorage does not reset it and the ceiling is real.
//
// Through ui/Portal, per design-system §5: a blurred or transformed ancestor
// becomes the containing block for position: fixed, and this mounts app-wide
// where one may exist.

import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import api from "@/app/axios";
import Portal from "@/app/_components/ui/Portal";
import GoogleButton from "./GoogleButton";
import { getUser } from "@/app/_utils/getUser";

const GoogleLinkPrompt = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      // Signed-out visitors have nothing to link, and asking costs a request on
      // every page of the public site.
      const user = await getUser();
      if (!alive || !user) return;
      try {
        const { data } = await api.get("/user/google/status");
        if (alive && data?.shouldPrompt) setOpen(true);
      } catch {
        // A prompt that cannot be shown is not an error worth surfacing.
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function dismiss() {
    setOpen(false);
    // Fire and forget: the modal is already gone, and a failed snooze only means
    // being asked again next week.
    api.post("/user/google/snooze").catch(() => {});
  }

  async function link() {
    setBusy(true);
    try {
      // A top-level navigation cannot carry the JWT, so the server stamps the
      // user id into a signed cookie here and hands back the URL to travel to.
      const { data } = await api.post("/user/auth/google/link");
      if (data?.url) window.location.assign(data.url);
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-link-title"
      >
        <div className="relative w-full max-w-md border border-ink-faint bg-raised p-8 shadow-cast">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="absolute right-4 top-4 cursor-pointer text-ink-soft transition-colors hover:text-ink"
          >
            <LuX className="text-base" />
          </button>

          <span className="font-label text-[0.6rem] uppercase tracking-[0.3em] text-ink-soft">
            Your account
          </span>
          <h2
            id="google-link-title"
            className="mt-4 display-type text-[clamp(1.5rem,3vw,2rem)] text-ink"
          >
            Link your Google account
          </h2>
          <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
            Sign in with one tap from now on — no password to remember. Your
            handle, your logic, your record and your titles stay exactly as they
            are, and your existing password keeps working.
          </p>

          <div className="mt-8">
            <GoogleButton label="Link Google" onClick={link} busy={busy} />
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full cursor-pointer font-label text-[10px] uppercase tracking-widest text-ink-soft transition-colors hover:text-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </Portal>
  );
};

export default GoogleLinkPrompt;
