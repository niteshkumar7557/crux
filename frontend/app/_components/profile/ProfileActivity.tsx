"use client";

// Fetches everything below the shell after mount.

import { useEffect, useRef, useState } from "react";
import api from "@/app/axios";
import Skeleton from "@/app/_components/ui/Skeleton";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";
import type { ProfileActivityData } from "@/app/profile/types";
import ArenaNow from "./ArenaNow";
import ArgumentPattern from "./ArgumentPattern";
import CareerHistory from "./CareerHistory";
import LogicLedger from "./LogicLedger";

const ProfileActivity = ({
  username,
  profileId,
  seasonNumber,
}: {
  username: string;
  profileId: number;
  seasonNumber: number;
}) => {
  const [data, setData] = useState<ProfileActivityData | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api
      .get(`/profile/${username}/activity`)
      .then(({ data: body }) => {
        if (active) setData(body);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [username]);

  useGSAP(
    () => {
      if (!data) return;
      if (!shouldAnimate(`/profile/${username}#activity`)) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-activity-section]", {
          y: 16,
          opacity: 0.25,
          duration: 0.6,
          stagger: 0.06,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      });
    },
    { scope: rootRef, dependencies: [data] },
  );

  if (failed) {
    return (
      <p className="font-label text-[10px] uppercase tracking-widest text-ink-soft py-12">
        Couldn&apos;t load this profile&apos;s activity. Refresh to try again.
      </p>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-96" />
          <Skeleton className="lg:col-span-4 h-96" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div data-activity-section className="lg:col-span-8">
          <LogicLedger ledger={data.ledger} seasonNumber={seasonNumber} />
        </div>
        <div data-activity-section className="lg:col-span-4">
          <ArgumentPattern craft={data.craft} />
        </div>
      </div>
      <div data-activity-section>
        <ArenaNow live={data.live} profileId={profileId} />
      </div>
      <div data-activity-section>
        <CareerHistory history={data.history} />
      </div>
    </div>
  );
};

export default ProfileActivity;
