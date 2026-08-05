"use client";

// The social post studio. Every endpoint behind this page re-checks the role
// server-side; a hidden button is not a rule.

import { useEffect, useState } from "react";
import { getUser } from "@/app/_utils/getUser";
import SocialStudio from "@/app/_components/admin/social/SocialStudio";

const SocialPage = () => {
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
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
      <div className="mb-12">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Administration
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.2rem,5vw,3.4rem)] text-ink">
          The post studio
        </h1>
      </div>

      {role === "unknown" && (
        <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          Checking…
        </p>
      )}

      {role === "denied" && (
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">This page is for administrators.</p>
        </div>
      )}

      {role === "admin" && <SocialStudio />}
    </div>
  );
};

export default SocialPage;
