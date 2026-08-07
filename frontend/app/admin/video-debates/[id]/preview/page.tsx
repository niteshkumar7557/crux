"use client";

// The same programme an editor is about to publish, drawn by the same component the
// public page uses. There is no second rendering path that can drift from it.
//
// This route never falls back to a public slug: a draft that 403s or 404s says so.

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/app/axios";
import { getUser } from "@/app/_utils/getUser";
import VideoDebateExperience from "@/app/_components/video-debates/VideoDebateExperience";
import type { VideoDebateDetailResponse } from "@/app/video-debates/types";

type Failure = "denied" | "missing" | "unavailable";

const VideoDebatePreviewPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [role, setRole] = useState<"unknown" | "admin" | "denied">("unknown");
  const [detail, setDetail] = useState<VideoDebateDetailResponse | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

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

  useEffect(() => {
    if (role !== "admin") return;
    let alive = true;
    params
      .then(({ id }) => api.get<VideoDebateDetailResponse>(`/admin/video-debates/${id}/preview`))
      .then(({ data }) => {
        if (alive) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const status = isAxiosError(err) ? err.response?.status : undefined;
        setFailure(status === 403 ? "denied" : status === 404 ? "missing" : "unavailable");
      });
    return () => {
      alive = false;
    };
  }, [role, params]);

  if (role === "unknown") {
    return (
      <p className="mx-auto max-w-5xl px-6 py-12 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft md:px-8">
        Checking…
      </p>
    );
  }

  if (role === "denied" || failure === "denied") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">This page is for administrators.</p>
        </div>
      </div>
    );
  }

  if (failure !== null) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
        <div className="border border-ink-faint bg-band p-8">
          <p className="font-body text-ink-soft">
            {failure === "missing"
              ? "There is no draft with that id."
              : "Couldn't load that preview."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="sticky top-0 z-10 border-b border-ink-faint bg-band px-6 py-3 text-center font-label text-[0.6rem] uppercase tracking-[0.3em] text-ink md:px-8">
        Admin preview · not public
      </p>
      {detail ? (
        <VideoDebateExperience detail={detail} />
      ) : (
        <p className="mx-auto max-w-5xl px-6 py-12 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft md:px-8">
          Loading the programme…
        </p>
      )}
    </>
  );
};

export default VideoDebatePreviewPage;
