"use client";

// Where the Google callback lands a user who already has an account.
//
// The callback set the refresh cookie and nothing else — no access token ever
// travels in a URL, where it would sit in history, in the Referer header and in
// any logging in between. This page trades the cookie for a token through the
// same /user/refresh the app already uses.
//
// It deliberately does NOT call getUser(): that returns the cached localStorage
// token when it is still valid, which after signing in as a different account
// would be the previous identity.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LogoMark } from "@/app/_components/ui/Logo";

const AuthComplete = () => {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function finish() {
      try {
        const { data } = await axios.post(
          "/api/user/refresh",
          {},
          { withCredentials: true },
        );
        if (!alive) return;
        if (!data?.access_token) {
          setFailed(true);
          return;
        }
        localStorage.setItem("access_token", data.access_token);
        router.replace("/arena");
      } catch {
        if (alive) setFailed(true);
      }
    }

    finish();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="bg-paper text-ink font-body min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <LogoMark size={48} className="text-ink" />
      {failed ? (
        <>
          <p className="font-body text-ink-soft text-center max-w-sm">
            We couldn&rsquo;t finish signing you in. Nothing was changed on your
            account.
          </p>
          <a
            href="/login"
            className="font-label text-[10px] uppercase tracking-widest text-ink hover:underline"
          >
            Back to sign in
          </a>
        </>
      ) : (
        <p
          aria-live="polite"
          className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft"
        >
          Signing you in…
        </p>
      )}
    </main>
  );
};

export default AuthComplete;
