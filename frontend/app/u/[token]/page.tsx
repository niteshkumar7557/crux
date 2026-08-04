"use client";

// One-click unsubscribe. The URL in every List-Unsubscribe header and every
// footer.
//
// It acts on arrival — no confirm button. A footer link that opens a form is one
// more step between "make it stop" and it stopping, and the step people take
// instead is the spam button. The undo is offered afterwards, for the misclick.
// Spec: game-theory.md §20

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/app/axios";
import { LogoMark } from "@/app/_components/ui/Logo";

const Unsubscribe = () => {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [state, setState] = useState<"working" | "done" | "unknown">("working");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api
      .post(`/email/unsubscribe/${token}`)
      .then(() => {
        if (alive) setState("done");
      })
      .catch(() => {
        if (alive) setState("unknown");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16 font-body text-ink">
      <div className="w-full max-w-md text-center">
        <LogoMark size={48} className="mx-auto text-ink" />

        {state === "working" && (
          <p
            aria-live="polite"
            className="mt-8 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft"
          >
            Unsubscribing…
          </p>
        )}

        {state === "done" && (
          <>
            <h1 className="mt-8 display-type text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink">
              You&rsquo;re unsubscribed
            </h1>
            <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
              We won&rsquo;t email you again. Your account, your logic and your
              record are untouched, and your in-app notifications still work
              exactly as before.
            </p>
            <p className="mt-8 font-body text-sm text-ink-soft">
              Changed your mind?
              <Link
                href="/profile/email"
                className="ml-2 font-label text-[10px] uppercase tracking-widest text-ink hover:underline"
              >
                Email settings
              </Link>
            </p>
          </>
        )}

        {state === "unknown" && (
          <>
            <h1 className="mt-8 display-type text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink">
              That link is no longer valid
            </h1>
            <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
              It may already have been used, or the account may be gone. You can
              turn email off from your settings instead.
            </p>
            <p className="mt-8 font-body text-sm text-ink-soft">
              <Link
                href="/profile/email"
                className="font-label text-[10px] uppercase tracking-widest text-ink hover:underline"
              >
                Email settings
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
