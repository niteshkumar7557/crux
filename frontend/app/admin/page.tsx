"use client";

// The admin console. Broadcast is its first tool; the block list and the stage
// pins still live where they were and can move here later.
//
// Role is read from the JWT to decide what to DRAW. It is not authorisation —
// every endpoint behind this page re-checks the role server-side, because a
// hidden button is not a rule.

import { useEffect, useState } from "react";
import { getUser } from "@/app/_utils/getUser";
import BroadcastForm from "@/app/_components/admin/BroadcastForm";

const AdminPage = () => {
  const [role, setRole] = useState<"unknown" | "admin" | "denied">("unknown");

  useEffect(() => {
    let alive = true;
    getUser().then((user) => {
      if (!alive) return;
      setRole(user?.role === "admin" ? "admin" : "denied");
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
      <div className="mb-12">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Administration
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.2rem,5vw,3.4rem)] text-ink">
          The console
        </h1>
      </div>

      {role === "unknown" && (
        <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          Checking…
        </p>
      )}

      {role === "denied" && (
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">
            This page is for administrators.
          </p>
        </div>
      )}

      {role === "admin" && (
        <>
          <div className="mb-10 flex flex-wrap gap-3">
            <a
              href="/admin/social"
              className="inline-flex border border-ink-faint bg-band px-6 py-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink"
            >
              The post studio →
            </a>
            <a
              href="/admin/video-debates"
              className="inline-flex border border-ink-faint bg-band px-6 py-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink"
            >
              Video debates →
            </a>
          </div>
          <BroadcastForm />
        </>
      )}
    </div>
  );
};

export default AdminPage;
